import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";

registry.register(
  "Wallet",
  z.object({
    id: z.string(),
    userId: z.string(),
    balance: z.number(),
    currency: z.string(),
    status: z.enum(["ACTIVE", "BLOCKED"]),
  })
);
