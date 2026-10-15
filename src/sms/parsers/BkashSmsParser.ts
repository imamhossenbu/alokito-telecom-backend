import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";

export class BkashSmsParser implements SmsParser {
  canParse(smsContent: string, devicePhoneNumber?: string): boolean {
    const lower = smsContent.toLowerCase();
    const hint = (devicePhoneNumber || "").toLowerCase();

    // Exclude other providers
    if (lower.includes("nagad") || hint.includes("nagad") || hint.includes("16167")) return false;
    if (lower.includes("rocket") || hint.includes("rocket") || hint.includes("16216")) return false;
    if (lower.includes("upay") || hint.includes("upay") || hint.includes("16268") || lower.includes("trxid: up") || lower.includes("trxid:up")) return false;

    return (
      (lower.includes("bkash") ||
        hint.includes("bkash") ||
        lower.includes("received") ||
        lower.includes("cash in") ||
        lower.includes("payment")) &&
      lower.includes("trxid")
    );
  }

  parse(smsContent: string, devicePhoneNumber?: string): ParsedSms {
    // bKash receipts:
    // "You have received Tk 500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5500.00. TrxID ABC123XYZ at 27/08/2026 14:30"
    // "Cash In Tk 1,000.00 from 01711122233 successful. ... TrxID 9XYZ123ABC at 27/08/2026 14:30"
    
    // Clean commas out of the amount string
    const normalizedContent = smsContent.replace(/,/g, "");

    const trxMatch = normalizedContent.match(/TrxID\s*:?\s*([A-Za-z0-9]+)/i);
    const amountMatch = normalizedContent.match(/(?:Tk|tk|Tk\.)\s*(\d+(?:\.\d{1,2})?)/i);
    if (!trxMatch) {
      throw new Error("Could not extract bKash TrxID from SMS");
    }
    if (!amountMatch) {
      throw new Error("Could not extract bKash amount from SMS");
    }

    const transactionId = trxMatch[1];
    const amountBdt = parseFloat(amountMatch[1]);
    const amount = bdtToPoisha(amountBdt);

    let sender: string | undefined;
    const senderMatch = normalizedContent.match(/(?:from|Sender:?)\s*([+0-9*xX.-]{4,25})/i);
    if (senderMatch) {
      sender = senderMatch[1].replace(/[.,]+$/, "").trim();
    }

    // Parse date if available
    let receivedAt = new Date();
    const dateMatch = normalizedContent.match(/at\s*(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2})/i);
    if (dateMatch) {
      const parts = dateMatch[1].split(/\s+/);
      const dateParts = parts[0].split("/");
      const timeParts = parts[1].split(":");
      // DD/MM/YYYY HH:MM BST (+06:00)
      const day = dateParts[0].padStart(2, "0");
      const month = dateParts[1].padStart(2, "0");
      const year = dateParts[2];
      const hours = timeParts[0].padStart(2, "0");
      const mins = timeParts[1].padStart(2, "0");
      const parsed = new Date(`${year}-${month}-${day}T${hours}:${mins}:00+06:00`);
      if (!isNaN(parsed.getTime())) {
        receivedAt = parsed;
      }
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
