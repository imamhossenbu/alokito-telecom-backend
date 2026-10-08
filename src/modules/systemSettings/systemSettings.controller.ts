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
        serviceStatus: settings.serviceStatus,
        appVersion: settings.appVersion,
      },
    });
  },

  async getAppVersion(req: Request, res: Response) {
    const appType = (req.query.app as string)?.toLowerCase() === "admin" ? "admin" : "customer";
    const settings = await systemSettingsService.getSettings();
    const versionData = settings.appVersion?.[appType] || {
      latestVersion: "1.0.3",
      buildNumber: 4,
      downloadUrl: "",
      forceUpdate: false,
      releaseNotes: "নতুন সংস্করণ আপডেট।",
    };
    sendSuccess(res, { data: versionData });
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
