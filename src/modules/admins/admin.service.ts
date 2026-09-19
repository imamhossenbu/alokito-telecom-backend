import argon2 from "argon2";
import { adminRepository } from "./admin.repository";
import { AdminModel, AdminStatus } from "./admin.model";
import { UserModel } from "../users/user.model";
import { TopUpModel } from "../topups/topup.model";
import { OrderModel } from "../orders/order.model";
import { RefundModel } from "../refunds/refund.model";
import { PaymentDeviceModel } from "../paymentDevices/paymentDevice.model";
import { WalletModel } from "../wallets/wallet.model";
import { WalletTransactionModel } from "../walletTransactions/walletTransaction.model";
import { AppError, ForbiddenError } from "../../shared/errors/app-error";
import { normalizeEmail } from "../../shared/utils/normalize";
import { signAccessToken } from "../../shared/utils/jwt";
import { poishaToBdt } from "../../shared/utils/money";
import { storageProvider } from "../../integrations/storage/cloudinary.provider";
import { env } from "../../config/env";
import type { AdminLoginBody } from "../auth/auth.schema";

export const adminAuthService = {
  async seedDefaultAdmin() {
    const defaultAdmins = [
      { name: "Super Admin", email: "admin@telecom.com", password: "admin123" },
      { name: "Drive Offer Admin", email: "admin@driveoffer.com", password: "admin1234" },
    ];

    for (const item of defaultAdmins) {
      const emailNorm = normalizeEmail(item.email);
      const exists = await adminRepository.findByEmailNormalized(emailNorm, true);
      const hash = await argon2.hash(item.password);
      if (!exists) {
        await adminRepository.create({
          name: item.name,
          email: item.email,
          emailNormalized: emailNorm,
          passwordHash: hash,
          role: "ADMIN",
          status: AdminStatus.ACTIVE,
        });
      } else {
        await AdminModel.updateOne(
          { _id: exists._id },
          { $set: { passwordHash: hash, status: AdminStatus.ACTIVE } },
        );
      }
    }
  },

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

export const adminWalletService = {
  async getWalletSummary() {
    const [walletsAgg, topUpAgg, purchaseAgg, refundAgg] = await Promise.all([
      WalletModel.aggregate([
        { $match: { status: "ACTIVE" } },
        { $group: { _id: null, totalBalance: { $sum: "$balance" } } },
      ]),
      WalletTransactionModel.aggregate([
        { $match: { type: "TOP_UP", direction: "CREDIT" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      WalletTransactionModel.aggregate([
        { $match: { type: "PURCHASE", direction: "DEBIT" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      WalletTransactionModel.aggregate([
        { $match: { type: "REFUND", direction: "CREDIT" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const currentBalance = walletsAgg.length > 0 ? poishaToBdt(walletsAgg[0].totalBalance) : 0;
    const totalAdded = topUpAgg.length > 0 ? poishaToBdt(topUpAgg[0].total) : 0;
    const totalSpent = purchaseAgg.length > 0 ? poishaToBdt(purchaseAgg[0].total) : 0;
    const totalRefund = refundAgg.length > 0 ? poishaToBdt(refundAgg[0].total) : 0;
    const netSales = Math.max(0, totalSpent - totalRefund);

    return {
      totalSales: totalSpent,
      totalDeposits: totalAdded,
      customerWalletBalance: currentBalance,
      totalRefunds: totalRefund,
      netSales,
      currentBalance,
      holdBalance: 0,
      totalAdded,
      totalSpent,
      totalRefund,
    };
  },

  async getWalletTransactions(query: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.type && query.type !== "ALL") {
      const typeUpper = query.type.toUpperCase();
      if (typeUpper === "ADMIN_ADJUSTMENT" || typeUpper === "ADJUSTMENT") {
        filter.type = { $in: ["ADJUSTMENT", "ADMIN_ADJUSTMENT"] };
      } else {
        filter.type = typeUpper;
      }
    }

    if (query.search && query.search.trim().length > 0) {
      const s = query.search.trim();
      const searchRegex = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      // Find matching users
      const matchingUsers = await UserModel.find({
        $or: [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }],
      }).select("_id").lean();
      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { transactionId: searchRegex },
        { description: searchRegex },
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
      ];
    }

    const [transactions, total] = await Promise.all([
      WalletTransactionModel.find(filter)
        .populate("userId", "name phone email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransactionModel.countDocuments(filter),
    ]);

    return {
      docs: transactions.map((tx: any) => ({
        id: tx.transactionId || tx._id.toString(),
        _id: tx._id.toString(),
        userId: tx.userId?._id?.toString() || tx.userId?.toString(),
        userName: tx.userId?.name || "Customer",
        userPhone: tx.userId?.phone || "",
        type: tx.type,
        direction: tx.direction,
        amount: poishaToBdt(tx.amount),
        balanceBefore: poishaToBdt(tx.balanceBefore),
        balanceAfter: poishaToBdt(tx.balanceAfter),
        referenceType: tx.referenceType,
        description: tx.description,
        createdAt: tx.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },
};

async function findAdminRecord(adminId?: string) {
  if (adminId) {
    try {
      const byId = await AdminModel.findById(adminId);
      if (byId) return byId;
    } catch (_) {}
  }
  return await AdminModel.findOne();
}

export const adminProfileService = {
  async getProfile(adminId: string) {
    const admin = await findAdminRecord(adminId);
    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }
    return {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      phone: admin.phone || "+880 1712-345678",
      role: admin.role,
      status: admin.status,
      profileImageUrl: admin.profileImageUrl || "",
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  },

  async updateProfile(adminId: string, data: { name?: string; phone?: string; profileImageUrl?: string }) {
    const admin = await findAdminRecord(adminId);
    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }
    if (data.name) admin.name = data.name.trim();
    if (data.phone !== undefined) admin.phone = data.phone.trim();
    if (data.profileImageUrl !== undefined) admin.profileImageUrl = data.profileImageUrl;
    await admin.save();

    return {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      phone: admin.phone || "+880 1712-345678",
      role: admin.role,
      status: admin.status,
      profileImageUrl: admin.profileImageUrl || "",
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  },

  async uploadProfilePhoto(adminId: string, file?: Express.Multer.File, photoUrl?: string) {
    const admin = await findAdminRecord(adminId);
    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }
    let url = photoUrl || "";
    if (file) {
      try {
        const upload = await storageProvider.upload(file.buffer, {
          folder: env.CLOUDINARY_PROFILE_FOLDER || "drive-offer/profile",
          visibility: "PUBLIC",
        });
        if (upload?.url) {
          url = upload.url;
        }
      } catch (err) {
        // Fallback to data URI if Cloudinary is offline or unconfigured
        const mime = file.mimetype || "image/jpeg";
        url = `data:${mime};base64,${file.buffer.toString("base64")}`;
      }
    }
    if (photoUrl !== undefined || file) {
      admin.profileImageUrl = url;
      await admin.save();
    }
    return {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      phone: admin.phone || "+880 1712-345678",
      role: admin.role,
      status: admin.status,
      profileImageUrl: admin.profileImageUrl || "",
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  },

  async changePassword(adminId: string, oldPass: string, newPass: string) {
    const admin: any = adminId
      ? await AdminModel.findById(adminId).select("+passwordHash")
      : await AdminModel.findOne().select("+passwordHash");
    if (!admin) {
      throw new AppError("ADMIN_NOT_FOUND", "Admin not found", 404);
    }
    const valid = await argon2.verify(admin.passwordHash, oldPass);
    if (!valid) {
      throw new AppError("AUTH_INVALID_CREDENTIALS", "Current password does not match", 400);
    }
    admin.passwordHash = await argon2.hash(newPass);
    await admin.save();
    return { success: true, message: "Password updated successfully" };
  },
};

// Store read notification IDs in memory per admin
const adminReadNotificationIds = new Set<string>();

export const adminNotificationService = {
  async getNotifications(adminId?: string) {
    // 1. Fetch latest pending orders
    const pendingOrders = await OrderModel.find({ orderStatus: "ACTIVATION_PENDING" })
      .populate("userId", "name phone")
      .populate("offerId", "title")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 2. Fetch latest processing orders
    const processingOrders = await OrderModel.find({ orderStatus: "ACTIVATION_PROCESSING" })
      .populate("userId", "name phone")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 3. Fetch latest active devices
    const devices = await PaymentDeviceModel.find({ status: { $ne: "REVOKED" } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    // 4. Fetch latest refunds
    const refunds = await RefundModel.find()
      .populate("userId", "name phone")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 5. Fetch latest registered users
    const latestUsers = await UserModel.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const notifications: Array<{
      id: string;
      title: string;
      message: string;
      type: "ORDER" | "DEVICE" | "WALLET" | "USER" | "SYSTEM";
      isRead: boolean;
      createdAt: Date;
      actionTab?: number;
      actionUrl?: string;
    }> = [];

    for (const ord of pendingOrders) {
      const id = `ord_pend_${ord._id.toString()}`;
      notifications.push({
        id,
        title: `Pending Order: ${ord.orderNumber || ord._id.toString().slice(-6).toUpperCase()}`,
        message: `${(ord.userId as any)?.name || 'User'} requested ${(ord as any).offerName || (ord.offerId as any)?.title || 'Offer'} for ৳${poishaToBdt(ord.price || 0)}`,
        type: "ORDER",
        isRead: adminReadNotificationIds.has(id),
        createdAt: ord.createdAt,
        actionTab: 2, // Orders tab
      });
    }

    for (const dev of devices) {
      const id = `dev_status_${dev._id.toString()}`;
      const isOnline = dev.lastSeenAt && (Date.now() - new Date(dev.lastSeenAt).getTime()) < 5 * 60 * 1000;
      notifications.push({
        id,
        title: `SMS Listener: ${dev.deviceName || 'Device'}`,
        message: isOnline ? `Device is online & actively listening on SIM ${dev.simOperator || 'SIM 1'}` : `Device is offline or inactive since ${dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleTimeString() : 'awhile'}`,
        type: "DEVICE",
        isRead: adminReadNotificationIds.has(id),
        createdAt: dev.updatedAt || dev.createdAt,
        actionTab: 4, // More/Devices
      });
    }

    for (const ref of refunds) {
      const id = `ref_${ref._id.toString()}`;
      notifications.push({
        id,
        title: `Refund Processed: ৳${poishaToBdt(ref.amount)}`,
        message: `Refund of ৳${poishaToBdt(ref.amount)} was credited for ${(ref.userId as any)?.name || 'Customer'}`,
        type: "WALLET",
        isRead: adminReadNotificationIds.has(id),
        createdAt: ref.createdAt,
        actionTab: 2,
      });
    }

    for (const usr of latestUsers) {
      const id = `usr_new_${usr._id.toString()}`;
      notifications.push({
        id,
        title: `New User Joined: ${usr.name || 'Member'}`,
        message: `${usr.phone || usr.email || 'A user'} registered on the platform`,
        type: "USER",
        isRead: adminReadNotificationIds.has(id),
        createdAt: usr.createdAt,
        actionTab: 1, // Users tab
      });
    }

    // Sort by createdAt descending
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      notifications,
      unreadCount,
      total: notifications.length,
    };
  },

  markRead(notificationId: string) {
    adminReadNotificationIds.add(notificationId);
    return { success: true };
  },

  markAllRead(ids: string[]) {
    for (const id of ids) {
      adminReadNotificationIds.add(id);
    }
    return { success: true };
  },
};


