import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import { adminLoginBodySchema } from "../auth/auth.schema";

registry.registerPath({
  method: "post",
  path: "/admin/auth/login",
  tags: ["Admin"],
  summary: "Admin login (email + password)",
  request: {
    body: { content: { "application/json": { schema: adminLoginBodySchema } } },
  },
  responses: {
    200: {
      description: "Access token issued",
      content: {
        "application/json": {
          schema: z.object({
            accessToken: z.string(),
            admin: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
            }),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});
