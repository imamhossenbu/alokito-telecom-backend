import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";

export class UpaySmsParser implements SmsParser {
  canParse(smsContent: string): boolean {
    const lower = smsContent.toLowerCase();
    return (
      (lower.includes("upay") || lower.includes("16268") || lower.includes("ucb")) &&
      (lower.includes("trxid") || lower.includes("txnid") || lower.includes("txn id"))
    );
  }

  parse(smsContent: string, devicePhoneNumber?: string): ParsedSms {
    // Upay receipts:
    // "Cash In of Tk. 500.00 from 01712345678 successful. TrxID: UP12345678. Fee Tk 0.00. Balance Tk 1500.00."
    const normalizedContent = smsContent.replace(/,/g, "");

    const txnMatch = normalizedContent.match(/(?:TrxID|TxnID|Txn ID)\s*:\s*([A-Za-z0-9]+)/i);
    const amountMatch = normalizedContent.match(/(?:Tk|tk|Tk\.)\s*(\d+(?:\.\d{1,2})?)/i);
    const senderMatch = normalizedContent.match(/from\s*(\+?880\d+|\d+)/i);

    if (!txnMatch) {
      throw new Error("Could not extract Upay TrxID from SMS");
    }
    if (!amountMatch) {
      throw new Error("Could not extract Upay amount from SMS");
    }

    const transactionId = txnMatch[1];
    const amountBdt = parseFloat(amountMatch[1]);
    const amount = bdtToPoisha(amountBdt);
    const sender = senderMatch ? senderMatch[1] : undefined;

    return {
      provider: PaymentProvider.UPAY,
      transactionId,
      amount,
      sender,
      receiver: devicePhoneNumber,
      receivedAt: new Date(),
    };
  }
}
