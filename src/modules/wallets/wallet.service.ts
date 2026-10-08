import mongoose, { Types } from "mongoose";
import { walletRepository } from "./wallet.repository";
import { walletTransactionRepository } from "../walletTransactions/walletTransaction.repository";
import { userRepository } from "../users/user.repository";
import { NotFoundError, UnauthorizedError, AppError } from "../../shared/errors/app-error";
import { bdtToPoisha, poishaToBdt } from "../../shared/utils/money";
import { auditLogService } from "../auditLogs/auditLog.service";
import { ActorType } from "../auditLogs/auditLog.model";
import { notificationService } from "../notifications/notification.service";

export const walletService = {
  async getWalletByUserId(userId: string) {
    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundError("WALLET_NOT_FOUND", "Wallet not found for user");
    }
    return wallet;
  },

  async getTransactions(userId: string, page = 1, limit = 20) {
    return walletTransactionRepository.findByUserId(userId, page, limit);
  },

  async getTransactionById(userId: string, transactionId: string) {
    const tx = await walletTransactionRepository.findById(transactionId);
    if (!tx) {
      throw new NotFoundError("NOT_FOUND", "Transaction not found");
    }
    if (tx.userId.toString() !== userId) {
      throw new UnauthorizedError("You are not authorized to view this transaction");
    }
    return tx;
  },

  async adminAdjustBalance(data: {
    userId: string;
    amountBdt: number;
    action: "CREDIT" | "DEBIT";
    reason: string;
    adminId: string;
  }) {
    const user = await userRepository.findById(data.userId);
    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "Customer not found");
    }

    const amountPoisha = bdtToPoisha(data.amountBdt);
    if (amountPoisha <= 0) {
      throw new AppError("VALIDATION_ERROR", "Amount must be greater than 0", 400);
    }

    const mongoSession = await mongoose.startSession();
    try {
      let finalBalance = 0;
      await mongoSession.withTransaction(async () => {
        let wallet = await walletRepository.findByUserId(user._id, mongoSession);
        if (!wallet) {
          wallet = await walletRepository.createForUser(user._id, mongoSession);
        }

        const balanceBefore = wallet.balance;

        if (data.action === "DEBIT") {
          if (balanceBefore < amountPoisha) {
            throw new AppError("INSUFFICIENT_BALANCE", "Customer wallet has insufficient balance for deduction", 400);
          }
          const debited = await walletRepository.adminDebitBalance(user._id, amountPoisha, mongoSession);
          if (!debited) {
            throw new AppError("INTERNAL_ERROR", "Failed to deduct wallet balance", 500);
          }
          finalBalance = balanceBefore - amountPoisha;
        } else {
          const credited = await walletRepository.creditBalance(user._id, amountPoisha, mongoSession);
          if (!credited) {
            throw new AppError("INTERNAL_ERROR", "Failed to credit wallet balance", 500);
          }
          finalBalance = balanceBefore + amountPoisha;
        }

        await walletTransactionRepository.create(
          {
            userId: user._id,
            walletId: wallet._id,
            type: "ADJUSTMENT",
            direction: data.action,
            amount: amountPoisha,
            balanceBefore,
            balanceAfter: finalBalance,
            referenceType: "ADMIN_ADJUSTMENT",
            referenceId: new Types.ObjectId(data.adminId),
            description: data.reason || `Admin balance ${data.action.toLowerCase()}`,
          },
          mongoSession
        );
      });

      await auditLogService.log({
        actorType: ActorType.ADMIN,
        actorId: data.adminId,
        action: "ADMIN_WALLET_ADJUSTMENT",
        entityType: "Wallet",
        entityId: user._id,
        metadata: {
          userId: data.userId,
          action: data.action,
          amountBdt: data.amountBdt,
          reason: data.reason,
          balanceAfterBdt: poishaToBdt(finalBalance),
        },
      });

      const actionBn = data.action === "CREDIT" ? "যুক্ত" : "কর্তন";
      await notificationService.send({
        userId: user._id,
        type: "BALANCE_ADJUSTMENT",
        title: `ব্যালেন্স ${actionBn} করা হয়েছে`,
        message: `এডমিন কর্তৃক আপনার অ্যাকাউন্টে ৳${data.amountBdt.toFixed(2)} ${actionBn} করা হয়েছে। বর্তমান ব্যালেন্স: ৳${poishaToBdt(finalBalance).toFixed(2)}। কারণ: ${data.reason || "অ্যাডমিন সমন্বয়"}`,
      });

      return {
        success: true,
        userId: user._id.toString(),
        action: data.action,
        amount: data.amountBdt,
        balance: poishaToBdt(finalBalance),
      };
    } finally {
      await mongoSession.endSession();
    }
  },
};
