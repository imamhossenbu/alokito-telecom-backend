import { Types, ClientSession } from "mongoose";
import { WalletModel } from "./wallet.model";

export const walletRepository = {
  async createForUser(userId: Types.ObjectId, session?: ClientSession) {
    const [wallet] = await WalletModel.create([{ userId, balance: 0 }], {
      session,
    });
    return wallet;
  },

  findByUserId(userId: string | Types.ObjectId, session?: ClientSession) {
    return WalletModel.findOne({ userId }).session(session || null);
  },

  findById(id: string | Types.ObjectId, session?: ClientSession) {
    return WalletModel.findById(id).session(session || null);
  },

  async debitBalance(userId: Types.ObjectId, amount: number, version: number, session?: ClientSession) {
    // Decrements the balance and increments the version using optimistic lock logic
    const result = await WalletModel.updateOne(
      { userId, version, status: "ACTIVE", balance: { $gte: amount } },
      { $inc: { balance: -amount, version: 1 } },
      { session }
    );
    return result.modifiedCount > 0;
  },

  async creditBalance(userId: Types.ObjectId, amount: number, session?: ClientSession) {
    // Increments the balance and version
    const result = await WalletModel.updateOne(
      { userId, status: "ACTIVE" },
      { $inc: { balance: amount, version: 1 } },
      { session }
    );
    return result.modifiedCount > 0;
  },
};
