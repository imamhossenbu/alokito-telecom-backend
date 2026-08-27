import { Request, Response } from "express";
import { walletService } from "./wallet.service";
import { sendSuccess } from "../../shared/utils/api-response";
import { UnauthorizedError } from "../../shared/errors/app-error";

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
};
