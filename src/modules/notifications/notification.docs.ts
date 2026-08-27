import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";

registry.register(
  "Notification",
  z.object({
    id: z.string(),
    userId: z.string(),
    type: z.string(),
    title: z.string(),
    message: z.string(),
    isRead: z.boolean(),
  })
);
