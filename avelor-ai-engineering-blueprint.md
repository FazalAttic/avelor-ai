# Avelor AI --- Engineering Blueprint v2

> **This is the revised blueprint.** It supersedes the first version
> where the two differ.
>
> **Core standard:** secure by default, scalable by design, simple until
> complexity is justified.
>
> **Architecture:** TypeScript monorepo, modular monolith, explicit
> boundaries, provider adapters, and an incremental delivery plan.

## Non-negotiable engineering rules

### Ponytail rules --- required before coding

`ponytail.md` is a required project-level engineering document.
Contributors and AI coding agents must read it before implementing or
modifying code. If it is missing, ask for it or add the agreed canonical
version to the repository before claiming compliance; do not invent or
silently substitute a different policy.

The Ponytail approach is to behave like a pragmatic senior engineer:

1.  **Inspect before editing.** Read the relevant files, trace the
    existing execution flow, and understand the current architecture
    before proposing changes.
2.  **Question the need.** Apply YAGNI. Confirm the requested behavior
    is needed and avoid speculative features.
3.  **Reuse before rebuilding.** Check existing code, platform APIs, the
    standard library, and installed dependencies before adding new
    abstractions or packages.
4.  **Fix root causes.** Do not conceal defects with workarounds,
    duplicated logic, or broad exception handling.
5.  **Prefer the smallest correct diff.** Avoid unrelated refactors,
    formatting churn, generated boilerplate, and needless file
    proliferation.
6.  **Avoid premature architecture.** Do not introduce microservices,
    queues, caches, generic frameworks, or multiple abstraction layers
    without a demonstrated requirement.
7.  **Explain deliberate simplifications.** Where the project's Ponytail
    convention requires it, use a `ponytail:` comment to document the
    deliberate ceiling, why it is acceptable now, and what signal would
    justify upgrading it.
8.  **Never simplify away safety or correctness.** Security,
    authorization, validation, data integrity, error handling,
    accessibility, and explicitly requested functionality are not
    optional shortcuts.
9.  **Verify meaningful changes.** Add or update tests and leave at
    least one reproducible, runnable check for non-trivial behavior.
10. **Report honestly.** State what was changed, what checks were run,
    what failed, and what remains unverified. Never claim tests passed
    if they were not run.

Ponytail comments should be used only where they add useful
context---not mechanically added to every file.

### Secure by default

Security requirements apply to every feature from the first release, not
as a later hardening phase.

-   Validate and parse all external input at system boundaries.
-   Authenticate requests where required and authorize each sensitive
    operation on the server.
-   Enforce tenant/store isolation in database queries, search, vector
    retrieval, background jobs, caches, logs, and file access.
-   Derive user and tenant identity from trusted authentication context,
    never from LLM-generated tool arguments.
-   Keep credentials server-side; provide `.env.example` with
    placeholders only and ignore real secret files.
-   Never let an LLM execute arbitrary SQL, shell commands, or
    unrestricted code.
-   Treat imported catalog text, product descriptions, uploaded files,
    and retrieved documents as untrusted content.
-   Revalidate authoritative price, currency, stock, discounts, and
    eligibility before checkout.
-   Verify payment webhooks, make state transitions idempotent, and
    handle duplicate or delayed events safely.
-   Apply bounded request sizes, result counts, timeouts, rate limits,
    and retry policies to expensive operations.
-   Redact credentials and unnecessary personal data from logs.
-   Add dependency auditing and a responsible vulnerability-reporting
    path.
-   Write negative tests for access-control boundaries, invalid input,
    payment events, and cross-tenant access.

### Scalable by design, not overengineered

"Scalable" means avoiding known bottlenecks and preserving clear upgrade
paths; it does not mean claiming unlimited scale or building distributed
infrastructure in advance.

-   Start with a modular monolith and one deployment unless a real
    requirement justifies separation.
-   Use indexes for common filters, pagination for catalog results,
    bounded AI context, and limits on expensive operations.
-   Keep provider integrations behind small, explicit interfaces.
-   Use idempotent jobs and a queue only when work needs durable
    asynchronous processing, retries, scheduling, or independent
    throughput.
-   Add caching only after defining invalidation rules and measuring a
    meaningful need.
-   Add vector search only when semantic retrieval improves measured
    results over structured and full-text search.
-   Measure query latency, provider latency, error rates, and resource
    use before optimizing.
-   Document bottlenecks and migration paths instead of prematurely
    implementing every possible scale strategy.

## AI SDK decision

### Recommended starting point

Evaluate the **AI SDK** as the preferred integration layer for
LLM interaction in the TypeScript application. It can reduce
provider-specific plumbing for supported models, streaming, and tool
calling. It does not replace Avelor's commerce logic, search system,
embedding lifecycle, database adapters, payment logic, or security
controls.

Before making it a mandatory dependency, create an Architecture Decision
Record (ADR) and verify:

-   Current compatibility with the selected Bun version and Hono
    runtime.
-   Support for the required providers and model features.
-   Tool calling and structured-input validation behavior.
-   Streaming and cancellation behavior.
-   Error normalization, timeouts, and retry behavior.
-   Package size, dependency footprint, license, and maintenance status.
-   Whether its abstractions meet the project requirements without a
    second redundant wrapper.

### Integration boundary

Keep SDK-specific types and imports out of the commerce domain. Place
the integration in the AI application/infrastructure layer, and expose
only the small Avelor-owned contracts that the rest of the application
needs.

``` text
Avelor commerce use cases
        |
        v
Avelor AI orchestration / tool contracts
        |
        v
LLM integration adapter
        |
        v
AI SDK (initial candidate)
        |
        +--> supported model providers
```

Use a thin adapter where it creates a real boundary. Do **not** build a
large duplicate abstraction that simply re-exports every SDK method. If
the SDK already supplies a suitable stable interface, use it directly
inside the AI integration layer and keep the rest of Avelor insulated
from its types.

If evaluation reveals unacceptable limitations, choose another
integration strategy and record the reason in the ADR. Provider
neutrality means Avelor's core business rules are not tied to one
vendor; it does not require pretending every model has identical
capabilities.

### Embeddings are separate

Do not assume the LLM SDK choice solves embedding generation or vector
storage. Keep embedding generation and vector-store access as separate
capabilities with independent configuration. Ensure query/document
vectors are compatible and re-index catalog data when the embedding
model or text-generation strategy changes.

## Frontend visual standard

For Avelor's official dashboard and storefront examples, use a
deliberate design system rather than ad hoc styles:

-   Light theme as the default.
-   Black or near-black as the primary brand/action color, with
    accessible contrast.
-   Reusable CSS variables/design tokens for color, spacing, radius,
    typography, borders, and shadows.
-   Reusable components for repeated UI patterns.
-   Responsive layouts, keyboard navigation, visible focus states,
    semantic HTML, and accessible form labels.
-   Avoid hardcoded repeated colors and one-off styling that bypasses
    the design tokens.
-   Keep storefront branding customizable where it is a merchant-facing
    feature; the project dashboard's default visual identity should
    remain consistent.

## Definition of done --- mandatory checklist

Before calling a non-trivial change complete, verify:

-   [ ] Ponytail rules were consulted and followed.
-   [ ] The existing flow and relevant dependencies were inspected
    before editing.
-   [ ] The change is the smallest correct solution; unnecessary
    dependencies and abstractions were avoided.
-   [ ] External inputs are validated and sensitive actions are
    authorized.
-   [ ] Tenant boundaries and authoritative data sources are preserved.
-   [ ] Failure paths, timeouts, and duplicate operations are considered
    where relevant.
-   [ ] Tests cover meaningful success and failure behavior.
-   [ ] Formatting, lint, type checking, tests, and build checks were
    run as applicable.
-   [ ] Documentation, configuration examples, and migrations are
    updated where needed.
-   [ ] The final summary accurately reports checks run and remaining
    limitations.

------------------------------------------------------------------------

## Previous full engineering blueprint

The following sections retain the broader architecture, repository
structure, catalog/search design, payment workflow, coding standards,
testing strategy, Git workflow, documentation, contribution guidelines,
and roadmap from the first blueprint. Apply them together with the
non-negotiable rules above. Where an older section describes a
recommendation as a fixed decision, treat it as provisional until
recorded in an ADR.

> **Purpose:** Define a maintainable, secure, provider-agnostic,
> open-source commerce platform with AI-powered product discovery.
>
> **Architecture:** Modular monorepo with a modular-monolith application
> at its core. Keep boundaries explicit without introducing
> microservices prematurely.
>
> **Status:** Initial proposal. Treat this document as an engineering
> guide, not a requirement to implement every capability in the first
> release.

------------------------------------------------------------------------

## 1. Engineering principles

Avelor AI should be recognizable as a carefully engineered open-source
project---not a collection of generated files.

1.  **Clarity over cleverness.** Prefer readable, unsurprising code and
    explicit control flow.
2.  **Modular monolith first.** Use internal module boundaries and
    package interfaces before considering separate deployable services.
3.  **One source of truth.** Product prices, stock, permissions, orders,
    and payment status must come from trusted backend systems---not
    model output or stale vector results.
4.  **Provider-neutral interfaces.** Keep business logic independent of
    specific LLM, embedding, vector-store, payment, and object-storage
    vendors.
5.  **Secure by default.** Validate inputs, enforce tenant boundaries,
    protect secrets, and authorize every sensitive operation on the
    server.
6.  **Test behavior, not implementation details.** Focus tests on public
    contracts, business rules, failure modes, and integration
    boundaries.
7.  **Document decisions.** Explain why architectural choices were made,
    especially when they create constraints.
8.  **Incremental complexity.** Build the smallest useful version,
    measure it, and add infrastructure only when there is a clear need.
9.  **Observable operations.** Provide structured logs, useful error
    messages, health checks, and traceable request IDs without leaking
    secrets.
10. **Accessibility and usability.** Customer-facing interfaces should
    be responsive, accessible, and usable without AI.

## 2. Proposed technology baseline

These are initial defaults, not irreversible commitments.

  ---------------------------------------------------------------------
  Area                               Initial direction
  ---------------------------------- ----------------------------------
  Language                           TypeScript with strict compiler
                                     settings

  Runtime                            Bun

  Backend HTTP                       Hono

  Storefront / developer dashboard   Next.js, where a web application
                                     is needed

  Primary relational database        PostgreSQL

  Database access                    Choose one primary ORM/query
                                     approach for the first release;
                                     avoid maintaining two competing
                                     abstractions

  Validation                         Shared schema validation at API
                                     and configuration boundaries

  AI providers                       Provider adapters behind a stable
                                     internal interface

  Embeddings                         Independent embedding-provider
                                     interface

  Search                             PostgreSQL filters and full-text
                                     search first; optional
                                     vector/hybrid search through
                                     adapters

  Testing                            Unit, integration, and end-to-end
                                     tests appropriate to each layer

  Formatting / linting               One formatter and one linting
                                     setup, enforced in CI

  CI                                 Pull-request checks for type
                                     checking, linting, tests, and
                                     build

  Documentation                      Markdown, architecture decision
                                     records (ADRs), API reference, and
                                     runnable examples
  ---------------------------------------------------------------------

**Important:** Avoid introducing every tool immediately. Confirm the
selected ORM, test runner, package manager, and workspace tooling in an
ADR before implementation. Do not mix npm, pnpm, and Bun lockfiles
without a deliberate reason.

## 3. Repository structure

Use a workspace monorepo. Keep deployable applications in `apps/` and
reusable libraries in `packages/`. A package should exist because it has
a meaningful boundary---not simply because every directory deserves its
own package.

``` text
avelor-ai/
├── apps/
│   ├── api/                         # HTTP API and application composition
│   │   ├── src/
│   │   │   ├── app.ts               # Hono app construction
│   │   │   ├── server.ts            # Runtime entry point
│   │   │   ├── routes/              # HTTP route registration
│   │   │   ├── middleware/          # Request IDs, auth, error handling
│   │   │   └── config/              # Environment parsing
│   │   └── tests/
│   ├── storefront/                  # Optional customer-facing Next.js app
│   └── dashboard/                   # Optional store-owner dashboard
│
├── packages/
│   ├── core/                        # Domain types, rules, and use cases
│   │   └── src/
│   │       ├── catalog/
│   │       ├── cart/
│   │       ├── orders/
│   │       ├── inventory/
│   │       └── shared/
│   ├── contracts/                   # Shared request/response schemas
│   ├── database/                    # Database implementations and migrations
│   ├── ai/                          # AI orchestration and tool definitions
│   ├── ai-providers/                # LLM provider adapters
│   ├── embeddings/                  # Embedding interface and adapters
│   ├── search/                      # Catalog retrieval and ranking
│   ├── vector-stores/               # Optional vector-store adapters
│   ├── payments/                    # Payment contracts and provider adapters
│   ├── storage/                     # Product media / object-storage adapters
│   ├── observability/               # Logging, metrics, tracing interfaces
│   └── test-utils/                  # Shared test fixtures and helpers
│
├── examples/
│   ├── minimal-store/
│   └── custom-provider/
├── docs/
│   ├── getting-started.md
│   ├── configuration.md
│   ├── architecture.md
│   ├── catalog-and-search.md
│   ├── ai-providers.md
│   ├── payments.md
│   ├── security.md
│   ├── deployment.md
│   ├── troubleshooting.md
│   └── decisions/
├── scripts/                         # Repeatable development and release scripts
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── SECURITY.md
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── LICENSE
├── README.md
├── SECURITY.md
├── bunfig.toml
├── package.json
├── tsconfig.base.json
└── <workspace-config>               # Selected workspace configuration
```

### Structure rules

-   Start with only the applications and packages that the first working
    slice needs.
-   Do not create empty packages just to match this tree.
-   Keep provider-specific SDK calls inside provider adapters.
-   Keep HTTP request/response concerns in the API application; domain
    rules should not depend on Hono.
-   Keep database-specific query code in the database/search
    implementations, not in route handlers.
-   Avoid circular dependencies. Lower-level packages must not import
    applications.
-   Keep test files near the code they test or in a clearly named
    `tests/` directory; use one consistent convention.
-   Keep generated code and build output out of source directories and
    Git unless explicitly required.

## 4. Architecture and dependency direction

Avelor AI should be a modular monolith. Modules can run in one process
and deploy together, while their interfaces remain clear enough to split
later if justified.

``` text
HTTP / UI
   |
   v
Application use cases
   |
   +----> Domain rules and contracts
   |
   +----> Ports / interfaces
               |
               v
       Infrastructure adapters
       (Postgres, LLMs, embeddings,
        vector stores, payments, storage)
```

### Dependency rules

1.  Domain and application logic must not import vendor SDKs.
2.  Provider adapters implement interfaces defined by the application or
    relevant package.
3.  The API layer calls application use cases; it does not contain
    business workflows.
4.  A provider adapter must not bypass authorization or tenant-scoping
    rules.
5.  Shared contracts should be small and stable. Avoid turning `shared/`
    into a dumping ground.
6.  Use dependency injection at composition boundaries. Do not create a
    global service locator.
7.  Keep asynchronous jobs as functions/use cases first. Add a queue and
    worker when work volume, reliability, or latency requires it.

### Example: AI provider contract

The exact interface should be agreed in code, but its shape could be:

``` ts
export interface ChatModel {
  generate(input: ChatInput): Promise<ChatResult>;
  stream?(input: ChatInput): AsyncIterable<ChatChunk>;
}
```

Tool calling and structured output should be represented explicitly in
the contract, with capability checks where providers differ. Do not
pretend every model supports identical features.

## 5. Catalog model: flexible data, strict invariants

The platform must support stores selling one category, many categories,
or unusual products without requiring a new database schema for each
store.

### Recommended data layers

**Core fields:** product ID, store/tenant ID, name, description, status,
SKU where applicable, currency, price representation, timestamps, and
media references.

**Flexible attributes:** typed, extensible key/value attributes such as
`color`, `size`, `material`, `dimensions`, `author`, `voltage`, or
`compatibility`.

**Variants and inventory:** model sellable variants and their stock
separately when products have options. Do not assume one product equals
one SKU.

**Categories:** support optional, store-defined categories and
hierarchies. Categories help browsing but must not be the only way to
retrieve a product.

**Search metadata:** normalized text, synonyms, verified specifications,
and optional embeddings. Generated descriptions or attributes must be
marked as generated and should not silently become trusted facts.

### Data integrity rules

-   Store prices as integer minor units or a carefully defined decimal
    representation; never use floating-point arithmetic for money.
-   Store currency explicitly.
-   Validate attribute types and units where defined.
-   Use stable IDs; do not use product names as identifiers.
-   Enforce tenant ownership in every query, including vector retrieval
    and background jobs.
-   Treat product data from imports as untrusted input and validate it.
-   Maintain a clear source of truth for price and stock in the
    relational catalog or authoritative commerce service.
-   Do not rely on a vector index for checkout decisions.

## 6. Search and RAG design

RAG is an optional retrieval-and-generation path, not a requirement for
every catalog operation. Start with dependable structured search and add
semantic retrieval when it improves real queries.

### Search pipeline

1.  Receive a customer request.
2.  Use the LLM to extract intent and candidate filters, if needed.
3.  Validate the filters against an allowlisted search contract.
4.  Apply exact constraints in the catalog query: tenant, availability,
    price, variants, and other structured attributes.
5.  Run full-text and, when configured, vector search.
6.  Combine and rank candidates using a documented strategy.
7.  Return a bounded set of product records with IDs and grounded
    fields.
8.  Let the LLM explain results using only retrieved information.
9.  Revalidate current price, stock, and eligibility before cart or
    checkout actions.

### Embedding lifecycle

-   Generate product embeddings during import or relevant product
    updates---not on every chat turn.
-   Generate a query embedding when semantic retrieval is used.
-   Store the embedding provider, model identifier, dimensions, and
    indexing version alongside index metadata.
-   Ensure query and document vectors are compatible.
-   Re-index when a model or text-construction strategy changes.
-   Make indexing idempotent and safe to retry.
-   Support deleting stale vectors when a product is deleted or made
    ineligible.
-   Allow semantic search to be disabled when no embedding provider is
    configured.

### Avoid overengineering

First release: PostgreSQL filtering and full-text search. Add a vector
adapter and embeddings behind interfaces once the baseline works. Hybrid
search should be evaluated against a small, documented test set rather
than adopted solely because it is fashionable.

## 7. AI orchestration and tool safety

The model may request actions; the backend decides whether those actions
are allowed.

### Suggested tools

-   `search_products`
-   `get_product_details`
-   `compare_products`
-   `check_inventory`
-   `add_to_cart`
-   `create_checkout`
-   `get_order_status`

### Tool rules

-   Define input and output schemas and validate both.
-   Use allowlisted operations; never let a model execute arbitrary SQL
    or code.
-   Authenticate the customer and authorize access for every
    user-specific operation.
-   Derive tenant and user identity from trusted server context, not
    model-supplied arguments.
-   Enforce timeouts, rate limits, bounded result sizes, and sensible
    retry policies.
-   Return structured errors that do not reveal secrets or internal
    implementation details.
-   Treat retrieved product descriptions and imported content as
    untrusted data, not instructions.
-   Require confirmation or human approval for consequential actions
    such as refunds when the business policy requires it.
-   Do not allow the model to invent prices, stock, discounts, delivery
    promises, or payment status.
-   Keep enough request/tool metadata for debugging while redacting
    personal data and credentials.

## 8. Provider and adapter design

Use separate interfaces for distinct responsibilities. Do not make one
universal provider interface that combines chat, embeddings, vector
storage, payments, and files.

Potential interfaces include:

-   `ChatModel`
-   `EmbeddingProvider`
-   `CatalogRepository`
-   `ProductSearch`
-   `VectorStore`
-   `PaymentProvider`
-   `ObjectStorage`

Each adapter should:

1.  Implement the documented interface.
2.  Validate configuration at startup.
3.  Translate provider errors into stable internal error categories.
4.  Apply timeouts and cancellation where supported.
5.  Avoid logging secrets or sensitive payloads.
6.  Have unit tests and provider contract tests.
7.  Document required credentials, supported features, limitations, and
    cost considerations.

Keep the first release small: implement one well-tested adapter per
essential capability. Add providers when there is a concrete use case or
a contribution that meets the contract tests.

## 9. Checkout and payment correctness

Payment handling is security-sensitive and must be server-authoritative.

1.  The backend reloads product prices and stock from the source of
    truth.
2.  The backend calculates totals, shipping, taxes, and discounts using
    explicit rules.
3.  The backend creates a pending order and a payment session with the
    provider.
4.  The customer completes the provider's checkout flow.
5.  The backend verifies signed webhooks and/or retrieves the payment
    status from the provider.
6.  State transitions are validated and idempotent.
7.  The order is marked paid only after trusted confirmation.
8.  Reconciliation handles delayed webhooks, duplicate events, and
    ambiguous states.

Never trust a browser redirect as proof of payment. Never store card
data unless the system is explicitly designed and certified to handle
it. Keep provider secrets on the server. Marketplace payouts and split
payments should be treated as a separate, later scope from
single-merchant checkout.

## 10. TypeScript and coding standards

-   Enable strict TypeScript; avoid `any`. If unavoidable at an external
    boundary, isolate it and validate immediately.
-   Prefer explicit, domain-relevant names over abbreviations.
-   Keep functions focused and small enough to understand without
    scrolling through unrelated logic.
-   Prefer composition over inheritance.
-   Avoid premature generic frameworks and unnecessary design patterns.
-   Validate untrusted input at system boundaries.
-   Distinguish expected domain errors from unexpected infrastructure
    failures.
-   Use `async`/`await` consistently and handle promise failures.
-   Avoid hidden side effects in constructors and module imports.
-   Keep configuration typed, validated, and centralized.
-   Never commit `.env` files, API keys, tokens, private certificates,
    or customer data.
-   Use comments to explain intent, trade-offs, and non-obvious
    constraints---not to narrate every line.
-   Add JSDoc to public package APIs where it improves IDE help and
    generated documentation.
-   Keep exported APIs intentional; do not export every internal helper.
-   Use a consistent naming convention and formatter across the
    repository.
-   Do not suppress lint or type errors without a narrow, explained
    reason.

## 11. Error handling, logs, and observability

-   Use a consistent error shape at API boundaries.
-   Map validation errors to appropriate client responses and unexpected
    errors to safe server errors.
-   Include request IDs in logs and error responses where appropriate.
-   Use structured logs with stable fields such as request ID,
    operation, duration, and outcome.
-   Redact authorization headers, API keys, payment secrets, and
    unnecessary personal data.
-   Add health/readiness checks for deployable applications.
-   Instrument external-provider latency, failures, timeouts, and retry
    counts.
-   Do not log full conversations or complete product/customer records
    by default.
-   Add metrics only when they answer a clear operational question.

## 12. Testing strategy

Testing should be a required part of every meaningful change.

### Unit tests

Test domain rules and pure functions: price calculations, filters,
ranking helpers, validation, and order state transitions.

### Integration tests

Test real module boundaries using a test database or suitable test
infrastructure: repositories, migrations, tenant scoping, provider
adapters, and webhook processing.

### Contract tests

Test every provider adapter against the same interface-level
expectations, including errors, timeouts, unsupported capabilities, and
malformed responses.

### End-to-end tests

Test critical user journeys: add a product, search for it, add it to a
cart, create checkout, and process a simulated verified payment event.

### Required edge cases

-   Cross-tenant product access is rejected.
-   Invalid and missing filters are handled safely.
-   Empty search results do not cause invented recommendations.
-   Product updates and deletions invalidate relevant search data.
-   Embedding failures do not silently mark indexing complete.
-   Duplicate webhooks do not create duplicate side effects.
-   Price or inventory changes between search and checkout are
    revalidated.
-   Provider timeouts and rate limits produce controlled failures.
-   AI tool arguments cannot override identity, tenant, or authoritative
    prices.

Use deterministic fixtures and mock external APIs in ordinary CI. Keep a
small opt-in test suite for live provider integrations; never require
real paid API calls for every pull request.

## 13. Git and release workflow

### Branches and commits

-   Keep `main` releasable.
-   Use short-lived feature branches.
-   Open pull requests for changes; avoid direct pushes to protected
    `main` once collaborators are active.
-   Use conventional commit prefixes where useful, such as `feat:`,
    `fix:`, `docs:`, `test:`, `refactor:`, and `chore:`.
-   Keep pull requests focused and reasonably small.
-   Link changes to an issue or explain why an issue is unnecessary.

### Pull-request checks

CI should run:

1.  Dependency installation using the committed lockfile.
2.  Formatting check.
3.  Lint.
4.  Type checking.
5.  Unit tests.
6.  Integration tests that can run safely in CI.
7.  Production build.
8.  Dependency/security checks appropriate to the repository.

Do not merge a change with failing required checks. Document exceptional
skips and create a follow-up issue.

### Releases

-   Follow semantic versioning for published packages once their public
    API stabilizes.
-   Maintain a changelog or clear release notes.
-   Mark breaking changes explicitly.
-   Tag releases and ensure the tag corresponds to the tested commit.
-   Do not publish secrets, local configuration, or generated artifacts
    accidentally.

## 14. Open-source documentation

### `README.md` should answer

-   What Avelor AI is---and what it is not.
-   Who it is for and what problem it solves.
-   A simple architecture overview.
-   A short feature list with current implementation status.
-   Prerequisites and quick-start instructions.
-   How to configure providers and credentials.
-   How to run tests and checks.
-   A link to contribution and security guidance.
-   License, project status, and roadmap.

Avoid claiming support for integrations or features that have not been
tested.

### Other documents

-   `CONTRIBUTING.md`: setup, code conventions, testing, PR process, and
    review expectations.
-   `CODE_OF_CONDUCT.md`: expected community behavior and reporting
    process.
-   `SECURITY.md`: supported versions, responsible disclosure
    contact/process, and secret-handling guidance.
-   `docs/architecture.md`: modules, dependency direction, data flow,
    and key boundaries.
-   `docs/configuration.md`: environment variables with descriptions and
    safe examples.
-   `docs/ai-providers.md`: adapter setup, feature differences, and
    troubleshooting.
-   `docs/catalog-and-search.md`: product schema, custom attributes,
    indexing, retrieval, and re-indexing.
-   `docs/payments.md`: order lifecycle, webhook setup, idempotency, and
    local testing.
-   `docs/deployment.md`: production deployment and operational
    requirements.
-   `docs/decisions/`: short ADRs for consequential choices.

## 15. Contribution guidelines

Every contribution should make the project easier to maintain.

### Before opening a PR

-   Search existing issues and pull requests.
-   Discuss major API or architectural changes before implementing them.
-   Keep the change focused.
-   Add or update tests.
-   Update documentation when behavior, configuration, or public APIs
    change.
-   Run the documented checks locally.
-   Never include credentials, private customer data, or unrelated
    formatting churn.

### Provider contributions

A new provider integration should include:

-   Adapter implementation.
-   Configuration validation.
-   Feature/capability documentation.
-   Unit and contract tests.
-   Error and timeout handling.
-   A usage example.
-   Documentation of any provider-specific limitations.

### Review expectations

Reviewers should consider correctness, security, compatibility,
readability, test coverage, documentation, and whether the complexity is
justified. Review code on its merits, not the contributor's experience
level.

## 16. Security checklist

-   [ ] Validate every external input.
-   [ ] Enforce authentication and authorization on the server.
-   [ ] Scope all data access to the correct tenant.
-   [ ] Protect secrets using environment or secret-management
    facilities.
-   [ ] Verify payment webhook signatures.
-   [ ] Make payment and order operations idempotent.
-   [ ] Apply rate limits and resource limits to expensive endpoints.
-   [ ] Prevent arbitrary SQL/tool execution by the model.
-   [ ] Treat imported product content as untrusted.
-   [ ] Redact secrets and unnecessary personal data from logs.
-   [ ] Keep dependencies updated and review security advisories.
-   [ ] Provide a responsible security-reporting path.

## 17. Implementation roadmap

### Phase 0 --- Project foundation

-   Initialize the workspace and strict TypeScript configuration.
-   Add formatting, linting, test runner, and CI.
-   Write the README, contribution guide, license, and initial ADRs.
-   Establish environment parsing and error-handling conventions.

### Phase 1 --- Commerce foundation

-   Implement store/tenant identity and isolation.
-   Implement products, flexible attributes, categories, variants, and
    inventory.
-   Add migrations, repository tests, and a minimal API.
-   Build reliable structured filters and full-text search.

### Phase 2 --- AI discovery

-   Define the AI tool contracts.
-   Implement one LLM adapter.
-   Add product search and detail tools with bounded outputs.
-   Add grounded response rules and no-result behavior.
-   Add an embedding interface and one embedding adapter only when
    semantic search is ready.

### Phase 3 --- Transactions

-   Implement carts and server-side total calculation.
-   Add one payment adapter and local/test-mode flows.
-   Verify webhooks and order state transitions.
-   Test duplicate events, failures, and reconciliation.

### Phase 4 --- Extensibility

-   Add additional LLM, embedding, vector-store, storage, and payment
    adapters based on demand.
-   Publish stable package APIs only after they have real use and tests.
-   Add bulk import, background indexing, and operational monitoring as
    required.

## 18. Definition of done

A change is not complete merely because it works on one developer's
machine.

A meaningful feature is done when:

-   The behavior and boundaries are clear.
-   Inputs and outputs are validated.
-   Authorization and tenant isolation are preserved.
-   Relevant tests cover success and failure cases.
-   Formatting, linting, type checks, tests, and builds pass.
-   Errors are actionable without leaking sensitive information.
-   Documentation and examples reflect actual behavior.
-   Configuration and migrations are reproducible.
-   The feature does not claim capabilities it does not support.

------------------------------------------------------------------------

## Final guidance

The strongest signal of engineering maturity is not the number of
folders, packages, abstractions, or design patterns. It is whether the
project has clear boundaries, predictable behavior, meaningful tests,
safe defaults, useful documentation, and a straightforward way for
another developer to contribute.

**Start small, keep the architecture intentional, and let real
requirements earn additional complexity.**
