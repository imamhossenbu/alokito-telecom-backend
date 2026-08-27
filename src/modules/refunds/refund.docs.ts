import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import { createRefundBodySchema } from "./refund.schema";

const refundSchema = registry.register(
  "Refund",
  z.object({
    id: z.string(),
    refundNumber: z.string(),
    orderId: z.string(),
    userId: z.string(),
    walletId: z.string(),
    amount: z.number(), // poisha
    reason: z.string(),
    status: z.enum(["PENDING", "REFUNDED", "FAILED"]),
    walletTransactionId: z.string().optional(),
    createdBy: z.string(),
    refundedAt: z.string().optional(),
    createdAt: z.string(),
  })
);

// Customer Paths
registry.registerPath({
  method: "get",
  path: "/refunds",
  tags: ["Refunds"],
  summary: "List customer refunds",
  security: [{ CustomerAuth: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      description: "List of refunds",
      content: {
        "application/json": {
          schema: z.object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            docs: z.array(refundSchema),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/refunds/{id}",
  tags: ["Refunds"],
  summary: "Get specific refund details by ID",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Refund details",
      content: {
        "application/json": {
          schema: refundSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Admin Paths
registry.registerPath({
  method: "get",
  path: "/admin/refunds",
  tags: ["Admin"],
  summary: "List all refunds (Admin)",
  security: [{ AdminAuth: [] }],
  responses: {
    200: {
      description: "List of all refunds",
      content: {
        "application/json": {
          schema: z.array(refundSchema),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/refunds/{id}",
  tags: ["Admin"],
  summary: "Get refund details by ID",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Refund details",
      content: {
        "application/json": {
          schema: refundSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/orders/{id}/refund",
  tags: ["Admin"],
  summary: "Manually refund a completed order",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: createRefundBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Refund created successfully",
      content: {
        "application/json": {
          schema: refundSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});
