import { z } from "../shared/utils/zod";
import { registry } from "./openapi-registry";

export const ErrorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({
    success: z.literal(false).openapi({ example: false }),
    error: z.object({
      code: z.string().openapi({ example: "VALIDATION_ERROR" }),
      message: z.string().openapi({ example: "Validation failed" }),
      details: z.record(z.unknown()).optional(),
    }),
    requestId: z.string().uuid(),
  }),
);

/** Shorthand for the common 4xx/5xx responses most routes share. */
export const commonErrorResponses = {
  400: {
    description: "Validation error",
    content: { "application/json": { schema: ErrorResponseSchema } },
  },
  401: {
    description: "Unauthorized",
    content: { "application/json": { schema: ErrorResponseSchema } },
  },
  403: {
    description: "Forbidden",
    content: { "application/json": { schema: ErrorResponseSchema } },
  },
  404: {
    description: "Not found",
    content: { "application/json": { schema: ErrorResponseSchema } },
  },
  429: {
    description: "Rate limited",
    content: { "application/json": { schema: ErrorResponseSchema } },
  },
} as const;
