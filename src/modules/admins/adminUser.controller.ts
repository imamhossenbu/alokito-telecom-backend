import { Request, Response } from "express";
import { adminUserService } from "./adminuser.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import { UnauthorizedError } from "../../shared/errors/app-error";
import {
  listUsersQuerySchema,
  adminCreateCustomerBodySchema,
  adminUpdateCustomerBodySchema,
  idParamsSchema,
} from "../users/user.schema";

function requireAdmin(req: Request): string {
  if (!req.actor || req.actor.type !== "ADMIN") {
    throw new UnauthorizedError();
  }
  return req.actor.adminId;
}

export const adminUserController = {
  async list(req: Request, res: Response) {
    requireAdmin(req);
    const query = listUsersQuerySchema.parse(req.query);
    const { items, meta } = await adminUserService.list(query);
    sendSuccess(res, { data: items, meta });
  },

  async getById(req: Request, res: Response) {
    requireAdmin(req);
    const { id } = idParamsSchema.parse(req.params);
    const data = await adminUserService.getById(id);
    sendSuccess(res, { data });
  },

  async create(req: Request, res: Response) {
    const adminId = requireAdmin(req);
    const body = adminCreateCustomerBodySchema.parse(req.body);
    const data = await adminUserService.create(adminId, body);
    sendCreated(res, data);
  },

  async update(req: Request, res: Response) {
    requireAdmin(req);
    const { id } = idParamsSchema.parse(req.params);
    const body = adminUpdateCustomerBodySchema.parse(req.body);
    const data = await adminUserService.update(id, body);
    sendSuccess(res, { data });
  },

  async block(req: Request, res: Response) {
    requireAdmin(req);
    const { id } = idParamsSchema.parse(req.params);
    const data = await adminUserService.block(id);
    sendSuccess(res, { data });
  },

  async unblock(req: Request, res: Response) {
    requireAdmin(req);
    const { id } = idParamsSchema.parse(req.params);
    const data = await adminUserService.unblock(id);
    sendSuccess(res, { data });
  },

  async resetPin(req: Request, res: Response) {
    requireAdmin(req);
    const { id } = idParamsSchema.parse(req.params);
    await adminUserService.resetPin(id);
    sendSuccess(res, { data: { pinReset: true } });
  },

  async softDelete(req: Request, res: Response) {
    const adminId = requireAdmin(req);
    const { id } = idParamsSchema.parse(req.params);
    await adminUserService.softDelete(id, adminId);
    sendSuccess(res, { data: { deleted: true } });
  },
};
