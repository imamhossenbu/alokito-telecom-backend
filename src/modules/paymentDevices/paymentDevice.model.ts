import { Schema, model, Document, Types } from "mongoose";
import { PaymentProvider } from "../../shared/enums";

export const PaymentDeviceStatus = {
  PENDING: "PENDING",
  CONNECTED: "CONNECTED",
  OFFLINE: "OFFLINE",
  REVOKED: "REVOKED",
} as const;
export type PaymentDeviceStatusType =
  (typeof PaymentDeviceStatus)[keyof typeof PaymentDeviceStatus];

export interface PaymentDeviceDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  deviceId: string;
  deviceName?: string;
  platform: string;
  appVersion?: string;
  phoneNumber?: string;
  simSlot?: number;
  simOperator?: string;
  paymentProvider?: string;
  status: PaymentDeviceStatusType;
  lastSeenAt: Date;
  lastSmsAt?: Date;
  pairedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentDeviceSchema = new Schema<PaymentDeviceDocument>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    deviceId: { type: String, required: true, unique: true },
    deviceName: { type: String },
    platform: { type: String, default: "ANDROID", required: true },
    appVersion: { type: String },
    phoneNumber: { type: String },
    simSlot: { type: Number },
    simOperator: { type: String },
    paymentProvider: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(PaymentDeviceStatus),
      default: PaymentDeviceStatus.PENDING,
      required: true,
    },
    lastSeenAt: { type: Date, required: true, default: Date.now },
    lastSmsAt: { type: Date },
    pairedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

paymentDeviceSchema.index({ adminId: 1, status: 1 });
paymentDeviceSchema.index({ paymentProvider: 1, status: 1 });
paymentDeviceSchema.index({ phoneNumber: 1, status: 1 });

export const PaymentDeviceModel = model<PaymentDeviceDocument>(
  "PaymentDevice",
  paymentDeviceSchema
);
