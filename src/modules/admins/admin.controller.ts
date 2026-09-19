import { Request, Response } from "express";
import {
  adminAuthService,
  adminDashboardService,
  adminWalletService,
  adminProfileService,
  adminNotificationService,
} from "./admin.service";
import { sendSuccess } from "../../shared/utils/api-response";
import { adminLoginBodySchema } from "../auth/auth.schema";

function getAdminId(req: Request): string {
  if (req.actor && req.actor.type === "ADMIN") {
    return req.actor.adminId;
  }
  return (
    (req as any).admin?.id ||
    (req as any).admin?._id ||
    (req as any).admin?.sub ||
    ""
  );
}

export const adminController = {
  async login(req: Request, res: Response) {
    const body = adminLoginBodySchema.parse(req.body);
    const result = await adminAuthService.login(body);
    sendSuccess(res, { data: result });
  },

  async getDashboard(req: Request, res: Response) {
    const result = await adminDashboardService.getDashboardData();
    sendSuccess(res, { data: result });
  },

  async getProfile(req: Request, res: Response) {
    const adminId = getAdminId(req);
    const result = await adminProfileService.getProfile(adminId);
    sendSuccess(res, { data: result });
  },

  async updateProfile(req: Request, res: Response) {
    const adminId = getAdminId(req);
    const result = await adminProfileService.updateProfile(adminId, req.body);
    sendSuccess(res, { data: result });
  },

  async uploadProfilePhoto(req: Request, res: Response) {
    const adminId = getAdminId(req);
    const filesList = Array.isArray(req.files)
      ? req.files
      : req.files
        ? Object.values(req.files).flat()
        : [];
    const file = req.file || filesList[0];
    const photoUrl = req.body?.photoUrl || req.body?.profileImageUrl;
    const result = await adminProfileService.uploadProfilePhoto(adminId, file, photoUrl);
    sendSuccess(res, { data: result });
  },

  async changePassword(req: Request, res: Response) {
    const adminId = getAdminId(req);
    const { currentPassword, newPassword } = req.body;
    const result = await adminProfileService.changePassword(adminId, currentPassword, newPassword);
    sendSuccess(res, { data: result });
  },

  async getNotifications(req: Request, res: Response) {
    const adminId = getAdminId(req);
    const result = await adminNotificationService.getNotifications(adminId);
    sendSuccess(res, { data: result });
  },

  async markNotificationRead(req: Request, res: Response) {
    const id = req.params.id;
    const result = adminNotificationService.markRead(id);
    sendSuccess(res, { data: result });
  },

  async markAllNotificationsRead(req: Request, res: Response) {
    const ids = req.body.ids || [];
    const result = adminNotificationService.markAllRead(ids);
    sendSuccess(res, { data: result });
  },

  async getWalletTransactions(req: Request, res: Response) {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;
    const result = await adminWalletService.getWalletTransactions({ page, limit, type, search });
    sendSuccess(res, { data: result });
  },

  async getWalletSummary(req: Request, res: Response) {
    const result = await adminWalletService.getWalletSummary();
    sendSuccess(res, { data: result });
  },
};

