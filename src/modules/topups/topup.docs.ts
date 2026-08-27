import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import { createTopUpBodySchema, verifyTopUpBodySchema } from "./topup.schema";

const topUpSchema = registry.register(
  "TopUp",
  z.object({
    id: z.string(),
    topUpNumber: z.string(),
    userId: z.string(),
    paymentDeviceId: z.string().optional(),
    paymentProvider: z.string(),
    paymentNumber: z.string(),
    amount: z.number(), // poisha
    customerTransactionId: z.string().optional(),
    status: z.enum(["PENDING", "VERIFYING", "VERIFIED", "FAILED", "EXPIRED"]),
    verificationStatus: z.enum(["PENDING", "VERIFIED", "FAILED"]),
    failureReason: z.string().optional(),
    submittedAt: z.string(),
    verifiedAt: z.string().optional(),
    expiresAt: z.string().optional(),
  })
);

// Customer Paths
registry.registerPath({
  method: "post",
  path: "/wallet/topups",
  tags: ["Wallet"],
  summary: "Request a wallet top-up (Add Balance)",
  security: [{ CustomerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTopUpBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Top-up initialized. Returns instructions & receiver number.",
      content: {
        "application/json": {
          schema: z.object({
            topUpId: z.string(),
            topUpNumber: z.string(),
            provider: z.string(),
            paymentNumber: z.string(),
            amount: z.number(), // BDT
            status: z.string(),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/wallet/topups/{id}/verify",
  tags: ["Wallet"],
  summary: "Submit transaction ID (TrxID) to verify payment",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: verifyTopUpBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Verification completed successfully",
      content: {
        "application/json": {
          schema: topUpSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/wallet/topups",
  tags: ["Wallet"],
  summary: "List customer's top-up history",
  security: [{ CustomerAuth: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      description: "List of top-up requests",
      content: {
        "application/json": {
          schema: z.object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            docs: z.array(topUpSchema),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/wallet/topups/{id}",
  tags: ["Wallet"],
  summary: "Get specific top-up request details",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Top-up details",
      content: {
        "application/json": {
          schema: topUpSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});
