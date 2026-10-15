import { SmsParser, ParsedSms } from "./SmsParser";
import { bdtToPoisha } from "../../shared/utils/money";
import { PaymentProvider } from "../../shared/enums";

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

  parse(smsContent: string, devicePhoneNumber?: string): ParsedSms {
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

    // Parse date if available
    let receivedAt = new Date();
    const dateMatch = normalizedContent.match(/Date\s*:\s*(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2})/i);
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
      provider: PaymentProvider.ROCKET,
      transactionId,
      amount,
      sender,
      receiver: devicePhoneNumber,
      receivedAt,
    };
  }
}
