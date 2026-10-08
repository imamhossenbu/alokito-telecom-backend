import { Request, Response } from "express";
import { topUpService } from "./topup.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import { createTopUpBodySchema, verifyTopUpBodySchema } from "./topup.schema";
import { UnauthorizedError } from "../../shared/errors/app-error";

function getActorUserId(req: Request): string {
  if (!req.actor || req.actor.type !== "CUSTOMER") {
    throw new UnauthorizedError();
  }
  return req.actor.userId;
}

export const topUpController = {
  async createTopUp(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const body = createTopUpBodySchema.parse(req.body);
    const topUp = await topUpService.createTopUp(
      userId,
      body.provider,
      body.amount,
      body.transactionId,
      body.senderPhone
    );
    sendCreated(res, { data: topUp });
  },

  async verifyTopUp(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const body = verifyTopUpBodySchema.parse(req.body);
    const result = await topUpService.verifyTopUp(userId, req.params.id, body.transactionId);
    sendSuccess(res, { data: result });
  },

  async getTopUps(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await topUpService.getTopUps(userId, page, limit);
    sendSuccess(res, { data: result });
  },

  async getTopUpById(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const topUp = await topUpService.getTopUpById(userId, req.params.id);
    sendSuccess(res, { data: topUp });
  },

  async adminGetPendingTopUps(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const result = await topUpService.adminGetPendingTopUps(page, limit);
    sendSuccess(res, { data: result });
  },

  async adminApproveTopUp(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const result = await topUpService.adminApproveTopUp(
      req.actor.adminId,
      req.params.id,
      req.body?.adminNote
    );
    sendSuccess(res, { data: result });
  },

  async adminRejectTopUp(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const result = await topUpService.adminRejectTopUp(
      req.actor.adminId,
      req.params.id,
      req.body?.reason || "Rejected by admin"
    );
    sendSuccess(res, { data: result });
  },
};
