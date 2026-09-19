import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";

export class RocketSmsParser implements SmsParser {
  canParse(smsContent: string): boolean {
    const lower = smsContent.toLowerCase();
    return (
      (lower.includes("rocket") || lower.includes("16216") || lower.includes("dbbl") || lower.includes("received")) &&
      (lower.includes("txnid") || lower.includes("txn id")) &&
      !lower.includes("nagad") &&
      !lower.includes("bkash")
    );
  }

  parse(smsContent: string, devicePhoneNumber?: string): ParsedSms {
    // Rocket receipts:
    // "Rocket: You have received Tk. 500.00 from 01912345678. TxnID: 91ABCXYZ. Date: 27/08/2026 14:30"
    
    const normalizedContent = smsContent.replace(/,/g, "");

    const txnMatch = normalizedContent.match(/TxnID\s*:\s*([A-Za-z0-9]+)/i);
    const amountMatch = normalizedContent.match(/(?:Tk|tk|Tk\.)\s*(\d+(?:\.\d{1,2})?)/i);
    const senderMatch = normalizedContent.match(/from\s*(\+?880\d+|\d+)/i);

    if (!txnMatch) {
      throw new Error("Could not extract Rocket TxnID from SMS");
    }
    if (!amountMatch) {
      throw new Error("Could not extract Rocket amount from SMS");
    }

    const transactionId = txnMatch[1];
    const amountBdt = parseFloat(amountMatch[1]);
    const amount = bdtToPoisha(amountBdt);
    const sender = senderMatch ? senderMatch[1] : undefined;

    // Parse date if available
    let receivedAt = new Date();
    const dateMatch = normalizedContent.match(/Date\s*:\s*(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2})/i);
    if (dateMatch) {
      const parts = dateMatch[1].split(/\s+/);
      const dateParts = parts[0].split("/");
      const timeParts = parts[1].split(":");
      receivedAt = new Date(
        parseInt(dateParts[2], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[0], 10),
        parseInt(timeParts[0], 10),
        parseInt(timeParts[1], 10)
      );
    }

    return {
      provider: PaymentProvider.ROCKET,
      transactionId,
      amount,
      sender,
      receiver: devicePhoneNumber,
      receivedAt,
    };
  }
}
