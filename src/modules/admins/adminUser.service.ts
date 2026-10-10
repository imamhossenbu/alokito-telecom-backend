import mongoose, { Types } from "mongoose";
import { userRepository } from "../users/user.repository";
import { identityRepository } from "../identities/identity.repository";
import { walletRepository } from "../wallets/wallet.repository";
import { authRepository } from "../auth/auth.repository";
import { sendTemporaryPinEmail } from "../users/user.service";
import { CreatedByType } from "../users/user.model";
import { AccountStatus } from "../../shared/enums";
import {
  AppError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/app-error";
import { hashPin, generateTemporaryPin } from "../../shared/utils/pin";
import { normalizeEmail, normalizeBdPhone } from "../../shared/utils/normalize";
import { buildPaginationMeta } from "../../shared/pagination/paginate";
import { pinResetEmailTemplate } from "../../integrations/email/templates";
import { queueEmail } from "../../jobs/email.job";
import { logger } from "../../config/logger";
import { poishaToBdt } from "../../shared/utils/money";
import type {
  ListUsersQuery,
  AdminCreateCustomerBody,
  AdminUpdateCustomerBody,
} from "../users/user.schema";

function serializeUserSummary(user: {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  accountStatus: string;
  district?: string;
  createdAt: Date;
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    accountStatus: user.accountStatus,
    district: user.district,
    createdAt: user.createdAt,
  };
}

export const adminUserService = {
  async list(query: ListUsersQuery) {
    const { items, total } = await userRepository.listAndCount(
      {
        search: query.search,
        status: query.status as never,
        district: query.district,
      },
      { page: query.page, limit: query.limit },
      { field: query.sort, order: query.order },
    );
    return {
      items: items.map(serializeUserSummary),
      meta: buildPaginationMeta(
        { page: query.page, limit: query.limit },
        total,
      ),
    };
  },

  async getById(id: string) {
    const user = await userRepository.findById(id, false, true);
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");

    const [identity, wallet, ordersCount] = await Promise.all([
      identityRepository.findByUserId(user._id),
      walletRepository.findByUserId(user._id),
      (async () => {
        try {
          const { OrderModel } = await import("../orders/order.model");
          return await OrderModel.countDocuments({ userId: user._id });
        } catch (_) {
          return 0;
        }
      })(),
    ]);

    const base = serializeUserSummary(user);
    return {
      ...base,
      pinCode: user.pinCode || "",
      nidNumber: identity?.nidNumber || "",
      dateOfBirth: identity?.dateOfBirth ? identity.dateOfBirth.toISOString().split("T")[0] : "",
      address: user.address || identity?.address || "",
      division: (user as any).division || (identity as any)?.division || "",
      district: user.district || (identity as any)?.district || "",
      upazila: (user as any).upazila || (identity as any)?.upazila || "",
      union: (user as any).union || (identity as any)?.union || "",
      postCode: (user as any).postCode || (identity as any)?.postCode || "",
      wallet: {
        balance: wallet ? wallet.balance : 0,
        balanceBdt: wallet ? poishaToBdt(wallet.balance) : 0,
        currency: wallet?.currency || "BDT",
        status: wallet?.status || "ACTIVE",
      },
      ordersCount,
    };
  },

  /** Admin-created customer (spec sections 11, 113) — same temp-PIN pattern as customer-created-customer. */
  async create(adminId: string, body: AdminCreateCustomerBody) {
    const emailNormalized = normalizeEmail(body.email);
    const phone = normalizeBdPhone(body.phone);

    const exists = await userRepository.existsByEmailOrPhone(
      emailNormalized,
      phone,
    );
    if (exists) {
      throw new ConflictError(
        "USER_ALREADY_EXISTS",
        "An account with this email or phone already exists",
      );
    }

    const temporaryPin = generateTemporaryPin(6);
    const pinHash = await hashPin(temporaryPin);

    const mongoSession = await mongoose.startSession();
    try {
      let newUserId: Types.ObjectId | undefined;
      await mongoSession.withTransaction(async () => {
        const newUser = await userRepository.create(
          {
            name: body.name,
            email: body.email,
            emailNormalized,
            phone,
            pinHash,
            createdByType: CreatedByType.ADMIN,
            createdById: new Types.ObjectId(adminId),
            mustChangePin: true,
            accountStatus: AccountStatus.ACTIVE,
          },
          mongoSession,
        );
        newUserId = newUser._id;

        await identityRepository.createForCustomerCreatedUser(
          {
            userId: newUser._id,
            nidNumber: body.nidNumber,
            dateOfBirth: body.dateOfBirth
              ? new Date(body.dateOfBirth)
              : undefined,
            address: body.address,
          },
          mongoSession,
        );

        await walletRepository.createForUser(newUser._id, mongoSession);
      });

      if (!newUserId)
        throw new AppError("INTERNAL_ERROR", "Failed to create customer", 500);

      await sendTemporaryPinEmail(body.email, temporaryPin);

      return { userId: newUserId.toString() };
    } finally {
      await mongoSession.endSession();
    }
  },

  async update(id: string, body: AdminUpdateCustomerBody) {
    const updateData: any = { ...body };
    if (body.phone) {
      updateData.phone = normalizeBdPhone(body.phone);
    }
    const user = await userRepository.updateProfile(
      new Types.ObjectId(id),
      updateData,
    );
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");
    return serializeUserSummary(user);
  },

  async block(id: string) {
    const userId = new Types.ObjectId(id);
    const user = await userRepository.setAccountStatus(
      userId,
      AccountStatus.BLOCKED,
    );
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");
    await authRepository.revokeAllSessionsForUser(userId, "ADMIN_BLOCKED");
    await authRepository.revokeAllTrustedDevicesForUser(userId);
    return serializeUserSummary(user);
  },

  async unblock(id: string) {
    const user = await userRepository.setAccountStatus(
      new Types.ObjectId(id),
      AccountStatus.ACTIVE,
    );
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");
    return serializeUserSummary(user);
  },

  /** Admin PIN reset — new temp or custom PIN, sessions revoked. */
  async resetPin(id: string, newCustomPin?: string) {
    const userId = new Types.ObjectId(id);
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");

    const temporaryPin = newCustomPin && newCustomPin.trim().length >= 4
      ? newCustomPin.trim()
      : generateTemporaryPin(6);
    const pinHash = await hashPin(temporaryPin);
    await userRepository.updatePinHash(userId, pinHash, false, temporaryPin);
    await authRepository.revokeAllSessionsForUser(userId, "ADMIN_PIN_RESET");
    await authRepository.revokeAllTrustedDevicesForUser(userId);

    const { subject, html } = pinResetEmailTemplate({ temporaryPin });
    try {
      await queueEmail({ to: user.email, subject, html });
    } catch (err) {
      logger.error({ err, userId: id }, "Failed to queue PIN reset email");
    }

    return { temporaryPin };
  },

  /** Soft delete (spec section 118) — financial history is never removed. */
  async softDelete(id: string, adminId: string) {
    const userId = new Types.ObjectId(id);
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");

    await userRepository.softDelete(userId, new Types.ObjectId(adminId));
    await authRepository.revokeAllSessionsForUser(userId, "ADMIN_DELETED_USER");
    await authRepository.revokeAllTrustedDevicesForUser(userId);
  },
};
