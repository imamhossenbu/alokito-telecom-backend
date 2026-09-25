import { Worker, Job } from "bullmq";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { emailProvider } from "../integrations/email/nodemailer.provider";
import { EmailJobData } from "./email.job";

let emailWorker: Worker<EmailJobData> | null = null;

if (env.REDIS_URL && process.env.ENABLE_REDIS === "true") {
  logger.info("Initializing BullMQ emailWorker...");
  emailWorker = new Worker<EmailJobData>(
    "emailQueue",
    async (job: Job<EmailJobData>) => {
      const { to, subject, html } = job.data;
      logger.info({ jobId: job.id, to, subject }, "Processing background email job");
      await emailProvider.send({ to, subject, html });
    },
    {
      connection: {
        url: env.REDIS_URL,
        retryStrategy: (times) => {
          if (times > 2) return null; // Stop retrying after 2 attempts
          return 2000;
        },
      },
      concurrency: 5, // Process up to 5 email jobs concurrently
    }
  );

  emailWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Background email job completed successfully");
  });

  emailWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Background email job failed");
  });

  emailWorker.on("error", async (err: any) => {
    if (err?.message?.includes("max requests limit exceeded") || err?.message?.includes("quota")) {
      logger.warn("Upstash Redis quota exceeded. Closing BullMQ emailWorker.");
      try {
        await emailWorker?.close();
      } catch (_) {}
      emailWorker = null;
    } else {
      logger.warn({ err: err?.message || err }, "BullMQ emailWorker connection warning");
    }
  });
}

export { emailWorker };
