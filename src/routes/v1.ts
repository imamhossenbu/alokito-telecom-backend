import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import adminRoutes from "../modules/admins/admin.routes";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    data: {
      name: "Drive Offer API",
      version: "v1",
    },
    requestId: res.locals.requestId,
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);

import operatorRoutes from "../modules/operators/operator.routes";
import offerRoutes from "../modules/offers/offer.routes";
import driveOfferRoutes from "../modules/driveOffers/driveOffer.routes";
import walletRoutes from "../modules/wallets/wallet.routes";
import topupRoutes from "../modules/topups/topup.routes";
import paymentDeviceRoutes from "../modules/paymentDevices/paymentDevice.routes";
import paymentMethodsRoutes from "../modules/paymentDevices/payment-methods.routes";
import orderRoutes from "../modules/orders/order.routes";
import refundRoutes from "../modules/refunds/refund.routes";
import notificationRoutes from "../modules/notifications/notification.routes";

import settingsRoutes from "../modules/systemSettings/systemSettings.routes";
import prayerTimesRoutes from "../modules/prayerTimes/prayerTimes.routes";
import smsWebhookRoutes from "../modules/smsWebhook/smsWebhook.routes";

router.use("/operators", operatorRoutes);
router.use("/offers", offerRoutes);
router.use("/drive-offers", driveOfferRoutes);
router.use("/wallet/topups", topupRoutes);
router.use("/wallet", walletRoutes);
router.use("/payment-devices", paymentDeviceRoutes);
router.use("/payment-methods", paymentMethodsRoutes);
router.use("/sms", smsWebhookRoutes);
router.use("/orders", orderRoutes);
router.use("/refunds", refundRoutes);
router.use("/notifications", notificationRoutes);
router.use("/settings", settingsRoutes);
router.use("/prayer-times", prayerTimesRoutes);

export default router;
