import { Request, Response } from "express";
import { walletService } from "./wallet.service";
import { sendSuccess } from "../../shared/utils/api-response";
import { UnauthorizedError, AppError } from "../../shared/errors/app-error";

function getActorUserId(req: Request): string {
  if (!req.actor || req.actor.type !== "CUSTOMER") {
    throw new UnauthorizedError();
  }
  return req.actor.userId;
}

export const walletController = {
  async getWallet(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const wallet = await walletService.getWalletByUserId(userId);
    sendSuccess(res, { data: wallet });
  },

  async getTransactions(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await walletService.getTransactions(userId, page, limit);
    sendSuccess(res, { data: result });
  },

  async getTransactionById(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const tx = await walletService.getTransactionById(userId, req.params.id);
    sendSuccess(res, { data: tx });
  },

  async adminAdjustBalance(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const targetUserId = (req.body.userId || req.body.customerId || req.params.id)?.toString();
    const rawAmount = req.body.amountBdt ?? req.body.amount;
    const { action, reason } = req.body;

    if (!targetUserId) {
      throw new AppError("VALIDATION_ERROR", "User ID or phone number is required", 400);
    }

    const parsedAmount = typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError("VALIDATION_ERROR", "Valid amount greater than 0 is required", 400);
    }

    const result = await walletService.adminAdjustBalance({
      userId: targetUserId,
      amountBdt: parsedAmount,
      action: action === "DEBIT" ? "DEBIT" : "CREDIT",
      reason: reason || "Manual Admin Adjustment",
      adminId: req.actor.adminId,
    });
    sendSuccess(res, { data: result });
  },
};
