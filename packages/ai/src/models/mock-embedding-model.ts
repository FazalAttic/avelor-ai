import type { EmbeddingInput, EmbeddingModel, EmbeddingResult } from "../contracts/embedding";

/**
 * Deterministic MockEmbeddingModel for CI tests, offline development, and zero-cost benchmarks.
 * Uses semantic topic projections and token hashing to produce normalized unit vectors
 * where conceptually similar phrases (e.g. "rainy hike" vs "waterproof jacket") have high cosine similarity.
 */
export class MockEmbeddingModel implements EmbeddingModel {
  readonly modelId = "mock-embedding-v1";
  readonly dimensions: number;

  private static readonly TOPIC_VECTORS: Record<string, number> = {
    rain: 0,
    waterproof: 0,
    storm: 0,
    wet: 0,
    jacket: 0,
    coat: 0,
    shell: 0,
    outerwear: 0,
    shoe: 1,
    sneaker: 1,
    runner: 1,
    boot: 1,
    footwear: 1,
    coffee: 2,
    espresso: 2,
    bean: 2,
    roast: 2,
    brew: 2,
    tea: 3,
    herbal: 3,
    cozy: 3,
    warm: 3,
    winter: 3,
  };

  constructor(dimensions = 64) {
    this.dimensions = dimensions;
  }

  async embed(input: EmbeddingInput): Promise<EmbeddingResult> {
    const embeddings: number[][] = [];

    for (const text of input.texts) {
      const vec = new Array(this.dimensions).fill(0.01);
      const lower = text.toLowerCase();
      const words = lower.split(/[^a-z0-9]+/);

      // 1. Topic projections
      for (const word of words) {
        for (const [keyword, dimIndex] of Object.entries(MockEmbeddingModel.TOPIC_VECTORS)) {
          if (word.includes(keyword) || keyword.includes(word)) {
            vec[dimIndex % this.dimensions] += 4.0;
          }
        }

        // 2. Hash contribution for general vocabulary
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = (hash << 5) - hash + word.charCodeAt(i);
          hash |= 0;
        }
        const targetDim = Math.abs(hash) % this.dimensions;
        vec[targetDim] += 0.2;
      }

      // 3. Normalize vector to unit length (L2 norm)
      let normSq = 0;
      for (const val of vec) {
        normSq += val * val;
      }
      const norm = Math.sqrt(normSq) || 1;
      const normalized = vec.map((v) => Number((v / norm).toFixed(6)));

      embeddings.push(normalized);
    }

    return {
      embeddings,
      usage: { totalTokens: input.texts.reduce((acc, t) => acc + t.length / 4, 0) },
    };
  }
}
