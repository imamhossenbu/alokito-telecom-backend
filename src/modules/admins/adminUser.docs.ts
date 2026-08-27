import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import {
  listUsersQuerySchema,
  adminCreateCustomerBodySchema,
  adminUpdateCustomerBodySchema,
} from "../users/user.schema";

registry.registerPath({
  method: "get",
  path: "/admin/users",
  tags: ["Admin"],
  summary: "List/search customers (paginated)",
  security: [{ AdminAuth: [] }],
  request: { query: listUsersQuerySchema },
  responses: {
    200: { description: "Paginated customer list" },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/users/{id}",
  tags: ["Admin"],
  summary: "Get a customer by ID",
  security: [{ AdminAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Customer" }, ...commonErrorResponses },
});

registry.registerPath({
  method: "post",
  path: "/admin/users",
  tags: ["Admin"],
  summary: "Admin creates a customer (no PIN/NID image; temporary PIN emailed)",
  security: [{ AdminAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: adminCreateCustomerBodySchema },
      },
    },
  },
  responses: {
    201: { description: "Customer created" },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/users/{id}",
  tags: ["Admin"],
  summary: "Update a customer's profile",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": { schema: adminUpdateCustomerBodySchema },
      },
    },
  },
  responses: { 200: { description: "Updated" }, ...commonErrorResponses },
});

registry.registerPath({
  method: "post",
  path: "/admin/users/{id}/block",
  tags: ["Admin"],
  summary: "Block a customer — revokes all sessions and trusted devices",
  security: [{ AdminAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Blocked" }, ...commonErrorResponses },
});

registry.registerPath({
  method: "post",
  path: "/admin/users/{id}/unblock",
  tags: ["Admin"],
  summary: "Unblock a customer",
  security: [{ AdminAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Unblocked" }, ...commonErrorResponses },
});

registry.registerPath({
  method: "post",
  path: "/admin/users/{id}/reset-pin",
  tags: ["Admin"],
  summary:
    "Force a PIN reset — new temporary PIN emailed, all sessions revoked",
  security: [{ AdminAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "PIN reset" }, ...commonErrorResponses },
});

registry.registerPath({
  method: "delete",
  path: "/admin/users/{id}",
  tags: ["Admin"],
  summary: "Soft-delete a customer (financial history is preserved)",
  security: [{ AdminAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: "Deleted" }, ...commonErrorResponses },
});
