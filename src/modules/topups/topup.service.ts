import mongoose, { Types } from "mongoose";
import { topUpRepository } from "./topup.repository";
import { TopUpModel, TopUpStatus } from "./topup.model";
import { PaymentDeviceModel, PaymentDeviceStatus } from "../paymentDevices/paymentDevice.model";
import { PaymentSmsEventModel, SmsEventVerificationStatus } from "../paymentDevices/smsEvent.model";
import { walletRepository } from "../wallets/wallet.repository";
import { walletTransactionRepository } from "../walletTransactions/walletTransaction.repository";
import { AppError, NotFoundError, ConflictError } from "../../shared/errors/app-error";
import { bdtToPoisha, poishaToBdt } from "../../shared/utils/money";
import { env } from "../../config/env";
import { auditLogService } from "../auditLogs/auditLog.service";
import { ActorType } from "../auditLogs/auditLog.model";
import { notificationService } from "../notifications/notification.service";


export const topUpService = {
  // ── Customer: Create Top-up request ───────────────────
  async createTopUp(userId: string, provider: string, amountBdt: number) {
    // 1. Find active connected payment device for the requested provider
    const threshold = Date.now() - env.DEVICE_HEARTBEAT_TIMEOUT_SECONDS * 1000;
    const device = await PaymentDeviceModel.findOne({
      paymentProvider: provider.toUpperCase(),
      status: PaymentDeviceStatus.CONNECTED,
      phoneNumber: { $exists: true },
      lastSeenAt: { $gt: new Date(threshold) },
    });

    let paymentNumber = device?.phoneNumber;
    if (!paymentNumber) {
      try {
        const { systemSettingsService } = await import("../systemSettings/systemSettings.service");
        const settings = await systemSettingsService.getSettings();
        const fallbacks: any = settings.fallbackPaymentNumbers;
        paymentNumber = fallbacks?.[provider.toLowerCase()] || "01890000001";
      } catch (_) {
        paymentNumber = "01890000001";
      }
    }

    const amount = bdtToPoisha(amountBdt);

    const topUp = await topUpRepository.create({
      userId: new Types.ObjectId(userId),
      paymentProvider: provider.toUpperCase(),
      paymentNumber,
      amount,
      status: TopUpStatus.PENDING,
      verificationStatus: "PENDING",
      submittedAt: new Date(),
    });

    return {
      topUpId: topUp._id.toString(),
      topUpNumber: topUp.topUpNumber,
      provider: topUp.paymentProvider,
      paymentNumber: topUp.paymentNumber,
      amount: poishaToBdt(topUp.amount), // Return BDT to customer
      status: topUp.status,
    };
  },

  // ── Customer: Verify Top-up via transaction ID ────────
  async verifyTopUp(userId: string, topUpId: string, transactionId: string) {
    const topUp = await topUpRepository.findById(topUpId);
    if (!topUp) {
      throw new NotFoundError("TOPUP_NOT_FOUND", "Top-up request not found");
    }

    if (topUp.userId.toString() !== userId) {
      throw new AppError("UNAUTHORIZED", "You do not own this topup request", 401);
    }

    if (topUp.status === TopUpStatus.VERIFIED) {
      throw new AppError("TOPUP_ALREADY_VERIFIED", "This top-up request has already been verified", 400);
    }

    if (topUp.status === TopUpStatus.FAILED || topUp.status === TopUpStatus.EXPIRED) {
      throw new AppError("ORDER_INVALID_STATE", `This top-up request has failed or expired with status ${topUp.status}`, 400);
    }

    if (topUp.expiresAt && topUp.expiresAt < new Date()) {
      topUp.status = TopUpStatus.EXPIRED;
      await topUp.save();
      throw new AppError("AUTH_OTP_EXPIRED", "Verification window has expired", 400);
    }

    const cleanTxId = transactionId.trim().toUpperCase();

    // Prevent reuse of transaction ID
    const alreadyUsed = await topUpRepository.existsByTransactionId(topUp.paymentProvider, cleanTxId);
    if (alreadyUsed) {
      throw new ConflictError("PAYMENT_TRANSACTION_ALREADY_USED", "This transaction ID has already been used");
    }

    // Check if system is in manual verification mode
    try {
      const { systemSettingsService } = await import("../systemSettings/systemSettings.service");
      const isManual = await systemSettingsService.isManualVerification();
      if (isManual) {
        topUp.status = TopUpStatus.VERIFYING;
        topUp.customerTransactionId = cleanTxId;
        await topUp.save();

        return {
          success: true,
          manualReview: true,
          status: "VERIFYING",
          message: "আপনার ট্রানজ্যাকশন আইডি সফলভাবে জমা হয়েছে। এডমিন রিভিউ শেষে দ্রুত ব্যালেন্স যুক্ত হবে।",
        };
      }
    } catch (_) {}

    // Define acceptable receipt time window tolerances
    const toleranceMs = env.PAYMENT_VERIFICATION_TOLERANCE_MINUTES * 60 * 1000;
    const windowMs = env.PAYMENT_VERIFICATION_WINDOW_MINUTES * 60 * 1000;
    const minReceivedAt = new Date(topUp.createdAt.getTime() - toleranceMs);
    const maxReceivedAt = new Date(topUp.createdAt.getTime() + windowMs);

    // Search for matching SMS event evidence
    const matchEvent = await PaymentSmsEventModel.findOne({
      provider: topUp.paymentProvider,
      transactionId: cleanTxId,
      amount: topUp.amount, // Exactly matches poisha
      verificationStatus: SmsEventVerificationStatus.UNUSED,
      receivedAt: { $gte: minReceivedAt, $lte: maxReceivedAt },
    });

    if (!matchEvent) {
      // Mark top-up status as VERIFYING (customer submitted but matching SMS hasn't arrived/matched yet)
      topUp.status = TopUpStatus.VERIFYING;
      topUp.customerTransactionId = cleanTxId;
      await topUp.save();

      throw new NotFoundError(
        "PAYMENT_NOT_FOUND",
        "No matching payment transaction found. Please ensure you sent the correct amount and try again in a few moments."
      );
    }

    // Run atomic credit
    const mongoSession = await mongoose.startSession();
    try {
      let finalBalance = 0;
      await mongoSession.withTransaction(async () => {
        // Double-check topup state under transaction lock
        const lockedTopUp = await TopUpModel.findById(topUp._id).session(mongoSession);
        if (!lockedTopUp || lockedTopUp.status === TopUpStatus.VERIFIED) {
          throw new AppError("TOPUP_ALREADY_VERIFIED", "This top-up request has already been verified", 400);
        }

        // Lock SMS event
        const lockedEvent = await PaymentSmsEventModel.findById(matchEvent._id).session(mongoSession);
        if (!lockedEvent || lockedEvent.verificationStatus !== SmsEventVerificationStatus.UNUSED) {
          throw new ConflictError("PAYMENT_TRANSACTION_ALREADY_USED", "This transaction ID has already been used");
        }

        // Get customer wallet
        const wallet = await walletRepository.findByUserId(userId, mongoSession);
        if (!wallet) {
          throw new NotFoundError("WALLET_NOT_FOUND", "Wallet not found for customer");
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = wallet.balance + topUp.amount;

        // Apply credit
        const credited = await walletRepository.creditBalance(new Types.ObjectId(userId), topUp.amount, mongoSession);
        if (!credited) {
          throw new AppError("INTERNAL_ERROR", "Failed to credit wallet balance", 500);
        }

        // Consume SMS event
        lockedEvent.verificationStatus = SmsEventVerificationStatus.MATCHED;
        lockedEvent.matchedTopUpId = topUp._id;
        await lockedEvent.save({ session: mongoSession });

        // Record immutable transaction
        const wTx = await walletTransactionRepository.create(
          {
            userId: new Types.ObjectId(userId),
            walletId: wallet._id,
            type: "TOP_UP",
            direction: "CREDIT",
            amount: topUp.amount,
            balanceBefore,
            balanceAfter,
            referenceType: "TOP_UP",
            referenceId: topUp._id,
            description: `Wallet top-up via ${topUp.paymentProvider} (TrxID: ${cleanTxId})`,
          },
          mongoSession
        );

        // Update Top-up request details
        lockedTopUp.status = TopUpStatus.VERIFIED;
        lockedTopUp.verificationStatus = "VERIFIED";
        lockedTopUp.customerTransactionId = cleanTxId;
        lockedTopUp.paymentDeviceId = matchEvent.paymentDeviceId;
        lockedTopUp.paymentSmsEventId = matchEvent._id;
        lockedTopUp.walletTransactionId = wTx._id;
        lockedTopUp.verifiedAt = new Date();
        await lockedTopUp.save({ session: mongoSession });

        finalBalance = balanceAfter;
      });

      await auditLogService.log({
        actorType: ActorType.CUSTOMER,
        actorId: userId,
        action: "TOPUP_VERIFIED",
        entityType: "TopUp",
        entityId: topUp._id,
        metadata: { amount: topUp.amount, transactionId: cleanTxId },
      });

      // Send verification notification
      await notificationService.send({
        userId: new Types.ObjectId(userId),
        type: "TOPUP_VERIFIED",
        title: "Top-up Successful",
        message: `Your top-up of ৳${poishaToBdt(topUp.amount).toFixed(2)} via ${topUp.paymentProvider} has been verified successfully.`,
        referenceType: "TopUp",
        referenceId: topUp._id,
      });

      return {
        success: true,
        walletBalance: poishaToBdt(finalBalance),
      };
    } finally {
      await mongoSession.endSession();
    }
  },

  async getTopUps(userId: string, page = 1, limit = 20) {
    return topUpRepository.findAll(userId, page, limit);
  },

  async getTopUpById(userId: string, id: string) {
    const topUp = await topUpRepository.findById(id);
    if (!topUp) {
      throw new NotFoundError("TOPUP_NOT_FOUND", "Top-up not found");
    }
    if (topUp.userId.toString() !== userId) {
      throw new AppError("UNAUTHORIZED", "You do not own this topup", 401);
    }
    return topUp;
  },

  // ── Admin Top-Up Manual Approval Methods ──
  async adminGetPendingTopUps(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const filter = { status: { $in: [TopUpStatus.VERIFYING, TopUpStatus.PENDING] } };
    const [docs, total] = await Promise.all([
      TopUpModel.find(filter)
        .populate("userId", "name phone email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TopUpModel.countDocuments(filter),
    ]);
    return { docs, total, page, limit };
  },

  async adminApproveTopUp(adminId: string, topUpId: string, adminNote?: string) {
    const topUp = await TopUpModel.findById(topUpId);
    if (!topUp) {
      throw new NotFoundError("TOPUP_NOT_FOUND", "Top-up request not found");
    }
    if (topUp.status === TopUpStatus.VERIFIED) {
      throw new AppError("TOPUP_ALREADY_VERIFIED", "This top-up has already been verified", 400);
    }

    const mongoSession = await mongoose.startSession();
    try {
      let finalBalance = 0;
      await mongoSession.withTransaction(async () => {
        const wallet = await walletRepository.findByUserId(topUp.userId.toString(), mongoSession);
        if (!wallet) {
          throw new NotFoundError("WALLET_NOT_FOUND", "Customer wallet not found");
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + topUp.amount;

        const credited = await walletRepository.creditBalance(topUp.userId, topUp.amount, mongoSession);
        if (!credited) {
          throw new AppError("INTERNAL_ERROR", "Failed to credit balance", 500);
        }

        const wTx = await walletTransactionRepository.create(
          {
            userId: topUp.userId,
            walletId: wallet._id,
            type: "TOP_UP",
            direction: "CREDIT",
            amount: topUp.amount,
            balanceBefore,
            balanceAfter,
            referenceType: "TOP_UP",
            referenceId: topUp._id,
            description: `Manual Top-Up approved by Admin (${adminNote || "Verified"})`,
          },
          mongoSession
        );

        topUp.status = TopUpStatus.VERIFIED;
        topUp.verificationStatus = "VERIFIED";
        topUp.walletTransactionId = wTx._id;
        topUp.verifiedAt = new Date();
        await topUp.save({ session: mongoSession });

        finalBalance = balanceAfter;
      });

      await auditLogService.log({
        actorType: ActorType.ADMIN,
        actorId: adminId,
        action: "TOPUP_MANUAL_APPROVED",
        entityType: "TopUp",
        entityId: topUp._id,
        metadata: { amount: topUp.amount, adminNote },
      });

      await notificationService.send({
        userId: topUp.userId,
        type: "TOPUP_VERIFIED",
        title: "Top-up Approved",
        message: `আপনার ৳${poishaToBdt(topUp.amount).toFixed(2)} টাকা ব্যালেন্স রিচার্জ অ্যাডমিন দ্বারা অনুমোদিত হয়েছে।`,
        referenceType: "TopUp",
        referenceId: topUp._id,
      });

      return {
        success: true,
        walletBalance: poishaToBdt(finalBalance),
        topUp,
      };
    } finally {
      await mongoSession.endSession();
    }
  },

  async adminRejectTopUp(adminId: string, topUpId: string, reason: string) {
    const topUp = await TopUpModel.findById(topUpId);
    if (!topUp) {
      throw new NotFoundError("TOPUP_NOT_FOUND", "Top-up request not found");
    }

    topUp.status = TopUpStatus.FAILED;
    topUp.verificationStatus = "FAILED";
    await topUp.save();

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "TOPUP_MANUAL_REJECTED",
      entityType: "TopUp",
      entityId: topUp._id,
      metadata: { reason },
    });

    await notificationService.send({
      userId: topUp.userId,
      type: "TOPUP_FAILED",
      title: "Top-up Rejected",
      message: `আপনার ৳${poishaToBdt(topUp.amount).toFixed(2)} টাকা রিচার্জ বাতিল করা হয়েছে। কারণ: ${reason}`,
      referenceType: "TopUp",
      referenceId: topUp._id,
    });

    return { success: true, topUp };
  },
};
