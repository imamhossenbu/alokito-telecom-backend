import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";

const walletSchema = registry.register(
  "Wallet",
  z.object({
    id: z.string(),
    userId: z.string(),
    balance: z.number(), // poisha
    currency: z.string(),
    status: z.enum(["ACTIVE", "BLOCKED"]),
  })
);

const walletTransactionSchema = registry.register(
  "WalletTransaction",
  z.object({
    id: z.string(),
    userId: z.string(),
    walletId: z.string(),
    transactionId: z.string(),
    type: z.enum(["TOP_UP", "PURCHASE", "REFUND", "ADJUSTMENT"]),
    direction: z.enum(["CREDIT", "DEBIT"]),
    amount: z.number(),
    balanceBefore: z.number(),
    balanceAfter: z.number(),
    referenceType: z.enum(["TOP_UP", "ORDER", "REFUND", "ADMIN_ADJUSTMENT"]),
    referenceId: z.string(),
    description: z.string(),
    createdAt: z.string(),
  })
);

// Customer Paths
registry.registerPath({
  method: "get",
  path: "/wallet",
  tags: ["Wallet"],
  summary: "Get current customer's wallet balance",
  security: [{ CustomerAuth: [] }],
  responses: {
    200: {
      description: "Wallet balance",
      content: {
        "application/json": {
          schema: walletSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/wallet/transactions",
  tags: ["Wallet"],
  summary: "List wallet transaction history logs",
  security: [{ CustomerAuth: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      description: "List of transactions",
      content: {
        "application/json": {
          schema: z.object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            docs: z.array(walletTransactionSchema),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/wallet/transactions/{id}",
  tags: ["Wallet"],
  summary: "Get wallet transaction details by ID",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Transaction details",
      content: {
        "application/json": {
          schema: walletTransactionSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});
