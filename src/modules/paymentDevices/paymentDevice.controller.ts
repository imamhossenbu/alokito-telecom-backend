import { Request, Response } from "express";
import { paymentDeviceService } from "./paymentDevice.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import { UnauthorizedError } from "../../shared/errors/app-error";

export const paymentDeviceController = {
  // ── Admin Endpoints ──────────────────────────────────
  async adminCreatePairingCode(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const result = await paymentDeviceService.adminCreatePairing(req.actor.adminId);
    sendCreated(res, result);
  },

  async adminGetDevices(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const list = await paymentDeviceService.adminGetDevices(req.actor.adminId);
    sendSuccess(res, { data: list });
  },

  async adminGetDeviceById(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const device = await paymentDeviceService.adminGetDeviceById(req.actor.adminId, req.params.id);
    sendSuccess(res, { data: device });
  },

  async adminUpdateDevice(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const device = await paymentDeviceService.adminUpdateDevice(
      req.actor.adminId,
      req.params.id,
      req.body
    );
    sendSuccess(res, { data: device });
  },

  async adminRevokeDevice(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const device = await paymentDeviceService.adminRevokeDevice(req.actor.adminId, req.params.id);
    sendSuccess(res, { data: device });
  },

  async adminDeleteDevice(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const result = await paymentDeviceService.adminDeleteDevice(req.actor.adminId, req.params.id);
    sendSuccess(res, { data: result });
  },

  async adminGetDeviceEvents(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const provider = req.query.provider as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await paymentDeviceService.adminGetDeviceEvents(
      req.actor.adminId,
      req.params.id || "all",
      page,
      limit,
      { provider, status, search }
    );
    sendSuccess(res, { data: result });
  },

  async adminGetSmsCandidates(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const result = await paymentDeviceService.adminGetSmsCandidates(
      req.actor.adminId,
      req.params.id
    );
    sendSuccess(res, { data: result });
  },

  async adminManualCreditFromSms(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const result = await paymentDeviceService.adminManualCreditFromSms(
      req.actor.adminId,
      req.params.id,
      req.body
    );
    sendSuccess(res, { data: result });
  },

  // ── Device Endpoints ─────────────────────────────────
  async devicePair(req: Request, res: Response) {
    // This is public/device-initiated (requires the pairing code from Admin)
    const result = await paymentDeviceService.devicePair(req.body);
    sendSuccess(res, { data: result });
  },

  async deviceDisconnect(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "PAYMENT_DEVICE") {
      throw new UnauthorizedError();
    }
    const result = await paymentDeviceService.deviceDisconnect(req.actor.paymentDeviceId);
    sendSuccess(res, { data: result });
  },

  async deviceSetup(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "PAYMENT_DEVICE") {
      throw new UnauthorizedError();
    }
    const result = await paymentDeviceService.deviceSetup(
      req.actor.paymentDeviceId,
      req.body
    );
    sendSuccess(res, { data: result });
  },

  async deviceHeartbeat(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "PAYMENT_DEVICE") {
      throw new UnauthorizedError();
    }
    const result = await paymentDeviceService.deviceHeartbeat(req.actor.paymentDeviceId);
    sendSuccess(res, { data: result });
  },

  async deviceIngestSms(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "PAYMENT_DEVICE") {
      throw new UnauthorizedError();
    }
    const result = await paymentDeviceService.deviceIngestSms(
      req.actor.paymentDeviceId,
      req.actor.adminId,
      req.body.smsContent
    );
    sendSuccess(res, { data: result });
  },

  // ── Customer Endpoint ────────────────────────────────
  async getActivePaymentMethods(req: Request, res: Response) {
    const list = await paymentDeviceService.getActivePaymentMethods();
    sendSuccess(res, { data: list });
  },
};
