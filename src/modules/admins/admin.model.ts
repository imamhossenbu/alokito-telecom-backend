import { Schema, model, Document, Types } from "mongoose";

export const AdminStatus = {
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
} as const;
export type AdminStatusType = (typeof AdminStatus)[keyof typeof AdminStatus];

export interface AdminDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  emailNormalized: string;
  phone?: string;
  passwordHash: string;
  profileImageUrl?: string;
  role: "ADMIN";
  status: AdminStatusType;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    emailNormalized: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String },
    passwordHash: { type: String, required: true, select: false },
    profileImageUrl: { type: String },
    role: { type: String, enum: ["ADMIN"], default: "ADMIN", required: true },
    status: {
      type: String,
      enum: Object.values(AdminStatus),
      default: AdminStatus.ACTIVE,
      required: true,
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

adminSchema.index({ emailNormalized: 1 }, { unique: true });

export const AdminModel = model<AdminDocument>("Admin", adminSchema);
