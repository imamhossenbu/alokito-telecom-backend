import { Router } from "express";
import { userController } from "./user.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { imageUpload } from "../../middleware/upload.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import { registrationRateLimiter } from "../../middleware/rateLimit.middleware";
import {
  updateProfileBodySchema,
  createCustomerBodySchema,
} from "./user.schema";
import { changePinBodySchema } from "../auth/auth.schema";

const router = Router();

router.use(authMiddleware); // every /users/me/* and /users/customers route requires a logged-in customer

router.get("/me", asyncHandler(userController.getMe));
router.patch(
  "/me",
  validate({ body: updateProfileBodySchema }),
  asyncHandler(userController.updateMe),
);
router.post(
  "/me/profile-image",
  imageUpload.single("profileImage"),
  asyncHandler(userController.uploadProfileImage),
);
router.post(
  "/me/change-pin",
  validate({ body: changePinBodySchema }),
  asyncHandler(userController.changePin),
);
router.get("/me/identity", asyncHandler(userController.getIdentity));
router.get(
  "/me/trusted-devices",
  asyncHandler(userController.listTrustedDevices),
);
router.delete(
  "/me/trusted-devices/:deviceId",
  asyncHandler(userController.revokeTrustedDevice),
);

router.post(
  "/customers",
  registrationRateLimiter,
  validate({ body: createCustomerBodySchema }),
  asyncHandler(userController.createCustomer),
);

export default router;
