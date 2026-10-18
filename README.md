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

## Architecture Overview

Avelor is structured as a Bun workspace monorepo. Conversational AI never touches raw database state directly; business logic and transactional calculations remain server-authoritative.

| Workspace | Technology | Responsibility |
| :--- | :--- | :--- |
| **`apps/storefront`** | Next.js 16, Tailwind CSS v4, Framer Motion | Customer shopping experience, conversational AI drawer, and store admin console (`/admin`). |
| **`apps/api`** | Bun, Hono, Better Auth | REST endpoints, authentication, catalog search, order checkout, webhooks, and AI agent orchestration. |
| **`packages/core`** | TypeScript (Zero dependencies) | Pure domain logic: integer minor-unit Money, Cart, Orders, Policies, Catalog, and Email services. |
| **`packages/database`** | Drizzle ORM, PostgreSQL (pgvector), Redis | Relational tables, session storage, Redis ephemeral cart repository, and Token Bucket rate limiting. |
| **`packages/ai`** | Vercel AI SDK, TypeSafe AI, OpenAI, Gemini | Unified LLM interface (`ChatModel`), semantic embeddings, in-memory vector store, and layered safety guardrails. |

---

## Prerequisites

Ensure the following are installed locally:

- **[Bun](https://bun.sh)** (v1.2 or higher)
- **[Docker & Docker Compose](https://www.docker.com/)** (for PostgreSQL with `pgvector` and Redis 7)
- **Node.js 20+** (optional, recommended for tooling compatibility)

---

## Quickstart Setup

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/FazalAttic/avelor-ai.git
cd avelor-ai
bun install
```

### 2. Configure Environment Variables

Copy the example environment file to `.env.local`:

```bash
cp .env.example .env.local
```

The default values in `.env.example` work out-of-the-box for local Docker containers:
- `DATABASE_URL`: `postgres://avelor:avelor@localhost:5433/avelor_dev`
- `REDIS_URL`: `redis://localhost:6379`
- `BETTER_AUTH_SECRET`: Random 32+ character string
- `BETTER_AUTH_URL`: `http://localhost:5000`

*(Optional: Set `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` to enable real LLM responses; otherwise, the built-in mock model is used).*

### 3. Start Database and Cache Containers

Launch PostgreSQL (pgvector) and Redis in the background:

```bash
bun run docker:db
```

### 4. Push Database Schema

Apply the Drizzle ORM schema to your PostgreSQL database:

```bash
bun run db:push
```

### 5. Start Development Servers

Start both the backend API and Next.js storefront concurrently:

```bash
bun run dev
```

Alternatively, to start the Docker services and dev servers in a single command:

```bash
bun run dev:all
```

---

## Local Access Points

Once running, access the services at:

- **Storefront**: [http://localhost:3000](http://localhost:3000)
- **Admin Console**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/health](http://localhost:5000/health)
- **PostgreSQL**: `localhost:5433` (User: `avelor`, Pass: `avelor`, DB: `avelor_dev`)
- **Redis**: `localhost:6379`

---

## Available Scripts

Run commands from the repository root:

| Command | Action |
| :--- | :--- |
| `bun run dev` | Starts API (`:5000`) and Storefront (`:3000`) concurrently. |
| `bun run dev:all` | Starts Docker containers and launches both dev servers. |
| `bun run dev:api` | Runs the API server only with hot reload. |
| `bun run dev:storefront` | Runs the Next.js storefront only with Turbopack. |
| `bun run docker:db` | Spins up PostgreSQL (`pgvector`) and Redis containers. |
| `bun run docker:down` | Stops and tears down Docker containers. |
| `bun run db:push` | Synchronizes Drizzle schema with the database. |
| `bun test` | Executes the complete test suite across all packages. |
| `bun run check` | Runs TypeScript type checking (`tsc -b`) and Biome linter. |
| `bun run format` | Auto-formats all code using Biome. |

---

## Environment Configuration Guide

Key environment variables in `.env.local`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database & Cache
DATABASE_URL=postgres://avelor:avelor@localhost:5433/avelor_dev
REDIS_URL=redis://localhost:6379

# Authentication (Better Auth)
BETTER_AUTH_SECRET=your_32_char_secret_key_here
BETTER_AUTH_URL=http://localhost:5000
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Storefront URLs
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_AUTH_URL=http://localhost:5000
NEXT_PUBLIC_AVELOR_TENANT_ID=store_alpha

# AI Providers (Optional: defaults to built-in Mock models)
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
TYPESAFE_API_KEY=

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=Avelor <onboarding@resend.dev>
REQUIRE_EMAIL_VERIFICATION=false

# Payments (Cashfree / Mock)
PAYMENT_PROVIDER=mock
WEBHOOK_SECRET=avelor_dev_secret_key_32chars_long
```

---

## Testing & Quality Assurance

Avelor maintains strict end-to-end type safety, unit test coverage, and automated linting.

```bash
# Run all tests
bun test

# Run type checker and linter
bun run check
```

---

## License

Avelor AI is open-source software licensed under the [Apache License, Version 2.0](./LICENSE).
