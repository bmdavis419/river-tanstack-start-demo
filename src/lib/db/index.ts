import { createServerOnlyFn } from "@tanstack/react-start";
import Redis from "ioredis";

const globalForDb = globalThis as unknown as {
  redisClient: Redis | undefined;
};

const getClient = createServerOnlyFn(() => {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }

  if (!globalForDb.redisClient) {
    globalForDb.redisClient = new Redis(process.env.REDIS_URL);
  }

  return globalForDb.redisClient;
});

export const redisClient = new Proxy({} as Redis, {
  get: (_, prop) => {
    const client = getClient();
    return client[prop as keyof Redis];
  },
});
