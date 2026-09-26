import { Request, Response } from "express";
import { systemSettingsService } from "./systemSettings.service";
import { sendSuccess } from "../../shared/utils/api-response";
import { UnauthorizedError } from "../../shared/errors/app-error";

export const systemSettingsController = {
  async getPublicSettings(req: Request, res: Response) {
    const settings = await systemSettingsService.getSettings();
    sendSuccess(res, {
      data: {
        verificationMode: settings.verificationMode,
        fallbackPaymentNumbers: settings.fallbackPaymentNumbers,
        manualVerificationNote: settings.manualVerificationNote,
      },
    });
  },

  async adminGetSettings(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const settings = await systemSettingsService.getSettings();
    sendSuccess(res, { data: settings });
  },

  async adminUpdateSettings(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const settings = await systemSettingsService.updateSettings(req.body);
    sendSuccess(res, { data: settings });
  },
};
