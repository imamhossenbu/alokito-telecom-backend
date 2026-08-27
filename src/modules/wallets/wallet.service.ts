import { Types } from "mongoose";
import { walletRepository } from "./wallet.repository";
import { walletTransactionRepository } from "../walletTransactions/walletTransaction.repository";
import { NotFoundError, UnauthorizedError } from "../../shared/errors/app-error";

export const walletService = {
  async getWalletByUserId(userId: string) {
    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundError("WALLET_NOT_FOUND", "Wallet not found for user");
    }
    return wallet;
  },

  async getTransactions(userId: string, page = 1, limit = 20) {
    return walletTransactionRepository.findByUserId(userId, page, limit);
  },

  async getTransactionById(userId: string, transactionId: string) {
    const tx = await walletTransactionRepository.findById(transactionId);
    if (!tx) {
      throw new NotFoundError("NOT_FOUND", "Transaction not found");
    }
    if (tx.userId.toString() !== userId) {
      throw new UnauthorizedError("You are not authorized to view this transaction");
    }
    return tx;
  },
};
