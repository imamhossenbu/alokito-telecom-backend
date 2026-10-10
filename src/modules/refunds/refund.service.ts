import mongoose, { Types } from "mongoose";
import { refundRepository } from "./refund.repository";
import { RefundStatus } from "./refund.model";
import { OrderModel } from "../orders/order.model";
import { OrderStatus } from "../../shared/enums";
import { walletRepository } from "../wallets/wallet.repository";
import { walletTransactionRepository } from "../walletTransactions/walletTransaction.repository";
import { AppError, NotFoundError, ConflictError } from "../../shared/errors/app-error";
import { poishaToBdt } from "../../shared/utils/money";
import { auditLogService } from "../auditLogs/auditLog.service";
import { ActorType } from "../auditLogs/auditLog.model";
import { notificationService } from "../notifications/notification.service";

export const refundService = {
  // ── Admin: Process order refund ──────────────────────
  async adminRefundOrder(orderId: string, reason: string, adminId: string) {
    const isObjectId = Types.ObjectId.isValid(orderId);
    const order = await OrderModel.findOne({
      $or: [
        ...(isObjectId ? [{ _id: new Types.ObjectId(orderId) }] : []),
        { orderNumber: orderId.toString() },
      ],
    });
    if (!order) {
      throw new NotFoundError("ORDER_NOT_FOUND", "Order not found");
    }

    // Check if refund already exists (idempotency - spec 115, 126)
    const existing = await refundRepository.findByOrderId(order._id);
    if (existing) {
      if (existing.status === RefundStatus.REFUNDED) {
        return existing; // Idempotent return of completed refund
      }
      throw new ConflictError("REFUND_ALREADY_EXISTS", "A refund is already pending or processed for this order");
    }

    // Check eligibility: Order must not already be refunded
    if (order.orderStatus === OrderStatus.REFUNDED) {
      throw new AppError(
        "REFUND_NOT_ALLOWED",
        `Order is already refunded`,
        400
      );
    }

    const mongoSession = await mongoose.startSession();
    try {
      let refund;
      await mongoSession.withTransaction(async () => {
        // Fetch and lock wallet
        const wallet = await walletRepository.findByUserId(order.userId, mongoSession);
        if (!wallet) {
          throw new NotFoundError("WALLET_NOT_FOUND", "Wallet not found for customer");
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = wallet.balance + order.price;

        // Credit wallet
        const credited = await walletRepository.creditBalance(order.userId, order.price, mongoSession);
        if (!credited) {
          throw new AppError("INTERNAL_ERROR", "Failed to credit wallet balance", 500);
        }

        // Create refund log
        refund = await refundRepository.create(
          {
            orderId: order._id,
            userId: order.userId,
            walletId: wallet._id,
            amount: order.price,
            reason,
            status: RefundStatus.REFUNDED,
            createdBy: new Types.ObjectId(adminId),
            refundedAt: new Date(),
          },
          mongoSession
        );

        // Record wallet credit transaction
        const wTx = await walletTransactionRepository.create(
          {
            userId: order.userId,
            walletId: wallet._id,
            type: "REFUND",
            direction: "CREDIT",
            amount: order.price,
            balanceBefore,
            balanceAfter,
            referenceType: "REFUND",
            referenceId: refund._id,
            status: "REFUNDED",
            description: `Refund for failed order ${order.orderNumber}`,
          },
          mongoSession
        );

        refund.walletTransactionId = wTx._id;
        await refund.save({ session: mongoSession });

        // Update original purchase transaction status to REFUNDED
        if (order.walletTransactionId) {
          const { WalletTransactionModel } = await import("../walletTransactions/walletTransaction.model");
          await WalletTransactionModel.findByIdAndUpdate(
            order.walletTransactionId,
            { status: "REFUNDED" },
            { session: mongoSession }
          );
        }

        // Mark order as REFUNDED
        order.orderStatus = OrderStatus.REFUNDED;
        order.refundReason = reason;
        await order.save({ session: mongoSession });
      });

      if (!refund) {
        throw new AppError("INTERNAL_ERROR", "Refund creation failed", 500);
      }

      await auditLogService.log({
        actorType: ActorType.ADMIN,
        actorId: adminId,
        action: "ADMIN_REFUND_CREATED",
        entityType: "Refund",
        entityId: (refund as any)._id,
        metadata: { orderNumber: order.orderNumber, amount: order.price },
      });

      await notificationService.send({
        userId: order.userId,
        type: "REFUND_COMPLETED",
        title: "Refund Processed",
        message: `A refund of ৳${poishaToBdt(order.price).toFixed(2)} has been credited to your wallet for order ${order.orderNumber}.`,
        referenceType: "Refund",
        referenceId: (refund as any)._id,
      });

      return refund;
    } finally {
      await mongoSession.endSession();
    }
  },

  // ── Customer: Get refunds ─────────────────────────────
  async getCustomerRefunds(userId: string, page = 1, limit = 20) {
    return refundRepository.findAll({ userId: new Types.ObjectId(userId) }, page, limit);
  },

  async getCustomerRefundById(userId: string, id: string) {
    const refund = await refundRepository.findById(id);
    if (!refund) {
      throw new NotFoundError("NOT_FOUND", "Refund not found");
    }
    if (refund.userId.toString() !== userId) {
      throw new AppError("UNAUTHORIZED", "Access denied", 401);
    }
    return refund;
  },

  // ── Admin: Get refunds ────────────────────────────────
  async adminGetRefunds(query: Record<string, any>, page = 1, limit = 20) {
    const filter: Record<string, any> = {};
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.status) filter.status = query.status;
    return refundRepository.findAll(filter, page, limit);
  },

  async adminGetRefundById(id: string) {
    const refund = await refundRepository.findById(id);
    if (!refund) {
      throw new NotFoundError("NOT_FOUND", "Refund not found");
    }
    return refund;
  },
};
