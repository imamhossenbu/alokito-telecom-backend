import { Types, ClientSession } from "mongoose";
import { WalletModel } from "./wallet.model";

export const walletRepository = {
  async createForUser(userId: Types.ObjectId, session?: ClientSession) {
    const [wallet] = await WalletModel.create([{ userId, balance: 0 }], {
      session,
    });
    return wallet;
  },
};
