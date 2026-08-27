import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { verifyEmailTransport } from "./integrations/email/mailer.config";
import { emailWorker } from "./jobs/email.worker";
import { redisClient } from "./config/redis";

async function bootstrap(): Promise<void> {
  await connectDatabase();
  void verifyEmailTransport(); // non-blocking; logs a warning on failure instead of stopping boot

  // Side-effect to ensure worker starts if Redis is configured
  if (emailWorker) {
    logger.info("BullMQ emailWorker is active and listening");
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(
      `🚀 Drive Offer API listening on port ${env.PORT} [${env.NODE_ENV}]`,
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      // 1. Close BullMQ worker
      if (emailWorker) {
        logger.info("Closing email worker...");
        await emailWorker.close();
      }
      // 2. Close Redis client
      if (redisClient) {
        logger.info("Disconnecting Redis...");
        await redisClient.quit();
      }
      // 3. Disconnect database
      await disconnectDatabase();
      logger.info("Shutdown complete");
      process.exit(0);
    });

    // Force-exit if graceful shutdown hangs.
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught exception");
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});
