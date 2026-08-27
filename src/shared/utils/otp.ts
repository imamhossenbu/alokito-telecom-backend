import crypto from "crypto";

/** Generates a random N-digit numeric OTP code (default 6 digits, per spec section 9). */
export function generateOtp(length = 6): string {
  const max = 10 ** length;
  const code = crypto.randomInt(0, max);
  return code.toString().padStart(length, "0");
}

/**
 * OTP codes are short-lived and low-entropy compared to PINs, so a fast
 * SHA-256 hash (rather than Argon2) is sufficient here — the real
 * protection against brute force is `maxAttempts` + `expiresAt` on the
 * verificationSessions document itself.
 */
export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function verifyOtp(codeHash: string, code: string): boolean {
  const candidate = hashOtp(code);
  // Constant-time comparison to avoid timing side-channels.
  const a = Buffer.from(candidate);
  const b = Buffer.from(codeHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
