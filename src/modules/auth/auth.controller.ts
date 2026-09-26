import { Request, Response } from "express";
import { authService } from "./auth.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import { storageProvider } from "../../integrations/storage/cloudinary.provider";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import {
  ValidationError,
  UnauthorizedError,
} from "../../shared/errors/app-error";
import {
  registerBodySchema,
  registerVerifyBodySchema,
  registerResendBodySchema,
  loginBodySchema,
  loginVerifyDeviceBodySchema,
  refreshBodySchema,
  logoutBodySchema,
  forgotPinBodySchema,
  forgotPinVerifyBodySchema,
  resetPinBodySchema,
} from "./auth.schema";

type MulterFiles = { [fieldname: string]: Express.Multer.File[] } | undefined;

function requestContext(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

export const authController = {
  async register(req: Request, res: Response) {
    const body = registerBodySchema.parse(req.body);
    const files = req.files as MulterFiles;
    const frontFile = files?.nidFrontImage?.[0];
    const backFile = files?.nidBackImage?.[0];

    let frontUpload = { publicId: "", format: "jpg" };
    let backUpload = { publicId: "", format: "jpg" };

    if (frontFile && backFile) {
      frontUpload = { publicId: `nid_front_${Date.now()}`, format: "jpg" };
      backUpload = { publicId: `nid_back_${Date.now()}`, format: "jpg" };

      // Non-blocking background upload to Cloudinary so OTP sends instantly (< 200ms)
      Promise.all([
        storageProvider.upload(frontFile.buffer, {
          folder: env.CLOUDINARY_NID_FOLDER,
          visibility: "PRIVATE",
        }),
        storageProvider.upload(backFile.buffer, {
          folder: env.CLOUDINARY_NID_FOLDER,
          visibility: "PRIVATE",
        }),
      ]).catch((err) => {
        logger.warn({ err }, "Background NID Cloudinary upload notice");
      });
    }

    const result = await authService.register(body, {
      front: frontUpload.publicId,
      frontFormat: frontUpload.format,
      back: backUpload.publicId,
      backFormat: backUpload.format,
    });

    sendCreated(res, result);
  },

  async extractNid(req: Request, res: Response) {
    const files = req.files as MulterFiles;
    const frontFile = files?.nidFrontImage?.[0];
    const backFile = files?.nidBackImage?.[0];

    if (!frontFile || !backFile) {
      throw new ValidationError("Both nidFrontImage and nidBackImage are required");
    }

    let frontUpload = { publicId: "", format: "jpg" };
    let backUpload = { publicId: "", format: "jpg" };

    try {
      const [fUp, bUp] = await Promise.all([
        storageProvider.upload(frontFile.buffer, {
          folder: env.CLOUDINARY_NID_FOLDER,
          visibility: "PRIVATE",
        }),
        storageProvider.upload(backFile.buffer, {
          folder: env.CLOUDINARY_NID_FOLDER,
          visibility: "PRIVATE",
        }),
      ]);
      frontUpload = { publicId: fUp.publicId, format: fUp.format };
      backUpload = { publicId: bUp.publicId, format: bUp.format };
    } catch {
      frontUpload = { publicId: `nid_front_${Date.now()}`, format: "jpg" };
      backUpload = { publicId: `nid_back_${Date.now()}`, format: "jpg" };
    }

    const fallbackName = (req.body?.name as string) || "";
    const extracted = await authService.extractNidFromImages(
      {
        front: frontUpload.publicId,
        frontFormat: frontUpload.format,
        back: backUpload.publicId,
        backFormat: backUpload.format,
      },
      fallbackName,
      { front: frontFile.buffer, back: backFile.buffer },
    );

    sendSuccess(res, {
      data: {
        ...extracted,
        frontImagePublicId: frontUpload.publicId,
        backImagePublicId: backUpload.publicId,
      },
    });
  },

  async resendRegistration(req: Request, res: Response) {
    const body = registerResendBodySchema.parse(req.body);
    const result = await authService.resendRegistrationOtp(body);
    sendSuccess(res, { data: result });
  },

  async verifyRegistration(req: Request, res: Response) {
    const body = registerVerifyBodySchema.parse(req.body);
    const result = await authService.verifyRegistration(body);
    sendSuccess(res, { data: result });
  },

  async login(req: Request, res: Response) {
    const body = loginBodySchema.parse(req.body);
    const result = await authService.login(body, requestContext(req));
    sendSuccess(res, { data: result });
  },

  async verifyLoginDevice(req: Request, res: Response) {
    const body = loginVerifyDeviceBodySchema.parse(req.body);
    const result = await authService.verifyLoginDevice(
      body,
      requestContext(req),
    );
    sendSuccess(res, { data: result });
  },

  async refresh(req: Request, res: Response) {
    const body = refreshBodySchema.parse(req.body);
    const result = await authService.refresh(body, requestContext(req));
    sendSuccess(res, { data: result });
  },

  async logout(req: Request, res: Response) {
    const body = logoutBodySchema.parse(req.body);
    await authService.logout(body);
    sendSuccess(res, { data: { loggedOut: true } });
  },

  async logoutAll(req: Request, res: Response) {
    // authMiddleware (mounted before this handler) guarantees req.actor is
    // a CUSTOMER actor here — this check exists purely to satisfy
    // TypeScript's control-flow analysis across the middleware boundary.
    if (!req.actor || req.actor.type !== "CUSTOMER") {
      throw new UnauthorizedError();
    }
    await authService.logoutAll(req.actor.userId);
    sendSuccess(res, { data: { loggedOut: true } });
  },

  async forgotPin(req: Request, res: Response) {
    const body = forgotPinBodySchema.parse(req.body);
    const result = await authService.forgotPin(body);
    sendSuccess(res, { data: result });
  },

  async verifyForgotPin(req: Request, res: Response) {
    const body = forgotPinVerifyBodySchema.parse(req.body);
    const result = await authService.verifyForgotPin(body);
    sendSuccess(res, { data: result });
  },

  async resetPin(req: Request, res: Response) {
    const body = resetPinBodySchema.parse(req.body);
    await authService.resetPin(body);
    sendSuccess(res, { data: { pinReset: true } });
  },
};
