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
import { logger } from "../../config/logger";

export const topUpService = {
  // ── Customer: Create Top-up request ───────────────────
  async createTopUp(
    userId: string,
    provider: string,
    amountBdt: number,
    transactionId?: string,
    senderPhone?: string
  ) {
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

    // If transactionId is supplied, handle atomic verification & prevent duplicates:
    if (transactionId && transactionId.trim().length > 0) {
      const cleanTxId = transactionId.trim().toUpperCase();

      // Check if this user already verified this exact transaction ID
      const myVerified = await TopUpModel.findOne({
        userId: new Types.ObjectId(userId),
        customerTransactionId: cleanTxId,
        status: TopUpStatus.VERIFIED,
      });
      if (myVerified) {
        let wallet = await walletRepository.findByUserId(userId);
        return {
          topUpId: myVerified._id.toString(),
          topUpNumber: myVerified.topUpNumber,
          provider: myVerified.paymentProvider,
          paymentNumber: myVerified.paymentNumber,
          senderPhone: myVerified.senderPhone,
          transactionId: myVerified.customerTransactionId,
          amount: poishaToBdt(myVerified.amount),
          status: TopUpStatus.VERIFIED,
          verificationStatus: "VERIFIED",
          isImmediatelyVerified: true,
          createdAt: myVerified.createdAt,
          walletBalance: wallet ? poishaToBdt(wallet.balance) : 0,
          message: "এই Transaction ID টি ইতিমধ্যে সফলভাবে আপনার অ্যাকাউন্টে যুক্ত হয়েছে!",
        };
      }

      // Check if already successfully verified anywhere else
      const alreadyUsed = await topUpRepository.existsByTransactionId(provider.toUpperCase(), cleanTxId);
      if (alreadyUsed) {
        throw new ConflictError(
          "PAYMENT_TRANSACTION_ALREADY_USED",
          "এই Transaction ID টি ইতিমধ্যে ব্যবহার করা হয়েছে"
        );
      }

      // Check if there is an active/pending request with the same TrxID (prevent double submission)
      const existingActive = await TopUpModel.findOne({
        paymentProvider: provider.toUpperCase(),
        customerTransactionId: cleanTxId,
        status: { $in: [TopUpStatus.PENDING, TopUpStatus.VERIFYING] },
      });
      if (existingActive) {
        // If this user already submitted it and it's verifying, inform them kindly
        throw new ConflictError(
          "IDEMPOTENCY_CONFLICT",
          "এই Transaction ID দিয়ে ইতিমধ্যে একটি রিকোয়েস্ট জমা দেওয়া হয়েছে। দয়া করে কিছুক্ষণ অপেক্ষা করুন।"
        );
      }

      // Check manual verification mode
      let isManual = false;
      try {
        const { systemSettingsService } = await import("../systemSettings/systemSettings.service");
        isManual = await systemSettingsService.isManualVerification();
      } catch (_) {}

      // Create TopUp document with TrxID and senderPhone already attached
      const topUp = await topUpRepository.create({
        userId: new Types.ObjectId(userId),
        paymentProvider: provider.toUpperCase(),
        paymentNumber,
        senderPhone: senderPhone?.trim() || undefined,
        amount,
        customerTransactionId: cleanTxId,
        status: TopUpStatus.VERIFYING,
        verificationStatus: "PENDING",
        submittedAt: new Date(),
      });

      if (!isManual) {
        // Look for matching SMS event received in last 72 hours
        const windowMs = 72 * 60 * 60 * 1000;
        const minReceivedAt = new Date(Date.now() - windowMs);
        const matchEvent = await PaymentSmsEventModel.findOne({
          provider: provider.toUpperCase(),
          transactionId: cleanTxId,
          amount,
          verificationStatus: SmsEventVerificationStatus.UNUSED,
          receivedAt: { $gte: minReceivedAt },
        });

        if (matchEvent) {
          const creditRes = await this.executeAtomicTopUpCredit(topUp, matchEvent);
          return {
            topUpId: topUp._id.toString(),
            topUpNumber: topUp.topUpNumber,
            provider: topUp.paymentProvider,
            paymentNumber: topUp.paymentNumber,
            senderPhone: topUp.senderPhone,
            transactionId: topUp.customerTransactionId,
            amount: poishaToBdt(topUp.amount),
            status: TopUpStatus.VERIFIED,
            verificationStatus: "VERIFIED",
            isImmediatelyVerified: true,
            createdAt: topUp.createdAt,
            walletBalance: creditRes.walletBalance,
            message: "ব্যালেন্স সফলভাবে যোগ হয়েছে!",
          };
        }
      }

      return {
        topUpId: topUp._id.toString(),
        topUpNumber: topUp.topUpNumber,
        provider: topUp.paymentProvider,
        paymentNumber: topUp.paymentNumber,
        senderPhone: topUp.senderPhone,
        transactionId: topUp.customerTransactionId,
        amount: poishaToBdt(topUp.amount),
        status: TopUpStatus.VERIFYING,
        verificationStatus: "PENDING",
        isImmediatelyVerified: false,
        createdAt: topUp.createdAt,
        message: "আপনার ট্রানজ্যাকশন আইডি জমা হয়েছে। স্বয়ংক্রিয়ভাবে ভেরিফাই হচ্ছে।",
      };
    }

    // Fallback: If no transactionId supplied
    const topUp = await topUpRepository.create({
      userId: new Types.ObjectId(userId),
      paymentProvider: provider.toUpperCase(),
      paymentNumber,
      senderPhone: senderPhone?.trim() || undefined,
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
      senderPhone: topUp.senderPhone,
      amount: poishaToBdt(topUp.amount),
      status: topUp.status,
      isImmediatelyVerified: false,
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

    // In Bangladesh, TrxID is unique per provider.
    // Check for UNUSED SMS event within a generous 72-hour window.
    const windowMs = 72 * 60 * 60 * 1000;
    const minReceivedAt = new Date(Date.now() - windowMs);

    const matchEvent = await PaymentSmsEventModel.findOne({
      provider: topUp.paymentProvider,
      transactionId: cleanTxId,
      amount: topUp.amount, // Exactly matches poisha
      verificationStatus: SmsEventVerificationStatus.UNUSED,
      receivedAt: { $gte: minReceivedAt },
    });

    if (!matchEvent) {
      // Mark top-up status as VERIFYING (customer submitted, waiting for SMS listener)
      topUp.status = TopUpStatus.VERIFYING;
      topUp.customerTransactionId = cleanTxId;
      await topUp.save();

      return {
        success: true,
        status: "VERIFYING",
        message: "আপনার ট্রানজ্যাকশন আইডি জমা হয়েছে। এসএমএস আসার সাথে সাথে স্বয়ংক্রিয়ভাবে ব্যালেন্স যোগ হয়ে যাবে।",
      };
    }

    return await this.executeAtomicTopUpCredit(topUp, matchEvent);
  },

  // ── Core atomic credit execution ──────────────────────
  async executeAtomicTopUpCredit(topUp: any, matchEvent: any) {
    const userId = topUp.userId.toString();
    const cleanTxId = (topUp.customerTransactionId || matchEvent.transactionId).trim().toUpperCase();

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
        let wallet = await walletRepository.findByUserId(userId, mongoSession);
        if (!wallet) {
          wallet = await walletRepository.createForUser(new Types.ObjectId(userId), mongoSession);
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

      // Emit live socket event for real-time customer app synchronization
      try {
        const { emitToUser } = await import("../../config/socket");
        emitToUser(userId, "topup_verified", {
          topUpId: topUp._id.toString(),
          walletBalance: poishaToBdt(finalBalance),
          amount: poishaToBdt(topUp.amount),
          transactionId: cleanTxId,
        });
      } catch (_) {}

      // Send Telegram Bot notification if configured
      let customerPhone: string | undefined;
      try {
        const { systemSettingsService } = await import("../systemSettings/systemSettings.service");
        const { UserModel } = await import("../users/user.model");
        const customer = await UserModel.findById(userId).select("phone");
        customerPhone = customer?.phone;

        const settings = await systemSettingsService.getSettings();
        const botToken =
          settings.smsIntegration?.telegramBotToken ||
          process.env.TELEGRAM_BOT_TOKEN ||
          "8974788916:AAEvyNJ3JOO0PPHI9UwPwXNp01T4HJ6XxdA";
        const chatId = settings.smsIntegration?.telegramChatId;

        if (settings.smsIntegration?.isTelegramEnabled !== false && botToken && chatId) {
          const bdTime = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Dhaka",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).format(new Date());

          const provider = topUp.paymentProvider || matchEvent?.provider || "MFS";
          const receiverNum =
            topUp.paymentNumber ||
            matchEvent?.receiver ||
            (settings.paymentNumbers as any)?.[provider.toLowerCase()]?.number ||
            (settings.fallbackPaymentNumbers as any)?.[provider.toLowerCase()] ||
            "সিস্টেম নম্বর";

          const msg =
            `🎉 *পেমেন্ট সফলভাবে ভেরিফাইড হয়েছে!*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *মাধ্যম:* ${provider}\n` +
            `🆔 *TrxID:* \`${cleanTxId}\`\n` +
            `💵 *পরিমাণ:* ৳${poishaToBdt(topUp.amount).toFixed(2)}\n` +
            `📱 *প্রেরক নম্বর:* ${matchEvent?.sender || topUp.senderPhone || "অনুল্লেখিত"}\n` +
            `📥 *প্রাপক নম্বর:* ${receiverNum}\n` +
            `👤 *কাস্টমার মোবাইল:* ${customerPhone || "কাস্টমার"}\n` +
            `🕒 *ভেরিফাই সময়:* ${bdTime}\n` +
            `📊 *স্ট্যাটাস:* 🟢 ভেরিফাইড (VERIFIED)\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✅ কাস্টমার অ্যাকাউন্টে টাকা ক্রেডিট সম্পন্ন হয়েছে!`;

          const { smsWebhookService } = await import("../smsWebhook/smsWebhook.service");
          await smsWebhookService.sendTelegramRawMessage(botToken, chatId, msg);
        }
      } catch (_) {}

      return {
        success: true,
        status: "VERIFIED",
        walletBalance: poishaToBdt(finalBalance),
        customerPhone,
      };
    } finally {
      await mongoSession.endSession();
    }
  },

  // ── Auto-match newly ingested SMS with waiting top-up ──
  async autoMatchPendingTopUp(smsEvent: any) {
    try {
      const cleanTxId = smsEvent.transactionId.trim().toUpperCase();
      // Look for any PENDING or VERIFYING top-up with matching provider and transactionId
      const pendingTopUp = await TopUpModel.findOne({
        paymentProvider: smsEvent.provider,
        customerTransactionId: cleanTxId,
        status: { $in: [TopUpStatus.PENDING, TopUpStatus.VERIFYING] },
      });

      if (!pendingTopUp) {
        return null;
      }

      logger.info(
        { topUpId: pendingTopUp._id, smsEventId: smsEvent._id, txId: cleanTxId },
        "Auto-matching pending top-up with newly ingested SMS"
      );

      return await this.executeAtomicTopUpCredit(pendingTopUp, smsEvent);
    } catch (err) {
      logger.error({ err, smsEventId: smsEvent._id }, "Error during auto-match of pending top-up");
      return null;
    }
  },

  async getTopUps(userId: string, page = 1, limit = 50) {
    const res = await topUpRepository.findAll(userId, page, limit);
    const docs = res.docs
      // Filter out any abandoned legacy records without customerTransactionId
      .filter((doc: any) => {
        const tx = doc.customerTransactionId;
        return tx && typeof tx === "string" && tx.trim().length > 0;
      })
      .map((doc: any) => {
        const obj = doc.toObject ? doc.toObject() : doc;
        const txId = (obj.customerTransactionId || "").trim();
        return {
          ...obj,
          id: obj._id?.toString() ?? obj.id,
          topUpNumber: obj.topUpNumber || "",
          amountBdt: poishaToBdt(obj.amount),
          customerTransactionId: txId,
          transactionId: txId,
          paymentNumber: obj.paymentNumber || "",
          senderPhone: obj.senderPhone || "",
        };
      });
    return { ...res, docs };
  },

  async getTopUpById(userId: string, id: string) {
    const topUp = await topUpRepository.findById(id);
    if (!topUp) {
      throw new NotFoundError("TOPUP_NOT_FOUND", "Top-up not found");
    }
    if (topUp.userId.toString() !== userId) {
      throw new AppError("UNAUTHORIZED", "You do not own this topup", 401);
    }
    const obj = (topUp as any).toObject ? (topUp as any).toObject() : topUp;
    return {
      ...obj,
      id: obj._id?.toString() ?? obj.id,
      amountBdt: poishaToBdt(obj.amount),
    };
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
    const formattedDocs = docs.map((doc: any) => {
      const obj = doc.toObject ? doc.toObject() : doc;
      return {
        ...obj,
        id: obj._id?.toString() ?? obj.id,
        amountBdt: poishaToBdt(obj.amount),
      };
    });
    return { docs: formattedDocs, total, page, limit };
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
