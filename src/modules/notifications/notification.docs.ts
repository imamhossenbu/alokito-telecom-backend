import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";

const notificationSchema = registry.register(
  "Notification",
  z.object({
    id: z.string(),
    userId: z.string(),
    type: z.string(),
    title: z.string(),
    message: z.string(),
    referenceType: z.string().optional(),
    referenceId: z.string().optional(),
    isRead: z.boolean(),
    readAt: z.string().optional(),
    createdAt: z.string(),
  })
);

// Customer Paths
registry.registerPath({
  method: "get",
  path: "/notifications",
  tags: ["Notifications"],
  summary: "List current customer notifications (paginated)",
  security: [{ CustomerAuth: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      description: "List of notifications",
      content: {
        "application/json": {
          schema: z.object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            docs: z.array(notificationSchema),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/notifications/{id}",
  tags: ["Notifications"],
  summary: "Get specific notification details by ID",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Notification details",
      content: {
        "application/json": {
          schema: notificationSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/notifications/{id}/read",
  tags: ["Notifications"],
  summary: "Mark notification as read",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Notification marked as read",
      content: {
        "application/json": {
          schema: notificationSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/notifications/read-all",
  tags: ["Notifications"],
  summary: "Mark all notifications as read",
  security: [{ CustomerAuth: [] }],
  responses: {
    200: {
      description: "All notifications marked as read",
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true) }),
        },
      },
    },
    ...commonErrorResponses,
  },
});
