import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./openapi-registry";
import "./register-all"; // side-effect imports: populates the registry

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Drive Offer API",
      version: "1.0.0",
      description:
        "Telecom offer purchasing platform for the Bangladeshi market. " +
        "Generated directly from the Zod validation schemas used at runtime — " +
        "this document can never drift from the actual request/response contracts.",
    },
    servers: [{ url: "/api/v1", description: "Current environment" }],
    tags: [
      { name: "System", description: "Health checks" },
      { name: "Auth", description: "Registration, login, sessions" },
      { name: "Users", description: "Customer profile & NID identity" },
      {
        name: "Operators",
        description: "Telecom operators (GP, Robi, Airtel, BL, Teletalk)",
      },
      { name: "Offers", description: "Normal offers (wallet-purchasable)" },
      {
        name: "Drive Offers",
        description: "Reselling offers (admin-only cost visibility)",
      },
      { name: "Wallet", description: "Balance, transactions, top-ups" },
      { name: "Payment Devices", description: "SMS Listener pairing & events" },
      { name: "Orders", description: "Purchases & activation state machine" },
      { name: "Refunds", description: "Refunds to wallet" },
      { name: "Notifications", description: "In-app notifications" },
      { name: "Admin", description: "Admin-only operations" },
    ],
  });
}
