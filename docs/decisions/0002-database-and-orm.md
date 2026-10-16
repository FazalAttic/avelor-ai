# ADR 0002: PostgreSQL and Drizzle ORM for Catalog Persistence

## Status
Accepted

## Context
Avelor AI requires a relational persistence layer for commerce state: products, categories, flexible attributes, variants, and inventory.
Per the project's architectural principles:
1. Prices must be stored as integer minor units (never floating-point).
2. Tenant isolation must be enforced on every query.
3. We must choose one primary ORM/query approach for the first release and avoid maintaining competing abstractions.
4. The schema must support typed flexible attributes (jsonb) and full-text search.

Options considered:
1. **Prisma:** Heavy Rust binary engine, slower cold starts, larger bundle footprint.
2. **Kysely:** Pure query builder; requires third-party migration tooling.
3. **Drizzle ORM:** Schema-as-code, zero binary dependencies, instant compilation under Bun, native TypeScript types, and explicit SQL generation that makes tenant scoping obvious and audit-friendly.

## Decision
1. Adopt **PostgreSQL** as the primary relational database.
2. Use **Drizzle ORM** with the `postgres` driver in `packages/database` for schema definitions and migrations.
3. Keep database queries isolated in repository implementations behind the `CatalogRepository` port defined in `@avelor/core`. Application use cases and HTTP handlers interact strictly with domain interfaces, never importing Drizzle or database drivers directly.

## Consequences
- Single ORM baseline across the monorepo.
- Explicit schema definitions in `packages/database` that map directly to `@avelor/core` domain contracts.
- High developer ergonomics with zero build friction in Bun.
