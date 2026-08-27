import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

// `family` isn't in @types/nodemailer's Options interface, but nodemailer
// forwards unknown options straight through to Node's net/tls `connect()`,
// which does support it — hence the intersection type instead of `as any`.
const transportOptions: SMTPTransport.Options & { family?: 4 | 6 } = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false, // true only for port 465; STARTTLS is used on 587
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  // Force IPv4: some Windows/ISP setups resolve smtp.gmail.com to an
  // IPv6 address that's unreachable (ENETUNREACH) even though IPv4
  // connectivity works fine. This avoids that entirely.
  family: 4,
};

export const transporter = nodemailer.createTransport(transportOptions);

/**
 * Optional boot-time check — verifies SMTP credentials/connectivity once
 * at startup so a misconfigured mailer shows up in logs immediately
 * instead of silently failing on the first registration attempt.
 */
export async function verifyEmailTransport(): Promise<void> {
  try {
    await transporter.verify();
    logger.info("SMTP transport verified");
  } catch (err) {
    logger.error(
      { err },
      "SMTP transport verification failed — emails will not send",
    );
  }
}
