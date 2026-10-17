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
  InMemoryPolicyRepository,
  parseTenantId,
} from "@avelor/core";
import {
  checkRedisHealth,
  createDatabaseClient,
  createRedisClient,
  type Database,
  RedisCartRepository,
} from "@avelor/database";
import { createApp } from "./app";
import { createAuth } from "./auth";
import { seedDemoStore } from "./seed";

const port = Number(process.env.PORT ?? 5000);
const tenantId = parseTenantId(process.env.AVELOR_TENANT_ID ?? "store_alpha");

const database: Database = createDatabaseClient(
  process.env.DATABASE_URL ?? "postgres://avelor:avelor@localhost:5433/avelor_dev"
);
const auth = createAuth({ database });

// Cart storage: use Redis when available, otherwise fall back to in-memory store
let cartRepo: CartRepository = new InMemoryCartRepository();
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  const redisClient = createRedisClient(redisUrl);
  const isHealthy = await checkRedisHealth(redisClient);
  if (isHealthy) {
    cartRepo = new RedisCartRepository(redisClient);
    console.log(`[Avelor Redis] Connected to Redis at ${redisUrl} (cart TTL active)`);
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

await seedDemoStore(catalogRepo, policyRepo, tenantId);
await reindexCatalog({ tenantId, catalogRepo, embeddingModel, vectorStore });

const app = createApp({
  auth,
  cartRepo,
  chatModel,
  embeddingModel,
  guardrail,
  vectorStore,
  catalogRepo,
  policyRepo,
  enforceAdminAuth: true,
});

console.log(`[Avelor API] Server starting on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
