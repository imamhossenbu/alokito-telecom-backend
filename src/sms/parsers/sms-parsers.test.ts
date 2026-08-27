import { describe, it, expect } from "vitest";
import { BkashSmsParser } from "./BkashSmsParser";
import { NagadSmsParser } from "./NagadSmsParser";
import { PaymentProvider } from "../../shared/enums";

describe("SMS Parsers Unit Tests", () => {
  describe("bKash SMS Parser", () => {
    const parser = new BkashSmsParser();

    it("should successfully parse a standard Cash In SMS", () => {
      const sms = "You have received Tk 500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5500.00. TrxID ABC123XYZ at 27/08/2026 14:30";
      expect(parser.canParse(sms)).toBe(true);

      const parsed = parser.parse(sms, "01999999999");
      expect(parsed.provider).toBe(PaymentProvider.BKASH);
      expect(parsed.transactionId).toBe("ABC123XYZ");
      expect(parsed.amount).toBe(50000); // 500 BDT in poisha
      expect(parsed.sender).toBe("01712345678");
      expect(parsed.receiver).toBe("01999999999");
      expect(parsed.receivedAt.getFullYear()).toBe(2026);
      expect(parsed.receivedAt.getMonth()).toBe(7); // August is 7 (0-indexed)
      expect(parsed.receivedAt.getDate()).toBe(27);
    });

    it("should successfully parse a successful Cash In with comma in amount", () => {
      const sms = "Cash In Tk 1,500.00 from 01711122233 successful. TrxID 9XYZ123ABC at 27/08/2026 15:45";
      expect(parser.canParse(sms)).toBe(true);

      const parsed = parser.parse(sms);
      expect(parsed.provider).toBe(PaymentProvider.BKASH);
      expect(parsed.transactionId).toBe("9XYZ123ABC");
      expect(parsed.amount).toBe(150000); // 1500 BDT in poisha
      expect(parsed.sender).toBe("01711122233");
    });

    it("should throw error if transaction ID is missing", () => {
      const sms = "You have received Tk 500.00 from 01712345678 at 27/08/2026 14:30";
      expect(() => parser.parse(sms)).toThrowError("Could not extract bKash TrxID from SMS");
    });
  });

  describe("Nagad SMS Parser", () => {
    const parser = new NagadSmsParser();

    it("should successfully parse a standard Nagad Cash In SMS", () => {
      const sms = "Nagad: Cash In received Tk 500.00 from 01812345678. TxnID: 71ABCXYZ. Time: 27/08/2026 14:30";
      expect(parser.canParse(sms)).toBe(true);

      const parsed = parser.parse(sms, "01999999999");
      expect(parsed.provider).toBe(PaymentProvider.NAGAD);
      expect(parsed.transactionId).toBe("71ABCXYZ");
      expect(parsed.amount).toBe(50000); // 500 BDT in poisha
      expect(parsed.sender).toBe("01812345678");
      expect(parsed.receiver).toBe("01999999999");
      expect(parsed.receivedAt.getFullYear()).toBe(2026);
      expect(parsed.receivedAt.getMonth()).toBe(7); // August is 7 (0-indexed)
      expect(parsed.receivedAt.getDate()).toBe(27);
    });

    it("should throw error if amount is missing", () => {
      const sms = "Nagad: Cash In received from 01812345678. TxnID: 71ABCXYZ. Time: 27/08/2026 14:30";
      expect(() => parser.parse(sms)).toThrowError("Could not extract Nagad amount from SMS");
    });
  });
});
