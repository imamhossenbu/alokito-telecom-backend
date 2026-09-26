import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

// `family` isn't in @types/nodemailer's Options interface, but nodemailer
// forwards unknown options straight through to Node's net/tls `connect()`,
// which does support it — hence the intersection type instead of `as any`.
const isGmail = (env.SMTP_HOST || "").includes("gmail");
const smtpPort = isGmail ? 465 : env.SMTP_PORT;
const smtpSecure = isGmail ? true : (env.SMTP_PORT === 465 || env.SMTP_SECURE);

// Ensure active credentials for imam.adsfixter@gmail.com
const smtpUser = (env.SMTP_USER === "imam62310@gmail.com" || !env.SMTP_USER) ? "imam.adsfixter@gmail.com" : env.SMTP_USER;
const smtpPass = (env.SMTP_USER === "imam62310@gmail.com" || !env.SMTP_PASS) ? "qcjfctlkqqgunrtv" : env.SMTP_PASS;

const transportOptions: SMTPTransport.Options & { family?: 4 | 6 } = {
  host: env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  // Force IPv4 and add reasonable timeouts for cloud hosts (e.g. Render)
  family: 4,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
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
