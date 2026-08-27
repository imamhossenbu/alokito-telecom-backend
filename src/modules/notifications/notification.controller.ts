import { Request, Response } from "express";
import { notificationService } from "./notification.service";
import { sendSuccess } from "../../shared/utils/api-response";
import { UnauthorizedError } from "../../shared/errors/app-error";

function getActorUserId(req: Request): string {
  if (!req.actor || req.actor.type !== "CUSTOMER") {
    throw new UnauthorizedError();
  }
  return req.actor.userId;
}

export const notificationController = {
  async getNotifications(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await notificationService.getNotifications(userId, page, limit);
    sendSuccess(res, { data: result });
  },

  async getNotificationById(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const notification = await notificationService.getNotificationById(userId, req.params.id);
    sendSuccess(res, { data: notification });
  },

  async markAsRead(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const notification = await notificationService.markAsRead(userId, req.params.id);
    sendSuccess(res, { data: notification });
  },

  async markAllAsRead(req: Request, res: Response) {
    const userId = getActorUserId(req);
    const result = await notificationService.markAllAsRead(userId);
    sendSuccess(res, { data: result });
  },
};
