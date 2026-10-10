import { Request, Response } from "express";
import { userService } from "./user.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import {
  UnauthorizedError,
  ValidationError,
} from "../../shared/errors/app-error";
import {
  updateProfileBodySchema,
  createCustomerBodySchema,
  deviceIdParamsSchema,
} from "./user.schema";
import { changePinBodySchema } from "../auth/auth.schema";

function requireCustomer(req: Request): string {
  if (!req.actor || req.actor.type !== "CUSTOMER") {
    throw new UnauthorizedError();
  }
  return req.actor.userId;
}

export const userController = {
  async getMe(req: Request, res: Response) {
    const userId = requireCustomer(req);
    const data = await userService.getMe(userId);
    sendSuccess(res, { data });
  },

  async updateMe(req: Request, res: Response) {
    const userId = requireCustomer(req);
    const body = updateProfileBodySchema.parse(req.body);
    const data = await userService.updateMe(userId, body);
    sendSuccess(res, { data });
  },

  async uploadProfileImage(req: Request, res: Response) {
    const userId = requireCustomer(req);
    const file = req.file;
    if (!file) throw new ValidationError("profileImage file is required");
    const data = await userService.uploadProfileImage(userId, file);
    sendSuccess(res, { data });
  },

  async getIdentity(req: Request, res: Response) {
    const userId = requireCustomer(req);
    const data = await userService.getIdentity(userId);
    sendSuccess(res, { data });
  },

  async listTrustedDevices(req: Request, res: Response) {
    const userId = requireCustomer(req);
    const data = await userService.listTrustedDevices(userId);
    sendSuccess(res, { data });
  },

  async revokeTrustedDevice(req: Request, res: Response) {
    const userId = requireCustomer(req);
    const { deviceId } = deviceIdParamsSchema.parse(req.params);
    await userService.revokeTrustedDevice(userId, deviceId);
    sendSuccess(res, { data: { revoked: true } });
  },

  async changePin(req: Request, res: Response) {
    const userId = requireCustomer(req);
    const body = changePinBodySchema.parse(req.body);
    await userService.changePin(userId, body);
    sendSuccess(res, { data: { pinChanged: true } });
  },

  async getMyPin(req: Request, res: Response) {
    const userId = requireCustomer(req);
    const data = await userService.getPin(userId);
    sendSuccess(res, { data });
  },

  async createCustomer(req: Request, res: Response) {
    const userId = requireCustomer(req);
    const body = createCustomerBodySchema.parse(req.body);
    const data = await userService.createCustomer(userId, body);
    sendCreated(res, data);
  },
};
