import { transporter } from "./mailer.config";
import { EmailProvider, SendEmailOptions } from "./email.types";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

class NodemailerEmailProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<void> {
    const { to, subject, html, text } = options;

    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
        text: text ?? stripHtml(html),
      });
    } catch (err) {
      // Email sending must never take down the request that triggered it
      // (registration, temporary-PIN issuance, etc). Log loudly instead —
      // in Phase 2+ this call should be moved into a BullMQ job with
      // retries so transient SMTP failures don't silently drop OTPs.
      logger.error({ err, to, subject }, "Failed to send email");
      throw err;
    }
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export const emailProvider: EmailProvider = new NodemailerEmailProvider();
