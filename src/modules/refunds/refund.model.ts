import { Schema, model, Document, Types } from "mongoose";

export const RefundStatus = {
  PENDING: "PENDING",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
} as const;
export type RefundStatusType = (typeof RefundStatus)[keyof typeof RefundStatus];

export interface RefundDocument extends Document {
  _id: Types.ObjectId;
  refundNumber: string;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  walletId: Types.ObjectId;
  /** Integer poisha */
  amount: number;
  reason: string;
  status: RefundStatusType;
  walletTransactionId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  refundedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<RefundDocument>(
  {
    refundNumber: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.PENDING,
      required: true,
    },
    walletTransactionId: { type: Schema.Types.ObjectId, ref: "WalletTransaction" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    refundedAt: { type: Date },
    failureReason: { type: String },
  },
  { timestamps: true }
);

refundSchema.index({ userId: 1, createdAt: -1 });
refundSchema.index({ orderId: 1 }, { unique: true });

export const RefundModel = model<RefundDocument>("Refund", refundSchema);
