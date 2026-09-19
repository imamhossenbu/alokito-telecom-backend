import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";
import { createDriveOfferBodySchema, updateDriveOfferBodySchema, listDriveOffersQuerySchema } from "./driveOffer.schema";

const driveOfferSchema = registry.register(
  "DriveOffer",
  z.object({
    id: z.string(),
    operatorId: z.string(),
    offerName: z.string(),
    category: z.string(),
    offerType: z.string(),
    offerValue: z.string(),
    validity: z.string(),
    sellingPrice: z.number(), // Customer only sees selling price
    regularPrice: z.number().optional(),
    activationCode: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
);

const adminDriveOfferSchema = registry.register(
  "AdminDriveOffer",
  z.object({
    id: z.string(),
    operatorId: z.string(),
    offerName: z.string(),
    category: z.string(),
    offerType: z.string(),
    offerValue: z.string(),
    validity: z.string(),
    purchasePrice: z.number(), // Admin sees purchase price
    sellingPrice: z.number(),
    regularPrice: z.number().optional(),
    activationCode: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
);

// Customer Paths
registry.registerPath({
  method: "get",
  path: "/drive-offers",
  tags: ["Drive Offers"],
  summary: "Get all active drive offers (selling price only)",
  security: [{ CustomerAuth: [] }],
  request: {
    query: listDriveOffersQuerySchema,
  },
  responses: {
    200: {
      description: "List of active drive offers",
      content: {
        "application/json": {
          schema: z.object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            docs: z.array(driveOfferSchema),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/drive-offers/{id}",
  tags: ["Drive Offers"],
  summary: "Get active drive offer details by ID",
  security: [{ CustomerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Drive offer details",
      content: {
        "application/json": {
          schema: driveOfferSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Admin Paths
registry.registerPath({
  method: "get",
  path: "/admin/drive-offers",
  tags: ["Admin"],
  summary: "List all drive offers with cost audit metrics (Admin)",
  security: [{ AdminAuth: [] }],
  responses: {
    200: {
      description: "List of all drive offers",
      content: {
        "application/json": {
          schema: z.array(adminDriveOfferSchema),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/drive-offers",
  tags: ["Admin"],
  summary: "Create a new drive offer",
  security: [{ AdminAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createDriveOfferBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Drive offer created successfully",
      content: {
        "application/json": {
          schema: adminDriveOfferSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/drive-offers/{id}",
  tags: ["Admin"],
  summary: "Update drive offer details by ID",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: updateDriveOfferBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Drive offer updated successfully",
      content: {
        "application/json": {
          schema: adminDriveOfferSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/drive-offers/{id}",
  tags: ["Admin"],
  summary: "Delete a drive offer",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Drive offer deleted",
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/drive-offers/{id}/activate",
  tags: ["Admin"],
  summary: "Activate a drive offer",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Drive offer activated",
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/drive-offers/{id}/deactivate",
  tags: ["Admin"],
  summary: "Deactivate a drive offer",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Drive offer deactivated",
    },
    ...commonErrorResponses,
  },
});
