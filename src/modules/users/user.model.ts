import { Schema, model, Document, Types } from "mongoose";
import { AccountStatus, AccountStatusType } from "../../shared/enums";

export const CreatedByType = {
  SELF: "SELF",
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
} as const;
export type CreatedByTypeType =
  (typeof CreatedByType)[keyof typeof CreatedByType];

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  emailNormalized: string;
  phone: string;
  pinHash: string;
  profileImagePublicId?: string;
  profileImageUrl?: string;
  district?: string;
  address?: string;
  emailVerifiedAt?: Date;
  accountStatus: AccountStatusType;
  mustChangePin: boolean;
  createdByType: CreatedByTypeType;
  createdById?: Types.ObjectId;
  lastLoginAt?: Date;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
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
    profileImagePublicId: { type: String },
    profileImageUrl: { type: String },
    district: { type: String },
    address: { type: String },
    emailVerifiedAt: { type: Date },
    accountStatus: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.PENDING,
      required: true,
    },
    mustChangePin: { type: Boolean, default: false },
    createdByType: {
      type: String,
      enum: Object.values(CreatedByType),
      required: true,
      default: CreatedByType.SELF,
    },
    createdById: { type: Schema.Types.ObjectId },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true },
);

userSchema.index({ emailNormalized: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ accountStatus: 1, createdAt: -1 });
userSchema.index({ createdByType: 1, createdById: 1 });
userSchema.index({ district: 1 });
userSchema.index({ name: "text" });

export const UserModel = model<UserDocument>("User", userSchema);
