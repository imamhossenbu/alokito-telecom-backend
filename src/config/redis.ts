import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  logger.info("Initializing Redis connection...");
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
  });

  redisClient.on("connect", () => {
    logger.info("Redis connection established successfully");
  });

  redisClient.on("error", (err) => {
    logger.error({ err }, "Redis connection error");
  });
} else {
  logger.warn("REDIS_URL is not set. Redis-based features will fall back to in-memory mode.");
}

export { redisClient };
