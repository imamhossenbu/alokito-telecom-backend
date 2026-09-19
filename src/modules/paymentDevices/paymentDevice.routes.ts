import { Router } from "express";
import { paymentDeviceController } from "./paymentDevice.controller";
import { paymentDeviceMiddleware } from "../../middleware/device.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

// Endpoint for listener device pairing (public, pairing code verified)
router.post("/pair", asyncHandler(paymentDeviceController.devicePair));

// Endpoints requiring payment device credentials
router.post("/setup", paymentDeviceMiddleware, asyncHandler(paymentDeviceController.deviceSetup));
router.post("/heartbeat", paymentDeviceMiddleware, asyncHandler(paymentDeviceController.deviceHeartbeat));
router.post("/sms-events", paymentDeviceMiddleware, asyncHandler(paymentDeviceController.deviceIngestSms));
router.post("/disconnect", paymentDeviceMiddleware, asyncHandler(paymentDeviceController.deviceDisconnect));

export default router;
