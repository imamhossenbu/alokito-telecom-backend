import { Router } from "express";
import { adminController } from "./admin.controller";
import { adminUserController } from "./adminUser.controller";
import { validate } from "../../middleware/validation.middleware";
import { adminMiddleware } from "../../middleware/admin.middleware";
import {
  loginRateLimiter,
  registrationRateLimiter,
} from "../../middleware/rateLimit.middleware";
import { imageUpload } from "../../middleware/upload.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import { adminLoginBodySchema } from "../auth/auth.schema";
import {
  listUsersQuerySchema,
  adminCreateCustomerBodySchema,
  adminUpdateCustomerBodySchema,
} from "../users/user.schema";
import { operatorController } from "../operators/operator.controller";
import { createOperatorBodySchema, updateOperatorBodySchema } from "../operators/operator.schema";
import { offerController } from "../offers/offer.controller";
import { createOfferBodySchema, updateOfferBodySchema } from "../offers/offer.schema";
import { driveOfferController } from "../driveOffers/driveOffer.controller";
import { createDriveOfferBodySchema, updateDriveOfferBodySchema } from "../driveOffers/driveOffer.schema";
import { paymentDeviceController } from "../paymentDevices/paymentDevice.controller";
import { orderController } from "../orders/order.controller";
import { adminCreateManualOrderBodySchema } from "../orders/order.schema";
import { refundController } from "../refunds/refund.controller";
import { createRefundBodySchema } from "../refunds/refund.schema";
import { topUpController } from "../topups/topup.controller";
import { systemSettingsController } from "../systemSettings/systemSettings.controller";

const router = Router();

router.post(
  "/auth/login",
  loginRateLimiter,
  validate({ body: adminLoginBodySchema }),
  asyncHandler(adminController.login),
);

router.get(
  "/dashboard",
  adminMiddleware,
  asyncHandler(adminController.getDashboard),
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

// ── Operator management ──────────────────────────────
router.get(
  "/operators",
  adminMiddleware,
  asyncHandler(operatorController.adminGetOperators),
);
router.get(
  "/operators/:id",
  adminMiddleware,
  asyncHandler(operatorController.adminGetOperatorById),
);
router.post(
  "/operators",
  adminMiddleware,
  validate({ body: createOperatorBodySchema }),
  asyncHandler(operatorController.adminCreateOperator),
);
router.patch(
  "/operators/:id",
  adminMiddleware,
  validate({ body: updateOperatorBodySchema }),
  asyncHandler(operatorController.adminUpdateOperator),
);
router.post(
  "/operators/:id/activate",
  adminMiddleware,
  asyncHandler(operatorController.adminActivateOperator),
);
router.post(
  "/operators/:id/deactivate",
  adminMiddleware,
  asyncHandler(operatorController.adminDeactivateOperator),
);
router.delete(
  "/operators/:id",
  adminMiddleware,
  asyncHandler(operatorController.adminDeleteOperator),
);

// ── Offer management ──────────────────────────────────
router.get(
  "/offers",
  adminMiddleware,
  asyncHandler(offerController.adminGetOffers),
);
router.get(
  "/offers/:id",
  adminMiddleware,
  asyncHandler(offerController.adminGetOfferById),
);
router.post(
  "/offers",
  adminMiddleware,
  validate({ body: createOfferBodySchema }),
  asyncHandler(offerController.adminCreateOffer),
);
router.patch(
  "/offers/:id",
  adminMiddleware,
  validate({ body: updateOfferBodySchema }),
  asyncHandler(offerController.adminUpdateOffer),
);
router.delete(
  "/offers/:id",
  adminMiddleware,
  asyncHandler(offerController.adminDeleteOffer),
);
router.post(
  "/offers/:id/activate",
  adminMiddleware,
  asyncHandler(offerController.adminActivateOffer),
);
router.post(
  "/offers/:id/deactivate",
  adminMiddleware,
  asyncHandler(offerController.adminDeactivateOffer),
);

// ── Drive Offer management ───────────────────────────
router.get(
  "/drive-offers",
  adminMiddleware,
  asyncHandler(driveOfferController.adminGetOffers),
);
router.get(
  "/drive-offers/:id",
  adminMiddleware,
  asyncHandler(driveOfferController.adminGetOfferById),
);
router.post(
  "/drive-offers",
  adminMiddleware,
  validate({ body: createDriveOfferBodySchema }),
  asyncHandler(driveOfferController.adminCreateOffer),
);
router.patch(
  "/drive-offers/:id",
  adminMiddleware,
  validate({ body: updateDriveOfferBodySchema }),
  asyncHandler(driveOfferController.adminUpdateOffer),
);
router.delete(
  "/drive-offers/:id",
  adminMiddleware,
  asyncHandler(driveOfferController.adminDeleteOffer),
);
router.post(
  "/drive-offers/:id/activate",
  adminMiddleware,
  asyncHandler(driveOfferController.adminActivateOffer),
);
router.post(
  "/drive-offers/:id/deactivate",
  adminMiddleware,
  asyncHandler(driveOfferController.adminDeactivateOffer),
);

// ── Payment Device management ────────────────────────
router.post(
  "/payment-devices/pair",
  adminMiddleware,
  asyncHandler(paymentDeviceController.adminCreatePairingCode),
);
router.get(
  "/payment-devices",
  adminMiddleware,
  asyncHandler(paymentDeviceController.adminGetDevices),
);
router.get(
  "/payment-devices/:id",
  adminMiddleware,
  asyncHandler(paymentDeviceController.adminGetDeviceById),
);
router.patch(
  "/payment-devices/:id",
  adminMiddleware,
  asyncHandler(paymentDeviceController.adminUpdateDevice),
);
router.post(
  "/payment-devices/:id/revoke",
  adminMiddleware,
  asyncHandler(paymentDeviceController.adminRevokeDevice),
);
router.delete(
  "/payment-devices/:id",
  adminMiddleware,
  asyncHandler(paymentDeviceController.adminDeleteDevice),
);
router.get(
  "/payment-devices/:id/events",
  adminMiddleware,
  asyncHandler(paymentDeviceController.adminGetDeviceEvents),
);

// ── Order management ──────────────────────────────────
router.get(
  "/orders",
  adminMiddleware,
  asyncHandler(orderController.adminGetOrders),
);
router.get(
  "/orders/:id",
  adminMiddleware,
  asyncHandler(orderController.adminGetOrderById),
);
router.post(
  "/manual-orders",
  adminMiddleware,
  validate({ body: adminCreateManualOrderBodySchema }),
  asyncHandler(orderController.adminCreateManualOrder),
);
router.post(
  "/orders/:id/process",
  adminMiddleware,
  asyncHandler(orderController.adminProcessOrder),
);
router.post(
  "/orders/:id/complete",
  adminMiddleware,
  asyncHandler(orderController.adminCompleteOrder),
);
router.post(
  "/orders/:id/fail",
  adminMiddleware,
  asyncHandler(orderController.adminFailOrder),
);
router.post(
  "/orders/:id/cancel",
  adminMiddleware,
  asyncHandler(orderController.adminCancelOrder),
);

// ── Refund management ─────────────────────────────────
router.get(
  "/refunds",
  adminMiddleware,
  asyncHandler(refundController.adminGetRefunds),
);
router.get(
  "/refunds/:id",
  adminMiddleware,
  asyncHandler(refundController.adminGetRefundById),
);
router.post(
  "/orders/:id/refund",
  adminMiddleware,
  validate({ body: createRefundBodySchema }),
  asyncHandler(refundController.adminRefundOrder),
);

// ── Wallet & Transactions management ──────────────────
router.get(
  "/wallet/summary",
  adminMiddleware,
  asyncHandler(adminController.getWalletSummary),
);

router.get(
  "/wallet/transactions",
  adminMiddleware,
  asyncHandler(adminController.getWalletTransactions),
);

// ── Admin Profile & Settings ──────────────────────────
router.get(
  "/profile",
  adminMiddleware,
  asyncHandler(adminController.getProfile),
);

router.patch(
  "/profile",
  adminMiddleware,
  asyncHandler(adminController.updateProfile),
);

router.post(
  "/profile/photo",
  adminMiddleware,
  imageUpload.any(),
  asyncHandler(adminController.uploadProfilePhoto),
);

router.post(
  "/profile/change-password",
  adminMiddleware,
  asyncHandler(adminController.changePassword),
);

// ── Admin Dynamic Notifications ───────────────────────
router.get(
  "/notifications",
  adminMiddleware,
  asyncHandler(adminController.getNotifications),
);

router.post(
  "/notifications/:id/read",
  adminMiddleware,
  asyncHandler(adminController.markNotificationRead),
);

router.post(
  "/notifications/read-all",
  adminMiddleware,
  asyncHandler(adminController.markAllNotificationsRead),
);

// ── Top-up manual verification & approval ─────────────
router.get(
  "/topups/pending",
  adminMiddleware,
  asyncHandler(topUpController.adminGetPendingTopUps),
);
router.post(
  "/topups/:id/approve",
  adminMiddleware,
  asyncHandler(topUpController.adminApproveTopUp),
);
router.post(
  "/topups/:id/reject",
  adminMiddleware,
  asyncHandler(topUpController.adminRejectTopUp),
);

// ── System settings & Verification mode ───────────────
router.get(
  "/settings",
  adminMiddleware,
  asyncHandler(systemSettingsController.adminGetSettings),
);
router.patch(
  "/settings",
  adminMiddleware,
  asyncHandler(systemSettingsController.adminUpdateSettings),
);

export default router;
