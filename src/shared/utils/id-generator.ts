import { customAlphabet } from "nanoid";

// Unambiguous alphabet (no 0/O, 1/I/L) for human-readable reference IDs.
const nanoid = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

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
  return `${prefix}-${nanoid()}`;
}
