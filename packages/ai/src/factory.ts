import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { AiSdkEmbeddingModel } from "./adapters/ai-sdk-embedding";
import { AiSdkChatModel } from "./adapters/ai-sdk-model";
import type { EmbeddingModel } from "./contracts/embedding";
import type { GuardrailEngine } from "./contracts/guardrail";
import type { ChatModel } from "./contracts/model";
import { CompositeGuardrail } from "./guardrails/composite-guardrail";
import { JevGuardrail } from "./guardrails/jev-guardrail";
import { RuleBasedGuardrail } from "./guardrails/rule-based-guardrail";
import { MockEmbeddingModel } from "./models/mock-embedding-model";
import { MockChatModel } from "./models/mock-model";

export interface AiEnvironmentConfig {
  /** LLM Layer: Provider (e.g. 'google', 'openai', 'mock') */
  readonly llmProvider?: string | undefined;
  /** LLM Layer: API Key */
  readonly llmApiKey?: string | undefined;
  /** LLM Layer: Model Identifier (e.g. 'gemini-3.5-flash-lite', 'gpt-4o-mini') */
  readonly llmModel?: string | undefined;

  /** Embedding Layer: Provider (e.g. 'openai', 'google', 'mock') */
  readonly embeddingProvider?: string | undefined;
  /** Embedding Layer: API Key */
  readonly embeddingApiKey?: string | undefined;
  /** Embedding Layer: Model Identifier (e.g. 'text-embedding-3-small', 'text-embedding-004') */
  readonly embeddingModel?: string | undefined;
  /** Embedding Layer: Vector Dimensions (default: 1536) */
  readonly embeddingDimensions?: number | undefined;

  /** Guardrail Layer: API Key for content safety & prompt injection classifier */
  readonly guardrailApiKey?: string | undefined;
  /** Guardrail Layer: Provider (e.g. 'typesafe', 'rules') */
  readonly guardrailProvider?: string | undefined;

  /** Legacy vendor-specific options retained for backwards compatibility */
  readonly aiProvider?: string | undefined;
  readonly openaiApiKey?: string | undefined;
  readonly googleApiKey?: string | undefined;
  readonly typesafeApiKey?: string | undefined;
}

/**
 * Creates the production ChatModel for the LLM Layer.
 * Prioritizes layer-named credentials (`LLM_API_KEY`, `LLM_MODEL`, `LLM_PROVIDER`),
 * falling back gracefully to legacy company-specific keys (`GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`).
 * Defaults safely to MockChatModel when no API key is present.
 */
export function createProductionChatModel(config: AiEnvironmentConfig = {}): ChatModel {
  const provider = (
    config.llmProvider ??
    process.env.LLM_PROVIDER ??
    config.aiProvider ??
    ""
  ).toLowerCase();

  const apiKey =
    config.llmApiKey ??
    process.env.LLM_API_KEY ??
    config.googleApiKey ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    config.openaiApiKey ??
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new MockChatModel();
  }

  const modelName = config.llmModel ?? process.env.LLM_MODEL ?? process.env.GEMINI_MODEL;

  // If provider explicitly specified as OpenAI or key is sk- format
  const isOpenAi = provider === "openai" || (!provider && apiKey.startsWith("sk-"));

  if (isOpenAi) {
    const openai = createOpenAI({ apiKey });
    return new AiSdkChatModel(openai(modelName ?? "gpt-4o-mini") as never);
  }

  // Default / Google Generative AI provider
  const google = createGoogleGenerativeAI({ apiKey });
  return new AiSdkChatModel(google(modelName ?? "gemini-3.5-flash-lite") as never);
}

/**
 * Creates the production EmbeddingModel for the Embedding Model Layer.
 * Prioritizes layer-named credentials (`EMBEDDING_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_PROVIDER`),
 * falling back to legacy keys or the general LLM key.
 * Defaults to MockEmbeddingModel when no API key is present.
 */
export function createProductionEmbeddingModel(config: AiEnvironmentConfig = {}): EmbeddingModel {
  const provider = (config.embeddingProvider ?? process.env.EMBEDDING_PROVIDER ?? "").toLowerCase();

  const apiKey =
    config.embeddingApiKey ??
    process.env.EMBEDDING_API_KEY ??
    config.openaiApiKey ??
    process.env.OPENAI_API_KEY ??
    config.googleApiKey ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    config.llmApiKey ??
    process.env.LLM_API_KEY;

  if (!apiKey) {
    return new MockEmbeddingModel(1536);
  }

  const isOpenAi = provider === "openai" || (!provider && apiKey.startsWith("sk-"));

  if (isOpenAi) {
    const openai = createOpenAI({ apiKey });
    const modelId =
      config.embeddingModel ?? process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
    const dimensions =
      config.embeddingDimensions ?? Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);
    return new AiSdkEmbeddingModel(openai.embedding(modelId) as never, {
      modelId,
      dimensions,
    });
  }

  const google = createGoogleGenerativeAI({ apiKey });
  const modelId = config.embeddingModel ?? process.env.EMBEDDING_MODEL ?? "text-embedding-004";
  const dimensions = config.embeddingDimensions ?? Number(process.env.EMBEDDING_DIMENSIONS ?? 768);
  return new AiSdkEmbeddingModel(google.textEmbeddingModel(modelId) as never, {
    modelId,
    dimensions,
  });
}

/**
 * Creates the layered production Guardrail Engine for the AI Safety Layer.
 * Layer 1: RuleBasedGuardrail (< 1ms zero-cost regex filters for prompt injection, XSS, and SQLi).
 * Layer 2: Calibrated System-One decision model powered by `GUARDRAIL_API_KEY`.
 */
export function createProductionGuardrail(config: AiEnvironmentConfig = {}): GuardrailEngine {
  const guardrailApiKey =
    config.guardrailApiKey ??
    process.env.GUARDRAIL_API_KEY ??
    config.typesafeApiKey ??
    process.env.TYPESAFE_API_KEY;
  const ruleEngine = new RuleBasedGuardrail();
  const jevEngine = new JevGuardrail({ apiKey: guardrailApiKey });

  return new CompositeGuardrail({
    engines: [ruleEngine, jevEngine],
  });
}
