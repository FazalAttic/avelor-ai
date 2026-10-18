# Contributing to Avelor AI

Thank you for contributing to Avelor AI! We welcome contributions that align with our core engineering principles: keeping business logic server-authoritative, maintaining strict multi-tenant isolation, and writing minimal, correct code.

---

## Core Engineering Principles

Before writing code, ensure your changes follow these invariants:

1. **Backend is the Source of Truth:** Never trust client-side or LLM-generated prices, inventory, tenant identifiers, or permissions.
2. **Financial Precision:** All monetary amounts must use integer minor units via `Money` (e.g. cents). Never use floating-point arithmetic for currency.
3. **Strict Tenant Isolation:** Every database query, repository method, and mutating API endpoint must enforce `tenantId`.
4. **Inspect Before Editing:** Trace existing flows and reuse existing abstractions before adding new code.
5. **Apply YAGNI:** Implement only what is required now. Do not add speculative abstractions or unnecessary dependencies.
6. **Shortest Correct Diff:** Keep pull requests focused and minimal. Avoid unrelated refactors or formatting churn.
7. **Every Non-Trivial Change Leaves a Test:** Add reproducible tests with `bun test`. Never claim a check passed without running it.

---

## Monorepo Layout

Avelor is organized as a Bun workspace monorepo:

| Directory | Purpose |
| :--- | :--- |
| **`apps/api`** | Bun + Hono HTTP server, Better Auth, and REST routes (`:5000`). |
| **`apps/storefront`** | Next.js 16 (App Router), Tailwind CSS v4, AI chat UI, and Admin Console (`:3000`). |
| **`packages/core`** | Zero-dependency pure domain logic: Money, Cart, Orders, Catalog, Policies, and Email. |
| **`packages/database`** | Drizzle ORM PostgreSQL schema (`pgvector`), Redis Cart repository, and Token Bucket rate limiter. |
| **`packages/ai`** | Unified `ChatModel` interface, semantic embeddings, vector store, and guardrails. |

---

## Local Development Workflow

### 1. Prerequisites

- **[Bun](https://bun.sh)** (v1.2 or higher)
- **[Docker & Docker Compose](https://www.docker.com/)** (for PostgreSQL + pgvector and Redis)
- **Git**

### 2. Setup

```bash
# Clone the repository
git clone https://github.com/FazalAttic/avelor-ai.git
cd avelor-ai

# Install workspace dependencies
bun install

# Copy environment variables
cp .env.example .env.local

# Start PostgreSQL and Redis containers
bun run docker:db

# Push database schema
bun run db:push
```

### 3. Run Development Servers

```bash
# Start both API (:5000) and Storefront (:3000)
bun run dev

# Or run services individually:
bun run dev:api         # API backend with hot reload
bun run dev:storefront  # Next.js frontend with Turbopack
```

---

## Essential Scripts

| Command | Action |
| :--- | :--- |
| `bun run dev` | Runs API (`:5000`) and Storefront (`:3000`) concurrently. |
| `bun test` | Runs the full test suite across all apps and packages. |
| `bun run check` | Runs TypeScript type checking (`tsc -b`) and Biome linter. |
| `bun run format` | Auto-formats code across the entire monorepo using Biome. |
| `bun run db:push` | Pushes Drizzle schema updates to local PostgreSQL. |
| `bun run docker:db` | Starts PostgreSQL (pgvector) and Redis containers. |
| `bun run docker:down` | Stops and tears down Docker containers. |

---

## Code Quality & Standards

We use [Biome](https://biomejs.dev/) for fast, unified linting and formatting, and TypeScript in strict mode.

Before committing, make sure both checks pass:

```bash
# Type check and lint check
bun run check

# Run full test suite
bun test
```

If Biome reports formatting errors, run:

```bash
bun run format
```

---

## Submitting a Pull Request

1. **Branch Naming**: Create a descriptive branch from `main`:
   - `feat/feature-name`
   - `fix/bug-description`
   - `docs/documentation-update`
   - `test/test-addition`
2. **Commit Messages**: Use concise Conventional Commits (e.g. `feat(admin): add order export`, `fix(cart): correct minor-unit rounding`).
3. **Verify Locally**: Ensure `bun run check` and `bun test` both pass cleanly.
4. **Open PR**: Provide a clear summary of what changed, why, and which verification checks were run.
