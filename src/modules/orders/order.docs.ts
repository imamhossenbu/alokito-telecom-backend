import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import { createOrderBodySchema, adminCreateManualOrderBodySchema } from "./order.schema";

const orderSchema = registry.register(
  "Order",
  z.object({
    id: z.string(),
    orderNumber: z.string(),
    transactionId: z.string(),
    userId: z.string(),
    userPhone: z.string(),
    operatorId: z.string(),
    offerId: z.string(),
    offerType: z.enum(["NORMAL", "DRIVE"]),
    offerName: z.string(),
    offerValue: z.string(),
    validity: z.string(),
    price: z.number(), // poisha
    paymentMethod: z.enum(["WALLET", "MANUAL"]),
    orderSource: z.enum(["CUSTOMER", "ADMIN_MANUAL"]),
    orderStatus: z.enum(["ACTIVATION_PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUND_PENDING", "REFUNDED", "CANCELLED"]),
    activationStatus: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
    activationProcessedBy: z.string().optional(),
    activationProcessedAt: z.string().optional(),
    failureReason: z.string().optional(),
    completedAt: z.string().optional(),
    createdAt: z.string(),
  })
);

// Customer Paths
registry.registerPath({
  method: "post",
  path: "/orders",
  tags: ["Orders"],
  summary: "Place a drive-offer or general-offer purchase order (wallet debited atomically)",
  security: [{ CustomerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createOrderBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Order placed successfully",
      content: {
        "application/json": {
          schema: z.object({
            orderId: z.string(),
            orderNumber: z.string(),
            status: z.string(),
            remainingWalletBalance: z.number(), // BDT
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/orders",
  tags: ["Orders"],
  summary: "List customer's purchase orders",
  security: [{ CustomerAuth: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      description: "List of orders",
      content: {
        "application/json": {
          schema: z.object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            docs: z.array(orderSchema),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/orders/{id}",
  tags: ["Orders"],
  summary: "Get specific order details",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Order details",
      content: {
        "application/json": {
          schema: orderSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Admin Paths
registry.registerPath({
  method: "get",
  path: "/admin/orders",
  tags: ["Admin"],
  summary: "List all customer orders",
  security: [{ AdminAuth: [] }],
  responses: {
    200: {
      description: "List of all orders",
      content: {
        "application/json": {
          schema: z.array(orderSchema),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/orders/{id}",
  tags: ["Admin"],
  summary: "Get customer order details by ID",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Order details",
      content: {
        "application/json": {
          schema: orderSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/manual-orders",
  tags: ["Admin"],
  summary: "Create a manual order on behalf of customer",
  security: [{ AdminAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: adminCreateManualOrderBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Manual order created",
      content: {
        "application/json": {
          schema: orderSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/orders/{id}/process",
  tags: ["Admin"],
  summary: "Claim and process order (moves to PROCESSING)",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Order processing initialized",
      content: {
        "application/json": {
          schema: orderSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/orders/{id}/complete",
  tags: ["Admin"],
  summary: "Mark order as COMPLETED",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Order completed",
      content: {
        "application/json": {
          schema: orderSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/orders/{id}/fail",
  tags: ["Admin"],
  summary: "Mark order as FAILED (automatically triggers wallet refund)",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            failureReason: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Order failed and refunded",
      content: {
        "application/json": {
          schema: orderSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/orders/{id}/cancel",
  tags: ["Admin"],
  summary: "Cancel order (trigger wallet refund if debited)",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Order cancelled",
      content: {
        "application/json": {
          schema: orderSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});
