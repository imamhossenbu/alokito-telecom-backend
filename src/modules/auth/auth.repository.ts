import crypto from "crypto";
import { Types } from "mongoose";
import {
  RegistrationSessionModel,
  RegistrationSessionStatus,
} from "./registrationSession.model";
import {
  VerificationSessionModel,
  VerificationPurposeType,
} from "./verificationSession.model";
import { AuthSessionModel } from "./authSession.model";
import { TrustedDeviceModel } from "./trustedDevice.model";
import { env } from "../../config/env";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const authRepository = {
  // ── Registration sessions ────────────────────────────
  createRegistrationSession(data: {
    name: string;
    email: string;
    emailNormalized: string;
    phone: string;
    pinHash: string;
    nidFrontImagePublicId?: string;
    nidFrontImageFormat?: string;
    nidBackImagePublicId?: string;
    nidBackImageFormat?: string;
    nidNumber?: string;
    dateOfBirth?: Date;
    address?: string;
  }) {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min to complete registration
    return RegistrationSessionModel.create({
      ...data,
      expiresAt,
      status: RegistrationSessionStatus.PENDING,
    });
  },

  findActiveRegistrationSession(id: string) {
    return RegistrationSessionModel.findOne({
      _id: id,
      status: RegistrationSessionStatus.PENDING,
      expiresAt: { $gt: new Date() },
    }).select("+pinHash +nidNumber +dateOfBirth +address");
  },

  async markRegistrationVerified(id: Types.ObjectId) {
    await RegistrationSessionModel.updateOne(
      { _id: id },
      { $set: { status: RegistrationSessionStatus.VERIFIED } },
    );
  },

  // ── Verification sessions (email OTP) ────────────────
  async createVerificationSession(data: {
    userId?: Types.ObjectId;
    registrationSessionId?: Types.ObjectId;
    email: string;
    purpose: VerificationPurposeType;
    codeHash: string;
  }) {
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);
    return VerificationSessionModel.create({
      ...data,
      expiresAt,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      lastSentAt: new Date(),
    });
  },

  findActiveVerificationSession(id: string) {
    return VerificationSessionModel.findOne({
      _id: id,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).select("+codeHash");
  },

  /** Returns the most recent unconsumed session for a purpose, for resend-cooldown checks. */
  findLatestActiveByPurpose(email: string, purpose: VerificationPurposeType) {
    return VerificationSessionModel.findOne({
      email,
      purpose,
      consumedAt: { $exists: false },
    }).sort({
      createdAt: -1,
    });
  },

  async incrementAttempts(id: Types.ObjectId) {
    await VerificationSessionModel.updateOne(
      { _id: id },
      { $inc: { attempts: 1 } },
    );
  },

  async markConsumed(id: Types.ObjectId) {
    await VerificationSessionModel.updateOne(
      { _id: id },
      { $set: { verifiedAt: new Date(), consumedAt: new Date() } },
    );
  },

  // ── Auth sessions (refresh tokens) ───────────────────
  async createAuthSession(data: {
    userId: Types.ObjectId;
    deviceId: string;
    deviceType: string;
    refreshToken: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const expiresAt = addDuration(new Date(), env.JWT_REFRESH_EXPIRES);
    const session = await AuthSessionModel.create({
      userId: data.userId,
      deviceId: data.deviceId,
      deviceType: data.deviceType,
      refreshTokenHash: hashToken(data.refreshToken),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      expiresAt,
    });
    return session;
  },

  findActiveSessionByRefreshToken(refreshToken: string) {
    return AuthSessionModel.findOne({
      refreshTokenHash: hashToken(refreshToken),
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).select("+refreshTokenHash");
  },

  async rotateRefreshToken(sessionId: Types.ObjectId, newRefreshToken: string) {
    await AuthSessionModel.updateOne(
      { _id: sessionId },
      {
        $set: {
          refreshTokenHash: hashToken(newRefreshToken),
          lastUsedAt: new Date(),
        },
      },
    );
  },

  async revokeSession(sessionId: Types.ObjectId, reason: string) {
    await AuthSessionModel.updateOne(
      { _id: sessionId },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
  },

  async revokeAllSessionsForUser(
    userId: Types.ObjectId,
    reason: string,
    exceptSessionId?: Types.ObjectId,
  ) {
    await AuthSessionModel.updateMany(
      {
        userId,
        revokedAt: { $exists: false },
        ...(exceptSessionId ? { _id: { $ne: exceptSessionId } } : {}),
      },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
  },

  // ── Trusted devices ───────────────────────────────────
  findTrustedDevice(userId: Types.ObjectId, deviceId: string) {
    return TrustedDeviceModel.findOne({
      userId,
      deviceId,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
  },

  async upsertTrustedDevice(data: {
    userId: Types.ObjectId;
    deviceId: string;
    deviceName?: string;
    platform?: string;
    appVersion?: string;
  }) {
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 180 days
    await TrustedDeviceModel.updateOne(
      { userId: data.userId, deviceId: data.deviceId },
      {
        $set: {
          deviceName: data.deviceName,
          platform: data.platform,
          appVersion: data.appVersion,
          lastUsedAt: new Date(),
          expiresAt,
        },
        $setOnInsert: { trustedAt: new Date() },
      },
      { upsert: true },
    );
  },

  async revokeAllTrustedDevicesForUser(userId: Types.ObjectId) {
    await TrustedDeviceModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  },
};

/** Parses simple JWT-style duration strings like "15m", "30d" into a future Date. */
function addDuration(base: Date, duration: string): Date {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000); // fallback: 30 days
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
    match[2] as "s" | "m" | "h" | "d"
  ];
  return new Date(base.getTime() + value * unitMs);
}
