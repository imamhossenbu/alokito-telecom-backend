export interface ParsedSms {
  provider: string;
  transactionId: string;
  /** Integer poisha */
  amount: number;
  sender?: string;
  receiver?: string;
  reference?: string;
  receivedAt: Date;
}

export interface SmsParser {
  canParse(smsContent: string, devicePhoneNumber?: string): boolean;
  parse(smsContent: string, devicePhoneNumber?: string): ParsedSms;
}

