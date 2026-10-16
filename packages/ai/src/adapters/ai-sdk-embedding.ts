import { type EmbeddingModel as AiSdkModelType, embed, embedMany } from "ai";
import type { EmbeddingInput, EmbeddingModel, EmbeddingResult } from "../contracts/embedding";

export interface AiSdkEmbeddingModelOptions {
  readonly modelId?: string | undefined;
  readonly dimensions: number;
}

/**
 * Universal Embedding Adapter using the standard open AI SDK.
 * Enables any supported embedding model (OpenAI, Cohere, Ollama, Google, Mistral)
 * to be plugged in via Avelor's vendor-neutral EmbeddingModel port.
 */
export class AiSdkEmbeddingModel implements EmbeddingModel {
  readonly modelId: string;
  readonly dimensions: number;

  constructor(
    private readonly model: Parameters<typeof embed>[0]["model"],
    options: AiSdkEmbeddingModelOptions
  ) {
    this.modelId = options.modelId ?? "ai-sdk-embedding";
    this.dimensions = options.dimensions;
  }

  async embed(input: EmbeddingInput): Promise<EmbeddingResult> {
    if (input.texts.length === 0) {
      return { embeddings: [] };
    }

    if (input.texts.length === 1) {
      const text = input.texts[0] ?? "";
      const result = await embed({
        model: this.model,
        value: text,
      });
      return {
        embeddings: [result.embedding],
        ...(result.usage ? { usage: { totalTokens: result.usage.tokens } } : {}),
      };
    }

    const result = await embedMany({
      model: this.model,
      values: [...input.texts],
    });

    return {
      embeddings: result.embeddings,
      ...(result.usage ? { usage: { totalTokens: result.usage.tokens } } : {}),
    };
  }
}
