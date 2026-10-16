import type { CatalogRepository, TenantId } from "@avelor/core";
import type { EmbeddingModel } from "../contracts/embedding";
import type { VectorRecord, VectorStore } from "../contracts/vector-store";

export interface ReindexOptions {
  readonly tenantId: TenantId;
  readonly catalogRepo: CatalogRepository;
  readonly embeddingModel: EmbeddingModel;
  readonly vectorStore: VectorStore;
  readonly batchSize?: number | undefined;
}

export interface ReindexResult {
  readonly totalIndexed: number;
  readonly durationMs: number;
}

/**
 * Re-indexes all active products for a store into the vector store.
 * Formats structured product representation, generates dense embeddings in bounded batches,
 * and atomically upserts records to the vector store.
 */
export async function reindexCatalog(options: ReindexOptions): Promise<ReindexResult> {
  const start = performance.now();
  const batchSize = Math.max(1, Math.min(options.batchSize ?? 25, 100));
  let offset = 0;
  let totalIndexed = 0;

  while (true) {
    const page = await options.catalogRepo.listProducts(options.tenantId, {
      status: "active",
      limit: batchSize,
      offset,
    });

    if (page.items.length === 0) {
      break;
    }

    // 1. Prepare semantic text representation
    const texts = page.items.map((p) => {
      const categoriesText =
        p.categories.length > 0 ? ` Categories: ${p.categories.join(", ")}.` : "";
      return `${p.name}. ${p.description}.${categoriesText}`;
    });

    // 2. Generate embeddings via the configured EmbeddingModel
    const { embeddings } = await options.embeddingModel.embed({
      texts,
      taskType: "document",
    });

    // 3. Construct VectorRecords
    const records: VectorRecord[] = page.items.map((p, idx) => ({
      id: p.id,
      tenantId: options.tenantId,
      vector: embeddings[idx] ?? [],
      metadata: {
        name: p.name,
        categories: p.categories,
      },
    }));

    // 4. Upsert into VectorStore
    await options.vectorStore.upsert(records);

    totalIndexed += page.items.length;
    offset += page.items.length;

    if (totalIndexed >= page.total) {
      break;
    }
  }

  return {
    totalIndexed,
    durationMs: Math.round(performance.now() - start),
  };
}
