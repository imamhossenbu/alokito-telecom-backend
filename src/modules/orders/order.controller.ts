import { Request, Response } from "express";
import { orderService } from "./order.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import { createOrderBodySchema, adminCreateManualOrderBodySchema } from "./order.schema";
import { UnauthorizedError } from "../../shared/errors/app-error";

export const orderController = {
  // ── Customer Endpoints ───────────────────────────────
  async createOrder(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "CUSTOMER") {
      throw new UnauthorizedError();
    }
    const body = createOrderBodySchema.parse(req.body);
    const result = await orderService.createOrder(
      req.actor.userId,
      body.offerId,
      body.offerType,
      body.phone
    );
    sendCreated(res, result);
  },

  async getCustomerOrders(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "CUSTOMER") {
      throw new UnauthorizedError();
    }
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await orderService.getCustomerOrders(req.actor.userId, page, limit);
    sendSuccess(res, { data: result });
  },

  async getCustomerOrderById(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "CUSTOMER") {
      throw new UnauthorizedError();
    }
    const order = await orderService.getCustomerOrderById(req.actor.userId, req.params.id);
    sendSuccess(res, { data: order });
  },

  // ── Admin Endpoints ──────────────────────────────────
  async adminGetOrders(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await orderService.adminGetOrders(req.query, page, limit);
    sendSuccess(res, { data: result });
  },

  async adminGetOrderById(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const order = await orderService.adminGetOrderById(req.params.id);
    sendSuccess(res, { data: order });
  },

  async adminCreateManualOrder(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const body = adminCreateManualOrderBodySchema.parse(req.body);
    const order = await orderService.adminCreateManualOrder(body, req.actor.adminId);
    sendCreated(res, { data: order });
  },

  async adminProcessOrder(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const order = await orderService.adminProcessOrder(req.params.id, req.actor.adminId);
    sendSuccess(res, { data: order });
  },

  async adminCompleteOrder(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const order = await orderService.adminCompleteOrder(req.params.id, req.actor.adminId);
    sendSuccess(res, { data: order });
  },

  async adminFailOrder(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const failureReason = req.body.failureReason || "Failed by Administrator";
    const order = await orderService.adminFailOrder(req.params.id, failureReason, req.actor.adminId);
    sendSuccess(res, { data: order });
  },

  async adminCancelOrder(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const order = await orderService.adminCancelOrder(req.params.id, req.actor.adminId);
    sendSuccess(res, { data: order });
  },
};
