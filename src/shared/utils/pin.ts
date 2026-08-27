import argon2 from "argon2";

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB, OWASP-recommended minimum for argon2id
  timeCost: 2,
  parallelism: 1,
};

export async function hashPin(pin: string): Promise<string> {
  return argon2.hash(pin, HASH_OPTIONS);
}

export async function verifyPin(
  pinHash: string,
  pin: string,
): Promise<boolean> {
  try {
    return await argon2.verify(pinHash, pin);
  } catch {
    // Malformed hash, algorithm mismatch, etc — treat as verification failure,
    // never throw out of an auth check.
    return false;
  }
}

/** Generates a random N-digit numeric PIN (used for admin/customer-created temporary PINs). */
export function generateTemporaryPin(length = 6): string {
  const digits = new Array(length);
  for (let i = 0; i < length; i++) {
    digits[i] = Math.floor(Math.random() * 10);
  }
  // First digit non-zero so it always displays as a full-length number.
  if (digits[0] === 0) digits[0] = 1 + Math.floor(Math.random() * 9);
  return digits.join("");
}
