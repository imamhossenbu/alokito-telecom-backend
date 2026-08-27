import { Schema, model, Document, Types } from "mongoose";

export const OperatorStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type OperatorStatusType = (typeof OperatorStatus)[keyof typeof OperatorStatus];

export interface OperatorDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  logoUrl?: string;
  status: OperatorStatusType;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const operatorSchema = new Schema<OperatorDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    logoUrl: { type: String },
    status: {
      type: String,
      enum: Object.values(OperatorStatus),
      default: OperatorStatus.ACTIVE,
      required: true,
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

operatorSchema.index({ status: 1, sortOrder: 1 });

export const OperatorModel = model<OperatorDocument>("Operator", operatorSchema);
