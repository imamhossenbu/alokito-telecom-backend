import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";

registry.register(
  "Operator",
  z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    logoUrl: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    sortOrder: z.number(),
  })
);
