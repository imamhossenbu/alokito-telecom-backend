import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";

registry.register(
  "Offer",
  z.object({
    id: z.string(),
    operatorId: z.string(),
    name: z.string(),
    category: z.string(),
    type: z.string(),
    offerValue: z.string(),
    validity: z.string(),
    sellingPrice: z.number(),
    activationCode: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
);
