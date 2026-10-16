<p align="center">
  <img src="./assets/avelor-ai-banner.png" alt="Avelor AI Banner" width="100%" />
</p>

<p align="center">
  <strong>Open commerce for the AI era.</strong><br />
  A provider-neutral, secure-by-default, open-source commerce engine featuring grounded AI product discovery.
</p>

<p align="center">
  <a href="https://github.com/FazalAttic/avelor-ai/actions/workflows/ci.yml"><img src="https://github.com/FazalAttic/avelor-ai/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache 2.0" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Runtime-Bun_v1.2+-black.svg" alt="Runtime: Bun" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict_5.7+-3178C6.svg" alt="TypeScript Strict" /></a>
</p>

---

## Overview

**Avelor AI** is a modular TypeScript commerce platform built around a single core tenet: **the backend is the only source of truth**. 

Unlike generic LLM wrappers that hallucinate prices, fake inventory, or manipulate transactions through untrusted model output, Avelor strictly decouples conversational intelligence from authoritative commerce execution.

- **Universal AI (Bring Your Own LLM):** Plug in any model (Anthropic, OpenAI, Google, Groq, Ollama, etc.) through our neutral `ChatModel` contract or the standard open `ai` SDK adapter.
- **Grounded Discovery:** LLMs only observe what the catalog allows. Tool outputs are deterministic, bounded, and scoped to the active tenant.
- **Transactional Safety:** Minor-unit integer arithmetic (`Money`), zero floating-point math, multi-tenant query boundaries, and idempotent checkout lifecycles.
- **Pragmatic Monolith:** Built with [Ponytail rules](./ponytail.md)—high internal cohesion, clear package boundaries, minimal dependencies, and no premature distributed complexity.

---
## License

Avelor AI is open-source software licensed under the [Apache License, Version 2.0](./LICENSE).
