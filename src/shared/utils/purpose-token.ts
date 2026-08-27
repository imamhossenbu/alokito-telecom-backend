import jwt from "jsonwebtoken";
import { env } from "../../config/env";

interface PurposeTokenPayload {
  sub: string; // userId
  purpose: string;
}

export function signPurposeToken(
  payload: PurposeTokenPayload,
  expiresIn = "10m",
): string {
  // Deliberately reuses JWT_ACCESS_SECRET but with a distinct `purpose`
  // claim — verifyAccessToken() (auth.middleware.ts) checks `type`, not
  // `purpose`, so this token is structurally rejected by every normal API
  // auth check and can only be consumed by the one endpoint that expects
  // this exact purpose string.
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn,
  } as jwt.SignOptions);
}

export function verifyPurposeToken(
  token: string,
  expectedPurpose: string,
): PurposeTokenPayload {
  const decoded = jwt.verify(
    token,
    env.JWT_ACCESS_SECRET,
  ) as PurposeTokenPayload;
  if (decoded.purpose !== expectedPurpose) {
    throw new Error("Token purpose mismatch");
  }
  return decoded;
}
