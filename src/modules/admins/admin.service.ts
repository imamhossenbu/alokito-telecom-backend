import argon2 from "argon2";
import { adminRepository } from "./admin.repository";
import { AdminStatus } from "./admin.model";
import { UserModel } from "../users/user.model";
import { TopUpModel } from "../topups/topup.model";
import { OrderModel } from "../orders/order.model";
import { RefundModel } from "../refunds/refund.model";
import { PaymentDeviceModel } from "../paymentDevices/paymentDevice.model";
import { WalletTransactionModel } from "../walletTransactions/walletTransaction.model";
import { AppError, ForbiddenError } from "../../shared/errors/app-error";
import { normalizeEmail } from "../../shared/utils/normalize";
import { signAccessToken } from "../../shared/utils/jwt";
import { poishaToBdt } from "../../shared/utils/money";
import type { AdminLoginBody } from "../auth/auth.schema";

export const adminAuthService = {
  async login(body: AdminLoginBody) {
    const emailNormalized = normalizeEmail(body.email);
    const admin = await adminRepository.findByEmailNormalized(
      emailNormalized,
      true,
    );

    if (!admin) {
      throw new AppError(
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email or password",
        401,
      );
    }
    if (admin.status === AdminStatus.BLOCKED) {
      throw new ForbiddenError("This admin account has been blocked");
    }

    const valid = await argon2.verify(admin.passwordHash, body.password);
    if (!valid) {
      throw new AppError(
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email or password",
        401,
      );
    }

    await adminRepository.updateLastLogin(admin._id.toString());

    const accessToken = signAccessToken({
      sub: admin._id.toString(),
      type: "ADMIN",
    });

    return {
      accessToken,
      admin: { id: admin._id.toString(), name: admin.name, email: admin.email },
    };
  },
};

export const adminDashboardService = {
  async getDashboardData() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      newUsersToday,
      pendingTopUps,
      pendingOrders,
      processingOrders,
      completedOrdersToday,
      refundsPending,
      connectedPaymentDevices,
      offlinePaymentDevices,
    ] = await Promise.all([
      UserModel.countDocuments({ accountStatus: { $ne: "DELETED" } }),
      UserModel.countDocuments({ accountStatus: "ACTIVE" }),
      UserModel.countDocuments({ accountStatus: "BLOCKED" }),
      UserModel.countDocuments({ createdAt: { $gte: startOfToday }, accountStatus: { $ne: "DELETED" } }),
      TopUpModel.countDocuments({ status: "PENDING" }),
      OrderModel.countDocuments({ orderStatus: "ACTIVATION_PENDING" }),
      OrderModel.countDocuments({ orderStatus: "PROCESSING" }),
      OrderModel.countDocuments({ orderStatus: "COMPLETED", completedAt: { $gte: startOfToday } }),
      RefundModel.countDocuments({ status: "PENDING" }),
      PaymentDeviceModel.countDocuments({ status: "CONNECTED" }),
      PaymentDeviceModel.countDocuments({ status: "OFFLINE" }),
    ]);

    // Aggregate volumes
    const topUpAgg = await WalletTransactionModel.aggregate([
      { $match: { type: "TOP_UP", direction: "CREDIT" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const purchaseAgg = await WalletTransactionModel.aggregate([
      { $match: { type: "PURCHASE", direction: "DEBIT" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const walletTopupVolume = topUpAgg.length > 0 ? poishaToBdt(topUpAgg[0].total) : 0;
    const purchaseVolume = purchaseAgg.length > 0 ? poishaToBdt(purchaseAgg[0].total) : 0;

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      newUsersToday,
      pendingTopUps,
      pendingOrders,
      processingOrders,
      completedOrdersToday,
      refundsPending,
      connectedPaymentDevices,
      offlinePaymentDevices,
      walletTopupVolume,
      purchaseVolume,
    };
  },
};
