import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let redisClient: Redis | null = null;

if (env.REDIS_URL && process.env.ENABLE_REDIS === "true") {
  logger.info("Initializing Redis connection...");
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy: (times) => {
      if (times > 2) return null; // Stop retrying after 2 attempts
      return 2000;
    },
  });

  redisClient.on("connect", () => {
    logger.info("Redis connection established successfully");
  });

  redisClient.on("error", (err: any) => {
    logger.error({ err: err?.message || err }, "Redis connection error");
    if (err?.message?.includes("max requests limit exceeded") || err?.message?.includes("quota")) {
      logger.warn("Upstash Redis quota exceeded. Falling back to in-memory mode.");
      try {
        redisClient?.disconnect();
      } catch (_) {}
      redisClient = null;
    }
  });
} else {
  logger.warn("REDIS_URL is not set. Redis-based features will fall back to in-memory mode.");
}

export { redisClient };
