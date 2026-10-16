# Avelor AI

[![CI](https://github.com/avelor-ai/avelor-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/avelor-ai/avelor-ai/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-black.svg)](https://bun.sh)

A provider-neutral, secure-by-default, open-source commerce platform featuring AI-powered discovery.

---

## What Avelor AI Is (and Is Not)

- **What it is:** A modular TypeScript monolith designed for commerce with intelligent product discovery, tenant isolation, strict price/stock source-of-truth invariants, and provider-agnostic LLM/embedding adapters.
- **What it is not:** It is not an ungrounded chat wrapper that hallucinates prices or cart states. It is not an overengineered microservice mesh.

## Key Principles

- **Modular Monolith First:** Explicit module boundaries with shared contracts, deploying as a unified application.
- **Authoritative Commerce:** Prices, inventory, and checkout state are strictly managed by backend logic, never trusted from model output.
- **Pragmatic Engineering (Ponytail Mode):** Built following [`ponytail.md`](./ponytail.md)—YAGNI, minimal diffs, no unnecessary abstractions, and zero-compromise security.
- **Provider Neutrality:** Stable internal contracts decouple business logic from specific LLM or search vendors.

## Architecture Overview

```text
HTTP / UI (Apps: api, storefront)
         |
         v
Application Use Cases & Domain Rules (Packages: core, contracts)
         |
         +----> Ports & Contracts (AI, Search, Payments, Storage)
                     |
                     v
             Infrastructure Adapters
```

## Implementation Status

- [x] **Phase 0: Project Foundation** (Bun monorepo, strict TypeScript, Biome, CI, Ponytail standards)
- [x] **Phase 1: Commerce Foundation** (Store/tenant isolation, catalog, variants, inventory, PostgreSQL Drizzle schema, HTTP catalog API)
- [x] **Phase 2: AI Discovery** (Grounded search tools, ChatModel contract, DiscoveryAgent, /api/v1/chat endpoint)
- [ ] **Phase 3: Transactions** (Cart management, checkout calculation, payment webhooks)
- [ ] **Phase 4: Extensibility** (Hybrid search, vector store adapters, background jobs)

## Prerequisites

- [Bun](https://bun.sh) v1.2 or higher
- Git

## Quick Start

```bash
# Clone the repository
git clone https://github.com/avelor-ai/avelor-ai.git
cd avelor-ai

# Copy environment template
cp .env.example .env

# Install dependencies
bun install

# Run checks & test suite
bun run check
bun test

# Start the development server
bun run dev
```

## Documentation

- [Engineering Blueprint v2](./avelor-ai-engineering-blueprint.md)
- [Ponytail Engineering Rules](./ponytail.md)
- [Architecture Decision Records (ADRs)](./docs/decisions/)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)

## License

Avelor AI is open-source software licensed under the [Apache License, Version 2.0](./LICENSE).
