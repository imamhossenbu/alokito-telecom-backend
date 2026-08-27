import mongoose, { Types } from "mongoose";
import crypto from "crypto";
import { PaymentDeviceModel, PaymentDeviceStatus } from "./paymentDevice.model";
import { PaymentPairingSessionModel, PairingStatus } from "./pairing.model";
import { PaymentSmsEventModel, SmsEventVerificationStatus } from "./smsEvent.model";
import { normalizeSms } from "../../sms/normalizer/normalizer";
import { signAccessToken } from "../../shared/utils/jwt";
import { NotFoundError, AppError, ConflictError } from "../../shared/errors/app-error";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { auditLogService } from "../auditLogs/auditLog.service";
import { ActorType } from "../auditLogs/auditLog.model";

function hashPairingCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateSmsFingerprint(provider: string, transactionId: string, amount: number, receivedAt: Date): string {
  const data = `${provider.toUpperCase()}:${transactionId.toUpperCase()}:${amount}:${receivedAt.getTime()}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

export const paymentDeviceService = {
  // ── Admin: Pair generation ───────────────────────────
  async adminCreatePairing(adminId: string) {
    // Generate a 6-digit short code
    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    const pairingCodeHash = hashPairingCode(pairingCode);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const session = await PaymentPairingSessionModel.create({
      adminId: new Types.ObjectId(adminId),
      pairingCodeHash,
      status: PairingStatus.PENDING,
      expiresAt,
    });

    return {
      pairingCode,
      pairingId: session._id.toString(),
      expiresAt,
    };
  },

  // ── Device: Pair completion ───────────────────────────
  async devicePair(data: {
    pairingCode: string;
    deviceId: string;
    deviceName?: string;
    phoneNumber?: string;
    simSlot?: number;
    simOperator?: string;
    appVersion?: string;
  }) {
    const pairingCodeHash = hashPairingCode(data.pairingCode);
    const session = await PaymentPairingSessionModel.findOne({
      pairingCodeHash,
      status: PairingStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new AppError("PAIRING_CODE_INVALID", "Invalid or expired pairing code", 400);
    }

    const mongoSession = await mongoose.startSession();
    try {
      let device;
      await mongoSession.withTransaction(async () => {
        // Upsert device
        device = await PaymentDeviceModel.findOneAndUpdate(
          { deviceId: data.deviceId },
          {
            $set: {
              adminId: session.adminId,
              deviceName: data.deviceName,
              phoneNumber: data.phoneNumber,
              simSlot: data.simSlot,
              simOperator: data.simOperator,
              appVersion: data.appVersion,
              status: PaymentDeviceStatus.CONNECTED,
              lastSeenAt: new Date(),
              pairedAt: new Date(),
              revokedAt: undefined,
            },
          },
          { new: true, upsert: true, session: mongoSession }
        );

        // Mark session as paired
        session.status = PairingStatus.PAIRED;
        session.deviceId = data.deviceId;
        session.paymentDeviceId = device._id;
        session.pairedAt = new Date();
        await session.save({ session: mongoSession });
      });

      if (!device) {
        throw new AppError("INTERNAL_ERROR", "Device pairing failed", 500);
      }

      await auditLogService.log({
        actorType: ActorType.DEVICE,
        actorId: (device as any)._id,
        action: "PAYMENT_DEVICE_PAIRED",
        entityType: "PaymentDevice",
        entityId: (device as any)._id,
        metadata: { deviceId: data.deviceId, deviceName: data.deviceName },
      });

      // Generate JWT device credential token
      const token = signAccessToken({
        sub: (device as any)._id.toString(),
        type: "PAYMENT_DEVICE",
        adminId: session.adminId.toString(),
        deviceId: data.deviceId,
      });

      return {
        success: true,
        token,
        deviceId: (device as any)._id.toString(),
      };
    } finally {
      await mongoSession.endSession();
    }
  },

  // ── Device: Heartbeat ─────────────────────────────────
  async deviceHeartbeat(paymentDeviceId: string) {
    const device = await PaymentDeviceModel.findById(paymentDeviceId);
    if (!device || device.status === PaymentDeviceStatus.REVOKED) {
      throw new NotFoundError("PAYMENT_DEVICE_NOT_FOUND", "Device not found or revoked");
    }

    device.lastSeenAt = new Date();
    device.status = PaymentDeviceStatus.CONNECTED;
    await device.save();

    return { success: true };
  },

  // ── Device: SMS Ingestion ──────────────────────────────
  async deviceIngestSms(paymentDeviceId: string, adminId: string, smsContent: string) {
    const device = await PaymentDeviceModel.findById(paymentDeviceId);
    if (!device || device.status === PaymentDeviceStatus.REVOKED) {
      throw new NotFoundError("PAYMENT_DEVICE_NOT_FOUND", "Device not found or revoked");
    }

    // Update lastSeenAt and lastSmsAt
    device.lastSeenAt = new Date();
    device.lastSmsAt = new Date();
    device.status = PaymentDeviceStatus.CONNECTED;
    await device.save();

    // Parse and normalize SMS content using our rules
    let parsed;
    try {
      parsed = normalizeSms(smsContent, device.phoneNumber);
    } catch (err) {
      logger.warn({ err, smsContent }, "SMS Ingestion failed to parse message");
      throw new AppError("VALIDATION_ERROR", "Could not parse SMS content", 400);
    }

    // Check mapping match (device provider must match the parsed SMS provider)
    if (device.paymentProvider && device.paymentProvider !== parsed.provider) {
      logger.warn(
        { deviceProvider: device.paymentProvider, parsedProvider: parsed.provider },
        "SMS provider mismatch for device"
      );
      throw new AppError("PAYMENT_PROVIDER_MISMATCH", "Parsed provider does not match device mapping", 400);
    }

    const smsFingerprint = generateSmsFingerprint(
      parsed.provider,
      parsed.transactionId,
      parsed.amount,
      parsed.receivedAt
    );

    // Save SMS event, checking for duplicate
    try {
      const event = await PaymentSmsEventModel.create({
        paymentDeviceId: new Types.ObjectId(paymentDeviceId),
        adminId: new Types.ObjectId(adminId),
        provider: parsed.provider,
        transactionId: parsed.transactionId.toUpperCase(),
        amount: parsed.amount,
        sender: parsed.sender,
        receiver: parsed.receiver,
        reference: parsed.reference,
        receivedAt: parsed.receivedAt,
        smsFingerprint,
        verificationStatus: SmsEventVerificationStatus.UNUSED,
      });

      return { success: true, eventId: event._id.toString() };
    } catch (err: any) {
      if (err.code === 11000) {
        // Duplicate key, SMS already ingested — treat as success (idempotence)
        const existing = await PaymentSmsEventModel.findOne({ smsFingerprint });
        return { success: true, eventId: existing?._id.toString(), duplicate: true };
      }
      throw err;
    }
  },

  // ── Admin: List devices ───────────────────────────────
  async adminGetDevices(adminId: string) {
    const devices = await PaymentDeviceModel.find({ adminId: new Types.ObjectId(adminId) });
    
    // Dynamically flag disconnected devices based on heartbeat timeout
    const threshold = Date.now() - env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS * 1000;
    
    for (const device of devices) {
      if (
        device.status === PaymentDeviceStatus.CONNECTED &&
        device.lastSeenAt.getTime() < threshold
      ) {
        device.status = PaymentDeviceStatus.OFFLINE;
        await device.save();
      }
    }
    return devices;
  },

  async adminGetDeviceById(adminId: string, id: string) {
    const device = await PaymentDeviceModel.findOne({ _id: id, adminId: new Types.ObjectId(adminId) });
    if (!device) {
      throw new NotFoundError("PAYMENT_DEVICE_NOT_FOUND", "Device not found");
    }

    // Check timeout
    const threshold = Date.now() - env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS * 1000;
    if (
      device.status === PaymentDeviceStatus.CONNECTED &&
      device.lastSeenAt.getTime() < threshold
    ) {
      device.status = PaymentDeviceStatus.OFFLINE;
      await device.save();
    }

    return device;
  },

  // ── Admin: Update mapping/phone ───────────────────────
  async adminUpdateDevice(
    adminId: string,
    id: string,
    data: { paymentProvider?: string; phoneNumber?: string }
  ) {
    const device = await PaymentDeviceModel.findOne({ _id: id, adminId: new Types.ObjectId(adminId) });
    if (!device) {
      throw new NotFoundError("PAYMENT_DEVICE_NOT_FOUND", "Device not found");
    }

    if (data.paymentProvider) device.paymentProvider = data.paymentProvider as any;
    if (data.phoneNumber) device.phoneNumber = data.phoneNumber;

    await device.save();

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "PAYMENT_DEVICE_UPDATED",
      entityType: "PaymentDevice",
      entityId: device._id,
      metadata: data,
    });

    return device;
  },

  // ── Admin: Revoke device ──────────────────────────────
  async adminRevokeDevice(adminId: string, id: string) {
    const device = await PaymentDeviceModel.findOne({ _id: id, adminId: new Types.ObjectId(adminId) });
    if (!device) {
      throw new NotFoundError("PAYMENT_DEVICE_NOT_FOUND", "Device not found");
    }

    device.status = PaymentDeviceStatus.REVOKED;
    device.revokedAt = new Date();
    await device.save();

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "PAYMENT_DEVICE_REVOKED",
      entityType: "PaymentDevice",
      entityId: device._id,
    });

    return device;
  },

  // ── Admin: List events for device ─────────────────────
  async adminGetDeviceEvents(adminId: string, deviceId: string, page = 1, limit = 20) {
    const filter = { paymentDeviceId: new Types.ObjectId(deviceId), adminId: new Types.ObjectId(adminId) };
    const total = await PaymentSmsEventModel.countDocuments(filter);
    const docs = await PaymentSmsEventModel.find(filter)
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },

  // ── Active Payment Methods Listing ────────────────────
  async getActivePaymentMethods() {
    const threshold = Date.now() - env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS * 1000;
    
    // Find all devices mapping active providers
    const devices = await PaymentDeviceModel.find({
      status: PaymentDeviceStatus.CONNECTED,
      paymentProvider: { $exists: true },
      phoneNumber: { $exists: true },
    });

    const activeMethods = [];
    for (const d of devices) {
      // Check if actually offline
      if (d.lastSeenAt.getTime() < threshold) {
        d.status = PaymentDeviceStatus.OFFLINE;
        await d.save();
        continue;
      }
      activeMethods.push({
        provider: d.paymentProvider,
        paymentNumber: d.phoneNumber,
        status: "AVAILABLE",
      });
    }

    return activeMethods;
  },
};
