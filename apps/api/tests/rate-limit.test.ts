import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { checkRedisHealth, createRedisClient, RedisTokenBucket } from "@avelor/database";
import type Redis from "ioredis";
import { createApp } from "../src/app";

describe("API Token Bucket Rate Limiting End-to-End", () => {
  let redis: Redis;
  let isLive = false;

  beforeAll(async () => {
    redis = createRedisClient({
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
      lazyConnect: false,
      connectTimeout: 2000,
    });
    isLive = await checkRedisHealth(redis);
  });

  afterAll(async () => {
    if (redis) {
      await redis.quit().catch(() => {});
    }
  });

  it("enforces Token Bucket rate limit, sets standard headers, and returns 429 when exhausted", async () => {
    if (!isLive) return;

    const testLimiter = new RedisTokenBucket(redis, {
      capacity: 2,
      refillRatePerSecond: 1,
      keyPrefix: "test:api:ratelimit:",
    });

    const testIp = "192.168.1.100";
    await testLimiter.reset(testIp);

    const app = createApp({
      apiRateLimiter: testLimiter,
    });

    // Request 1: allowed, remaining = 1
    const res1 = await app.request("/api/v1/products", {
      headers: {
        "x-tenant-id": "store_alpha",
        "x-forwarded-for": testIp,
      },
    });
    expect(res1.status).toBe(200);
    expect(res1.headers.get("x-ratelimit-limit")).toBe("2");
    expect(res1.headers.get("x-ratelimit-remaining")).toBe("1");

    // Request 2: allowed, remaining = 0
    const res2 = await app.request("/api/v1/products", {
      headers: {
        "x-tenant-id": "store_alpha",
        "x-forwarded-for": testIp,
      },
    });
    expect(res2.status).toBe(200);
    expect(res2.headers.get("x-ratelimit-remaining")).toBe("0");

    // Request 3: blocked with HTTP 429!
    const res3 = await app.request("/api/v1/products", {
      headers: {
        "x-tenant-id": "store_alpha",
        "x-forwarded-for": testIp,
      },
    });
    expect(res3.status).toBe(429);
    expect(res3.headers.get("retry-after")).toBeDefined();
    const body3 = (await res3.json()) as { error: { code: string; message: string } };
    expect(body3.error.code).toBe("RATE_LIMIT_EXCEEDED");

    // Different IP is isolated and not blocked
    const otherIpRes = await app.request("/api/v1/products", {
      headers: {
        "x-tenant-id": "store_alpha",
        "x-forwarded-for": "10.0.0.99",
      },
    });
    expect(otherIpRes.status).toBe(200);
  });
});
