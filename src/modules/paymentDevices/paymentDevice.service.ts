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

async function syncDeviceNumbersToSystemSettings(device: any) {
  try {
    const { systemSettingsService } = await import("../systemSettings/systemSettings.service");
    const fallbacks: any = {};

    const checkAndAssign = (phone?: string, provsStr?: string) => {
      if (!phone || !provsStr) return;
      const cleanPhone = phone.trim();
      if (!cleanPhone || cleanPhone === "Unknown") return;
      const provs = provsStr.toUpperCase().split(/[,|]/).map((p) => p.trim());
      if (provs.includes("BKASH") && !fallbacks.bkash) fallbacks.bkash = cleanPhone;
      if (provs.includes("NAGAD") && !fallbacks.nagad) fallbacks.nagad = cleanPhone;
      if (provs.includes("ROCKET") && !fallbacks.rocket) fallbacks.rocket = cleanPhone;
      if (provs.includes("UPAY") && !fallbacks.upay) fallbacks.upay = cleanPhone;
    };

    // 1. Check SIM 1 & SIM 2
    checkAndAssign(device.sim1PhoneNumber, device.sim1Providers);
    checkAndAssign(device.sim2PhoneNumber, device.sim2Providers);

    // 2. Check legacy phone & providers
    if (device.phoneNumber && device.paymentProvider) {
      const phones = device.phoneNumber.split(/[,|]/).map((p: string) => p.trim());
      const provs = device.paymentProvider.split(/[,|]/).map((p: string) => p.trim());
      phones.forEach((p: string, idx: number) => {
        const provStr = provs[idx] || device.paymentProvider;
        checkAndAssign(p, provStr);
      });
    }

    if (Object.keys(fallbacks).length > 0) {
      await systemSettingsService.updateSettings({
        fallbackPaymentNumbers: fallbacks,
      });
      logger.info({ fallbacks, deviceId: device.deviceId }, "Synchronized listener device payment numbers to system settings");
      try {
        const { io } = await import("../../config/socket");
        if (io) {
          io.emit("payment_methods_updated", fallbacks);
        }
      } catch (_) { }
    }
  } catch (err) {
    logger.warn({ err }, "Could not sync device numbers to system settings");
  }
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
    pairingCode?: string;
    code?: string;
    deviceId: string;
    deviceName?: string;
    phoneNumber?: string;
    simSlot?: number;
    simOperator?: string;
    appVersion?: string;
  }) {
    const rawCode = (data.pairingCode || data.code || "").toString().trim();
    if (!rawCode) {
      throw new AppError("PAIRING_CODE_INVALID", "Pairing code is required", 400);
    }
    const pairingCodeHash = hashPairingCode(rawCode);
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
      let device: any;
      await mongoSession.withTransaction(async () => {
        // Find existing device to preserve its configuration fields
        const existingDevice = await PaymentDeviceModel.findOne({ deviceId: data.deviceId }).session(mongoSession);

        const updateSet: any = {
          adminId: session.adminId,
          deviceName: data.deviceName || (existingDevice ? existingDevice.deviceName : undefined),
          appVersion: data.appVersion || (existingDevice ? existingDevice.appVersion : undefined),
          status: PaymentDeviceStatus.CONNECTED,
          lastSeenAt: new Date(),
          pairedAt: new Date(),
          revokedAt: undefined,
        };

        // Only override phone, slot, operator if provided, else retain existing values
        if (data.phoneNumber !== undefined) updateSet.phoneNumber = data.phoneNumber;
        else if (existingDevice && existingDevice.phoneNumber) updateSet.phoneNumber = existingDevice.phoneNumber;

        if (data.simSlot !== undefined) updateSet.simSlot = data.simSlot;
        else if (existingDevice && existingDevice.simSlot !== undefined) updateSet.simSlot = existingDevice.simSlot;

        if (data.simOperator !== undefined) updateSet.simOperator = data.simOperator;
        else if (existingDevice && existingDevice.simOperator) updateSet.simOperator = existingDevice.simOperator;

        if (existingDevice && existingDevice.paymentProvider) {
          updateSet.paymentProvider = existingDevice.paymentProvider;
        }

        if (existingDevice && existingDevice.sim1PhoneNumber) {
          updateSet.sim1PhoneNumber = existingDevice.sim1PhoneNumber;
          updateSet.sim1Providers = existingDevice.sim1Providers;
        }
        if (existingDevice && existingDevice.sim2PhoneNumber) {
          updateSet.sim2PhoneNumber = existingDevice.sim2PhoneNumber;
          updateSet.sim2Providers = existingDevice.sim2Providers;
        }

        device = await PaymentDeviceModel.findOneAndUpdate(
          { deviceId: data.deviceId },
          { $set: updateSet },
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

      // Synchronize device payment numbers to system settings if available
      await syncDeviceNumbersToSystemSettings(device);

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
        device: {
          phoneNumber: device.phoneNumber || null,
          simSlot: device.simSlot !== undefined ? device.simSlot : null,
          simOperator: device.simOperator || null,
          paymentProvider: device.paymentProvider || null,
          sim1PhoneNumber: device.sim1PhoneNumber || null,
          sim1Providers: device.sim1Providers || null,
          sim2PhoneNumber: device.sim2PhoneNumber || null,
          sim2Providers: device.sim2Providers || null,
        }
      };
    } finally {
      await mongoSession.endSession();
    }
  },

  // ── Device: Setup ─────────────────────────────────────
  async deviceSetup(
    paymentDeviceId: string,
    data: {
      paymentProvider: string;
      phoneNumber?: string;
      simSlot?: number;
      simOperator?: string;
      appVersion?: string;
      deviceName?: string;
      sim1PhoneNumber?: string;
      sim1Providers?: string;
      sim2PhoneNumber?: string;
      sim2Providers?: string;
    }
  ) {
    const device = await PaymentDeviceModel.findById(paymentDeviceId);
    if (!device || device.status === PaymentDeviceStatus.REVOKED) {
      throw new NotFoundError("PAYMENT_DEVICE_NOT_FOUND", "Device not found or revoked");
    }

    if (data.paymentProvider) device.paymentProvider = data.paymentProvider;
    if (data.phoneNumber) device.phoneNumber = data.phoneNumber;
    if (data.simSlot !== undefined) device.simSlot = data.simSlot;
    if (data.simOperator) device.simOperator = data.simOperator;
    if (data.appVersion) device.appVersion = data.appVersion;
    if (data.deviceName) device.deviceName = data.deviceName;

    // Explicit SIM slots if passed
    if (data.sim1PhoneNumber !== undefined) device.sim1PhoneNumber = data.sim1PhoneNumber;
    if (data.sim1Providers !== undefined) device.sim1Providers = data.sim1Providers;
    if (data.sim2PhoneNumber !== undefined) device.sim2PhoneNumber = data.sim2PhoneNumber;
    if (data.sim2Providers !== undefined) device.sim2Providers = data.sim2Providers;

    // Automatically parse comma-separated phoneNumber and paymentProvider if sim1/sim2 not explicitly provided
    if ((!device.sim1PhoneNumber || !device.sim2PhoneNumber) && device.phoneNumber) {
      const phones = device.phoneNumber.split(",").map((s) => s.trim()).filter(Boolean);
      const provs = (device.paymentProvider || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (phones.length > 0 && !device.sim1PhoneNumber) {
        device.sim1PhoneNumber = phones[0];
        device.sim1Providers = provs[0] || device.paymentProvider || "BKASH";
      }
      if (phones.length > 1 && !device.sim2PhoneNumber) {
        device.sim2PhoneNumber = phones[1];
        device.sim2Providers = provs[1] || "NAGAD";
      }
    }

    device.status = PaymentDeviceStatus.CONNECTED;
    device.lastSeenAt = new Date();
    await device.save();

    // Auto-sync active device numbers to system settings so Admin & Customer panels update immediately
    await syncDeviceNumbersToSystemSettings(device);

    await auditLogService.log({
      actorType: ActorType.DEVICE,
      actorId: paymentDeviceId,
      action: "PAYMENT_DEVICE_SETUP",
      entityType: "PaymentDevice",
      entityId: device._id,
      metadata: data,
    });

    return { success: true, device };
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

    // Sync device numbers to system settings on heartbeat
    await syncDeviceNumbersToSystemSettings(device);

    // Listener app expects the device document in 'data.device' to keep local state synced
    // Make sure to map _id to id so Flutter can parse it
    return {
      success: true,
      device: {
        ...device.toObject(),
        id: device._id.toString(),
        adminId: device.adminId.toString(),
      }
    };
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
    if (
      device.paymentProvider &&
      device.paymentProvider !== "OTHER" &&
      !device.paymentProvider.split(/[,|]/).includes(parsed.provider)
    ) {
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
        reference: parsed.reference,
        receivedAt: parsed.receivedAt,
        smsFingerprint,
        rawSms: smsContent.trim(),
        verificationStatus: SmsEventVerificationStatus.UNUSED,
      });

      // Automatically attempt matching with any waiting/verifying customer top-up request
      try {
        const { topUpService } = await import("../topups/topup.service");
        await topUpService.autoMatchPendingTopUp(event);
      } catch (matchErr) {
        logger.warn({ matchErr, eventId: event._id }, "Failed to auto-match pending topup on SMS ingestion");
      }

      return { success: true, eventId: event._id.toString() };
    } catch (err: any) {
      if (err.code === 11000) {
        // Duplicate key, SMS already ingested — treat as success (idempotence)
        const existing = await PaymentSmsEventModel.findOne({ smsFingerprint });
        if (existing) {
          try {
            const { topUpService } = await import("../topups/topup.service");
            await topUpService.autoMatchPendingTopUp(existing);
          } catch (_) { }
        }
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
    data: {
      paymentProvider?: string;
      phoneNumber?: string;
      sim1PhoneNumber?: string;
      sim1Providers?: string;
      sim2PhoneNumber?: string;
      sim2Providers?: string;
    }
  ) {
    const device = await PaymentDeviceModel.findOne({ _id: id, adminId: new Types.ObjectId(adminId) });
    if (!device) {
      throw new NotFoundError("PAYMENT_DEVICE_NOT_FOUND", "Device not found");
    }

    if (data.paymentProvider !== undefined) device.paymentProvider = data.paymentProvider as any;
    if (data.phoneNumber !== undefined) device.phoneNumber = data.phoneNumber;
    if (data.sim1PhoneNumber !== undefined) device.sim1PhoneNumber = data.sim1PhoneNumber;
    if (data.sim1Providers !== undefined) device.sim1Providers = data.sim1Providers;
    if (data.sim2PhoneNumber !== undefined) device.sim2PhoneNumber = data.sim2PhoneNumber;
    if (data.sim2Providers !== undefined) device.sim2Providers = data.sim2Providers;

    await device.save();
    await syncDeviceNumbersToSystemSettings(device);

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

  // ── Admin: Delete device ──────────────────────────────
  async adminDeleteDevice(adminId: string, id: string) {
    const device = await PaymentDeviceModel.findOne({ _id: id, adminId: new Types.ObjectId(adminId) });
    if (!device) {
      throw new NotFoundError("PAYMENT_DEVICE_NOT_FOUND", "Device not found");
    }

    await PaymentDeviceModel.findByIdAndDelete(id);

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "PAYMENT_DEVICE_DELETED",
      entityType: "PaymentDevice",
      entityId: device._id,
    });

    return { success: true, message: "Device deleted successfully" };
  },

  // ── Admin: List events for device or all SMS events ─────────────────────
  async adminGetDeviceEvents(
    adminId: string,
    deviceId: string,
    page = 1,
    limit = 50,
    options?: { provider?: string; status?: string; search?: string }
  ) {
    let filter: any = {};
    if (deviceId && deviceId !== "all" && Types.ObjectId.isValid(deviceId)) {
      filter.paymentDeviceId = new Types.ObjectId(deviceId);
    }
    if (options?.provider && options.provider !== "ALL") {
      filter.provider = options.provider.toUpperCase();
    }
    if (options?.status && options.status !== "ALL") {
      filter.verificationStatus = options.status.toUpperCase();
    }
    if (options?.search && options.search.trim().length > 0) {
      const q = options.search.trim();
      filter.$or = [
        { transactionId: { $regex: q, $options: "i" } },
        { sender: { $regex: q, $options: "i" } },
        { receiver: { $regex: q, $options: "i" } },
        { rawSms: { $regex: q, $options: "i" } },
      ];
    }
    const total = await PaymentSmsEventModel.countDocuments(filter);
    const docs = await PaymentSmsEventModel.find(filter)
      .sort({ receivedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const formattedDocs = docs.map((doc) => {
      const obj = doc.toObject();
      return {
        ...obj,
        amountPoisha: obj.amount,
        amount: obj.amount > 0 ? obj.amount / 100 : 0,
      };
    });

    return { total, page, limit, docs: formattedDocs };
  },

  // ── Device: Disconnect ────────────────────────────────
  async deviceDisconnect(paymentDeviceId: string) {
    const device = await PaymentDeviceModel.findById(paymentDeviceId);
    if (!device) {
      throw new NotFoundError("PAYMENT_DEVICE_NOT_FOUND", "Device not found");
    }

    device.status = PaymentDeviceStatus.DISCONNECTED;
    device.lastSeenAt = new Date();
    await device.save();

    await auditLogService.log({
      actorType: ActorType.DEVICE,
      actorId: paymentDeviceId,
      action: "PAYMENT_DEVICE_DISCONNECTED",
      entityType: "PaymentDevice",
      entityId: device._id,
    });

    return { success: true, message: "Device disconnected successfully" };
  },

  // ── Active Payment Methods Listing ────────────────────
  async getActivePaymentMethods() {
    const activeMethods: Array<{
      provider: string;
      paymentNumber: string;
      type?: string;
      instructions?: string;
      simSlot?: number;
      status: string;
    }> = [];

    // 1. Highest priority: Admin configured payment numbers from SystemSettings
    try {
      const { systemSettingsService } = await import("../systemSettings/systemSettings.service");
      const settings = await systemSettingsService.getSettings();
      const pn = settings.paymentNumbers;
      if (pn) {
        if (pn.bkash?.active !== false && pn.bkash?.number) {
          activeMethods.push({
            provider: "BKASH",
            paymentNumber: pn.bkash.number,
            type: pn.bkash.type || "Send Money (Personal)",
            instructions: pn.bkash.instructions || "",
            status: "AVAILABLE",
          });
        }
        if (pn.nagad?.active !== false && pn.nagad?.number) {
          activeMethods.push({
            provider: "NAGAD",
            paymentNumber: pn.nagad.number,
            type: pn.nagad.type || "Send Money (Personal)",
            instructions: pn.nagad.instructions || "",
            status: "AVAILABLE",
          });
        }
        if (pn.rocket?.active !== false && pn.rocket?.number) {
          activeMethods.push({
            provider: "ROCKET",
            paymentNumber: pn.rocket.number,
            type: pn.rocket.type || "Send Money (Personal)",
            instructions: pn.rocket.instructions || "",
            status: "AVAILABLE",
          });
        }
        if (pn.upay?.active !== false && pn.upay?.number) {
          activeMethods.push({
            provider: "UPAY",
            paymentNumber: pn.upay.number,
            type: pn.upay.type || "Send Money (Personal)",
            instructions: pn.upay.instructions || "",
            status: "AVAILABLE",
          });
        }
      }
    } catch (_) { }

    const threshold = Date.now() - env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS * 1000;

    // 2. Check connected devices if any providers still not covered
    const devices = await PaymentDeviceModel.find({
      status: PaymentDeviceStatus.CONNECTED,
    }).sort({ updatedAt: -1 });

    for (const d of devices) {
      // Check if actually offline
      if (d.lastSeenAt.getTime() < threshold) {
        d.status = PaymentDeviceStatus.OFFLINE;
        await d.save();
        continue;
      }

      // Check SIM 1 & SIM 2 mapping
      if (d.sim1PhoneNumber && d.sim1Providers) {
        const provs = d.sim1Providers.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
        for (const prov of provs) {
          activeMethods.push({
            provider: prov,
            paymentNumber: d.sim1PhoneNumber,
            simSlot: 1,
            status: "AVAILABLE",
          });
        }
      }

      if (d.sim2PhoneNumber && d.sim2Providers) {
        const provs = d.sim2Providers.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
        for (const prov of provs) {
          activeMethods.push({
            provider: prov,
            paymentNumber: d.sim2PhoneNumber,
            simSlot: 2,
            status: "AVAILABLE",
          });
        }
      }

      // Legacy single phoneNumber / paymentProvider support
      if (d.phoneNumber && d.paymentProvider && !d.sim1PhoneNumber) {
        const provs = d.paymentProvider.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
        const phones = d.phoneNumber.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
        phones.forEach((phone, idx) => {
          provs.forEach((prov) => {
            activeMethods.push({
              provider: prov,
              paymentNumber: phone,
              simSlot: idx + 1,
              status: "AVAILABLE",
            });
          });
        });
      }
    }

    // 2. Check if any paired devices with numbers exist if activeMethods is still empty
    if (activeMethods.length === 0) {
      const anyDevices = await PaymentDeviceModel.find({
        status: { $in: [PaymentDeviceStatus.CONNECTED, PaymentDeviceStatus.PENDING, PaymentDeviceStatus.OFFLINE] }
      }).sort({ updatedAt: -1 });
      for (const d of anyDevices) {
        if (d.sim1PhoneNumber && d.sim1Providers) {
          const provs = d.sim1Providers.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
          for (const prov of provs) {
            activeMethods.push({
              provider: prov,
              paymentNumber: d.sim1PhoneNumber,
              simSlot: 1,
              status: "AVAILABLE",
            });
          }
        }
        if (d.sim2PhoneNumber && d.sim2Providers) {
          const provs = d.sim2Providers.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
          for (const prov of provs) {
            activeMethods.push({
              provider: prov,
              paymentNumber: d.sim2PhoneNumber,
              simSlot: 2,
              status: "AVAILABLE",
            });
          }
        }
        if (d.phoneNumber && d.paymentProvider && !d.sim1PhoneNumber) {
          const provs = d.paymentProvider.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
          const phones = d.phoneNumber.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
          phones.forEach((phone, idx) => {
            const prov = provs[idx] || d.paymentProvider || "BKASH";
            activeMethods.push({
              provider: prov,
              paymentNumber: phone,
              simSlot: idx + 1,
              status: "AVAILABLE",
            });
          });
        }
      }
    }

    // 3. Supplement or fallback with system configured payment numbers
    try {
      const { systemSettingsService } = await import("../systemSettings/systemSettings.service");
      const settings = await systemSettingsService.getSettings();
      const fallbacks = settings.fallbackPaymentNumbers;
      const existingProviders = new Set(activeMethods.map((m) => m.provider.toUpperCase().trim()));

      if (fallbacks?.bkash && (!existingProviders.has("BKASH") || activeMethods.length === 0)) {
        activeMethods.push({ provider: "BKASH", paymentNumber: fallbacks.bkash, status: "AVAILABLE" });
      }
      if (fallbacks?.nagad && (!existingProviders.has("NAGAD") || activeMethods.length === 0)) {
        activeMethods.push({ provider: "NAGAD", paymentNumber: fallbacks.nagad, status: "AVAILABLE" });
      }
      if (fallbacks?.rocket && (!existingProviders.has("ROCKET") || activeMethods.length === 0)) {
        activeMethods.push({ provider: "ROCKET", paymentNumber: fallbacks.rocket, status: "AVAILABLE" });
      }
      if (fallbacks?.upay && (!existingProviders.has("UPAY") || activeMethods.length === 0)) {
        activeMethods.push({ provider: "UPAY", paymentNumber: fallbacks.upay, status: "AVAILABLE" });
      }
    } catch (_) { }

    // Deduplicate by provider: keep the first (highest priority) non-empty number
    const deduped: typeof activeMethods = [];
    const seen = new Set<string>();
    for (const m of activeMethods) {
      const p = m.provider.toUpperCase().trim();
      if (!seen.has(p) && m.paymentNumber?.trim()) {
        seen.add(p);
        deduped.push({ ...m, provider: p, paymentNumber: m.paymentNumber.trim() });
      }
    }

    return deduped;
  },

  // ── Admin: Get candidate suggestions for an SMS event ──
  async adminGetSmsCandidates(adminId: string, eventId: string) {
    const event = await PaymentSmsEventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError("NOT_FOUND", "SMS event not found");
    }

    const { UserModel } = await import("../users/user.model");
    const { TopUpModel, TopUpStatus } = await import("../topups/topup.model");

    let matchedUser = null;
    if (event.sender) {
      const cleanDigits = event.sender.replace(/[^0-9]/g, "");
      if (cleanDigits.length >= 8) {
        const last8 = cleanDigits.slice(-8);
        matchedUser = await UserModel.findOne({
          phone: { $regex: last8 },
        }).select("_id name phone email");
      }
    }

    const pendingTopUps = await TopUpModel.find({
      status: { $in: [TopUpStatus.PENDING, TopUpStatus.VERIFYING] },
    })
      .populate("userId", "name phone email")
      .sort({ createdAt: -1 })
      .limit(10);

    const formattedPending = pendingTopUps.map((t: any) => {
      const u = t.userId || {};
      return {
        id: t._id.toString(),
        amountPoisha: t.amount,
        amountBdt: t.amount / 100,
        provider: t.paymentProvider,
        customerTransactionId: t.customerTransactionId,
        senderPhone: t.senderPhone,
        userId: u._id?.toString() || t.userId?.toString(),
        userName: u.name || "Customer",
        userPhone: u.phone || "",
        createdAt: t.createdAt,
      };
    });

    return {
      event: {
        id: event._id.toString(),
        provider: event.provider,
        transactionId: event.transactionId,
        amountPoisha: event.amount,
        amountBdt: event.amount > 0 ? event.amount / 100 : 0,
        sender: event.sender,
        verificationStatus: event.verificationStatus,
        receivedAt: event.receivedAt,
        rawSms: event.rawSms,
      },
      matchedUser: matchedUser
        ? {
            id: matchedUser._id.toString(),
            name: matchedUser.name,
            phone: matchedUser.phone,
            email: matchedUser.email,
          }
        : null,
      pendingTopUps: formattedPending,
    };
  },

  // ── Admin: Manually credit customer wallet from SMS log ──
  async adminManualCreditFromSms(
    adminId: string,
    eventId: string,
    data: {
      userId?: string;
      customerId?: string;
      topUpId?: string;
      amountBdt?: number;
      amount?: number;
      reason?: string;
    }
  ) {
    const event = await PaymentSmsEventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError("NOT_FOUND", "SMS log event not found");
    }

    if (event.verificationStatus === SmsEventVerificationStatus.MATCHED) {
      throw new AppError("PAYMENT_TRANSACTION_ALREADY_USED", "This SMS event is already matched or verified", 400);
    }

    const targetUserId = (data.userId || data.customerId)?.toString();
    if (!targetUserId) {
      throw new AppError("VALIDATION_ERROR", "User ID or phone number is required", 400);
    }

    const { UserModel } = await import("../users/user.model");
    let user = null;
    if (mongoose.Types.ObjectId.isValid(targetUserId)) {
      user = await UserModel.findById(targetUserId);
    }
    if (!user) {
      user = await UserModel.findOne({ phone: targetUserId });
    }
    if (!user) {
      user = await UserModel.findOne({ email: targetUserId.toLowerCase() });
    }
    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "Customer not found");
    }

    let creditAmountBdt = data.amountBdt ?? data.amount;
    let creditAmountPoisha: number;
    if (creditAmountBdt !== undefined && creditAmountBdt !== null && !isNaN(Number(creditAmountBdt))) {
      creditAmountPoisha = Math.round(Number(creditAmountBdt) * 100);
      creditAmountBdt = Number(creditAmountBdt);
    } else {
      creditAmountPoisha = event.amount;
      creditAmountBdt = event.amount / 100;
    }

    if (creditAmountPoisha <= 0) {
      throw new AppError("VALIDATION_ERROR", "Valid amount greater than 0 is required", 400);
    }

    const { walletRepository } = await import("../wallets/wallet.repository");
    const { walletTransactionRepository } = await import("../walletTransactions/walletTransaction.repository");
    const { TopUpModel, TopUpStatus } = await import("../topups/topup.model");
    const { auditLogService } = await import("../auditLogs/auditLog.service");
    const { ActorType } = await import("../auditLogs/auditLog.model");
    const { notificationService } = await import("../notifications/notification.service");

    const mongoSession = await mongoose.startSession();
    let finalBalance = 0;
    let matchedTopUp: any = null;

    try {
      await mongoSession.withTransaction(async () => {
        let wallet = await walletRepository.findByUserId(user!._id, mongoSession);
        if (!wallet) {
          wallet = await walletRepository.createForUser(user!._id, mongoSession);
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + creditAmountPoisha;

        const credited = await walletRepository.creditBalance(user!._id, creditAmountPoisha, mongoSession);
        if (!credited) {
          throw new AppError("INTERNAL_ERROR", "Failed to credit customer wallet", 500);
        }

        if (data.topUpId) {
          matchedTopUp = await TopUpModel.findById(data.topUpId).session(mongoSession);
        }
        if (!matchedTopUp) {
          matchedTopUp = await TopUpModel.findOne({
            userId: user!._id,
            status: { $in: [TopUpStatus.PENDING, TopUpStatus.VERIFYING] },
            $or: [
              { customerTransactionId: event.transactionId },
              { amount: creditAmountPoisha },
            ],
          }).session(mongoSession);
        }

        const description = data.reason ||
          `Manual Credit from SMS by Admin (${event.provider} TrxID: ${event.transactionId})`;

        const wTx = await walletTransactionRepository.create(
          {
            userId: user!._id,
            walletId: wallet._id,
            type: "TOP_UP",
            direction: "CREDIT",
            amount: creditAmountPoisha,
            balanceBefore,
            balanceAfter,
            referenceType: matchedTopUp ? "TOP_UP" : "ADMIN_ADJUSTMENT",
            referenceId: matchedTopUp?._id || event._id,
            description,
          },
          mongoSession
        );

        if (matchedTopUp) {
          matchedTopUp.status = TopUpStatus.VERIFIED;
          matchedTopUp.verificationStatus = "VERIFIED";
          matchedTopUp.walletTransactionId = wTx._id;
          matchedTopUp.verifiedAt = new Date();
          await matchedTopUp.save({ session: mongoSession });
        }

        event.verificationStatus = SmsEventVerificationStatus.MATCHED;
        if (matchedTopUp) {
          event.matchedTopUpId = matchedTopUp._id;
        }
        await event.save({ session: mongoSession });

        finalBalance = balanceAfter;
      });
    } finally {
      await mongoSession.endSession();
    }

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "SMS_MANUAL_CREDIT",
      entityType: "PaymentSmsEvent",
      entityId: event._id,
      metadata: {
        userId: user._id,
        amountPoisha: creditAmountPoisha,
        amountBdt: creditAmountBdt,
        transactionId: event.transactionId,
        provider: event.provider,
      },
    });

    await notificationService.send({
      userId: user._id,
      type: "TOPUP_VERIFIED",
      title: "Wallet Credited",
      message: `আপনার ওয়ালেটে ৳${creditAmountBdt.toFixed(2)} টাকা (${event.provider} TrxID: ${event.transactionId}) যোগ করা হয়েছে।`,
      referenceType: "TopUp",
      referenceId: matchedTopUp?._id || event._id,
    });

    try {
      const { emitToUser } = await import("../../config/socket");
      emitToUser(user._id.toString(), "topup_verified", {
        walletBalance: finalBalance / 100,
        amount: creditAmountBdt,
        transactionId: event.transactionId,
        provider: event.provider,
      });
    } catch (_) {}

    return {
      success: true,
      event: {
        id: event._id.toString(),
        transactionId: event.transactionId,
        provider: event.provider,
        amountPoisha: creditAmountPoisha,
        amountBdt: creditAmountBdt,
        verificationStatus: event.verificationStatus,
      },
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
      },
      newBalanceBdt: finalBalance / 100,
      matchedTopUpId: matchedTopUp?._id?.toString(),
    };
  },
};
