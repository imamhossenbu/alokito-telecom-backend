import { Schema, model, Document, Types } from "mongoose";

export interface TrustedDeviceDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  deviceId: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
  trustedAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const trustedDeviceSchema = new Schema<TrustedDeviceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deviceId: { type: String, required: true },
    deviceName: { type: String },
    platform: { type: String },
    appVersion: { type: String },
    trustedAt: { type: Date, required: true, default: () => new Date() },
    lastUsedAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

trustedDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const TrustedDeviceModel = model<TrustedDeviceDocument>(
  "TrustedDevice",
  trustedDeviceSchema,
);
