# ADR 0006: Universal Embeddings, Vector Storage, and Hybrid Search

## Status
Accepted

## Context
Conversational e-commerce discovery frequently encounters the "vocabulary mismatch" problem: customers search using moods, scenarios, or problems (e.g. *"waterproof gear for a rainy trek"* or *"cozy winter tea"*), while store catalogs use technical brand or product names (e.g. *"Alpine Gore-Tex Technical Shell"*). Standard SQL keyword search (`ILIKE` or full-text indexes) yields zero results in such cases.

Per the Engineering Blueprint:
1. **Vendor Neutrality:** Do not hardcode a specific embedding vendor (OpenAI, Cohere, Ollama) or vector database (Pinecone, Qdrant).
2. **Reuse Before Rebuilding (Zero Added Infrastructure by Default):** Since Avelor already runs on PostgreSQL, semantic vector storage must run natively via `pgvector` out of the box without requiring external paid SaaS subscriptions.
3. **Hybrid Search Fusion:** Combine structured SQL filters (category, active status, in-stock count, price range) with semantic cosine distance, guaranteeing the LLM never hallucinates or recommends out-of-stock items.
4. **Automated Catalog Re-indexing:** Switching embedding models changes the latent vector space. An automated batch reindexing mechanism is required to re-embed active products.

## Decision
1. Define the universal **`EmbeddingModel`** port in `@avelor/core` with model ID and dimension properties.
2. Implement **`AiSdkEmbeddingModel`** adapter in `@avelor/ai` to support any embedding model through the open AI SDK.
3. Define the universal **`VectorStore`** port in `@avelor/core` (`upsert`, `search`, `delete`).
4. Implement **`PgVectorStore`** in `@avelor/database` using PostgreSQL `pgvector` extension and Drizzle ORM, storing embeddings in a dedicated `product_embeddings` table with store tenant isolation.
5. Provide **`InMemoryVectorStore`** and **`MockEmbeddingModel`** in `@avelor/ai` for offline development and fast CI testing.
6. Implement **Hybrid Search** in `catalog-tools.ts`: executes keyword search first, then fills remaining capacity using semantic vector similarity ($> 0.35$ cosine threshold), returning deduplicated, verified products.
7. Implement **`reindexCatalog`** service and expose `POST /api/v1/admin/reindex` strictly protected by the `admin` role.

## Consequences
- Open-source self-hosters get semantic AI discovery out of the box with zero external vector database dependencies.
- Pluggable architecture allows enterprise users to connect external vector stores (Pinecone, Qdrant) by implementing the `VectorStore` interface without modifying commerce or agent logic.
- Store admins can trigger catalog re-indexing via CLI or admin API endpoint when embedding models are changed.
- Shopper chats reliably discover products through natural, descriptive, and conceptual queries.
