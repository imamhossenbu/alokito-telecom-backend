import { Request, Response } from "express";
import { refundService } from "./refund.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import { createRefundBodySchema } from "./refund.schema";
import { UnauthorizedError } from "../../shared/errors/app-error";

export const refundController = {
  // ── Customer Endpoints ───────────────────────────────
  async getCustomerRefunds(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "CUSTOMER") {
      throw new UnauthorizedError();
    }
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await refundService.getCustomerRefunds(req.actor.userId, page, limit);
    sendSuccess(res, { data: result });
  },

  async getCustomerRefundById(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "CUSTOMER") {
      throw new UnauthorizedError();
    }
    const refund = await refundService.getCustomerRefundById(req.actor.userId, req.params.id);
    sendSuccess(res, { data: refund });
  },

  // ── Admin Endpoints ──────────────────────────────────
  async adminGetRefunds(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await refundService.adminGetRefunds(req.query, page, limit);
    sendSuccess(res, { data: result });
  },

  async adminGetRefundById(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const refund = await refundService.adminGetRefundById(req.params.id);
    sendSuccess(res, { data: refund });
  },

  async adminRefundOrder(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const body = createRefundBodySchema.parse(req.body);
    const refund = await refundService.adminRefundOrder(req.params.id, body.reason, req.actor.adminId);
    sendCreated(res, { data: refund });
  },
};
