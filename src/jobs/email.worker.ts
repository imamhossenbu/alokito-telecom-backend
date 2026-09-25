import { Worker, Job } from "bullmq";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { emailProvider } from "../integrations/email/nodemailer.provider";
import { EmailJobData } from "./email.job";

let emailWorker: Worker<EmailJobData> | null = null;

if (env.REDIS_URL) {
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

  emailWorker.on("error", (err) => {
    logger.warn({ err: err?.message || err }, "BullMQ emailWorker connection warning");
  });
}

export { emailWorker };
