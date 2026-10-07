import { Router } from "express";
import { paymentDeviceController } from "./paymentDevice.controller";
import { optionalAuthMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.get("/", optionalAuthMiddleware, asyncHandler(paymentDeviceController.getActivePaymentMethods));

export default router;
