/**
 * Side-effect-only imports. Each line pulls in a module's schema/docs
 * file purely so its top-level `registry.registerPath(...)` /
 * `registry.register(...)` calls run and add themselves to the shared
 * registry (see `openapi-registry.ts`).
 *
 * Add one line here per module as it's built (Phase 2+). Nothing else
 * needs to change — `openapi.generator.ts` picks up whatever has been
 * registered by the time it runs.
 */
import "../modules/health.docs";
import "../modules/auth/auth.docs";
import "../modules/admins/admin.docs";

// import '../modules/users/user.schema';
// import '../modules/operators/operator.schema';
// import '../modules/offers/offer.schema';
// import '../modules/driveOffers/driveOffer.schema';
// import '../modules/wallets/wallet.schema';
// import '../modules/topups/topup.schema';
// import '../modules/paymentDevices/paymentDevice.schema';
// import '../modules/orders/order.schema';
// import '../modules/refunds/refund.schema';
// import '../modules/notifications/notification.schema';
