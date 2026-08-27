import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";

export class BkashSmsParser implements SmsParser {
  canParse(smsContent: string): boolean {
    const lower = smsContent.toLowerCase();
    return (
      (lower.includes("bkash") || lower.includes("received") || lower.includes("cash in")) &&
      lower.includes("trxid")
    );
  }

  parse(smsContent: string, devicePhoneNumber?: string): ParsedSms {
    // bKash receipts:
    // "You have received Tk 500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5500.00. TrxID ABC123XYZ at 27/08/2026 14:30"
    // "Cash In Tk 1,000.00 from 01711122233 successful. ... TrxID 9XYZ123ABC at 27/08/2026 14:30"
    
    // Clean commas out of the amount string
    const normalizedContent = smsContent.replace(/,/g, "");

    const trxMatch = normalizedContent.match(/TrxID\s*([A-Za-z0-9]+)/i);
    const amountMatch = normalizedContent.match(/(?:Tk|tk)\s*(\d+(?:\.\d{1,2})?)/i);
    const senderMatch = normalizedContent.match(/from\s*(\+?880\d+|\d+)/i);

    if (!trxMatch) {
      throw new Error("Could not extract bKash TrxID from SMS");
    }
    if (!amountMatch) {
      throw new Error("Could not extract bKash amount from SMS");
    }

    const transactionId = trxMatch[1];
    const amountBdt = parseFloat(amountMatch[1]);
    const amount = bdtToPoisha(amountBdt);
    const sender = senderMatch ? senderMatch[1] : undefined;

    // Parse date if available
    let receivedAt = new Date();
    const dateMatch = normalizedContent.match(/at\s*(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2})/i);
    if (dateMatch) {
      const parts = dateMatch[1].split(/\s+/);
      const dateParts = parts[0].split("/");
      const timeParts = parts[1].split(":");
      // DD/MM/YYYY HH:MM
      receivedAt = new Date(
        parseInt(dateParts[2], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[0], 10),
        parseInt(timeParts[0], 10),
        parseInt(timeParts[1], 10)
      );
    }

    return {
      provider: PaymentProvider.BKASH,
      transactionId,
      amount,
      sender,
      receiver: devicePhoneNumber,
      receivedAt,
    };
  }
}
