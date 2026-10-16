# ADR 0003: AI Tool Contracts and Provider Boundary

## Status
Accepted

## Context
Avelor AI enables intelligent product discovery powered by Large Language Models.
However, LLMs are non-deterministic and prone to hallucinating product attributes, discounts, stock availability, and prices.
Furthermore, letting an LLM access the database directly or infer tenant identity from customer conversation creates catastrophic security and data-leak risks.

Per the project's architectural principles:
1. LLM provider SDKs must remain strictly decoupled from commerce business rules.
2. Tenant identity must be derived exclusively from trusted server authentication/headers, never from LLM arguments.
3. The LLM may only invoke allowlisted tools (`search_products`, `get_product_details`).
4. Tool outputs must be bounded in length and count.
5. Product recommendations must be grounded strictly in authoritative catalog responses.
6. Local development and CI must not require paid external API keys.

## Decision
1. Create `packages/ai` to house AI tool definitions, system prompt guidelines, and the provider-neutral `ChatModel` contract.
2. Tool execution injects `tenantId` and `CatalogRepository` from server context; the model only controls user-facing search criteria (`query`, `category`).
3. Provide a deterministic `MockChatModel` for CI and offline local development, alongside provider adapters.

## Consequences
- Clean separation between core commerce rules and AI models.
- Fast, cost-free, deterministic tests that run in ordinary CI without network dependencies.
- Zero risk of cross-tenant catalog leaks via prompt injection.
