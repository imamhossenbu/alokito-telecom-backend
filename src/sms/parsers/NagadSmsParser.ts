import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";

export class NagadSmsParser implements SmsParser {
  canParse(smsContent: string, devicePhoneNumber?: string): boolean {
    const lower = smsContent.toLowerCase();
    const hint = (devicePhoneNumber || "").toLowerCase();

    if (lower.includes("bkash") || hint.includes("bkash")) return false;
    if (lower.includes("rocket") || hint.includes("rocket") || hint.includes("16216")) return false;
    if (lower.includes("upay") || hint.includes("upay") || hint.includes("16268")) return false;

    return (
      lower.includes("nagad") ||
      hint.includes("nagad") ||
      hint.includes("16167") ||
      lower.includes("money received") ||
      (lower.includes("sender:") && (lower.includes("txnid") || lower.includes("txn id") || lower.includes("trxid"))) ||
      (lower.includes("money in") && (lower.includes("txnid") || lower.includes("txn id") || lower.includes("trxid"))) ||
      (lower.includes("cash in") && (lower.includes("txnid") || lower.includes("txn id") || lower.includes("trxid")))
    );
  }

  parse(smsContent: string, devicePhoneNumber?: string): ParsedSms {
    // Nagad receipts:
    // "Nagad: Cash In received Tk 500.00 from 01812345678. TxnID: 71ABCXYZ. Time: 27/08/2026 14:30"
    
    const normalizedContent = smsContent.replace(/,/g, "");

    const txnMatch = normalizedContent.match(/(?:TxnID|Txn ID|TrxID)\s*:?\s*([A-Za-z0-9]+)/i);
    const amountMatch = normalizedContent.match(/(?:(?:Amount:\s*)?Tk\.?|tk\.?)\s*(\d+(?:\.\d{1,2})?)/i);
    const senderMatch = normalizedContent.match(/(?:from|Sender:?)\s*(\+?880\d+|\d+)/i);

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
      provider: PaymentProvider.NAGAD,
      transactionId,
      amount,
      sender,
      receiver: devicePhoneNumber,
      receivedAt,
    };
  }
}
