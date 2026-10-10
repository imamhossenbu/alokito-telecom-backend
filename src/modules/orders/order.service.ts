import mongoose, { Types } from "mongoose";
import { orderRepository } from "./order.repository";
import { OrderModel, ActivationStatus } from "./order.model";
import { OfferModel } from "../offers/offer.model";
import { DriveOfferModel } from "../driveOffers/driveOffer.model";
import { userRepository } from "../users/user.repository";
import { operatorRepository } from "../operators/operator.repository";
import { walletRepository } from "../wallets/wallet.repository";
import { walletTransactionRepository } from "../walletTransactions/walletTransaction.repository";
import { ORDER_STATE_TRANSITIONS, OrderStatus, OrderStatusType } from "../../shared/enums";
import { AppError, NotFoundError, ConflictError, ForbiddenError } from "../../shared/errors/app-error";
import { poishaToBdt, bdtToPoisha } from "../../shared/utils/money";
import { auditLogService } from "../auditLogs/auditLog.service";
import { ActorType } from "../auditLogs/auditLog.model";
import { notificationService } from "../notifications/notification.service";
import { broadcastToAdmins } from "../../config/socket";
import { logger } from "../../config/logger";

function validateStateTransition(current: OrderStatusType, target: OrderStatusType) {
  const allowed = ORDER_STATE_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new AppError(
      "ORDER_INVALID_STATE",
      `Invalid order status transition from ${current} to ${target}`,
      400
    );
  }
}

export const orderService = {
  // ── Customer: Buy offer using wallet balance ──────────
  async createOrder(
    userId: string,
    offerId: string,
    offerType: "NORMAL" | "DRIVE",
    phone: string,
    pin: string
  ) {
    const mongoSession = await mongoose.startSession();
    try {
      let result;
      await mongoSession.withTransaction(async () => {
        // 0. Verify Customer PIN
        const user = await userRepository.findById(userId, true);
        if (!user) {
          throw new NotFoundError("USER_NOT_FOUND", "User not found");
        }
        if (!pin || pin.trim().length === 0) {
          throw new AppError("VALIDATION_ERROR", "দয়া করে আপনার সিকিউরিটি পিন নম্বর প্রদান করুন।", 400);
        }
        const { verifyPin } = await import("../../shared/utils/pin");
        const isPinCorrect = await verifyPin(user.pinHash, pin.trim());
        if (!isPinCorrect) {
          throw new AppError("AUTH_INVALID_CREDENTIALS", "আপনার সিকিউরিটি পিন সঠিক নয়। সঠিক পিন দিন।", 400);
        }

        // 1. Fetch offer and ensure active
        let offer: any;
        if (offerType === "NORMAL") {
          offer = await OfferModel.findById(offerId).session(mongoSession);
        } else {
          offer = await DriveOfferModel.findById(offerId).session(mongoSession);
        }

        if (!offer) {
          throw new NotFoundError("OFFER_NOT_FOUND", "Offer not found");
        }
        if (offer.status !== "ACTIVE") {
          throw new AppError("OFFER_INACTIVE", "This offer is currently inactive", 400);
        }

        const sellingPrice = offer.sellingPrice; // in poisha

        // 2. Fetch customer wallet
        const wallet = await walletRepository.findByUserId(userId, mongoSession);
        if (!wallet) {
          throw new NotFoundError("WALLET_NOT_FOUND", "Wallet not found for user");
        }
        if (wallet.status !== "ACTIVE") {
          throw new ForbiddenError("Wallet is blocked. Contact support.");
        }

        // 3. Verify sufficient balance
        if (wallet.balance < sellingPrice) {
          const balanceBdt = poishaToBdt(wallet.balance);
          const requiredBdt = poishaToBdt(sellingPrice);
          const shortfallBdt = requiredBdt - balanceBdt;

          throw new AppError(
            "INSUFFICIENT_BALANCE",
            "Insufficient wallet balance.",
            400,
            {
              balance: balanceBdt,
              required: requiredBdt,
              shortfall: shortfallBdt,
            }
          );
        }

        // 4. Debit wallet atomically
        const debited = await walletRepository.debitBalance(
          new Types.ObjectId(userId),
          sellingPrice,
          wallet.version,
          mongoSession
        );
        if (!debited) {
          throw new ConflictError("IDEMPOTENCY_CONFLICT", "Transaction conflict. Please try again.");
        }

        // 5. Create order
        const order = await orderRepository.create(
          {
            userId: new Types.ObjectId(userId),
            userPhone: phone,
            operatorId: offer.operatorId,
            offerId: offer._id,
            offerType,
            offerName: offer.name || offer.offerName,
            offerValue: offer.offerValue,
            validity: offer.validity,
            price: sellingPrice,
            paymentMethod: "WALLET",
            orderSource: "CUSTOMER",
            orderStatus: OrderStatus.ACTIVATION_PENDING,
            activationStatus: ActivationStatus.PENDING,
          },
          mongoSession
        );

        // 6. Create Wallet Transaction log
        const balanceBefore = wallet.balance;
        const balanceAfter = wallet.balance - sellingPrice;
        const wTx = await walletTransactionRepository.create(
          {
            userId: new Types.ObjectId(userId),
            walletId: wallet._id,
            type: "PURCHASE",
            direction: "DEBIT",
            amount: sellingPrice,
            balanceBefore,
            balanceAfter,
            referenceType: "ORDER",
            referenceId: order._id,
            status: "PENDING",
            description: `Purchased offer: ${offer.name || offer.offerName} (${phone})`,
            metadata: {
              recipientPhone: phone,
              offerName: offer.name || offer.offerName,
              orderNumber: order.orderNumber,
            },
          },
          mongoSession
        );

        // Link walletTransactionId to order
        order.walletTransactionId = wTx._id;
        await order.save({ session: mongoSession });

        result = {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          remainingWalletBalance: poishaToBdt(balanceAfter),
        };
      });

      if (!result) {
        throw new AppError("INTERNAL_ERROR", "Order creation failed", 500);
      }

      await auditLogService.log({
        actorType: ActorType.CUSTOMER,
        actorId: userId,
        action: "ORDER_CREATED",
        entityType: "Order",
        entityId: (result as any).orderId,
        metadata: { orderNumber: (result as any).orderNumber },
      });

      // Send notification to customer
      await notificationService.send({
        userId: new Types.ObjectId(userId),
        type: "ORDER_CREATED",
        title: "Order Placed",
        message: `Your order for ${phone} has been received and is pending activation.`,
        referenceType: "Order",
        referenceId: new Types.ObjectId((result as any).orderId),
      });

      // Broadcast real-time order event to all administrators for instant voice/sound alerts
      try {
        broadcastToAdmins("new_order", {
          orderId: (result as any).orderId,
          orderNumber: (result as any).orderNumber,
          offerName: (result as any).offerName,
          phone: phone,
          price: (result as any).price,
          status: "PENDING",
          createdAt: new Date(),
        });
        broadcastToAdmins("new_notification", {
          id: `ord_pend_${(result as any).orderId}`,
          type: "ORDER",
          title: `নতুন অফার অর্ডার: ${(result as any).orderNumber}`,
          message: `${phone} নম্বরে নতুন অফার অর্ডার এসেছে`,
          createdAt: new Date(),
        });
      } catch (err) {
        // Socket broadcast shouldn't fail order transaction
      }

      return result;
    } finally {
      await mongoSession.endSession();
    }
  },

  // ── Admin: Create manual order ────────────────────────
  async adminCreateManualOrder(
    data: {
      userId: string;
      operatorId: string;
      offerId: string;
      offerType: "NORMAL" | "DRIVE";
      phone: string;
    },
    adminId: string
  ) {
    const user = await userRepository.findById(data.userId);
    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "User not found");
    }

    const operator = await operatorRepository.findById(data.operatorId);
    if (!operator) {
      throw new NotFoundError("NOT_FOUND", "Operator not found");
    }

    let offer: any;
    if (data.offerType === "NORMAL") {
      offer = await OfferModel.findById(data.offerId);
    } else {
      offer = await DriveOfferModel.findById(data.offerId);
    }

    if (!offer) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Offer not found");
    }

    // Manual admin orders don't debit user wallet by default.
    const order = await orderRepository.create({
      userId: new Types.ObjectId(data.userId),
      userPhone: data.phone,
      operatorId: new Types.ObjectId(data.operatorId),
      offerId: offer._id,
      offerType: data.offerType,
      offerName: offer.name || offer.offerName,
      offerValue: offer.offerValue,
      validity: offer.validity,
      price: offer.sellingPrice,
      paymentMethod: "MANUAL",
      orderSource: "ADMIN_MANUAL",
      orderStatus: OrderStatus.ACTIVATION_PENDING,
      activationStatus: ActivationStatus.PENDING,
    });

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "ADMIN_ORDER_CREATED",
      entityType: "Order",
      entityId: order._id,
      metadata: { orderNumber: order.orderNumber, isManual: true },
    });

    return order;
  },

  // ── Admin: Process order (ACTIVATION_PENDING -> PROCESSING) ──
  async adminProcessOrder(orderId: string, adminId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError("ORDER_NOT_FOUND", "Order not found");
    }

    validateStateTransition(order.orderStatus, OrderStatus.PROCESSING);

    order.orderStatus = OrderStatus.PROCESSING;
    order.activationStatus = ActivationStatus.PROCESSING;
    order.activationProcessedBy = new Types.ObjectId(adminId);
    order.activationProcessedAt = new Date();
    await order.save();

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "ADMIN_ORDER_PROCESSED",
      entityType: "Order",
      entityId: order._id,
    });

    await notificationService.send({
      userId: order.userId,
      type: "ORDER_PROCESSING",
      title: "Order Processing",
      message: `Your order for ${order.userPhone} is now being processed.`,
      referenceType: "Order",
      referenceId: order._id,
    });

    return order;
  },

  // ── Admin: Complete order (PROCESSING -> COMPLETED) ──
  async adminCompleteOrder(orderId: string, adminId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError("ORDER_NOT_FOUND", "Order not found");
    }

    validateStateTransition(order.orderStatus, OrderStatus.COMPLETED);

    order.orderStatus = OrderStatus.COMPLETED;
    order.activationStatus = ActivationStatus.COMPLETED;
    order.completedAt = new Date();
    await order.save();

    // Mark linked transaction as COMPLETED
    if (order.walletTransactionId) {
      const { WalletTransactionModel } = await import("../walletTransactions/walletTransaction.model");
      await WalletTransactionModel.findByIdAndUpdate(order.walletTransactionId, { status: "COMPLETED" });
    }

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "ADMIN_ORDER_COMPLETED",
      entityType: "Order",
      entityId: order._id,
    });

    await notificationService.send({
      userId: order.userId,
      type: "ORDER_COMPLETED",
      title: "Order Completed",
      message: `Your order for ${order.userPhone} has been completed successfully.`,
      referenceType: "Order",
      referenceId: order._id,
    });

    return order;
  },

  // ── Admin: Fail order (ACTIVATION_PENDING/PROCESSING -> FAILED) ──
  async adminFailOrder(orderId: string, failureReason: string, adminId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError("ORDER_NOT_FOUND", "Order not found");
    }

    validateStateTransition(order.orderStatus, OrderStatus.FAILED);

    order.orderStatus = OrderStatus.FAILED;
    order.activationStatus = ActivationStatus.FAILED;
    order.failureReason = failureReason;
    await order.save();

    // Automatically refund wallet if order was paid by wallet and not yet refunded
    if (order.paymentMethod === "WALLET" && order.price > 0) {
      try {
        const wallet = await walletRepository.findByUserId(order.userId);
        if (wallet) {
          const balanceBefore = wallet.balance;
          const balanceAfter = wallet.balance + order.price;
          await walletRepository.creditBalance(order.userId, order.price);

          const { WalletTransactionModel } = await import("../walletTransactions/walletTransaction.model");
          if (order.walletTransactionId) {
            await WalletTransactionModel.findByIdAndUpdate(order.walletTransactionId, { status: "FAILED" });
          }

          await walletTransactionRepository.create({
            userId: order.userId,
            walletId: wallet._id,
            type: "REFUND",
            direction: "CREDIT",
            amount: order.price,
            balanceBefore,
            balanceAfter,
            referenceType: "ORDER",
            referenceId: order._id,
            status: "REFUNDED",
            description: `Refund for failed order ${order.orderNumber} (${order.offerName})`,
            metadata: {
              orderNumber: order.orderNumber,
              recipientPhone: order.userPhone,
            },
          });
        }
      } catch (err) {
        logger.error({ err, orderId: order._id }, "Failed to auto-refund on failOrder");
      }
    }

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "ADMIN_ORDER_FAILED",
      entityType: "Order",
      entityId: order._id,
      metadata: { failureReason },
    });

    await notificationService.send({
      userId: order.userId,
      type: "ORDER_FAILED",
      title: "Order Failed & Refunded",
      message: `Your order for ${order.userPhone} has failed (${failureReason}). Money has been refunded to your wallet.`,
      referenceType: "Order",
      referenceId: order._id,
    });

    return order;
  },

  // ── Admin: Cancel order (ACTIVATION_PENDING -> CANCELLED) ──
  async adminCancelOrder(orderId: string, adminId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError("ORDER_NOT_FOUND", "Order not found");
    }

    validateStateTransition(order.orderStatus, OrderStatus.CANCELLED);

    order.orderStatus = OrderStatus.CANCELLED;
    order.activationStatus = ActivationStatus.FAILED;
    order.failureReason = "Cancelled by Administrator";
    await order.save();

    // Automatically refund wallet if order was paid by wallet and not yet refunded
    if (order.paymentMethod === "WALLET" && order.price > 0) {
      try {
        const wallet = await walletRepository.findByUserId(order.userId);
        if (wallet) {
          const balanceBefore = wallet.balance;
          const balanceAfter = wallet.balance + order.price;
          await walletRepository.creditBalance(order.userId, order.price);

          const { WalletTransactionModel } = await import("../walletTransactions/walletTransaction.model");
          if (order.walletTransactionId) {
            await WalletTransactionModel.findByIdAndUpdate(order.walletTransactionId, { status: "CANCELLED" });
          }

          await walletTransactionRepository.create({
            userId: order.userId,
            walletId: wallet._id,
            type: "REFUND",
            direction: "CREDIT",
            amount: order.price,
            balanceBefore,
            balanceAfter,
            referenceType: "ORDER",
            referenceId: order._id,
            status: "REFUNDED",
            description: `Refund for cancelled order ${order.orderNumber} (${order.offerName})`,
            metadata: {
              orderNumber: order.orderNumber,
              recipientPhone: order.userPhone,
            },
          });
        }
      } catch (err) {
        logger.error({ err, orderId: order._id }, "Failed to auto-refund on cancelOrder");
      }
    }

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "ADMIN_ORDER_CANCELLED",
      entityType: "Order",
      entityId: order._id,
    });

    await notificationService.send({
      userId: order.userId,
      type: "ORDER_FAILED",
      title: "Order Cancelled & Refunded",
      message: `Your order for ${order.userPhone} was cancelled. ৳${poishaToBdt(order.price).toFixed(2)} has been refunded to your wallet.`,
      referenceType: "Order",
      referenceId: order._id,
    });

    return order;
  },

  // ── Customer: View orders ─────────────────────────────
  async getCustomerOrders(userId: string, page = 1, limit = 20) {
    return orderRepository.findAll({ userId: new Types.ObjectId(userId) }, page, limit);
  },

  async getCustomerOrderById(userId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError("ORDER_NOT_FOUND", "Order not found");
    }
    // Prevent IDOR (spec 122)
    if (order.userId._id.toString() !== userId) {
      throw new AppError("UNAUTHORIZED", "Access denied", 401);
    }
    return order;
  },

  // ── Admin: View orders ────────────────────────────────
  async adminGetOrders(query: Record<string, any>, page = 1, limit = 20) {
    const filter: Record<string, any> = {};
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.status) filter.orderStatus = query.status;
    if (query.orderSource) filter.orderSource = query.orderSource;
    return orderRepository.findAll(filter, page, limit);
  },

  async adminGetOrderById(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError("ORDER_NOT_FOUND", "Order not found");
    }
    return order;
  },

  async adminUpdateOrder(
    orderId: string,
    data: {
      userPhone?: string;
      price?: number;
      orderStatus?: string;
      notes?: string;
      failureReason?: string;
      refundReason?: string;
    },
    adminId: string
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError("ORDER_NOT_FOUND", "Order not found");
    }

    if (data.userPhone) {
      order.userPhone = data.userPhone.trim();
    }
    if (data.price !== undefined) {
      const p = Number(data.price);
      order.price = p < 10000 ? bdtToPoisha(p) : p;
    }
    if (data.notes !== undefined) {
      (order as any).notes = data.notes;
    }
    if (data.failureReason !== undefined) {
      order.failureReason = data.failureReason;
    }
    if (data.refundReason !== undefined) {
      order.refundReason = data.refundReason;
    }
    if (data.orderStatus) {
      const targetStatus = data.orderStatus.toUpperCase();
      if (Object.values(OrderStatus).includes(targetStatus as any)) {
        order.orderStatus = targetStatus as any;
        if (targetStatus === OrderStatus.COMPLETED) {
          order.activationStatus = ActivationStatus.COMPLETED;
          order.completedAt = new Date();
        } else if (targetStatus === OrderStatus.PROCESSING) {
          order.activationStatus = ActivationStatus.PROCESSING;
          order.activationProcessedBy = new Types.ObjectId(adminId);
          order.activationProcessedAt = new Date();
        } else if (targetStatus === OrderStatus.FAILED) {
          order.activationStatus = ActivationStatus.FAILED;
        }
      }
    }

    await order.save();

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: adminId,
      action: "ADMIN_ORDER_UPDATED",
      entityType: "Order",
      entityId: order._id,
      metadata: { orderNumber: order.orderNumber, updates: data },
    });

    return order;
  },
};
