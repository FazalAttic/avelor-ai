import { describe, expect, it } from "bun:test";
import { InMemoryCatalogRepository, parseTenantId } from "@avelor/core";
import { MockEmbeddingModel } from "../src/models/mock-embedding-model";
import { reindexCatalog } from "../src/services/reindex";
import { executeToolCall } from "../src/tools/catalog-tools";
import { InMemoryVectorStore } from "../src/vector/in-memory-vector-store";

describe("Universal Embedding, Vector Store & Semantic Discovery", () => {
  const tenantA = parseTenantId("store_alpha");
  const tenantB = parseTenantId("store_beta");

  describe("MockEmbeddingModel", () => {
    it("generates deterministic unit-normalized vectors with configured dimensions", async () => {
      const model = new MockEmbeddingModel(64);
      expect(model.dimensions).toBe(64);

      const res = await model.embed({ texts: ["waterproof alpine shell jacket"] });
      expect(res.embeddings.length).toBe(1);
      const vec = res.embeddings[0] ?? [];
      expect(vec.length).toBe(64);

      // Verify L2 norm is approximately 1.0
      let normSq = 0;
      for (const val of vec) {
        normSq += val * val;
      }
      expect(Math.abs(Math.sqrt(normSq) - 1.0)).toBeLessThan(0.01);
    });

    it("yields high similarity for conceptually related terms and low for unrelated", async () => {
      const model = new MockEmbeddingModel(64);
      const { embeddings } = await model.embed({
        texts: [
          "rainy storm mountain hike", // Query
          "waterproof alpine shell coat", // Similar concept (no exact words)
          "dark roast organic espresso beans", // Completely unrelated
        ],
      });

      const qVec = embeddings[0] ?? [];
      const simVec = embeddings[1] ?? [];
      const diffVec = embeddings[2] ?? [];

      // Cosine dot product between unit vectors
      const dot = (a: readonly number[], b: readonly number[]) =>
        a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);

      const simScore = dot(qVec, simVec);
      const diffScore = dot(qVec, diffVec);

      expect(simScore).toBeGreaterThan(0.6);
      expect(diffScore).toBeLessThan(0.3);
      expect(simScore).toBeGreaterThan(diffScore);
    });
  });

  describe("InMemoryVectorStore", () => {
    it("enforces tenant boundary isolation on vector retrieval", async () => {
      const store = new InMemoryVectorStore();
      const model = new MockEmbeddingModel(64);

      const { embeddings } = await model.embed({
        texts: ["Product for Store Alpha", "Product for Store Beta"],
      });

      await store.upsert([
        { id: "prod_alpha", tenantId: tenantA, vector: embeddings[0] ?? [] },
        { id: "prod_beta", tenantId: tenantB, vector: embeddings[1] ?? [] },
      ]);

      const queryRes = await model.embed({ texts: ["Product for Store"] });
      const queryVec = queryRes.embeddings[0] ?? [];

      // Search tenant A
      const resultsA = await store.search(queryVec, { tenantId: tenantA });
      expect(resultsA.length).toBe(1);
      expect(resultsA[0]?.id).toBe("prod_alpha");

      // Search tenant B
      const resultsB = await store.search(queryVec, { tenantId: tenantB });
      expect(resultsB.length).toBe(1);
      expect(resultsB[0]?.id).toBe("prod_beta");
    });

    it("filters results by minScore and limits by topK", async () => {
      const store = new InMemoryVectorStore();
      const model = new MockEmbeddingModel(64);

      const { embeddings } = await model.embed({
        texts: [
          "cozy winter herbal warm tea",
          "warm spiced black tea",
          "trail running shoes footwear",
        ],
      });

      await store.upsert([
        { id: "tea_1", tenantId: tenantA, vector: embeddings[0] ?? [] },
        { id: "tea_2", tenantId: tenantA, vector: embeddings[1] ?? [] },
        { id: "shoes_1", tenantId: tenantA, vector: embeddings[2] ?? [] },
      ]);

      const queryRes = await model.embed({ texts: ["cozy winter tea"] });
      const queryVec = queryRes.embeddings[0] ?? [];

      // Top 1 should return the closest match
      const top1 = await store.search(queryVec, { tenantId: tenantA, topK: 1 });
      expect(top1.length).toBe(1);
      expect(top1[0]?.id).toBe("tea_1");

      // High threshold should exclude unrelated shoes
      const highThreshold = await store.search(queryVec, {
        tenantId: tenantA,
        minScore: 0.5,
      });
      const ids = highThreshold.map((r) => r.id);
      expect(ids).toContain("tea_1");
      expect(ids).not.toContain("shoes_1");
    });

    it("deletes vectors cleanly", async () => {
      const store = new InMemoryVectorStore();
      const model = new MockEmbeddingModel(64);
      const { embeddings } = await model.embed({ texts: ["test item"] });

      await store.upsert([{ id: "item_1", tenantId: tenantA, vector: embeddings[0] ?? [] }]);
      expect(store.count(tenantA)).toBe(1);

      await store.delete(tenantA, ["item_1"]);
      expect(store.count(tenantA)).toBe(0);
    });
  });

  describe("reindexCatalog Service", () => {
    it("indexes all active products and skips inactive ones", async () => {
      const catalogRepo = new InMemoryCatalogRepository();
      const vectorStore = new InMemoryVectorStore();
      const embeddingModel = new MockEmbeddingModel(64);

      // Create 3 active products and 1 draft
      await catalogRepo.createProduct({
        tenantId: tenantA,
        name: "Espresso Maker",
        description: "Brews rich espresso at home",
        status: "active",
        categories: ["coffee"],
      });
      await catalogRepo.createProduct({
        tenantId: tenantA,
        name: "Trail Shoes",
        description: "Grippy runners for mud and rock",
        status: "active",
        categories: ["footwear"],
      });
      await catalogRepo.createProduct({
        tenantId: tenantA,
        name: "Unreleased Tent",
        description: "Draft item",
        status: "draft",
      });

      const res = await reindexCatalog({
        tenantId: tenantA,
        catalogRepo,
        embeddingModel,
        vectorStore,
        batchSize: 2,
      });

      expect(res.totalIndexed).toBe(2);
      expect(vectorStore.count(tenantA)).toBe(2);
    });
  });

  describe("Hybrid Semantic Search in executeToolCall", () => {
    it("finds products via semantic similarity when keyword search has zero overlap", async () => {
      const catalogRepo = new InMemoryCatalogRepository();
      const vectorStore = new InMemoryVectorStore();
      const embeddingModel = new MockEmbeddingModel(64);

      // Product has NO mention of "rainy" or "trek" in its title or categories
      const product = await catalogRepo.createProduct({
        tenantId: tenantA,
        name: "Alpine Gore-Tex Storm Shell",
        description: "Waterproof protective coat engineered for heavy mountain downpours",
        status: "active",
        categories: ["outerwear"],
      });

      // Index the product
      await reindexCatalog({
        tenantId: tenantA,
        catalogRepo,
        embeddingModel,
        vectorStore,
      });

      // 1. Plain keyword search without semantic support returns empty
      const rawKeyword = await executeToolCall(
        "search_products",
        { query: "rainy trek" },
        { tenantId: tenantA, catalogRepo }
      );
      const keywordRes = JSON.parse(rawKeyword);
      expect(keywordRes.status).toBe("empty");

      // 2. Hybrid search with vector store finds the product semantically!
      const rawHybrid = await executeToolCall(
        "search_products",
        { query: "rainy trek" },
        { tenantId: tenantA, catalogRepo, embeddingModel, vectorStore }
      );
      const hybridRes = JSON.parse(rawHybrid);
      expect(hybridRes.status).toBe("success");
      expect(hybridRes.products.length).toBe(1);
      expect(hybridRes.products[0].id).toBe(product.id);
      expect(hybridRes.products[0].name).toBe("Alpine Gore-Tex Storm Shell");
    });
  });
});
