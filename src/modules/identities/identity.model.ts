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
  dateOfBirth: Date;
  address: string;
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
    nidNumber: { type: String, required: true, select: false },
    dateOfBirth: { type: Date, required: true, select: false },
    address: { type: String, required: true, select: false },
    nidFrontImagePublicId: { type: String, select: false },
    nidFrontImageFormat: { type: String, select: false },
    nidBackImagePublicId: { type: String, select: false },
    nidBackImageFormat: { type: String, select: false },
    extractionStatus: {
      type: String,
      enum: Object.values(NidExtractionStatus),
      default: NidExtractionStatus.PENDING,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(NidVerificationStatus),
      default: NidVerificationStatus.PENDING,
      required: true,
    },
    extractionConfidence: {
      nidNumber: Number,
      dateOfBirth: Number,
      address: Number,
      name: Number,
    },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
);

export const UserIdentityModel = model<UserIdentityDocument>(
  "UserIdentity",
  userIdentitySchema,
);
