import { BkashSmsParser } from "../parsers/BkashSmsParser";
import { NagadSmsParser } from "../parsers/NagadSmsParser";
import { RocketSmsParser } from "../parsers/RocketSmsParser";
import { UpaySmsParser } from "../parsers/UpaySmsParser";
import { ParsedSms } from "../parsers/SmsParser";

const parsers = [
  new BkashSmsParser(),
  new NagadSmsParser(),
  new RocketSmsParser(),
  new UpaySmsParser(),
];

export function normalizeSms(smsContent: string, devicePhoneNumber?: string): ParsedSms {
  const hint = (devicePhoneNumber || "").toLowerCase();
  if (hint.includes("bkash")) {
    const p = new BkashSmsParser();
    if (p.canParse(smsContent)) return p.parse(smsContent, devicePhoneNumber);
  } else if (hint.includes("nagad") || hint.includes("16167")) {
    const p = new NagadSmsParser();
    if (p.canParse(smsContent)) return p.parse(smsContent, devicePhoneNumber);
  } else if (hint.includes("rocket") || hint.includes("16216") || hint.includes("dbbl")) {
    const p = new RocketSmsParser();
    if (p.canParse(smsContent)) return p.parse(smsContent, devicePhoneNumber);
  } else if (hint.includes("upay") || hint.includes("ucb") || hint.includes("16268")) {
    const p = new UpaySmsParser();
    if (p.canParse(smsContent)) return p.parse(smsContent, devicePhoneNumber);
  }

  for (const parser of parsers) {
    if (parser.canParse(smsContent)) {
      return parser.parse(smsContent, devicePhoneNumber);
    }
  }
  throw new Error("No suitable SMS parser found for content: " + smsContent);
}
