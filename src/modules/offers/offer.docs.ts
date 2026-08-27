import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import { createOfferBodySchema, updateOfferBodySchema, listOffersQuerySchema } from "./offer.schema";

const offerSchema = registry.register(
  "Offer",
  z.object({
    id: z.string(),
    operatorId: z.string(),
    name: z.string(),
    category: z.string(),
    type: z.string(),
    offerValue: z.string(),
    validity: z.string(),
    sellingPrice: z.number(),
    activationCode: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
);

// Customer Paths
registry.registerPath({
  method: "get",
  path: "/offers",
  tags: ["Offers"],
  summary: "Get all active general offers",
  security: [{ CustomerAuth: [] }],
  request: {
    query: listOffersQuerySchema,
  },
  responses: {
    200: {
      description: "List of active offers",
      content: {
        "application/json": {
          schema: z.object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            docs: z.array(offerSchema),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/offers/{id}",
  tags: ["Offers"],
  summary: "Get active offer details by ID",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Offer details",
      content: {
        "application/json": {
          schema: offerSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Admin Paths
registry.registerPath({
  method: "get",
  path: "/admin/offers",
  tags: ["Admin"],
  summary: "List all offers (Admin)",
  security: [{ AdminAuth: [] }],
  responses: {
    200: {
      description: "List of all offers",
      content: {
        "application/json": {
          schema: z.array(offerSchema),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/offers",
  tags: ["Admin"],
  summary: "Create a new offer",
  security: [{ AdminAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createOfferBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Offer created successfully",
      content: {
        "application/json": {
          schema: offerSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/offers/{id}",
  tags: ["Admin"],
  summary: "Update offer details by ID",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: updateOfferBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Offer updated successfully",
      content: {
        "application/json": {
          schema: offerSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/offers/{id}",
  tags: ["Admin"],
  summary: "Delete an offer",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Offer deleted",
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/offers/{id}/activate",
  tags: ["Admin"],
  summary: "Activate an offer",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Offer activated",
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/offers/{id}/deactivate",
  tags: ["Admin"],
  summary: "Deactivate an offer",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Offer deactivated",
    },
    ...commonErrorResponses,
  },
});
