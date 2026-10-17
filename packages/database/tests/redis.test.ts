import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createMoney, parseTenantId } from "@avelor/core";
import type Redis from "ioredis";
import {
  checkRedisHealth,
  createRedisClient,
  RedisCache,
  RedisCartRepository,
  RedisTokenBucket,
} from "../src/index";

describe("Redis Client, Cache & Cart Repository", () => {
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

  describe("Redis Client Health", () => {
    it("reports live status when connected to Docker Redis", () => {
      // In CI, services.redis provides Redis on 6379; locally, docker compose runs avelor-redis
      if (!isLive && !process.env.CI) {
        console.warn("Skipping Redis health assertion: Redis is not reachable locally");
        return;
      }
      expect(isLive).toBe(true);
    });
  });

  describe("RedisCache", () => {
    it("sets, gets, and expires keys with TTL", async () => {
      if (!isLive) return;
      const cache = new RedisCache(redis, { keyPrefix: "test:cache:" });

      await cache.set("user_prefs", { theme: "night", fontSize: 14 }, 60);

      const cached = await cache.get<{ theme: string; fontSize: number }>("user_prefs");
      expect(cached).toEqual({ theme: "night", fontSize: 14 });

      const exists = await cache.has("user_prefs");
      expect(exists).toBe(true);

      await cache.delete("user_prefs");
      const deleted = await cache.get("user_prefs");
      expect(deleted).toBeNull();
    });

    it("handles getOrSet transparently", async () => {
      if (!isLive) return;
      const cache = new RedisCache(redis, { keyPrefix: "test:getorset:" });
      let fetchCount = 0;

      const fetcher = async () => {
        fetchCount += 1;
        return { data: "computed-value" };
      };

      const val1 = await cache.getOrSet("key1", fetcher, 60);
      const val2 = await cache.getOrSet("key1", fetcher, 60);

      expect(val1).toEqual({ data: "computed-value" });
      expect(val2).toEqual({ data: "computed-value" });
      expect(fetchCount).toBe(1); // Fetcher should only be invoked once

      await cache.delete("key1");
    });

    it("invalidates keys by prefix", async () => {
      if (!isLive) return;
      const cache = new RedisCache(redis, { keyPrefix: "test:prefix:" });

      await cache.set("catalog:item1", { name: "Item 1" }, 60);
      await cache.set("catalog:item2", { name: "Item 2" }, 60);
      await cache.set("users:user1", { name: "User 1" }, 60);

      const deletedCount = await cache.deletePrefix("catalog:");
      expect(deletedCount).toBe(2);

      expect(await cache.get("catalog:item1")).toBeNull();
      expect(await cache.get("catalog:item2")).toBeNull();
      expect(await cache.get("users:user1")).not.toBeNull();

      await cache.delete("users:user1");
    });
  });

  describe("RedisCartRepository", () => {
    const tenantA = parseTenantId("store_alpha");
    const tenantB = parseTenantId("store_beta");

    it("creates a cart with zero subtotal and stores in Redis", async () => {
      if (!isLive) return;
      const repo = new RedisCartRepository(redis, { keyPrefix: "test:cart:" });

      const cart = await repo.createCart(tenantA, "USD");
      expect(cart.id).toMatch(/^cart_/);
      expect(cart.tenantId).toBe(tenantA);
      expect(cart.currency).toBe("USD");
      expect(cart.items).toHaveLength(0);
      expect(cart.subtotal.amount).toBe(0);

      const retrieved = await repo.getCart(tenantA, cart.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(cart.id);
      expect(retrieved?.subtotal.amount).toBe(0);
    });

    it("enforces tenant boundary isolation", async () => {
      if (!isLive) return;
      const repo = new RedisCartRepository(redis, { keyPrefix: "test:cart:" });

      const cart = await repo.createCart(tenantA, "USD");

      // Tenant B should not be able to retrieve Tenant A's cart
      const crossTenant = await repo.getCart(tenantB, cart.id);
      expect(crossTenant).toBeNull();
    });

    it("adds and aggregates items with integer minor-unit math", async () => {
      if (!isLive) return;
      const repo = new RedisCartRepository(redis, { keyPrefix: "test:cart:" });

      const cart = await repo.createCart(tenantA, "USD");

      const item1 = {
        variantId: "var_shoe_42",
        productId: "prod_shoe",
        sku: "SHOE-42",
        title: "Runner Shoe 42",
        unitPrice: createMoney(9900, "USD"), // $99.00
        quantity: 1,
        totalPrice: createMoney(9900, "USD"),
      };

      const withOne = await repo.addItem(tenantA, cart.id, item1);
      expect(withOne.items).toHaveLength(1);
      expect(withOne.subtotal.amount).toBe(9900);

      // Add same variant again -> aggregates quantity
      const withTwo = await repo.addItem(tenantA, cart.id, { ...item1, quantity: 2 });
      expect(withTwo.items).toHaveLength(1);
      expect(withTwo.items[0]?.quantity).toBe(3);
      expect(withTwo.subtotal.amount).toBe(29700); // 3 * 9900 = $297.00
    });

    it("removes items and recalculates subtotal", async () => {
      if (!isLive) return;
      const repo = new RedisCartRepository(redis, { keyPrefix: "test:cart:" });

      const cart = await repo.createCart(tenantA, "USD");

      await repo.addItem(tenantA, cart.id, {
        variantId: "var_1",
        productId: "prod_1",
        sku: "SKU-1",
        title: "Product 1",
        unitPrice: createMoney(5000, "USD"),
        quantity: 2,
        totalPrice: createMoney(10000, "USD"),
      });

      await repo.addItem(tenantA, cart.id, {
        variantId: "var_2",
        productId: "prod_2",
        sku: "SKU-2",
        title: "Product 2",
        unitPrice: createMoney(2500, "USD"),
        quantity: 1,
        totalPrice: createMoney(2500, "USD"),
      });

      const afterRemove = await repo.removeItem(tenantA, cart.id, "var_1");
      expect(afterRemove.items).toHaveLength(1);
      expect(afterRemove.items[0]?.variantId).toBe("var_2");
      expect(afterRemove.subtotal.amount).toBe(2500);
    });

    it("clears cart completely", async () => {
      if (!isLive) return;
      const repo = new RedisCartRepository(redis, { keyPrefix: "test:cart:" });

      const cart = await repo.createCart(tenantA, "USD");

      await repo.addItem(tenantA, cart.id, {
        variantId: "var_1",
        productId: "prod_1",
        sku: "SKU-1",
        title: "Product 1",
        unitPrice: createMoney(1500, "USD"),
        quantity: 1,
        totalPrice: createMoney(1500, "USD"),
      });

      const cleared = await repo.clearCart(tenantA, cart.id);
      expect(cleared.items).toHaveLength(0);
      expect(cleared.subtotal.amount).toBe(0);
    });
  });

  describe("RedisTokenBucket", () => {
    it("permits initial requests up to capacity and calculates remaining tokens", async () => {
      if (!isLive) return;
      const bucket = new RedisTokenBucket(redis, {
        capacity: 3,
        refillRatePerSecond: 1,
        keyPrefix: "test:ratelimit:burst:",
      });
      const clientId = "client_alpha";
      await bucket.reset(clientId);

      // Request 1: uses 1 token, 2 remaining
      const r1 = await bucket.consume(clientId, 1);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);
      expect(r1.retryAfterSeconds).toBe(0);

      // Request 2: uses 1 token, 1 remaining
      const r2 = await bucket.consume(clientId, 1);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      // Request 3: uses 1 token, 0 remaining
      const r3 = await bucket.consume(clientId, 1);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // Request 4: rejected! Capacity exhausted
      const r4 = await bucket.consume(clientId, 1);
      expect(r4.allowed).toBe(false);
      expect(r4.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });

    it("supports variable token costs for expensive operations like LLM chat", async () => {
      if (!isLive) return;
      const bucket = new RedisTokenBucket(redis, {
        capacity: 10,
        refillRatePerSecond: 2,
        keyPrefix: "test:ratelimit:llm:",
      });
      const userId = "user_llm_heavy";
      await bucket.reset(userId);

      // AI chat request with cost of 5 tokens
      const r1 = await bucket.consume(userId, 5);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(5);

      // Second AI chat request with cost of 5 tokens
      const r2 = await bucket.consume(userId, 5);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);

      // Third AI chat request rejected because remaining is 0 < 5
      const r3 = await bucket.consume(userId, 5);
      expect(r3.allowed).toBe(false);
      expect(r3.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });

    it("refills tokens over elapsed time", async () => {
      if (!isLive) return;
      const bucket = new RedisTokenBucket(redis, {
        capacity: 2,
        refillRatePerSecond: 10, // 10 tokens/sec = 1 token every 100ms
        keyPrefix: "test:ratelimit:refill:",
      });
      const clientId = "client_refill";
      await bucket.reset(clientId);

      // Drain all 2 tokens
      await bucket.consume(clientId, 2);
      const drained = await bucket.consume(clientId, 1);
      expect(drained.allowed).toBe(false);

      // Wait 150ms for tokens to replenish
      await new Promise((resolve) => setTimeout(resolve, 150));

      const refilled = await bucket.consume(clientId, 1);
      expect(refilled.allowed).toBe(true);
    });
  });
});
