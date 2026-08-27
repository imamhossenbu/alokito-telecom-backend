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

registry.registerPath({
  method: "get",
  path: "/admin/dashboard",
  tags: ["Admin"],
  summary: "Get admin dashboard KPI metrics",
  security: [{ AdminAuth: [] }],
  responses: {
    200: {
      description: "Dashboard KPIs",
      content: {
        "application/json": {
          schema: z.object({
            totalUsers: z.number(),
            activeUsers: z.number(),
            blockedUsers: z.number(),
            newUsersToday: z.number(),
            pendingTopUps: z.number(),
            pendingOrders: z.number(),
            processingOrders: z.number(),
            completedOrdersToday: z.number(),
            refundsPending: z.number(),
            connectedPaymentDevices: z.number(),
            offlinePaymentDevices: z.number(),
            walletTopupVolume: z.number(),
            purchaseVolume: z.number(),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});
