import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import { createOperatorBodySchema, updateOperatorBodySchema } from "./operator.schema";

const operatorSchema = registry.register(
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

// Customer Paths
registry.registerPath({
  method: "get",
  path: "/operators",
  tags: ["Operators"],
  summary: "Get all active operators",
  security: [{ CustomerAuth: [] }],
  responses: {
    200: {
      description: "List of active operators",
      content: {
        "application/json": {
          schema: z.array(operatorSchema),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/operators/{id}",
  tags: ["Operators"],
  summary: "Get active operator details by ID",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Operator details",
      content: {
        "application/json": {
          schema: operatorSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Admin Paths
registry.registerPath({
  method: "get",
  path: "/admin/operators",
  tags: ["Admin"],
  summary: "List all operators (Admin)",
  security: [{ AdminAuth: [] }],
  responses: {
    200: {
      description: "List of all operators",
      content: {
        "application/json": {
          schema: z.array(operatorSchema),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/operators",
  tags: ["Admin"],
  summary: "Create a new operator",
  security: [{ AdminAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createOperatorBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Operator created successfully",
      content: {
        "application/json": {
          schema: operatorSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/operators/{id}",
  tags: ["Admin"],
  summary: "Update operator details by ID",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: updateOperatorBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Operator updated successfully",
      content: {
        "application/json": {
          schema: operatorSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/operators/{id}/activate",
  tags: ["Admin"],
  summary: "Activate an operator",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Operator activated",
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/operators/{id}/deactivate",
  tags: ["Admin"],
  summary: "Deactivate an operator",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Operator deactivated",
    },
    ...commonErrorResponses,
  },
});
