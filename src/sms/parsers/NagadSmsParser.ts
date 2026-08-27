import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";

export class NagadSmsParser implements SmsParser {
  canParse(smsContent: string): boolean {
    const lower = smsContent.toLowerCase();
    return (
      (lower.includes("nagad") || lower.includes("received")) &&
      (lower.includes("txnid") || lower.includes("txn id"))
    );
  }

  parse(smsContent: string, devicePhoneNumber?: string): ParsedSms {
    // Nagad receipts:
    // "Nagad: Cash In received Tk 500.00 from 01812345678. TxnID: 71ABCXYZ. Time: 27/08/2026 14:30"
    
    const normalizedContent = smsContent.replace(/,/g, "");

    const txnMatch = normalizedContent.match(/(?:TxnID|Txn ID)\s*:\s*([A-Za-z0-9]+)/i);
    const amountMatch = normalizedContent.match(/(?:Tk|tk)\s*(\d+(?:\.\d{1,2})?)/i);
    const senderMatch = normalizedContent.match(/from\s*(\+?880\d+|\d+)/i);

    if (!txnMatch) {
      throw new Error("Could not extract Nagad TxnID from SMS");
    }
    if (!amountMatch) {
      throw new Error("Could not extract Nagad amount from SMS");
    }

    const transactionId = txnMatch[1];
    const amountBdt = parseFloat(amountMatch[1]);
    const amount = bdtToPoisha(amountBdt);
    const sender = senderMatch ? senderMatch[1] : undefined;

    // Parse date if available
    let receivedAt = new Date();
    const timeMatch = normalizedContent.match(/Time\s*:\s*(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2})/i);
    if (timeMatch) {
      const parts = timeMatch[1].split(/\s+/);
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
      provider: PaymentProvider.NAGAD,
      transactionId,
      amount,
      sender,
      receiver: devicePhoneNumber,
      receivedAt,
    };
  }
}
