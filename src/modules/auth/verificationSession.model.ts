import { Schema, model, Document, Types } from "mongoose";

export const VerificationPurpose = {
  REGISTER: "REGISTER",
  LOGIN_NEW_DEVICE: "LOGIN_NEW_DEVICE",
  FORGOT_PIN: "FORGOT_PIN",
  CHANGE_EMAIL: "CHANGE_EMAIL",
  CHANGE_PHONE: "CHANGE_PHONE",
} as const;
export type VerificationPurposeType =
  (typeof VerificationPurpose)[keyof typeof VerificationPurpose];

export interface VerificationSessionDocument extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  registrationSessionId?: Types.ObjectId;
  email: string;
  purpose: VerificationPurposeType;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  verifiedAt?: Date;
  consumedAt?: Date;
  lastSentAt: Date;
  createdAt: Date;
}

const verificationSessionSchema = new Schema<VerificationSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    registrationSessionId: {
      type: Schema.Types.ObjectId,
      ref: "RegistrationSession",
    },
    email: { type: String, required: true, trim: true },
    purpose: {
      type: String,
      enum: Object.values(VerificationPurpose),
      required: true,
    },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date },
    consumedAt: { type: Date },
    lastSentAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

verificationSessionSchema.index({ email: 1, purpose: 1, createdAt: -1 });
verificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 }); // grace period past expiry, then TTL-cleaned

export const VerificationSessionModel = model<VerificationSessionDocument>(
  "VerificationSession",
  verificationSessionSchema,
);
