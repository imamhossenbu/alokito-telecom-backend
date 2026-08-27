import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

/**
 * The one shared registry for the whole API. Each module's `*.docs.ts`
 * (or inline in `*.schema.ts`) file should import this and call
 * `registry.registerPath(...)` / `registry.register(...)` for its own
 * routes and reusable schemas. The final OpenAPI document is assembled
 * from whatever has been registered here by the time the server boots —
 * see `openapi.generator.ts`.
 */
export const registry = new OpenAPIRegistry();

// Shared bearer-auth security schemes, referenced by individual routes
// via `security: [{ CustomerAuth: [] }]` etc. in their registerPath() call.
registry.registerComponent("securitySchemes", "CustomerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Customer access token, obtained from POST /auth/login",
});

registry.registerComponent("securitySchemes", "AdminAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Admin access token",
});

registry.registerComponent("securitySchemes", "PaymentDeviceAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Payment listener device credential, issued after pairing",
});
