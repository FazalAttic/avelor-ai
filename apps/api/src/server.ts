import {
  createProductionChatModel,
  createProductionEmbeddingModel,
  createProductionGuardrail,
  InMemoryVectorStore,
  reindexCatalog,
} from "@avelor/ai";
import { InMemoryCatalogRepository, InMemoryPolicyRepository, parseTenantId } from "@avelor/core";
import { createApp } from "./app";
import { seedDemoStore } from "./seed";

const port = Number(process.env.PORT ?? 5000);
const tenantId = parseTenantId(process.env.AVELOR_TENANT_ID ?? "store_alpha");

const chatModel = createProductionChatModel();
const embeddingModel = createProductionEmbeddingModel();
const guardrail = createProductionGuardrail();
const vectorStore = new InMemoryVectorStore();

const catalogRepo = new InMemoryCatalogRepository();
const policyRepo = new InMemoryPolicyRepository();

await seedDemoStore(catalogRepo, policyRepo, tenantId);
await reindexCatalog({ tenantId, catalogRepo, embeddingModel, vectorStore });

const app = createApp({
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
