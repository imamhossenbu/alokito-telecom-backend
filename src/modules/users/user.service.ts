import mongoose, { Types } from "mongoose";
import { userRepository } from "./user.repository";
import { identityRepository } from "../identities/identity.repository";
import { walletRepository } from "../wallets/wallet.repository";
import { CreatedByType } from "./user.model";
import { AccountStatus } from "../../shared/enums";
import {
  AppError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/app-error";
import {
  hashPin,
  verifyPin,
  generateTemporaryPin,
} from "../../shared/utils/pin";
import { normalizeEmail, normalizeBdPhone } from "../../shared/utils/normalize";
import { storageProvider } from "../../integrations/storage/cloudinary.provider";
import { emailProvider } from "../../integrations/email/nodemailer.provider";
import { temporaryPinEmailTemplate } from "../../integrations/email/templates";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { TrustedDeviceModel } from "../auth/trustedDevice.model";
import type { UpdateProfileBody, CreateCustomerBody } from "./user.schema";
import type { ChangePinBody } from "../auth/auth.schema";

function serializeUser(user: {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  profileImageUrl?: string;
  district?: string;
  address?: string;
  accountStatus: string;
  mustChangePin: boolean;
  emailVerifiedAt?: Date;
  createdAt: Date;
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    profileImageUrl: user.profileImageUrl,
    district: user.district,
    address: user.address,
    accountStatus: user.accountStatus,
    mustChangePin: user.mustChangePin,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
  };
}

async function sendTemporaryPinEmail(email: string, temporaryPin: string) {
  const { subject, html } = temporaryPinEmailTemplate({ email, temporaryPin });
  try {
    await emailProvider.send({ to: email, subject, html });
  } catch (err) {
    logger.error({ err, email }, "Failed to send temporary PIN email");
  }
}

export const userService = {
  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");
    return serializeUser(user);
  },

  async updateMe(userId: string, body: UpdateProfileBody) {
    const user = await userRepository.updateProfile(
      new Types.ObjectId(userId),
      body,
    );
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");
    return serializeUser(user);
  },

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    const upload = await storageProvider.upload(file.buffer, {
      folder: env.CLOUDINARY_PROFILE_FOLDER,
      visibility: "PUBLIC",
    });
    await userRepository.updateProfileImage(
      new Types.ObjectId(userId),
      upload.publicId,
      upload.url ?? "",
    );
    return { profileImageUrl: upload.url };
  },

  async getIdentity(userId: string) {
    const identity = await identityRepository.findByUserId(
      new Types.ObjectId(userId),
    );
    if (!identity)
      throw new NotFoundError("NOT_FOUND", "No identity record found");

    const frontUrl = identity.nidFrontImagePublicId
      ? storageProvider.getSignedUrl(
          identity.nidFrontImagePublicId,
          identity.nidFrontImageFormat ?? "jpg",
        )
      : undefined;
    const backUrl = identity.nidBackImagePublicId
      ? storageProvider.getSignedUrl(
          identity.nidBackImagePublicId,
          identity.nidBackImageFormat ?? "jpg",
        )
      : undefined;

    return {
      nidNumber: identity.nidNumber,
      dateOfBirth: identity.dateOfBirth,
      address: identity.address,
      extractionStatus: identity.extractionStatus,
      verificationStatus: identity.verificationStatus,
      // Short-lived (5 min) — the client must re-fetch this endpoint to
      // view the image again later, never persist the URL itself.
      nidFrontImageUrl: frontUrl,
      nidBackImageUrl: backUrl,
    };
  },

  async listTrustedDevices(userId: string) {
    const devices = await TrustedDeviceModel.find({
      userId: new Types.ObjectId(userId),
      revokedAt: { $exists: false },
    }).sort({ lastUsedAt: -1 });

    return devices.map((d) => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      platform: d.platform,
      trustedAt: d.trustedAt,
      lastUsedAt: d.lastUsedAt,
      expiresAt: d.expiresAt,
    }));
  },

  async revokeTrustedDevice(userId: string, deviceId: string) {
    await TrustedDeviceModel.updateOne(
      { userId: new Types.ObjectId(userId), deviceId },
      { $set: { revokedAt: new Date() } },
    );
  },

  async changePin(userId: string, body: ChangePinBody) {
    const user = await userRepository.findById(userId, true);
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");

    const currentValid = await verifyPin(user.pinHash, body.currentPin);
    if (!currentValid) {
      throw new AppError(
        "AUTH_INVALID_CREDENTIALS",
        "Current PIN is incorrect",
        401,
      );
    }

    const newPinHash = await hashPin(body.newPin);
    await userRepository.updatePinHash(user._id, newPinHash, false);
  },

  /**
   * Customer-created-customer (spec sections 10, 37, 112). No NID image,
   * no PIN entry by the creator — a temporary PIN is generated and
   * emailed, and the new account must change it on first login.
   */
  async createCustomer(creatorUserId: string, body: CreateCustomerBody) {
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
            createdByType: CreatedByType.CUSTOMER,
            createdById: new Types.ObjectId(creatorUserId),
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
};

// Re-exported for the admin user service, which shares the same
// temporary-PIN-issuance pattern (spec sections 11, 113, 117).
export { sendTemporaryPinEmail };
