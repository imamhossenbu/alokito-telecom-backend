import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";
import { extractSmsDateTime } from "../normalizer/dateExtractor";

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

  parse(smsContent: string, devicePhoneNumber?: string, fallbackDate?: Date): ParsedSms {
    // Nagad receipts:
    // "Nagad: Cash In received Tk 500.00 from 01812345678. TxnID: 71ABCXYZ. Time: 27/08/2026 14:30"
    
    const normalizedContent = smsContent.replace(/,/g, "");

    const txnMatch = normalizedContent.match(/(?:TxnID|Txn ID|TrxID)\s*:?\s*([A-Za-z0-9]+)/i);
    const amountMatch = normalizedContent.match(/(?:(?:Amount:\s*)?Tk\.?|tk\.?)\s*(\d+(?:\.\d{1,2})?)/i);
    const senderMatch = normalizedContent.match(/(?:from|Sender:?)\s*([+0-9*xX.-]{4,25})/i);

    if (!txnMatch) {
      throw new Error("Could not extract Nagad TxnID from SMS");
    }
    if (!amountMatch) {
      throw new Error("Could not extract Nagad amount from SMS");
    }

    const transactionId = txnMatch[1];
    const amountBdt = parseFloat(amountMatch[1]);
    const amount = bdtToPoisha(amountBdt);
    const sender = senderMatch ? senderMatch[1].replace(/[.,]+$/, "").trim() : undefined;

    // Parse exact transaction date from message body
    const receivedAt = extractSmsDateTime(normalizedContent, fallbackDate);

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
