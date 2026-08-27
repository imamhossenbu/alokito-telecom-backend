import { z } from "../../shared/utils/zod";
import { registry } from "../../docs/openapi-registry";
import { commonErrorResponses } from "../../docs/common-responses";

const paymentDeviceSchema = registry.register(
  "PaymentDevice",
  z.object({
    id: z.string(),
    adminId: z.string(),
    deviceId: z.string(),
    deviceName: z.string().optional(),
    platform: z.literal("ANDROID"),
    phoneNumber: z.string().optional(),
    paymentProvider: z.string().optional(),
    simSlot: z.number().optional(),
    simOperator: z.string().optional(),
    status: z.enum(["PENDING", "CONNECTED", "OFFLINE", "REVOKED"]),
    lastSeenAt: z.string(),
    pairedAt: z.string().optional(),
  })
);

const smsEventSchema = registry.register(
  "PaymentSmsEvent",
  z.object({
    id: z.string(),
    paymentDeviceId: z.string(),
    adminId: z.string(),
    provider: z.string(),
    transactionId: z.string(),
    amount: z.number(), // poisha
    sender: z.string().optional(),
    receivedAt: z.string(),
    verificationStatus: z.enum(["UNUSED", "MATCHED", "REJECTED"]),
  })
);

// Listener Device Paths (Android App APIs)
registry.registerPath({
  method: "post",
  path: "/payment-devices/pair",
  tags: ["Payment Devices"],
  summary: "Pair a physical Android SMS listener device",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            pairingCode: z.string(),
            deviceId: z.string(),
            deviceName: z.string(),
            phoneNumber: z.string().optional(),
            simSlot: z.number().optional(),
            simOperator: z.string().optional(),
            appVersion: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully paired. Returns device token.",
      content: {
        "application/json": {
          schema: z.object({
            token: z.string(),
            device: paymentDeviceSchema,
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/payment-devices/heartbeat",
  tags: ["Payment Devices"],
  summary: "Submit device heartbeat connectivity check",
  security: [{ DeviceAuth: [] }],
  responses: {
    200: { description: "Heartbeat accepted" },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/payment-devices/sms-events",
  tags: ["Payment Devices"],
  summary: "Ingest a parsed SMS transaction event",
  security: [{ DeviceAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            sender: z.string(),
            body: z.string(),
            receivedAt: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "SMS event processed successfully",
      content: {
        "application/json": {
          schema: smsEventSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

// Admin Paths
registry.registerPath({
  method: "post",
  path: "/admin/payment-devices/pair",
  tags: ["Admin"],
  summary: "Generate a new 6-digit pairing code",
  security: [{ AdminAuth: [] }],
  responses: {
    200: {
      description: "Pairing code generated",
      content: {
        "application/json": {
          schema: z.object({
            pairingCode: z.string(),
            pairingId: z.string(),
            expiresAt: z.string(),
          }),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/payment-devices",
  tags: ["Admin"],
  summary: "List all paired devices",
  security: [{ AdminAuth: [] }],
  responses: {
    200: {
      description: "List of devices",
      content: {
        "application/json": {
          schema: z.array(paymentDeviceSchema),
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/payment-devices/{id}",
  tags: ["Admin"],
  summary: "Get device details by ID",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Device details",
      content: {
        "application/json": {
          schema: paymentDeviceSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/payment-devices/{id}",
  tags: ["Admin"],
  summary: "Configure device number mapping and provider",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            phoneNumber: z.string().optional(),
            paymentProvider: z.enum(["BKASH", "NAGAD", "ROCKET", "OTHER"]).optional(),
            status: z.enum(["CONNECTED", "OFFLINE", "REVOKED"]).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Device configured",
      content: {
        "application/json": {
          schema: paymentDeviceSchema,
        },
      },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/payment-devices/{id}/revoke",
  tags: ["Admin"],
  summary: "Revoke device pairing configuration",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: { description: "Device credentials revoked" },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/payment-devices/{id}/events",
  tags: ["Admin"],
  summary: "List SMS events ingested by a device",
  security: [{ AdminAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "List of SMS events",
      content: {
        "application/json": {
          schema: z.array(smsEventSchema),
        },
      },
    },
    ...commonErrorResponses,
  },
});
