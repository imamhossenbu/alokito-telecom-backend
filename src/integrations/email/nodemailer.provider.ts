import { transporter } from "./mailer.config";
import { EmailProvider, SendEmailOptions } from "./email.types";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

class NodemailerEmailProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<void> {
    const { to, subject, html, text } = options;

    // 1. If Resend API Key is set, send via HTTPS on Port 443 (Allowed on Render Free tier)
    if (env.RESEND_API_KEY) {
      try {
        const resendFrom = (env.EMAIL_FROM && !env.EMAIL_FROM.includes("gmail.com") && env.EMAIL_FROM.includes("@"))
          ? env.EMAIL_FROM
          : "Alokito Telecom <onboarding@resend.dev>";

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [to],
            subject,
            html,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Resend HTTP error ${res.status}: ${errText}`);
        }
        logger.info({ to, subject }, "Email sent successfully via Resend HTTP API");
        return;
      } catch (err) {
        logger.error({ err, to, subject }, "Failed to send email via Resend HTTP API");
        throw err;
      }
    }

    // 2. If Brevo API Key is set, send via HTTPS on Port 443 (Allowed on Render Free tier)
    if (env.BREVO_API_KEY) {
      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": env.BREVO_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: { name: "Alokito Telecom", email: env.SMTP_USER || "imam.adsfixter@gmail.com" },
            to: [{ email: to }],
            subject,
            htmlContent: html,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Brevo HTTP error ${res.status}: ${errText}`);
        }
        logger.info({ to, subject }, "Email sent successfully via Brevo HTTP API");
        return;
      } catch (err) {
        logger.error({ err, to, subject }, "Failed to send email via Brevo HTTP API");
        throw err;
      }
    }

    // 3. Fall back to standard SMTP (Works on local machine or Render paid tier)
    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
        text: text ?? stripHtml(html),
      });
    } catch (err) {
      logger.error({ err, to, subject }, "Failed to send email via SMTP");
      throw err;
    }
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export const emailProvider: EmailProvider = new NodemailerEmailProvider();
