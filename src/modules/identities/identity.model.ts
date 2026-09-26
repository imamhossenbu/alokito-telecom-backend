import { Schema, model, Document, Types } from "mongoose";

export const NidExtractionStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  EXTRACTED: "EXTRACTED",
  FAILED: "FAILED",
  CONFIRMED: "CONFIRMED",
} as const;
export type NidExtractionStatusType =
  (typeof NidExtractionStatus)[keyof typeof NidExtractionStatus];

export const NidVerificationStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
} as const;
export type NidVerificationStatusType =
  (typeof NidVerificationStatus)[keyof typeof NidVerificationStatus];

interface ExtractionConfidence {
  nidNumber?: number;
  dateOfBirth?: number;
  address?: number;
  name?: number;
}

export interface UserIdentityDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  nidNumber: string;
  name?: string;
  nameBn?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth: Date;
  address: string;
  gender?: string;
  // Cloudinary public IDs — never a raw/public URL. Signed URLs are
  // generated on demand via storageProvider.getSignedUrl() (spec 78).
  nidFrontImagePublicId?: string;
  nidFrontImageFormat?: string;
  nidBackImagePublicId?: string;
  nidBackImageFormat?: string;
  extractionStatus: NidExtractionStatusType;
  verificationStatus: NidVerificationStatusType;
  extractionConfidence?: ExtractionConfidence;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userIdentitySchema = new Schema<UserIdentityDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    nidNumber: { type: String, required: true },
    name: { type: String },
    nameBn: { type: String },
    fatherName: { type: String },
    motherName: { type: String },
    dateOfBirth: { type: Date, required: true },
    address: { type: String, required: true },
    gender: { type: String, default: "MALE" },
    nidFrontImagePublicId: { type: String },
    nidFrontImageFormat: { type: String },
    nidBackImagePublicId: { type: String },
    nidBackImageFormat: { type: String },
    extractionStatus: {
      type: String,
      enum: Object.values(NidExtractionStatus),
      default: NidExtractionStatus.CONFIRMED,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(NidVerificationStatus),
      default: NidVerificationStatus.CONFIRMED,
      required: true,
    },
    extractionConfidence: {
      nidNumber: Number,
      dateOfBirth: Number,
      address: Number,
      name: Number,
    },
    confirmedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const UserIdentityModel = model<UserIdentityDocument>(
  "UserIdentity",
  userIdentitySchema,
);
