import { Router } from "express";
import { adminController } from "./admin.controller";
import { adminUserController } from "./adminuser.controller";
import { validate } from "../../middleware/validation.middleware";
import { adminMiddleware } from "../../middleware/admin.middleware";
import {
  loginRateLimiter,
  registrationRateLimiter,
} from "../../middleware/rateLimit.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import { adminLoginBodySchema } from "../auth/auth.schema";
import {
  listUsersQuerySchema,
  adminCreateCustomerBodySchema,
  adminUpdateCustomerBodySchema,
} from "../users/user.schema";

const router = Router();

router.post(
  "/auth/login",
  loginRateLimiter,
  validate({ body: adminLoginBodySchema }),
  asyncHandler(adminController.login),
);

// ── Customer management (spec section 38) ──────────────
router.get(
  "/users",
  adminMiddleware,
  validate({ query: listUsersQuerySchema }),
  asyncHandler(adminUserController.list),
);
router.get(
  "/users/:id",
  adminMiddleware,
  asyncHandler(adminUserController.getById),
);
router.post(
  "/users",
  adminMiddleware,
  registrationRateLimiter,
  validate({ body: adminCreateCustomerBodySchema }),
  asyncHandler(adminUserController.create),
);
router.patch(
  "/users/:id",
  adminMiddleware,
  validate({ body: adminUpdateCustomerBodySchema }),
  asyncHandler(adminUserController.update),
);
router.post(
  "/users/:id/block",
  adminMiddleware,
  asyncHandler(adminUserController.block),
);
router.post(
  "/users/:id/unblock",
  adminMiddleware,
  asyncHandler(adminUserController.unblock),
);
router.post(
  "/users/:id/reset-pin",
  adminMiddleware,
  asyncHandler(adminUserController.resetPin),
);
router.delete(
  "/users/:id",
  adminMiddleware,
  asyncHandler(adminUserController.softDelete),
);

// Offers, orders, payment devices, refunds, audit, dashboard — mounted
// here in Phases 4-11.

export default router;
