import { z } from "../shared/utils/zod";
import { registry } from "../docs/openapi-registry";

const HealthResponseSchema = z.object({
  status: z.enum(["ok"]),
  database: z.enum(["connected", "disconnected"]),
  timestamp: z.string().datetime(),
  version: z.string(),
});

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Liveness + readiness snapshot",
  responses: {
    200: {
      description: "Service is up",
      content: { "application/json": { schema: HealthResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/health/live",
  tags: ["System"],
  summary: "Bare liveness probe",
  responses: { 200: { description: "Process is alive" } },
});

registry.registerPath({
  method: "get",
  path: "/health/ready",
  tags: ["System"],
  summary: "Readiness probe (checks DB connection)",
  responses: {
    200: { description: "Ready to accept traffic" },
    503: { description: "Not ready (e.g. DB not connected)" },
  },
});
