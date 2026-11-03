import {
  createProductionChatModel,
  createProductionEmbeddingModel,
  createProductionGuardrail,
  reindexCatalog,
  type VectorStore,
} from "@avelor/ai";
import {
  type CartRepository,
  InMemoryCartRepository,
  parseTenantId,
  ResendEmailService,
} from "@avelor/core";
import {
  checkRedisHealth,
  createDatabaseClient,
  createRedisClient,
  type Database,
  DrizzleCatalogRepository,
  DrizzleConversationRepository,
  DrizzleOrderRepository,
  DrizzlePolicyRepository,
  PgVectorStore,
  type Redis,
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

// Redis cache & Token Bucket rate limiting: connect first so Auth session cache and Cart share Redis
const redisUrl = process.env.CACHE_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379";
let redisClient: Redis | undefined;
let isRedisAvailable = false;
let cartRepo: CartRepository = new InMemoryCartRepository();
let chatRateLimiter: RedisTokenBucket | undefined;
let apiRateLimiter: RedisTokenBucket | undefined;

try {
  const client = createRedisClient(redisUrl);
  if (await checkRedisHealth(client)) {
    redisClient = client;
    isRedisAvailable = true;
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
      `[Avelor Redis] Connected to Redis at ${redisUrl} (session secondaryStorage, cart TTL, and rate limiting active)`
    );
  } else {
    console.warn(
      `[Avelor Redis] Could not reach Redis at ${redisUrl}, running without Redis cache.`
    );
  }
} catch (redisErr) {
  console.warn(`[Avelor Redis] Error connecting to Redis at ${redisUrl}:`, redisErr);
}

const auth = createAuth({
  database,
  emailService,
  redisClient: isRedisAvailable ? redisClient : undefined,
});

const chatModel = createProductionChatModel();
const embeddingModel = createProductionEmbeddingModel();
const guardrail = createProductionGuardrail();
const catalogRepo = new DrizzleCatalogRepository(database);
const policyRepo = new DrizzlePolicyRepository(database);
const orderRepo = new DrizzleOrderRepository(database);
const conversationRepo = new DrizzleConversationRepository(database);

const vectorStore: VectorStore = new PgVectorStore(database);

// Seed initial demo store & orders into PostgreSQL if empty
try {
  await seedDemoStore(catalogRepo, policyRepo, tenantId);
  await seedDemoOrders(orderRepo, catalogRepo, tenantId);
  console.log(`[Avelor Catalog] Store catalog and orders initialized for tenant '${tenantId}'`);
} catch (seedErr) {
  console.error(`[Avelor Catalog] Error seeding demo store:`, seedErr);
}

// Index catalog into pgvector for AI semantic discovery
try {
  await reindexCatalog({ tenantId, catalogRepo, embeddingModel, vectorStore });
  console.log(`[Avelor Catalog] Vector catalog indexed for tenant '${tenantId}'`);
} catch (reindexErr) {
  console.warn(`[Avelor Catalog] Vector indexing error:`, reindexErr);
}

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
  conversationRepo,
  enforceAdminAuth: true,
  chatRateLimiter,
  apiRateLimiter,
});

console.log(`[Avelor API] Server starting on http://localhost:${port}`);

export default {
  port,
  idleTimeout: 120, // 2 minutes for LLM reasoning loops & SSE streams
  fetch: app.fetch,
};
