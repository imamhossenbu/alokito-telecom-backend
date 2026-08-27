import { Schema, model, Document, Types } from "mongoose";

export const WalletStatus = {
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
} as const;
export type WalletStatusType = (typeof WalletStatus)[keyof typeof WalletStatus];

export interface WalletDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Integer poisha (1 BDT = 100 poisha) — never a float. See shared/utils/money.ts. */
  balance: number;
  currency: string;
  status: WalletStatusType;
  /** Optimistic-concurrency guard for concurrent debit/credit races. */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<WalletDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    balance: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, required: true, default: "BDT" },
    status: {
      type: String,
      enum: Object.values(WalletStatus),
      default: WalletStatus.ACTIVE,
      required: true,
    },
    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const WalletModel = model<WalletDocument>("Wallet", walletSchema);
