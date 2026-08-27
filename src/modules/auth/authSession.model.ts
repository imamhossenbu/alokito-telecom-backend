import { Schema, model, Document, Types } from "mongoose";

export const DeviceType = {
  ANDROID: "ANDROID",
  WEB: "WEB",
  IOS: "IOS",
  OTHER: "OTHER",
} as const;
export type DeviceTypeType = (typeof DeviceType)[keyof typeof DeviceType];

export interface AuthSessionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  deviceId: string;
  deviceType: DeviceTypeType;
  refreshTokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
}

const authSessionSchema = new Schema<AuthSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deviceId: { type: String, required: true },
    deviceType: {
      type: String,
      enum: Object.values(DeviceType),
      required: true,
      default: DeviceType.OTHER,
    },
    refreshTokenHash: { type: String, required: true, select: false },
    ipAddress: { type: String },
    userAgent: { type: String },
    lastUsedAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokedReason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

authSessionSchema.index({ userId: 1, deviceId: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthSessionModel = model<AuthSessionDocument>(
  "AuthSession",
  authSessionSchema,
);
