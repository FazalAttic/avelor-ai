# ADR 0004: AI SDK Integration and Provider Adapter

## Status
Accepted

## Context
Avelor AI requires a flexible, provider-neutral model layer allowing merchants and developers to connect any LLM provider (OpenAI, Anthropic Claude, Google Gemini, Mistral, local models via Ollama, etc.) without rewriting discovery tools or business logic.

We evaluated the standard **Vercel AI SDK** (`ai` package on npm) against the following verification criteria:

| Evaluation Criteria | Assessment | Status |
| :--- | :--- | :--- |
| **Bun & Hono Compatibility** | Tested with Bun 1.4+ and Hono. Uses standard Web Fetch, Streams, and Promises. | Verified :white_check_mark: |
| **Provider Support** | Broad ecosystem: official adapters for OpenAI, Anthropic, Google, Cohere, Mistral, AWS Bedrock, and community providers (Ollama, LM Studio). | Verified :white_check_mark: |
| **Tool Calling & Validation** | Native `tool()` helper with Zod schema validation; parses structured JSON parameters cleanly. | Verified :white_check_mark: |
| **Streaming & Cancellation** | Full support for `streamText`, abort signals, and token-by-token streaming over HTTP Server-Sent Events. | Verified :white_check_mark: |
| **Error Normalization** | Stable error classifications (`NoSuchModelError`, `APICallError`, `InvalidResponseDataError`) with retry policies. | Verified :white_check_mark: |
| **Footprint & License** | Apache-2.0 open-source license, tree-shakeable, active ecosystem. | Verified :white_check_mark: |
| **Redundant Wrappers** | Insulated inside `packages/ai` behind Avelor's `ChatModel` interface so commerce packages (`@avelor/core`, `@avelor/database`) never import external model packages. | Verified :white_check_mark: |

## Decision
1. Adopt the standard **AI SDK** (`ai` package) as the official LLM integration adapter in `packages/ai`.
2. Implement `AiSdkChatModel` which accepts any `LanguageModelV1` instance, translating Avelor's allowlisted catalog tools into native `tool()` definitions.
3. Keep the commerce domain insulated: `packages/core` and `packages/database` do not depend on the SDK.
4. Retain `MockChatModel` as an offline, zero-cost fallback for CI test suites when no external provider API keys are configured.

## Consequences
- Developers and merchants can plug in any provider model (`openai('gpt-4o')`, `anthropic('claude-3-5-sonnet')`, `google('gemini-1.5-pro')`, or local Ollama) by configuring their model instance.
- Unified streaming and tool calling semantics across all supported LLMs.
- Zero vendor lock-in.
