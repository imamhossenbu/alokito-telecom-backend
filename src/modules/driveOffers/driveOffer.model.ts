import { Schema, model, Document, Types } from "mongoose";
import { OfferCategory, OfferCategoryType } from "../../shared/enums";

export const DriveOfferStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type DriveOfferStatusType = (typeof DriveOfferStatus)[keyof typeof DriveOfferStatus];

export interface DriveOfferDocument extends Document {
  _id: Types.ObjectId;
  operatorId: Types.ObjectId;
  offerName: string;
  category: OfferCategoryType;
  offerType: string;
  offerValue: string;
  validity: string;
  /** Integer poisha (1 BDT = 100 poisha). Admin only. */
  purchasePrice: number;
  /** Integer poisha (1 BDT = 100 poisha). Public. */
  sellingPrice: number;
  activationCode?: string;
  description?: string;
  status: DriveOfferStatusType;
  createdAt: Date;
  updatedAt: Date;
}

const driveOfferSchema = new Schema<DriveOfferDocument>(
  {
    operatorId: { type: Schema.Types.ObjectId, ref: "Operator", required: true },
    offerName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(OfferCategory),
      required: true,
    },
    offerType: { type: String, required: true, trim: true },
    offerValue: { type: String, required: true, trim: true },
    validity: { type: String, required: true, trim: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    activationCode: { type: String },
    description: { type: String },
    status: {
      type: String,
      enum: Object.values(DriveOfferStatus),
      default: DriveOfferStatus.ACTIVE,
      required: true,
    },
  },
  { timestamps: true }
);

driveOfferSchema.index({ operatorId: 1, status: 1 });
driveOfferSchema.index({ category: 1, status: 1 });
driveOfferSchema.index({ status: 1, createdAt: -1 });

export const DriveOfferModel = model<DriveOfferDocument>("DriveOffer", driveOfferSchema);
