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

if (env.REDIS_URL && process.env.ENABLE_REDIS === "true") {
  logger.info("Initializing BullMQ emailQueue...");
  emailQueue = new Queue<EmailJobData>("emailQueue", {
    connection: {
      url: env.REDIS_URL,
      retryStrategy: (times) => {
        if (times > 2) return null; // Stop retrying after 2 attempts
        return 2000;
      },
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

  emailQueue.on("error", async (err: any) => {
    if (err?.message?.includes("max requests limit exceeded") || err?.message?.includes("quota")) {
      logger.warn("Upstash Redis quota exceeded. Closing BullMQ emailQueue.");
      try {
        await emailQueue?.close();
      } catch (_) {}
      emailQueue = null;
    } else {
      logger.warn({ err: err?.message || err }, "BullMQ emailQueue connection warning");
    }
  });
}

export async function queueEmail(data: EmailJobData): Promise<void> {
  if (emailQueue) {
    logger.info({ to: data.to, subject: data.subject }, "Enqueuing email job in BullMQ");
    await emailQueue.add("sendEmail", data);
  } else {
    logger.info({ to: data.to }, "Sending email asynchronously in background process");
    // Non-blocking background execution so HTTP responses return instantly (< 50ms)
    setImmediate(async () => {
      try {
        await emailProvider.send(data);
      } catch (err) {
        logger.error({ err, to: data.to }, "Background email dispatch failed");
      }
    });
  }
}

export { emailQueue };
