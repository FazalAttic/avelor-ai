import Redis, { type RedisOptions } from "ioredis";

export interface CreateRedisOptions extends RedisOptions {
  readonly url?: string;
}

export function createRedisClient(optionsOrUrl?: string | CreateRedisOptions): Redis {
  let url = process.env.CACHE_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379";
  let userOptions: RedisOptions = {};

  if (typeof optionsOrUrl === "string") {
    url = optionsOrUrl;
  } else if (optionsOrUrl) {
    const { url: customUrl, ...rest } = optionsOrUrl;
    if (customUrl) {
      url = customUrl;
    }
    userOptions = rest;
  }

  const defaultOptions: RedisOptions = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 5) {
        return null;
      }
      return Math.min(times * 100, 2000);
    },
  };

  const RedisConstructor = Redis as unknown as new (url: string, options?: unknown) => Redis;
  const client = new RedisConstructor(url, Object.assign(defaultOptions, userOptions));

  client.on("error", (err) => {
    // Avoid uncaught exception crashes when Redis is temporarily connecting
    if (process.env.NODE_ENV !== "test") {
      console.warn(`[Avelor Redis] Connection notice: ${err.message}`);
    }
  });

  return client;
}

export async function checkRedisHealth(client: Redis): Promise<boolean> {
  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
