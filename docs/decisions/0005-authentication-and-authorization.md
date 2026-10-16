# ADR 0005: Authentication and Authorization with Better Auth

## Status
Accepted

## Context
Avelor AI requires an enterprise-grade authentication and authorization mechanism to separate store administrative operations from public customer shopping.
Per the project's security principles:
1. **Server-Authoritative Security:** Sensitive actions (product creation, inventory changes, price modifications, analytics) must be authorized on the server. Never trust client-side state.
2. **Simplified Single-Store Role Hierarchy:** To avoid premature complexity (YAGNI) and marketplace confusion, the system distinguishes between exactly two roles:
   - **`admin`:** Store owner/operator. Manages catalog, inventory, settings, orders, and sales analytics.
   - **`customer`:** Shopper. Searches catalog, uses AI discovery chat, manages cart, and completes checkout.
3. **Store Boundary Isolation:** An admin account from Store A cannot access or modify metrics/data for Store B (`user.tenantId === request.tenantId`).
4. **Dual Authentication Support:** The system must support browser sessions (cookies for admin dashboards) and `Bearer` tokens (for headless storefronts and mobile apps).

Options considered:
1. **Custom JWT/HMAC Roll-Your-Own:** High implementation risk, prone to token revocation bugs and security vulnerabilities.
2. **NextAuth / Auth.js:** Heavily coupled to Next.js; awkward to run cleanly on a standalone Bun + Hono API backend.
3. **Better Auth (`better-auth`):** TypeScript-first, framework-agnostic, native Bun & Hono handler, direct Drizzle ORM PostgreSQL integration, built-in Bearer token plugin, and schema-level role support.

## Decision
1. Adopt **Better Auth** as the unified authentication engine for Avelor AI.
2. Store users, sessions, accounts, and verifications in PostgreSQL via Drizzle ORM in `packages/database`.
3. Model roles with a strict two-role policy: `"admin"` and `"customer"`.
4. Enforce authorization in `@avelor/api` via dedicated Hono middleware:
   - `requireAuth`: Validates bearer token or session cookie and sets authenticated user in context.
   - `requireRole("admin")`: Rejects customer sessions with `403 Forbidden` on admin management routes.
   - `requireTenantMatch`: Ensures admins can only act on their designated store tenant ID if scoped.
5. Keep public customer discovery (`/api/v1/products`, `/api/v1/chat`, `/api/v1/carts`, `/api/v1/orders/checkout`) accessible without requiring an admin session.

## Consequences
- Cryptographically verified user sessions backed by database revocation.
- Customer accounts cannot touch product catalog mutations or inventory endpoints.
- Seamless compatibility with headless storefronts via Bearer token headers.
