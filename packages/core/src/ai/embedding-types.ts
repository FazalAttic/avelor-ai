export type EmbeddingTaskType = "query" | "document";

export interface EmbeddingInput {
  readonly texts: readonly string[];
  readonly taskType?: EmbeddingTaskType | undefined;
}

export interface EmbeddingResult {
  readonly embeddings: readonly (readonly number[])[];
  readonly usage?: { readonly totalTokens: number } | undefined;
}

/**
 * Universal Embedding Model Port.
 * Decouples e-commerce semantic search from specific AI vendors (OpenAI, Cohere, Ollama, Hugging Face).
 */
export interface EmbeddingModel {
  readonly modelId: string;
  readonly dimensions: number;
  embed(input: EmbeddingInput): Promise<EmbeddingResult>;
}
