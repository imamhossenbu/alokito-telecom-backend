import { Schema, model, Document, Types } from "mongoose";
import { PaymentProvider } from "../../shared/enums";

export const SmsEventVerificationStatus = {
  UNUSED: "UNUSED",
  MATCHED: "MATCHED",
  REJECTED: "REJECTED",
} as const;
export type SmsEventVerificationStatusType =
  (typeof SmsEventVerificationStatus)[keyof typeof SmsEventVerificationStatus];

export interface PaymentSmsEventDocument extends Document {
  _id: Types.ObjectId;
  paymentDeviceId?: Types.ObjectId;
  adminId?: Types.ObjectId;
  source?: string;
  provider: string;
  transactionId: string;
  /** Integer poisha */
  amount: number;
  sender?: string;
  receiver?: string;
  reference?: string;
  receivedAt: Date;
  /** Full raw SMS text content as received */
  rawSms?: string;
  /** Unique hash to avoid duplicate SMS events */
  smsFingerprint: string;
  parserVersion: string;
  verificationStatus: SmsEventVerificationStatusType;
  matchedTopUpId?: Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
}

const paymentSmsEventSchema = new Schema<PaymentSmsEventDocument>(
  {
    paymentDeviceId: { type: Schema.Types.ObjectId, ref: "PaymentDevice", required: false },
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: false },
    source: { type: String, default: "DEVICE" },
    provider: { type: String, enum: Object.values(PaymentProvider), required: true },
    transactionId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    sender: { type: String },
    receiver: { type: String },
    reference: { type: String },
    rawSms: { type: String },
    receivedAt: { type: Date, required: true },
    smsFingerprint: { type: String, required: true, unique: true },
    parserVersion: { type: String, required: true, default: "1.0.0" },
    verificationStatus: {
      type: String,
      enum: Object.values(SmsEventVerificationStatus),
      default: SmsEventVerificationStatus.UNUSED,
      required: true,
    },
    matchedTopUpId: { type: Schema.Types.ObjectId, ref: "TopUp" },
    rejectionReason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentSmsEventSchema.index({ provider: 1, transactionId: 1 });
paymentSmsEventSchema.index({ paymentDeviceId: 1, receivedAt: -1 });
paymentSmsEventSchema.index({ transactionId: 1 });
paymentSmsEventSchema.index({ receivedAt: -1 });

export const PaymentSmsEventModel = model<PaymentSmsEventDocument>(
  "PaymentSmsEvent",
  paymentSmsEventSchema
);
