# ADR 0005: Authentication and Authorization with Better Auth

## Status
Accepted

## Context
Avelor AI requires an enterprise-grade authentication and authorization mechanism to separate merchant operations from public customer shopping.
Per the Engineering Blueprint and Ponytail rules:
1. **Server-Authoritative Security:** Sensitive actions (product creation, inventory changes, price modifications, analytics) must be authorized on the server. Never trust client-side state.
2. **Simplified Role Hierarchy:** To avoid premature complexity (YAGNI), the system distinguishes between exactly two roles:
   - **`merchant`:** Store owner/operator. Manages catalog, inventory, settings, orders, and sales analytics for their specific tenant.
   - **`customer`:** Shopper. Searches catalog, uses AI discovery chat, manages cart, and completes checkout.
3. **Multi-Tenant Blast Radius:** A merchant from Store A must never access or modify data for Store B (`user.tenantId === request.tenantId`).
4. **Dual Authentication Support:** The system must support browser sessions (cookies for merchant dashboards) and `Bearer` tokens (for headless storefronts and mobile apps).

Options considered:
1. **Custom JWT/HMAC Roll-Your-Own:** High implementation risk, prone to token revocation bugs and security vulnerabilities.
2. **NextAuth / Auth.js:** Heavily coupled to Next.js; awkward to run cleanly on a standalone Bun + Hono API backend.
3. **Better Auth (`better-auth`):** TypeScript-first, framework-agnostic, native Bun & Hono handler, direct Drizzle ORM PostgreSQL integration, built-in Bearer token plugin, and schema-level role support.

## Decision
1. Adopt **Better Auth** as the unified authentication engine for Avelor AI.
2. Store users, sessions, accounts, and verifications in PostgreSQL via Drizzle ORM in `packages/database`.
3. Model roles with a strict two-role policy: `"merchant"` and `"customer"`.
4. Enforce authorization in `@avelor/api` via dedicated Hono middleware:
   - `requireAuth`: Validates bearer token or session cookie and sets authenticated user in context.
   - `requireRole("merchant")`: Rejects customer sessions with `403 Forbidden` on merchant management routes.
   - `requireTenantMatch`: Ensures merchants can only act on their own tenant ID.
5. Keep public customer discovery (`/api/v1/products`, `/api/v1/chat`, `/api/v1/carts`, `/api/v1/orders/checkout`) accessible with multi-tenant scoping without requiring a merchant session.

## Consequences
- Cryptographically verified user sessions backed by database revocation.
- Customer accounts cannot touch product catalog mutations or inventory endpoints.
- Seamless compatibility with headless storefronts via Bearer token headers.
