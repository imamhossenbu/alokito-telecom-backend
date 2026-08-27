import { Types, ClientSession } from "mongoose";
import { WalletTransactionModel, WalletTransactionDocument } from "./walletTransaction.model";
import { generateReferenceId, IdPrefix } from "../../shared/utils/id-generator";

export const walletTransactionRepository = {
  async create(
    data: Omit<Partial<WalletTransactionDocument>, "transactionId">,
    session?: ClientSession
  ) {
    const transactionId = generateReferenceId(IdPrefix.WALLET_TRANSACTION);
    const [doc] = await WalletTransactionModel.create([{ ...data, transactionId }], { session });
    return doc;
  },

  findById(id: string | Types.ObjectId) {
    return WalletTransactionModel.findById(id);
  },

  async findByUserId(userId: string | Types.ObjectId, page = 1, limit = 20) {
    const filter = { userId: new Types.ObjectId(userId) };
    const total = await WalletTransactionModel.countDocuments(filter);
    const docs = await WalletTransactionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },
};
