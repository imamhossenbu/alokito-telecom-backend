import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";

registry.register(
  "Order",
  z.object({
    id: z.string(),
    orderNumber: z.string(),
    transactionId: z.string(),
    userId: z.string(),
    userPhone: z.string(),
    operatorId: z.string(),
    offerId: z.string(),
    offerType: z.enum(["NORMAL", "DRIVE"]),
    offerName: z.string(),
    offerValue: z.string(),
    validity: z.string(),
    price: z.number(),
    paymentMethod: z.string(),
    orderStatus: z.string(),
    activationStatus: z.string(),
  })
);
