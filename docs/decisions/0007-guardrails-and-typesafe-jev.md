# 0007. Guardrails Architecture and TypeSafe AI Jev Decision Model

## Status
Accepted

## Context
Conversational AI shopping assistants in Avelor interact directly with untrusted public customer inputs. Without rigorous safety guardrails, malicious actors could:
1. Exploit prompt injections to override system instructions or leak internal prompt tokens.
2. Inject executable script tags (XSS) or SQL injection fragments into chat payloads.
3. Waste conversational quota and resources on out-of-scope tasks (coding homework, general trivia).
4. Coax generative LLMs into hallucinating non-existent discounts or violating store policies.

Relying solely on generative LLMs to evaluate safety is slow, costly ($0.15-$2.50/M tokens), and vulnerable to meta-prompt exploits.

## Decision
We implement a vendor-neutral, server-authoritative **`GuardrailEngine`** port in `@avelor/ai` with a layered **`CompositeGuardrail`** architecture:

1. **Layer 1: Deterministic Rule-Based Heuristics (`RuleBasedGuardrail`)**
   - Runs in `< 1ms` entirely on CPU before any network calls.
   - Rejects blatant prompt injection phrases (`ignore all previous instructions`, `reveal system prompt`, `DAN mode`).
   - Rejects XSS, HTML script tags, event handlers, and SQL injection syntax.
   - Enforces strict input length boundaries (default 2,000 characters).
   - Rejects $0 of API quota on standard automated attacks.

2. **Layer 2: TypeSafe AI Jev System-One Decision Model (`JevGuardrail`)**
   - Utilizes TypeSafe AI's Jev model via `@typesafe-ai/sdk`.
   - Highly calibrated decision model outputting strictly typed classification (`choice`, `noul`) directly into TypeScript structures.
   - Ultra-low pricing ($0.042 / million tokens), making semantic safety evaluation fast and economical.
   - Evaluates user intent (`shopping` vs `malicious` vs `out_of_scope`) and injection probability.

3. **Production Model Factory (`createProductionChatModel`, `createProductionEmbeddingModel`, `createProductionGuardrail`)**
   - Wires real OpenAI (`text-embedding-3-small`, `gpt-4o-mini`) or Google Gemini (`text-embedding-004`, `gemini-3.5-flash-lite`) and TypeSafe Jev directly from layer-named environment variables (`LLM_API_KEY`, `EMBEDDING_API_KEY`, `GUARDRAIL_API_KEY`, with backwards-compatible vendor key fallbacks).
   - Mock models remain strictly scoped to automated test suites and offline CI benchmarks.

## Consequences
- **Positive:**
  - Multi-tier defense stops 90%+ of automated adversarial traffic at $0 cost and sub-millisecond latency.
  - Semantic jailbreaks and off-topic queries are classified deterministically without generative hallucination.
  - Store operators simply provide their API keys in `.env` under their respective layer to activate real embeddings and guardrails.
- **Negative:**
  - Requires maintaining `GUARDRAIL_API_KEY` for advanced semantic classification when running in production.
