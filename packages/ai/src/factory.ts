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
  readonly aiProvider?: string | undefined;
  readonly openaiApiKey?: string | undefined;
  readonly googleApiKey?: string | undefined;
  readonly typesafeApiKey?: string | undefined;
  readonly embeddingProvider?: string | undefined;
}

/**
 * Creates the production ChatModel.
 * Automatically loads OpenAI (gpt-4o-mini) or Google Gemini (gemini-1.5-flash) when API keys are configured.
 * Defaults safely to MockChatModel when no API key is present (e.g. offline CI).
 */
export function createProductionChatModel(config: AiEnvironmentConfig = {}): ChatModel {
  const openaiKey = config.openaiApiKey ?? process.env.OPENAI_API_KEY;
  const googleKey =
    config.googleApiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return new AiSdkChatModel(openai("gpt-4o-mini") as never);
  }

  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    return new AiSdkChatModel(google("gemini-1.5-flash") as never);
  }

  return new MockChatModel();
}

/**
 * Creates the production EmbeddingModel.
 * Uses real OpenAI (text-embedding-3-small, 1536 dims) or Google (text-embedding-004) when keys are configured.
 * Defaults to MockEmbeddingModel when no API key is present.
 */
export function createProductionEmbeddingModel(config: AiEnvironmentConfig = {}): EmbeddingModel {
  const openaiKey = config.openaiApiKey ?? process.env.OPENAI_API_KEY;
  const googleKey =
    config.googleApiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return new AiSdkEmbeddingModel(openai.embedding("text-embedding-3-small") as never, {
      modelId: "text-embedding-3-small",
      dimensions: 1536,
    });
  }

  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    return new AiSdkEmbeddingModel(google.textEmbeddingModel("text-embedding-004") as never, {
      modelId: "text-embedding-004",
      dimensions: 768,
    });
  }

  return new MockEmbeddingModel(1536);
}

/**
 * Creates the layered production Guardrail Engine.
 * Layer 1: RuleBasedGuardrail (< 1ms zero-cost regex filters for prompt injection, XSS, and SQLi).
 * Layer 2: TypeSafe AI's Jev System-One decision model ($0.042/M tokens calibrated typed classification).
 */
export function createProductionGuardrail(config: AiEnvironmentConfig = {}): GuardrailEngine {
  const typesafeApiKey = config.typesafeApiKey ?? process.env.TYPESAFE_API_KEY;
  const ruleEngine = new RuleBasedGuardrail();
  const jevEngine = new JevGuardrail({ apiKey: typesafeApiKey });

  return new CompositeGuardrail({
    engines: [ruleEngine, jevEngine],
  });
}
