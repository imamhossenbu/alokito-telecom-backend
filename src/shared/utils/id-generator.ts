import crypto from "crypto";

// Unambiguous alphabet (no 0/O, 1/I/L) for human-readable reference IDs.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateCode(length: number = 8): string {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

export const IdPrefix = {
  USER: "USR",
  ORDER: "ORD",
  WALLET: "WAL",
  WALLET_TRANSACTION: "WTX",
  TOP_UP: "TOP",
  REFUND: "REF",
  PAYMENT_DEVICE: "PD",
} as const;

export function generateReferenceId(
  prefix: (typeof IdPrefix)[keyof typeof IdPrefix],
): string {
  return `${prefix}-${generateCode(8)}`;
}
