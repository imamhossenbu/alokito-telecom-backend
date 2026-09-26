import { Router } from "express";
import { authController } from "./auth.controller";
import { imageUpload } from "../../middleware/upload.middleware";
import { validate } from "../../middleware/validation.middleware";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  loginRateLimiter,
  otpRateLimiter,
  registrationRateLimiter,
} from "../../middleware/rateLimit.middleware";
import {
  registerBodySchema,
  registerResendBodySchema,
  registerVerifyBodySchema,
  loginBodySchema,
  loginVerifyDeviceBodySchema,
  refreshBodySchema,
  logoutBodySchema,
  forgotPinBodySchema,
  forgotPinVerifyBodySchema,
  resetPinBodySchema,
} from "./auth.schema";

const router = Router();

// ── Self registration ──────────────────────────────────
router.post(
  "/extract-nid",
  registrationRateLimiter,
  imageUpload.fields([
    { name: "nidFrontImage", maxCount: 1 },
    { name: "nidBackImage", maxCount: 1 },
  ]),
  asyncHandler(authController.extractNid),
);

router.post(
  "/register",
  registrationRateLimiter,
  imageUpload.fields([
    { name: "nidFrontImage", maxCount: 1 },
    { name: "nidBackImage", maxCount: 1 },
  ]),
  // NOTE: body validation happens inside the controller (not via the
  // `validate()` middleware) because multer must parse the multipart
  // stream first to populate req.body's text fields.
  asyncHandler(authController.register),
);

router.post(
  "/register/resend",
  otpRateLimiter,
  validate({ body: registerResendBodySchema }),
  asyncHandler(authController.resendRegistration),
);

router.post(
  "/register/verify",
  otpRateLimiter,
  validate({ body: registerVerifyBodySchema }),
  asyncHandler(authController.verifyRegistration),
);

// ── Login ────────────────────────────────────────────────
router.post(
  "/login",
  loginRateLimiter,
  validate({ body: loginBodySchema }),
  asyncHandler(authController.login),
);

router.post(
  "/login/verify-device",
  otpRateLimiter,
  validate({ body: loginVerifyDeviceBodySchema }),
  asyncHandler(authController.verifyLoginDevice),
);

// ── Token lifecycle ────────────────────────────────────
router.post(
  "/refresh",
  validate({ body: refreshBodySchema }),
  asyncHandler(authController.refresh),
);
router.post(
  "/logout",
  validate({ body: logoutBodySchema }),
  asyncHandler(authController.logout),
);
router.post(
  "/logout-all",
  authMiddleware,
  asyncHandler(authController.logoutAll),
);

// ── Forgot / reset PIN ─────────────────────────────────
router.post(
  "/forgot-pin",
  otpRateLimiter,
  validate({ body: forgotPinBodySchema }),
  asyncHandler(authController.forgotPin),
);
router.post(
  "/forgot-pin/verify",
  otpRateLimiter,
  validate({ body: forgotPinVerifyBodySchema }),
  asyncHandler(authController.verifyForgotPin),
);
router.post(
  "/reset-pin",
  validate({ body: resetPinBodySchema }),
  asyncHandler(authController.resetPin),
);

export default router;
