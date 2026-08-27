import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import {
  registerBodySchema,
  registerVerifyBodySchema,
  registerResendBodySchema,
  loginBodySchema,
  loginVerifyDeviceBodySchema,
  refreshBodySchema,
  logoutBodySchema,
  forgotPinBodySchema,
  forgotPinVerifyBodySchema,
  resetPinBodySchema,
} from "./auth.schema";

const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary:
    "Start self-registration (multipart: fields + nidFrontImage + nidBackImage)",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: registerBodySchema.extend({
            nidFrontImage: z
              .string()
              .openapi({ type: "string", format: "binary" } as never),
            nidBackImage: z
              .string()
              .openapi({ type: "string", format: "binary" } as never),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Registration session created, OTP sent",
      content: {
        "application/json": {
          schema: z.object({
            registrationId: z.string(),
            verificationRequired: z.literal(true),
            emailMasked: z.string(),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/register/resend",
  tags: ["Auth"],
  summary: "Resend the registration OTP",
  request: {
    body: {
      content: { "application/json": { schema: registerResendBodySchema } },
    },
  },
  responses: { 200: { description: "OTP resent" }, ...commonErrorResponses },
});

registry.registerPath({
  method: "post",
  path: "/auth/register/verify",
  tags: ["Auth"],
  summary:
    "Verify registration OTP — creates user, identity, wallet, and an auth session",
  request: {
    body: {
      content: { "application/json": { schema: registerVerifyBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Account created",
      content: {
        "application/json": { schema: z.object({ userId: z.string() }) },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary:
    "Login with email + PIN. Trusted devices get tokens immediately; new devices require OTP verification.",
  request: {
    body: { content: { "application/json": { schema: loginBodySchema } } },
  },
  responses: {
    200: {
      description:
        "Either tokens (trusted device) or a verificationId (new device)",
      content: {
        "application/json": {
          schema: z.union([
            z
              .object({ requiresVerification: z.literal(false) })
              .merge(tokenPairSchema),
            z.object({
              requiresVerification: z.literal(true),
              verificationId: z.string(),
            }),
            z.object({
              mustChangePin: z.literal(true),
              changeToken: z.string(),
            }),
          ]),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login/verify-device",
  tags: ["Auth"],
  summary:
    "Verify OTP for a new device login, optionally trusting the device going forward",
  request: {
    body: {
      content: { "application/json": { schema: loginVerifyDeviceBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Tokens issued",
      content: { "application/json": { schema: tokenPairSchema } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Rotate refresh token, issue a new access token",
  request: {
    body: { content: { "application/json": { schema: refreshBodySchema } } },
  },
  responses: {
    200: {
      description: "New token pair",
      content: { "application/json": { schema: tokenPairSchema } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Revoke a single session by its refresh token",
  request: {
    body: { content: { "application/json": { schema: logoutBodySchema } } },
  },
  responses: { 200: { description: "Logged out" } },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout-all",
  tags: ["Auth"],
  summary: "Revoke every active session for the current user",
  security: [{ CustomerAuth: [] }],
  responses: {
    200: { description: "All sessions revoked" },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/forgot-pin",
  tags: ["Auth"],
  summary: "Request a PIN-reset OTP by email",
  request: {
    body: { content: { "application/json": { schema: forgotPinBodySchema } } },
  },
  responses: { 200: { description: "OTP sent" }, ...commonErrorResponses },
});

registry.registerPath({
  method: "post",
  path: "/auth/forgot-pin/verify",
  tags: ["Auth"],
  summary: "Verify the PIN-reset OTP, receive a short-lived reset token",
  request: {
    body: {
      content: { "application/json": { schema: forgotPinVerifyBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Reset token issued",
      content: {
        "application/json": { schema: z.object({ resetToken: z.string() }) },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/reset-pin",
  tags: ["Auth"],
  summary: "Set a new PIN using a reset token from /auth/forgot-pin/verify",
  request: {
    body: { content: { "application/json": { schema: resetPinBodySchema } } },
  },
  responses: {
    200: { description: "PIN reset, all sessions revoked" },
    ...commonErrorResponses,
  },
});
