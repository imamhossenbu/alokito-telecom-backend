import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import {
  updateProfileBodySchema,
  createCustomerBodySchema,
} from "./user.schema";
import { changePinBodySchema } from "../auth/auth.schema";

const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  profileImageUrl: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  accountStatus: z.string(),
  mustChangePin: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
});

registry.registerPath({
  method: "get",
  path: "/users/me",
  tags: ["Users"],
  summary: "Get the current customer's profile",
  security: [{ CustomerAuth: [] }],
  responses: {
    200: {
      description: "Profile",
      content: { "application/json": { schema: userProfileSchema } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "patch",
  path: "/users/me",
  tags: ["Users"],
  summary: "Update name/district/address",
  security: [{ CustomerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: updateProfileBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Updated profile",
      content: { "application/json": { schema: userProfileSchema } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/profile-image",
  tags: ["Users"],
  summary:
    "Upload a public profile image (multipart, field name: profileImage)",
  security: [{ CustomerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            profileImage: z
              .string()
              .openapi({ type: "string", format: "binary" } as never),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Uploaded",
      content: {
        "application/json": {
          schema: z.object({ profileImageUrl: z.string().optional() }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/change-pin",
  tags: ["Users"],
  summary: "Change PIN (requires current PIN)",
  security: [{ CustomerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: changePinBodySchema } } },
  },
  responses: { 200: { description: "PIN changed" }, ...commonErrorResponses },
});

registry.registerPath({
  method: "get",
  path: "/users/me/identity",
  tags: ["Users"],
  summary: "Get NID identity — image URLs are short-lived signed links",
  security: [{ CustomerAuth: [] }],
  responses: {
    200: { description: "Identity record" },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/users/me/trusted-devices",
  tags: ["Users"],
  summary: "List trusted devices",
  security: [{ CustomerAuth: [] }],
  responses: {
    200: { description: "List of trusted devices" },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/me/trusted-devices/{deviceId}",
  tags: ["Users"],
  summary: "Revoke a trusted device",
  security: [{ CustomerAuth: [] }],
  request: { params: z.object({ deviceId: z.string() }) },
  responses: { 200: { description: "Revoked" }, ...commonErrorResponses },
});

registry.registerPath({
  method: "post",
  path: "/users/customers",
  tags: ["Users"],
  summary:
    "Customer creates another customer (no PIN/NID image; temporary PIN emailed)",
  security: [{ CustomerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: createCustomerBodySchema } },
    },
  },
  responses: {
    201: {
      description: "Customer created",
      content: {
        "application/json": { schema: z.object({ userId: z.string() }) },
      },
    },
    ...commonErrorResponses,
  },
});
