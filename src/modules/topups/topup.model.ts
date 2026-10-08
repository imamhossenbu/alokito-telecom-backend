import { Schema, model, Document, Types } from "mongoose";
import { PaymentProvider } from "../../shared/enums";

export const TopUpStatus = {
  PENDING: "PENDING",
  VERIFYING: "VERIFYING",
  VERIFIED: "VERIFIED",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
} as const;
export type TopUpStatusType = (typeof TopUpStatus)[keyof typeof TopUpStatus];

export interface TopUpDocument extends Document {
  _id: Types.ObjectId;
  topUpNumber: string;
  userId: Types.ObjectId;
  paymentDeviceId?: Types.ObjectId;
  paymentProvider: string;
  paymentNumber: string;
  senderPhone?: string;
  /** Integer poisha */
  amount: number;
  customerTransactionId?: string;
  status: TopUpStatusType;
  verificationStatus: "PENDING" | "VERIFIED" | "FAILED";
  paymentSmsEventId?: Types.ObjectId;
  walletTransactionId?: Types.ObjectId;
  submittedAt?: Date;
  verifiedAt?: Date;
  failureReason?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const topUpSchema = new Schema<TopUpDocument>(
  {
    topUpNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paymentDeviceId: { type: Schema.Types.ObjectId, ref: "PaymentDevice" },
    paymentProvider: { type: String, enum: Object.values(PaymentProvider), required: true },
    paymentNumber: { type: String, required: true },
    senderPhone: { type: String },
    amount: { type: Number, required: true, min: 0 },
    customerTransactionId: { type: String },
    status: {
      type: String,
      enum: Object.values(TopUpStatus),
      default: TopUpStatus.PENDING,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
      required: true,
    },
    paymentSmsEventId: { type: Schema.Types.ObjectId, ref: "PaymentSmsEvent" },
    walletTransactionId: { type: Schema.Types.ObjectId, ref: "WalletTransaction" },
    submittedAt: { type: Date },
    verifiedAt: { type: Date },
    failureReason: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

topUpSchema.index({ userId: 1, createdAt: -1 });
topUpSchema.index({ paymentProvider: 1, customerTransactionId: 1 });
topUpSchema.index({ status: 1, createdAt: -1 });

export const TopUpModel = model<TopUpDocument>("TopUp", topUpSchema);
