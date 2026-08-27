import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";

registry.register(
  "DriveOffer",
  z.object({
    id: z.string(),
    operatorId: z.string(),
    offerName: z.string(),
    category: z.string(),
    offerType: z.string(),
    offerValue: z.string(),
    validity: z.string(),
    sellingPrice: z.number(),
    activationCode: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
);
