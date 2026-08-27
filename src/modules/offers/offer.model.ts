import { Schema, model, Document, Types } from "mongoose";
import { OfferCategory, OfferCategoryType } from "../../shared/enums";

export const OfferStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type OfferStatusType = (typeof OfferStatus)[keyof typeof OfferStatus];

export interface OfferDocument extends Document {
  _id: Types.ObjectId;
  operatorId: Types.ObjectId;
  name: string;
  category: OfferCategoryType;
  type: string;
  offerValue: string;
  validity: string;
  /** Integer poisha (1 BDT = 100 poisha) */
  sellingPrice: number;
  activationCode?: string;
  description?: string;
  status: OfferStatusType;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<OfferDocument>(
  {
    operatorId: { type: Schema.Types.ObjectId, ref: "Operator", required: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(OfferCategory),
      required: true,
    },
    type: { type: String, required: true, trim: true },
    offerValue: { type: String, required: true, trim: true },
    validity: { type: String, required: true, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    activationCode: { type: String },
    description: { type: String },
    status: {
      type: String,
      enum: Object.values(OfferStatus),
      default: OfferStatus.ACTIVE,
      required: true,
    },
  },
  { timestamps: true }
);

offerSchema.index({ operatorId: 1, status: 1 });
offerSchema.index({ category: 1, status: 1 });
offerSchema.index({ status: 1, createdAt: -1 });

export const OfferModel = model<OfferDocument>("Offer", offerSchema);
