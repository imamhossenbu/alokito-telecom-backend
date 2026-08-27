import { Router } from "express";
import { paymentDeviceController } from "./paymentDevice.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.get("/", authMiddleware, asyncHandler(paymentDeviceController.getActivePaymentMethods));

export default router;
