import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";

registry.register(
  "TopUp",
  z.object({
    id: z.string(),
    topUpNumber: z.string(),
    userId: z.string(),
    paymentDeviceId: z.string().optional(),
    paymentProvider: z.string(),
    paymentNumber: z.string(),
    amount: z.number(),
    status: z.string(),
  })
);
