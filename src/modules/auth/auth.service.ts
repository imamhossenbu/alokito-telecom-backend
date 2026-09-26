import mongoose, { Types } from "mongoose";
import argon2 from "argon2";
import { authRepository } from "./auth.repository";
import { userRepository } from "../users/user.repository";
import { walletRepository } from "../wallets/wallet.repository";
import { identityRepository } from "../identities/identity.repository";
import { adminRepository } from "../admins/admin.repository";
import { nidExtractor } from "../../integrations/nid/nid-extractor";
import { VerificationPurpose } from "./verificationSession.model";
import { CreatedByType } from "../users/user.model";
import { AccountStatus } from "../../shared/enums";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors/app-error";
import { hashPin, verifyPin } from "../../shared/utils/pin";
import { generateOtp, hashOtp, verifyOtp } from "../../shared/utils/otp";
import {
  normalizeEmail,
  normalizeBdPhone,
  maskEmail,
} from "../../shared/utils/normalize";
import {
  signAccessToken,
  generateOpaqueRefreshToken,
} from "../../shared/utils/jwt";
import {
  signPurposeToken,
  verifyPurposeToken,
} from "../../shared/utils/purpose-token";
import { queueEmail } from "../../jobs/email.job";
import { otpEmailTemplate } from "../../integrations/email/templates";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type {
  RegisterBody,
  RegisterVerifyBody,
  RegisterResendBody,
  LoginBody,
  LoginVerifyDeviceBody,
  RefreshBody,
  LogoutBody,
  ForgotPinBody,
  ForgotPinVerifyBody,
  ResetPinBody,
} from "./auth.schema";

const OTP_PURPOSE_LABELS: Record<string, string> = {
  REGISTER: "account registration",
  LOGIN_NEW_DEVICE: "new device login",
  FORGOT_PIN: "PIN reset",
  CHANGE_EMAIL: "email change",
  CHANGE_PHONE: "phone change",
};

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokensForUser(
  userId: Types.ObjectId,
  device: {
    deviceId: string;
    deviceType: string;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<TokenPair> {
  const refreshToken = generateOpaqueRefreshToken();
  const session = await authRepository.createAuthSession({
    userId,
    deviceId: device.deviceId,
    deviceType: device.deviceType,
    refreshToken,
    ipAddress: device.ipAddress,
    userAgent: device.userAgent,
  });

  const accessToken = signAccessToken({
    sub: userId.toString(),
    type: "CUSTOMER",
    sessionId: session._id.toString(),
    deviceId: device.deviceId,
  });

  return { accessToken, refreshToken };
}

/** Sends (and persists) a fresh OTP for the given purpose, replacing the need to check an old one. */
async function issueOtp(params: {
  userId?: Types.ObjectId;
  registrationSessionId?: Types.ObjectId;
  email: string;
  purpose: (typeof VerificationPurpose)[keyof typeof VerificationPurpose];
}): Promise<{ verificationSessionId: Types.ObjectId; code: string }> {
  const code = generateOtp(6);
  logger.info(
    { email: params.email, purpose: params.purpose, code },
    "🔑 [OTP GENERATED] Verification Code: %s for %s",
    code,
    params.email,
  );
  const verificationSession = await authRepository.createVerificationSession({
    ...params,
    codeHash: hashOtp(code),
  });

  const { subject, html } = otpEmailTemplate({
    code,
    purposeLabel: OTP_PURPOSE_LABELS[params.purpose] ?? "verification",
    expiresInMinutes: Math.round(env.OTP_EXPIRY_SECONDS / 60),
  });

  try {
    await queueEmail({ to: params.email, subject, html });
  } catch (err) {
    logger.error(
      { err, email: params.email, purpose: params.purpose },
      "Failed to queue OTP email",
    );
  }

  return { verificationSessionId: verificationSession._id, code };
}

async function verifyOtpOrThrow(verificationSessionId: string, code: string) {
  const session = await authRepository.findActiveVerificationSession(
    verificationSessionId,
  );
  if (!session) {
    throw new AppError(
      "AUTH_OTP_EXPIRED",
      "Verification code expired or not found",
      400,
    );
  }
  if (session.attempts >= session.maxAttempts) {
    throw new AppError(
      "AUTH_OTP_TOO_MANY_ATTEMPTS",
      "Too many incorrect attempts. Request a new code.",
      429,
    );
  }
  if (!verifyOtp(session.codeHash, code)) {
    await authRepository.incrementAttempts(session._id);
    throw new AppError("AUTH_OTP_INVALID", "Incorrect verification code", 400);
  }
  await authRepository.markConsumed(session._id);
  return session;
}

export const authService = {
  // ══════════════════════════════════════════════════════
  // SELF REGISTRATION (spec sections 8, 77, 114)
  // ══════════════════════════════════════════════════════
  async register(
    body: RegisterBody,
    nidImages: {
      front?: string;
      frontFormat?: string;
      back?: string;
      backFormat?: string;
    },
  ) {
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

    const pinHash = await hashPin(body.pin);

    const extracted = {
      nidNumber: body.nidNumber || "",
      name: body.name,
      nameBn: body.nameBn || "",
      fatherName: body.fatherName || "",
      motherName: body.motherName || "",
      gender: body.gender || "MALE",
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : new Date(1996, 4, 12),
      address: body.address || "",
    };

    const registrationSession = await authRepository.createRegistrationSession({
      name: body.name,
      email: body.email,
      emailNormalized,
      phone,
      pinHash,
      nidFrontImagePublicId: nidImages.front,
      nidFrontImageFormat: nidImages.frontFormat,
      nidBackImagePublicId: nidImages.back,
      nidBackImageFormat: nidImages.backFormat,
      nidNumber: extracted.nidNumber,
      nameBn: extracted.nameBn,
      fatherName: extracted.fatherName,
      motherName: extracted.motherName,
      dateOfBirth: extracted.dateOfBirth,
      address: extracted.address,
      gender: extracted.gender,
    });

    const { verificationSessionId, code } = await issueOtp({
      registrationSessionId: registrationSession._id,
      email: body.email,
      purpose: VerificationPurpose.REGISTER,
    });

    registrationSession.verificationSessionId = verificationSessionId;
    await registrationSession.save();

    return {
      registrationId: registrationSession._id.toString(),
      verificationRequired: true,
      emailMasked: maskEmail(body.email),
      extractedNid: {
        nidNumber: extracted.nidNumber,
        name: extracted.name,
        nameBn: extracted.nameBn,
        fatherName: extracted.fatherName,
        motherName: extracted.motherName,
        gender: extracted.gender,
        dateOfBirth: extracted.dateOfBirth,
        address: extracted.address,
      },
    };
  },

  async extractNidFromImages(
    nidImages: {
      front?: string;
      frontFormat?: string;
      back?: string;
      backFormat?: string;
    },
    fallbackName?: string,
    buffers?: { front?: Buffer; back?: Buffer },
  ) {
    if (!nidImages.front || !nidImages.back) {
      throw new AppError("VALIDATION_ERROR", "Both NID front and back images are required", 400);
    }
    return nidExtractor.extractNid(nidImages.front, nidImages.back, fallbackName, buffers);
  },

  async resendRegistrationOtp(body: RegisterResendBody) {
    const registrationSession =
      await authRepository.findActiveRegistrationSession(body.registrationId);
    if (!registrationSession) {
      throw new NotFoundError(
        "VALIDATION_ERROR",
        "Registration session not found or expired",
      );
    }

    const latest = await authRepository.findLatestActiveByPurpose(
      registrationSession.email,
      VerificationPurpose.REGISTER,
    );
    if (
      latest &&
      Date.now() - latest.lastSentAt.getTime() < env.OTP_RESEND_COOLDOWN * 1000
    ) {
      throw new AppError(
        "RATE_LIMITED",
        "Please wait before requesting another code",
        429,
      );
    }

    await issueOtp({
      registrationSessionId: registrationSession._id,
      email: registrationSession.email,
      purpose: VerificationPurpose.REGISTER,
    });

    return { emailMasked: maskEmail(registrationSession.email) };
  },

  async verifyRegistration(body: RegisterVerifyBody) {
    const registrationSession =
      await authRepository.findActiveRegistrationSession(body.registrationId);
    if (!registrationSession) {
      throw new NotFoundError(
        "VALIDATION_ERROR",
        "Registration session not found or expired",
      );
    }

    await verifyOtpOrThrow(
      registrationSession.verificationSessionId?.toString() ?? "",
      body.code,
    );

    // Re-check uniqueness at the last moment (race protection — someone
    // else may have registered the same email/phone while this session
    // was pending).
    const exists = await userRepository.existsByEmailOrPhone(
      registrationSession.emailNormalized,
      registrationSession.phone,
    );
    if (exists) {
      throw new ConflictError(
        "USER_ALREADY_EXISTS",
        "An account with this email or phone already exists",
      );
    }

    const mongoSession = await mongoose.startSession();
    try {
      let user;
      await mongoSession.withTransaction(async () => {
        user = await userRepository.create(
          {
            name: registrationSession.name,
            email: registrationSession.email,
            emailNormalized: registrationSession.emailNormalized,
            phone: registrationSession.phone,
            pinHash: registrationSession.pinHash,
            createdByType: CreatedByType.SELF,
            accountStatus: AccountStatus.ACTIVE,
          },
          mongoSession,
        );

        await userRepository.markEmailVerified(user._id, mongoSession);

        if (
          registrationSession.nidFrontImagePublicId ||
          registrationSession.nidNumber
        ) {
          await identityRepository.createFromRegistration(
            {
              userId: user._id,
              name: registrationSession.name,
              nameBn: (registrationSession as any).nameBn,
              fatherName: (registrationSession as any).fatherName,
              motherName: (registrationSession as any).motherName,
              nidNumber: registrationSession.nidNumber,
              dateOfBirth: registrationSession.dateOfBirth,
              address: registrationSession.address,
              gender: (registrationSession as any).gender,
              nidFrontImagePublicId: registrationSession.nidFrontImagePublicId,
              nidFrontImageFormat: registrationSession.nidFrontImageFormat,
              nidBackImagePublicId: registrationSession.nidBackImagePublicId,
              nidBackImageFormat: registrationSession.nidBackImageFormat,
            },
            mongoSession,
          );
        }

        await walletRepository.createForUser(user._id, mongoSession);
        await authRepository.markRegistrationVerified(registrationSession._id);
      });

      if (!user)
        throw new AppError("INTERNAL_ERROR", "Registration failed", 500);

      const tokens = await issueTokensForUser((user as any)._id, {
        deviceId: "primary-device",
        deviceType: "ANDROID",
      });
      await authRepository.upsertTrustedDevice({
        userId: (user as any)._id,
        deviceId: "primary-device",
      });

      return {
        userId: (user as { _id: Types.ObjectId })._id.toString(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: (user as { _id: Types.ObjectId })._id.toString(),
          name: registrationSession.name,
          email: registrationSession.email,
          phone: registrationSession.phone,
          kycStatus: "VERIFIED",
        },
      };
    } finally {
      await mongoSession.endSession();
    }
  },

  // ══════════════════════════════════════════════════════
  // LOGIN (spec sections 6-9, 12, 35)
  // ══════════════════════════════════════════════════════
  async login(
    body: LoginBody,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    const inputIdentifier = body.email.trim();
    const isEmail = inputIdentifier.includes("@");

    // ── 1. Try Admin Login first ──
    if (isEmail) {
      try {
        const emailNormalized = normalizeEmail(inputIdentifier);
        const admin = await adminRepository.findByEmailNormalized(emailNormalized, true);
        if (admin && admin.status !== "BLOCKED") {
          const passwordValid = await argon2.verify(admin.passwordHash, body.pin);
          if (passwordValid) {
            await adminRepository.updateLastLogin(admin._id.toString());
            const accessToken = signAccessToken({
              sub: admin._id.toString(),
              type: "ADMIN",
            });
            return {
              role: "admin",
              accessToken,
              admin: { id: admin._id.toString(), name: admin.name, email: admin.email },
            };
          }
        }
      } catch (err) {
        // Fallback to customer search
      }
    }

    // ── 2. Try Customer Login ──
    let user = null;

    // Try finding by phone if input looks like one, or by email
    const looksLikePhone = /^\+?8801[3-9]\d{8}$|^01[3-9]\d{8}$/.test(inputIdentifier);
    if (looksLikePhone) {
      try {
        const phoneNormalized = normalizeBdPhone(inputIdentifier);
        user = await userRepository.findByPhone(phoneNormalized, true);
      } catch (err) {
        // Ignore
      }
    }

    if (!user) {
      try {
        const emailNormalized = normalizeEmail(inputIdentifier);
        user = await userRepository.findByEmailNormalized(emailNormalized, true);
      } catch (err) {
        // Ignore
      }
    }

    if (!user) {
      throw new AppError(
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email/phone or PIN",
        401,
      );
    }

    if (
      user.accountStatus === AccountStatus.BLOCKED ||
      user.accountStatus === AccountStatus.SUSPENDED
    ) {
      throw new ForbiddenError(
        "This account has been blocked. Contact support.",
      );
    }
    if (user.accountStatus === AccountStatus.DELETED) {
      throw new AppError(
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email/phone or PIN",
        401,
      );
    }

    const pinValid = await verifyPin(user.pinHash, body.pin);
    if (!pinValid) {
      throw new AppError(
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email/phone or PIN",
        401,
      );
    }

    if (user.mustChangePin) {
      const changeToken = signPurposeToken(
        { sub: user._id.toString(), purpose: "MUST_CHANGE_PIN" },
        "10m",
      );
      return { role: "user", mustChangePin: true, changeToken };
    }

    // Auto trust device and issue tokens
    const deviceId = body.deviceId || "primary-device";
    await authRepository.upsertTrustedDevice({
      userId: user._id,
      deviceId,
      deviceName: body.deviceName,
      platform: body.platform,
      appVersion: body.appVersion,
    });
    await userRepository.updateLastLogin(user._id);

    const tokens = await issueTokensForUser(user._id, {
      deviceId,
      deviceType: body.platform,
      ...context,
    });

    return {
      role: "user",
      requiresVerification: false,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        kycStatus: "VERIFIED",
      },
    };
  },

  async verifyLoginDevice(
    body: LoginVerifyDeviceBody,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    const session = await verifyOtpOrThrow(body.verificationId, body.code);
    if (!session.userId) {
      throw new AppError(
        "AUTH_OTP_INVALID",
        "Invalid verification session",
        400,
      );
    }

    const user = await userRepository.findById(session.userId);
    if (!user) throw new NotFoundError("USER_NOT_FOUND", "User not found");

    if (body.trustDevice) {
      await authRepository.upsertTrustedDevice({
        userId: user._id,
        deviceId: body.deviceId,
      });
    }
    await userRepository.updateLastLogin(user._id);

    const tokens = await issueTokensForUser(user._id, {
      deviceId: body.deviceId,
      deviceType: "OTHER",
      ...context,
    });
    return tokens;
  },

  // ══════════════════════════════════════════════════════
  // TOKEN LIFECYCLE
  // ══════════════════════════════════════════════════════
  async refresh(
    body: RefreshBody,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    const session = await authRepository.findActiveSessionByRefreshToken(
      body.refreshToken,
    );
    if (!session) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await userRepository.findById(session.userId);
    if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
      await authRepository.revokeSession(session._id, "USER_INACTIVE");
      throw new UnauthorizedError("Account is not active");
    }

    // Rotation: the old refresh token is invalidated the moment a new one
    // is issued, so a stolen-but-unused token can't be replayed later.
    const newRefreshToken = generateOpaqueRefreshToken();
    await authRepository.rotateRefreshToken(session._id, newRefreshToken);

    const accessToken = signAccessToken({
      sub: user._id.toString(),
      type: "CUSTOMER",
      sessionId: session._id.toString(),
      deviceId: session.deviceId,
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(body: LogoutBody) {
    const session = await authRepository.findActiveSessionByRefreshToken(
      body.refreshToken,
    );
    if (session) {
      await authRepository.revokeSession(session._id, "USER_LOGOUT");
    }
    // Idempotent: logging out an already-invalid token is not an error.
  },

  async logoutAll(userId: string) {
    await authRepository.revokeAllSessionsForUser(
      new Types.ObjectId(userId),
      "USER_LOGOUT_ALL",
    );
  },

  // ══════════════════════════════════════════════════════
  // FORGOT PIN (spec section 82)
  // ══════════════════════════════════════════════════════
  async forgotPin(body: ForgotPinBody) {
    const emailNormalized = normalizeEmail(body.email);
    const user = await userRepository.findByEmailNormalized(emailNormalized);

    // NOTE: intentionally throwing USER_NOT_FOUND here rather than a generic
    // "if this email exists..." response. Simpler UX at the cost of a minor
    // email-enumeration surface — revisit during Phase 12 hardening if that
    // trade-off needs to change.
    if (!user) {
      throw new NotFoundError(
        "USER_NOT_FOUND",
        "No account found with this email",
      );
    }

    const { verificationSessionId } = await issueOtp({
      userId: user._id,
      email: user.email,
      purpose: VerificationPurpose.FORGOT_PIN,
    });

    return {
      verificationId: verificationSessionId.toString(),
      emailMasked: maskEmail(user.email),
    };
  },

  async verifyForgotPin(body: ForgotPinVerifyBody) {
    const session = await verifyOtpOrThrow(body.verificationId, body.code);
    if (!session.userId) {
      throw new AppError(
        "AUTH_OTP_INVALID",
        "Invalid verification session",
        400,
      );
    }
    const resetToken = signPurposeToken(
      { sub: session.userId.toString(), purpose: "PIN_RESET" },
      "10m",
    );
    return { resetToken };
  },

  async resetPin(body: ResetPinBody) {
    let payload;
    try {
      payload = verifyPurposeToken(body.resetToken, "PIN_RESET");
    } catch {
      throw new UnauthorizedError(
        "Reset link expired or invalid. Please start over.",
      );
    }

    const userId = new Types.ObjectId(payload.sub);
    const pinHash = await hashPin(body.newPin);
    await userRepository.updatePinHash(userId, pinHash, false);

    // Invalidate every existing session — a PIN reset means "someone lost
    // access to this account", so old sessions/devices must not survive it.
    await authRepository.revokeAllSessionsForUser(userId, "PIN_RESET");
    await authRepository.revokeAllTrustedDevicesForUser(userId);
  },
};
