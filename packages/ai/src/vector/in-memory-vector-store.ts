import type {
  VectorRecord,
  VectorSearchOptions,
  VectorSearchResult,
  VectorStore,
} from "../contracts/vector-store";

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const valA = a[i] ?? 0;
    const valB = b[i] ?? 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {
    return 0;
  }
  return dotProduct / magnitude;
}

/**
 * In-memory vector store for offline testing, local development, and fast zero-cost CI suites.
 */
export class InMemoryVectorStore implements VectorStore {
  private readonly records = new Map<string, VectorRecord>();

  private makeKey(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  async upsert(records: readonly VectorRecord[]): Promise<void> {
    for (const record of records) {
      this.records.set(this.makeKey(record.tenantId, record.id), record);
    }
  }

  async search(
    queryVector: readonly number[],
    options: VectorSearchOptions
  ): Promise<readonly VectorSearchResult[]> {
    const topK = options.topK ?? 10;
    const minScore = options.minScore ?? 0.0;
    const results: VectorSearchResult[] = [];

    for (const record of this.records.values()) {
      if (record.tenantId !== options.tenantId) {
        continue;
      }

      const score = cosineSimilarity(queryVector, record.vector);
      if (score >= minScore) {
        results.push({
          id: record.id,
          score,
          ...(record.metadata ? { metadata: record.metadata } : {}),
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async delete(tenantId: string, ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      this.records.delete(this.makeKey(tenantId, id));
    }
  }

  /**
   * Helper for inspection in tests
   */
  count(tenantId?: string): number {
    if (!tenantId) {
      return this.records.size;
    }
    let count = 0;
    for (const record of this.records.values()) {
      if (record.tenantId === tenantId) {
        count++;
      }
    }
    return count;
  }
}
