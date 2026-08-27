import { describe, it, expect } from "vitest";
import { hashPin, verifyPin, generateTemporaryPin } from "./pin";

describe("PIN Utility Unit Tests", () => {
  describe("generateTemporaryPin", () => {
    it("should generate a PIN of requested default length (6)", () => {
      const pin = generateTemporaryPin();
      expect(pin).toHaveLength(6);
      expect(/^\d+$/.test(pin)).toBe(true);
    });

    it("should generate a PIN of custom length", () => {
      const pin = generateTemporaryPin(4);
      expect(pin).toHaveLength(4);
      expect(/^\d+$/.test(pin)).toBe(true);
    });

    it("should not start with 0", () => {
      // Run it many times to ensure randomness doesn't hit 0 at index 0
      for (let i = 0; i < 100; i++) {
        const pin = generateTemporaryPin();
        expect(pin[0]).not.toBe("0");
      }
    });
  });

  describe("hashPin and verifyPin", () => {
    it("should successfully hash a PIN and verify it correctly", async () => {
      const pin = "123456";
      const hashed = await hashPin(pin);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(pin);

      const isValid = await verifyPin(hashed, pin);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPin(hashed, "654321");
      expect(isInvalid).toBe(false);
    });

    it("should return false when verifying a malformed hash instead of throwing", async () => {
      const isValid = await verifyPin("invalid-hash-string", "123456");
      expect(isValid).toBe(false);
    });
  });
});
