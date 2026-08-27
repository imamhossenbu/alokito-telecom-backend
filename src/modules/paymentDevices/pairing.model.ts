import { Schema, model, Document, Types } from "mongoose";

export const PairingStatus = {
  PENDING: "PENDING",
  PAIRED: "PAIRED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type PairingStatusType = (typeof PairingStatus)[keyof typeof PairingStatus];

export interface PaymentPairingSessionDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  pairingCodeHash: string;
  pairingTokenHash?: string;
  status: PairingStatusType;
  expiresAt: Date;
  deviceId?: string;
  paymentDeviceId?: Types.ObjectId;
  createdAt: Date;
  pairedAt?: Date;
}

const paymentPairingSessionSchema = new Schema<PaymentPairingSessionDocument>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    pairingCodeHash: { type: String, required: true },
    pairingTokenHash: { type: String },
    status: {
      type: String,
      enum: Object.values(PairingStatus),
      default: PairingStatus.PENDING,
      required: true,
    },
    expiresAt: { type: Date, required: true },
    deviceId: { type: String },
    paymentDeviceId: { type: Schema.Types.ObjectId, ref: "PaymentDevice" },
    pairedAt: { type: Date },
  },
  { timestamps: true }
);

paymentPairingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
paymentPairingSessionSchema.index({ pairingCodeHash: 1, status: 1 });

export const PaymentPairingSessionModel = model<PaymentPairingSessionDocument>(
  "PaymentPairingSession",
  paymentPairingSessionSchema
);
