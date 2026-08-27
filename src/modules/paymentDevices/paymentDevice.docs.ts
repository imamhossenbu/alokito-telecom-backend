import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";

registry.register(
  "PaymentDevice",
  z.object({
    id: z.string(),
    adminId: z.string(),
    deviceId: z.string(),
    deviceName: z.string().optional(),
    platform: z.string(),
    phoneNumber: z.string().optional(),
    paymentProvider: z.string().optional(),
    status: z.string(),
  })
);
