export interface VectorRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly vector: readonly number[];
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface VectorSearchOptions {
  readonly tenantId: string;
  readonly topK?: number | undefined;
  readonly minScore?: number | undefined;
  readonly filter?: Readonly<Record<string, unknown>> | undefined;
}

export interface VectorSearchResult {
  readonly id: string;
  readonly score: number;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Universal Vector Store Port.
 * Decouples semantic retrieval from specific storage engines (PostgreSQL pgvector, Pinecone, Qdrant).
 */
export interface VectorStore {
  upsert(records: readonly VectorRecord[]): Promise<void>;
  search(
    queryVector: readonly number[],
    options: VectorSearchOptions
  ): Promise<readonly VectorSearchResult[]>;
  delete(tenantId: string, ids: readonly string[]): Promise<void>;
}
