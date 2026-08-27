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
import "../modules/admins/adminUser.docs";
import "../modules/users/user.docs";

import "../modules/operators/operator.docs";
import "../modules/offers/offer.docs";
import "../modules/driveOffers/driveOffer.docs";
import "../modules/wallets/wallet.docs";
import "../modules/topups/topup.docs";
import "../modules/paymentDevices/paymentDevice.docs";
import "../modules/orders/order.docs";
import "../modules/refunds/refund.docs";
import "../modules/notifications/notification.docs";
