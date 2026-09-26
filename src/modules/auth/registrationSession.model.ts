import { Schema, model, Document, Types } from "mongoose";

export const RegistrationSessionStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type RegistrationSessionStatusType =
  (typeof RegistrationSessionStatus)[keyof typeof RegistrationSessionStatus];

export interface RegistrationSessionDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  emailNormalized: string;
  phone: string;
  pinHash: string;

  nidFrontImagePublicId?: string;
  nidFrontImageFormat?: string;
  nidBackImagePublicId?: string;
  nidBackImageFormat?: string;

  nidNumber?: string;
  nameBn?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: Date;
  address?: string;
  gender?: string;

  verificationSessionId?: Types.ObjectId;
  status: RegistrationSessionStatusType;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const registrationSessionSchema = new Schema<RegistrationSessionDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    emailNormalized: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    pinHash: { type: String, required: true, select: false },

    nidFrontImagePublicId: { type: String },
    nidFrontImageFormat: { type: String },
    nidBackImagePublicId: { type: String },
    nidBackImageFormat: { type: String },

    nidNumber: { type: String },
    nameBn: { type: String },
    fatherName: { type: String },
    motherName: { type: String },
    dateOfBirth: { type: Date },
    address: { type: String },
    gender: { type: String, default: "MALE" },

    verificationSessionId: {
      type: Schema.Types.ObjectId,
      ref: "VerificationSession",
    },
    status: {
      type: String,
      enum: Object.values(RegistrationSessionStatus),
      default: RegistrationSessionStatus.PENDING,
      required: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

registrationSessionSchema.index({ emailNormalized: 1, status: 1 });
// TTL cleanup: Mongo removes documents automatically once expiresAt passes,
// keeping the collection small (spec section 90 — expired registration cleanup).
registrationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RegistrationSessionModel = model<RegistrationSessionDocument>(
  "RegistrationSession",
  registrationSessionSchema,
);
