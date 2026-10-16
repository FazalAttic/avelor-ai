import type {
  VectorRecord,
  VectorSearchOptions,
  VectorSearchResult,
  VectorStore,
} from "@avelor/core";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../index";
import { productEmbeddings } from "../schema/embeddings";

/**
 * PostgreSQL pgvector implementation of the universal VectorStore port.
 * Executes native cosine distance search, filtered strictly by store tenant isolation.
 */
export class PgVectorStore implements VectorStore {
  constructor(private readonly db: Database) {}

  async upsert(records: readonly VectorRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    for (const record of records) {
      const model = typeof record.metadata?.model === "string" ? record.metadata.model : "default";
      const contentHash =
        typeof record.metadata?.contentHash === "string" ? record.metadata.contentHash : "default";

      await this.db
        .insert(productEmbeddings)
        .values({
          id: `${record.tenantId}:${record.id}`,
          productId: record.id,
          tenantId: record.tenantId,
          embedding: [...record.vector],
          model,
          contentHash,
        })
        .onConflictDoUpdate({
          target: productEmbeddings.id,
          set: {
            embedding: [...record.vector],
            model,
            contentHash,
            updatedAt: new Date(),
          },
        });
    }
  }

  async search(
    queryVector: readonly number[],
    options: VectorSearchOptions
  ): Promise<readonly VectorSearchResult[]> {
    const topK = options.topK ?? 10;
    const minScore = options.minScore ?? 0.0;

    const vectorString = `[${queryVector.join(",")}]`;
    const similaritySql = sql<number>`1 - (${productEmbeddings.embedding} <=> ${vectorString}::vector)`;

    const rows = await this.db
      .select({
        id: productEmbeddings.productId,
        score: similaritySql,
        model: productEmbeddings.model,
      })
      .from(productEmbeddings)
      .where(
        and(eq(productEmbeddings.tenantId, options.tenantId), sql`${similaritySql} >= ${minScore}`)
      )
      .orderBy(sql`${productEmbeddings.embedding} <=> ${vectorString}::vector ASC`)
      .limit(topK);

    return rows.map((r) => ({
      id: r.id,
      score: Number(r.score),
      metadata: { model: r.model },
    }));
  }

  async delete(tenantId: string, ids: readonly string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.db
      .delete(productEmbeddings)
      .where(
        and(
          eq(productEmbeddings.tenantId, tenantId),
          inArray(productEmbeddings.productId, [...ids])
        )
      );
  }
}
