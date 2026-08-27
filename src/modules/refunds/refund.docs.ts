import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";

registry.register(
  "Refund",
  z.object({
    id: z.string(),
    refundNumber: z.string(),
    orderId: z.string(),
    userId: z.string(),
    amount: z.number(),
    reason: z.string(),
    status: z.string(),
  })
);
