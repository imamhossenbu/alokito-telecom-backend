import { Schema, model, Document, Types } from "mongoose";
import { WalletTransactionType, TransactionDirection } from "../../shared/enums";

export interface WalletTransactionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  walletId: Types.ObjectId;
  transactionId: string;
  type: string;
  direction: string;
  /** Integer poisha */
  amount: number;
  /** Integer poisha */
  balanceBefore: number;
  /** Integer poisha */
  balanceAfter: number;
  referenceType: "TOP_UP" | "ORDER" | "REFUND" | "ADMIN_ADJUSTMENT";
  referenceId: Types.ObjectId;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const walletTransactionSchema = new Schema<WalletTransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    transactionId: { type: String, required: true, unique: true },
    type: { type: String, enum: Object.values(WalletTransactionType), required: true },
    direction: { type: String, enum: Object.values(TransactionDirection), required: true },
    amount: { type: Number, required: true, min: 0 },
    balanceBefore: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    referenceType: {
      type: String,
      enum: ["TOP_UP", "ORDER", "REFUND", "ADMIN_ADJUSTMENT"],
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ referenceType: 1, referenceId: 1 });

export const WalletTransactionModel = model<WalletTransactionDocument>(
  "WalletTransaction",
  walletTransactionSchema
);
