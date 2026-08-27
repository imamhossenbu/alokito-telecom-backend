import { Request, Response } from "express";
import { adminAuthService, adminDashboardService } from "./admin.service";
import { sendSuccess } from "../../shared/utils/api-response";
import { adminLoginBodySchema } from "../auth/auth.schema";

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
};
