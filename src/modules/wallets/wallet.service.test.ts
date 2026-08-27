import { describe, it, expect, vi, beforeEach } from "vitest";
import { walletService } from "./wallet.service";
import { walletRepository } from "./wallet.repository";
import { walletTransactionRepository } from "../walletTransactions/walletTransaction.repository";
import { NotFoundError, UnauthorizedError } from "../../shared/errors/app-error";

vi.mock("./wallet.repository");
vi.mock("../walletTransactions/walletTransaction.repository");

describe("Wallet Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWalletByUserId", () => {
    it("should return the wallet if it exists", async () => {
      const mockWallet = { id: "w123", userId: "u123", balance: 50000 };
      vi.mocked(walletRepository.findByUserId).mockResolvedValue(mockWallet as any);

      const result = await walletService.getWalletByUserId("u123");
      expect(result).toEqual(mockWallet);
      expect(walletRepository.findByUserId).toHaveBeenCalledWith("u123");
    });

    it("should throw NotFoundError if the wallet does not exist", async () => {
      vi.mocked(walletRepository.findByUserId).mockResolvedValue(null);

      await expect(walletService.getWalletByUserId("u123")).rejects.toThrow(NotFoundError);
    });
  });

  describe("getTransactionById", () => {
    it("should return transaction if it exists and belongs to the user", async () => {
      const mockTx = { _id: "tx123", userId: "u123", amount: 1000 };
      vi.mocked(walletTransactionRepository.findById).mockResolvedValue(mockTx as any);

      const result = await walletService.getTransactionById("u123", "tx123");
      expect(result).toEqual(mockTx);
    });

    it("should throw NotFoundError if transaction is not found", async () => {
      vi.mocked(walletTransactionRepository.findById).mockResolvedValue(null);

      await expect(walletService.getTransactionById("u123", "tx123")).rejects.toThrow(NotFoundError);
    });

    it("should throw UnauthorizedError if transaction belongs to another user", async () => {
      const mockTx = { _id: "tx123", userId: "other-user", amount: 1000 };
      vi.mocked(walletTransactionRepository.findById).mockResolvedValue(mockTx as any);

      await expect(walletService.getTransactionById("u123", "tx123")).rejects.toThrow(UnauthorizedError);
    });
  });
});
