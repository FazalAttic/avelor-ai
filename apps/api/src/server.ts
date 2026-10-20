import {
  createProductionChatModel,
  createProductionEmbeddingModel,
  createProductionGuardrail,
  InMemoryVectorStore,
  reindexCatalog,
} from "@avelor/ai";
import {
  type CartRepository,
  InMemoryCartRepository,
  InMemoryCatalogRepository,
  InMemoryOrderRepository,
  InMemoryPolicyRepository,
  parseTenantId,
  ResendEmailService,
} from "@avelor/core";
import {
  checkRedisHealth,
  createDatabaseClient,
  createRedisClient,
  type Database,
  RedisCartRepository,
  RedisTokenBucket,
} from "@avelor/database";
import { createApp } from "./app";
import { createAuth } from "./auth";
import { seedDemoOrders, seedDemoStore } from "./seed";

const port = Number(process.env.PORT ?? 5000);
const tenantId = parseTenantId(process.env.AVELOR_TENANT_ID ?? "store_alpha");

const database: Database = createDatabaseClient(
  process.env.DATABASE_URL ?? "postgres://avelor:avelor@localhost:5433/avelor_dev"
);
const emailService = new ResendEmailService();
const auth = createAuth({ database, emailService });

// Cart storage & Token Bucket rate limiting: use Redis when available
let cartRepo: CartRepository = new InMemoryCartRepository();
let chatRateLimiter: RedisTokenBucket | undefined;
let apiRateLimiter: RedisTokenBucket | undefined;

const redisUrl = process.env.CACHE_URL ?? process.env.REDIS_URL;
if (redisUrl) {
  const redisClient = createRedisClient(redisUrl);
  const isHealthy = await checkRedisHealth(redisClient);
  if (isHealthy) {
    cartRepo = new RedisCartRepository(redisClient);
    chatRateLimiter = new RedisTokenBucket(redisClient, {
      capacity: 20,
      refillRatePerSecond: 1 / 1.5, // 1 token every 1.5s (20 burst queries, steady brainstorm refill)
      keyPrefix: "ratelimit:chat:",
    });
    apiRateLimiter = new RedisTokenBucket(redisClient, {
      capacity: 50,
      refillRatePerSecond: 2, // 2 tokens/s (fast human navigation, chokes scrapers)
      keyPrefix: "ratelimit:api:",
    });
    console.log(
      `[Avelor Redis] Connected to Redis at ${redisUrl} (cart TTL & Token Bucket rate limiting active)`
    );
  } else {
    console.warn(
      `[Avelor Redis] Could not reach Redis at ${redisUrl}, falling back to in-memory cart store.`
    );
  }
}

const chatModel = createProductionChatModel();
const embeddingModel = createProductionEmbeddingModel();
const guardrail = createProductionGuardrail();
const vectorStore = new InMemoryVectorStore();

const catalogRepo = new InMemoryCatalogRepository();
const policyRepo = new InMemoryPolicyRepository();
const orderRepo = new InMemoryOrderRepository();

await seedDemoStore(catalogRepo, policyRepo, tenantId);
await seedDemoOrders(orderRepo, catalogRepo, tenantId);
await reindexCatalog({ tenantId, catalogRepo, embeddingModel, vectorStore });

const app = createApp({
  auth,
  emailService,
  cartRepo,
  orderRepo,
  chatModel,
  embeddingModel,
  guardrail,
  vectorStore,
  catalogRepo,
  policyRepo,
  enforceAdminAuth: true,
  chatRateLimiter,
  apiRateLimiter,
});

console.log(`[Avelor API] Server starting on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
