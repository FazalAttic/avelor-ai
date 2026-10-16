# ADR 0001: Monorepo Runtime and Tooling Selection

## Status
Accepted

## Context
Avelor AI requires a clean, fast development environment that enforces strict TypeScript standards, deterministic dependency management, and rapid feedback loops without premature multi-tool fragmentation.

We considered:
1. **Node.js + pnpm + ESLint + Prettier + Jest/Vitest** (traditional stack, high config surface area and dependency count).
2. **Bun + Biome** (unified modern runtime, built-in fast test runner, single linter/formatter with zero configuration fatigue).

## Decision
1. **Runtime & Package Manager:** Adopt **Bun** exclusively. Root scripts invoke `bun test` and `bun run`. Lockfiles from npm/pnpm/yarn are prohibited.
2. **Monorepo Structure:** Use Bun native workspaces with `apps/*` (deployable services) and `packages/*` (reusable modules).
3. **Linting & Formatting:** Use **Biome** (`@biomejs/biome`) as the single tool for code formatting, linting, and import sorting.
4. **TypeScript:** Strict compiler settings with project references and `isolatedModules: true`.

## Consequences
- Fast installs and sub-second test execution out of the box.
- Zero ESLint/Prettier plugin conflicts or maintenance churn.
- CI pipeline is lean and executes in seconds.
- Adheres directly to Ponytail rules: reuse native platform capabilities, minimize external dependencies, avoid unnecessary boilerplate.
