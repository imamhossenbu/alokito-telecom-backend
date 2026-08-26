import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

interface CustomerTokenPayload {
  sub: string; // userId
  type: "CUSTOMER";
  sessionId: string;
  deviceId: string;
}

interface AdminTokenPayload {
  sub: string; // adminId
  type: "ADMIN";
}

interface PaymentDeviceTokenPayload {
  sub: string; // paymentDeviceId
  type: "PAYMENT_DEVICE";
  adminId: string;
  deviceId: string;
}

export type AccessTokenPayload =
  | CustomerTokenPayload
  | AdminTokenPayload
  | PaymentDeviceTokenPayload;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Refresh tokens are opaque random strings, NOT JWTs — only their hash is
 * stored server-side (authSessions.refreshTokenHash), so a leaked database
 * dump can't be used to mint new sessions. See spec section 11.
 */
export { randomUUID as generateOpaqueRefreshToken } from "crypto";
