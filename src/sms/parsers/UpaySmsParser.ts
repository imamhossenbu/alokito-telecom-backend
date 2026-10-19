import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";
import { extractSmsDateTime } from "../normalizer/dateExtractor";

export class UpaySmsParser implements SmsParser {
  canParse(smsContent: string, devicePhoneNumber?: string): boolean {
    const lower = smsContent.toLowerCase();
    const hint = (devicePhoneNumber || "").toLowerCase();

    if (lower.includes("bkash") || hint.includes("bkash")) return false;
    if (lower.includes("nagad") || hint.includes("nagad") || hint.includes("16167")) return false;
    if (lower.includes("rocket") || hint.includes("rocket") || hint.includes("16216")) return false;

    return (
      (lower.includes("upay") ||
        hint.includes("upay") ||
        hint.includes("16268") ||
        hint.includes("ucb") ||
        lower.includes("trxid: up") ||
        lower.includes("trxid:up") ||
        lower.includes("txnid: up") ||
        lower.includes("txnid:up")) &&
      (lower.includes("trxid") || lower.includes("txnid") || lower.includes("txn id"))
    );
  }

  parse(smsContent: string, devicePhoneNumber?: string, fallbackDate?: Date): ParsedSms {
    // Upay receipts:
    // "Cash In of Tk. 500.00 from 01712345678 successful. TrxID: UP12345678. Fee Tk 0.00. Balance Tk 1500.00."
    const normalizedContent = smsContent.replace(/,/g, "");

    const txnMatch = normalizedContent.match(/(?:TrxID|TxnID|Txn ID)\s*:?\s*([A-Za-z0-9]+)/i);
    const amountMatch = normalizedContent.match(/(?:Tk|tk|Tk\.)\s*(\d+(?:\.\d{1,2})?)/i);
    const senderMatch = normalizedContent.match(/(?:from|Sender:?)\s*([+0-9*xX.-]{4,25})/i);

    if (!txnMatch) {
      throw new Error("Could not extract Upay TrxID from SMS");
    }
    if (!amountMatch) {
      throw new Error("Could not extract Upay amount from SMS");
    }

    const transactionId = txnMatch[1];
    const amountBdt = parseFloat(amountMatch[1]);
    const amount = bdtToPoisha(amountBdt);
    const sender = senderMatch ? senderMatch[1].replace(/[.,]+$/, "").trim() : undefined;

    // Parse exact transaction date from message body
    const receivedAt = extractSmsDateTime(normalizedContent, fallbackDate);

    return {
      provider: PaymentProvider.UPAY,
      transactionId,
      amount,
      sender,
      receiver: devicePhoneNumber,
      receivedAt,
    };
  }
}
