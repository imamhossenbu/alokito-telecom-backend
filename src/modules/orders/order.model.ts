import { Schema, model, Document, Types } from "mongoose";
import { OrderStatus, OrderStatusType } from "../../shared/enums";

export const ActivationStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type ActivationStatusType = (typeof ActivationStatus)[keyof typeof ActivationStatus];

export interface OrderDocument extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  transactionId: string;
  userId: Types.ObjectId;
  userPhone: string;
  operatorId: Types.ObjectId;
  offerId: Types.ObjectId;
  offerType: "NORMAL" | "DRIVE";
  offerName: string;
  offerValue: string;
  validity: string;
  /** Integer poisha snapshot */
  price: number;
  paymentMethod: "WALLET" | "MANUAL";
  walletTransactionId?: Types.ObjectId;
  orderSource: "CUSTOMER" | "ADMIN_MANUAL";
  orderStatus: OrderStatusType;
  activationStatus: ActivationStatusType;
  activationProcessedBy?: Types.ObjectId;
  activationProcessedAt?: Date;
  failureReason?: string;
  refundReason?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    transactionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userPhone: { type: String, required: true },
    operatorId: { type: Schema.Types.ObjectId, ref: "Operator", required: true },
    offerId: { type: Schema.Types.ObjectId, required: true },
    offerType: { type: String, enum: ["NORMAL", "DRIVE"], required: true },
    offerName: { type: String, required: true },
    offerValue: { type: String, required: true },
    validity: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["WALLET", "MANUAL"], required: true },
    walletTransactionId: { type: Schema.Types.ObjectId, ref: "WalletTransaction" },
    orderSource: { type: String, enum: ["CUSTOMER", "ADMIN_MANUAL"], required: true },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.ACTIVATION_PENDING,
      required: true,
    },
    activationStatus: {
      type: String,
      enum: Object.values(ActivationStatus),
      default: ActivationStatus.PENDING,
      required: true,
    },
    activationProcessedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    activationProcessedAt: { type: Date },
    failureReason: { type: String },
    refundReason: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ transactionId: 1 }, { unique: true });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ operatorId: 1, createdAt: -1 });
orderSchema.index({ orderSource: 1, createdAt: -1 });

export const OrderModel = model<OrderDocument>("Order", orderSchema);
