import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";
import { extractSmsDateTime } from "../normalizer/dateExtractor";

export class RocketSmsParser implements SmsParser {
  canParse(smsContent: string, devicePhoneNumber?: string): boolean {
    const lower = smsContent.toLowerCase();
    const hint = (devicePhoneNumber || "").toLowerCase();

    if (lower.includes("bkash") || hint.includes("bkash")) return false;
    if (lower.includes("nagad") || hint.includes("nagad") || hint.includes("16167")) return false;
    if (lower.includes("upay") || hint.includes("upay") || hint.includes("16268")) return false;

    return (
      (lower.includes("rocket") || hint.includes("rocket") || hint.includes("16216") || lower.includes("dbbl")) &&
      (lower.includes("txnid") || lower.includes("txn id") || lower.includes("trxid"))
    );
  }

  parse(smsContent: string, devicePhoneNumber?: string, fallbackDate?: Date): ParsedSms {
    // Rocket receipts:
    // "Rocket: You have received Tk. 500.00 from 01912345678. TxnID: 91ABCXYZ. Date: 27/08/2026 14:30"
    
    const normalizedContent = smsContent.replace(/,/g, "");

    const txnMatch = normalizedContent.match(/(?:TxnID|Txn ID|TrxID)\s*:?\s*([A-Za-z0-9]+)/i);
    const amountMatch = normalizedContent.match(/(?:Tk|tk|Tk\.)\s*(\d+(?:\.\d{1,2})?)/i);
    const senderMatch = normalizedContent.match(/(?:from|Sender:?)\s*([+0-9*xX.-]{4,25})/i);

    if (!txnMatch) {
      throw new Error("Could not extract Rocket TxnID from SMS");
    }
    if (!amountMatch) {
      throw new Error("Could not extract Rocket amount from SMS");
    }

    const transactionId = txnMatch[1];
    const amountBdt = parseFloat(amountMatch[1]);
    const amount = bdtToPoisha(amountBdt);
    const sender = senderMatch ? senderMatch[1].replace(/[.,]+$/, "").trim() : undefined;

    // Parse exact transaction date from message body
    const receivedAt = extractSmsDateTime(normalizedContent, fallbackDate);

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
