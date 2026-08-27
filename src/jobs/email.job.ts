import { Queue } from "bullmq";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { emailProvider } from "../integrations/email/nodemailer.provider";

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

let emailQueue: Queue<EmailJobData> | null = null;

if (env.REDIS_URL) {
  logger.info("Initializing BullMQ emailQueue...");
  emailQueue = new Queue<EmailJobData>("emailQueue", {
    connection: {
      url: env.REDIS_URL,
    },
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
}

export async function queueEmail(data: EmailJobData): Promise<void> {
  if (emailQueue) {
    logger.info({ to: data.to, subject: data.subject }, "Enqueuing email job in BullMQ");
    await emailQueue.add("sendEmail", data);
  } else {
    logger.warn({ to: data.to }, "Redis not configured. Sending email synchronously as fallback");
    try {
      await emailProvider.send(data);
    } catch (err) {
      logger.error({ err, to: data.to }, "Synchronous email fallback send failed");
    }
  }
}

export { emailQueue };
