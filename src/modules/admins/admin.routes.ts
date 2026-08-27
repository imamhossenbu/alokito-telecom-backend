import { Router } from "express";
import { adminController } from "./admin.controller";
import { validate } from "../../middleware/validation.middleware";
import { loginRateLimiter } from "../../middleware/rateLimit.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import { adminLoginBodySchema } from "../auth/auth.schema";

const router = Router();

router.post(
  "/auth/login",
  loginRateLimiter,
  validate({ body: adminLoginBodySchema }),
  asyncHandler(adminController.login),
);

// Customer management, offers, orders, payment devices, refunds, audit,
// dashboard — mounted here in Phases 3-11.

export default router;
