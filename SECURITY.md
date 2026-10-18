# Security Policy

## Supported Versions

| Version | Supported          |
| :------ | :----------------- |
| 0.1.x   | :white_check_mark: |

---

## Reporting a Vulnerability

We take the security of Avelor AI seriously. If you discover a vulnerability or security risk, please do **not** disclose it publicly via GitHub issues or discussions.

Instead, report it responsibly via **GitHub Private Vulnerability Reporting**:

- **Report Link:** [Open a Security Advisory](https://github.com/FazalAttic/avelor-ai/security/advisories/new)
- **Email:** `security@avelor.ai` (monitored by repository maintainers)

### What to Include
1. Step-by-step instructions to reproduce the vulnerability.
2. Proof-of-concept (PoC) code or requests where applicable.
3. Affected components (`apps/api`, `apps/storefront`, `packages/ai`, `packages/core`, `packages/database`).
4. Potential security impact (e.g. cross-tenant leakage, price manipulation, prompt injection bypass).

### Response Timeline
- **Initial Acknowledgment:** Within 48 hours.
- **Triage & Status Update:** Within 5 business days.
- **Remediation & Patch:** Released via coordinated security advisory before public disclosure.

---

## Security Invariants

All contributions and architecture in Avelor AI adhere to a **zero-trust, server-authoritative** security model:

### 1. Multi-Tenant Isolation
- Every database query, repository operation, vector retrieval, and background task must explicitly scope by `tenantId`.
- Cross-tenant data leakage is treated as a critical severity vulnerability.

### 2. Financial & Transactional Integrity
- Pricing, currency conversions, and inventory balances are computed strictly on the backend.
- Monetary amounts must use integer minor units via `Money` (cents). Floating-point currency math is prohibited.
- Never trust client-provided or LLM-suggested prices, discounts, or totals.

### 3. Authentication & Role-Based Access Control (RBAC)
- All privileged endpoints require validated Better Auth sessions.
- Role checks (`admin` vs `customer`) are strictly enforced at the API route handler level.
- Identity and permissions are never inferred from client headers or conversational context.

### 4. AI Guardrails & Prompt Safety
- LLM interactions pass through input and output guardrails (`packages/ai`).
- System prompts and internal instructions must never be leaked to conversational outputs.
- Tool execution parameters are strictly validated; arbitrary SQL, shell execution, or unvalidated code execution by LLMs is strictly prohibited.

### 5. Webhook Security & Idempotency
- Incoming payment and third-party webhooks must be verified using timing-safe HMAC-SHA256 signatures.
- Webhook processing must be idempotent to prevent double-spending or duplicate order fulfillment.

### 6. Email & Input Sanitization
- All user-supplied data embedded into emails or views is HTML-escaped to prevent XSS.
- Email headers are sanitized to block CRLF injection attacks.

### 7. Rate Limiting & DoS Protection
- Sensitive endpoints (authentication, password resets, email verification, and LLM chat) are protected by distributed Redis token-bucket rate limiters.

