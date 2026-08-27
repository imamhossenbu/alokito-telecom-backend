import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenApiDocument } from "./openapi.generator";
import { env } from "../config/env";

const router = Router();

// Generated once at boot; the process restarts on deploy anyway, and
// regenerating per-request would be wasted work on every docs page load.
const openApiDocument = generateOpenApiDocument();

router.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

router.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: "Drive Offer API Docs",
  }),
);

/**
 * Docs are mounted at /api/docs. In production this is left enabled by
 * default since it documents nothing more than what a client already
 * needs to integrate — but if you'd rather keep the API shape private,
 * gate this behind `env.isProduction` in app.ts before mounting.
 */
export default router;

// Re-exported so app.ts can decide whether to mount docs at all.
export const docsEnabled = !env.isTest;
