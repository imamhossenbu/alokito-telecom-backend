import { BkashSmsParser } from "../parsers/BkashSmsParser";
import { NagadSmsParser } from "../parsers/NagadSmsParser";
import { RocketSmsParser } from "../parsers/RocketSmsParser";
import { ParsedSms } from "../parsers/SmsParser";

const parsers = [
  new BkashSmsParser(),
  new NagadSmsParser(),
  new RocketSmsParser(),
];

export function normalizeSms(smsContent: string, devicePhoneNumber?: string): ParsedSms {
  for (const parser of parsers) {
    if (parser.canParse(smsContent)) {
      return parser.parse(smsContent, devicePhoneNumber);
    }
  }
  throw new Error("No suitable SMS parser found for content: " + smsContent);
}
