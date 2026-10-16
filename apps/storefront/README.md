# Avelor AI — Conversational Commerce Storefront

Modern, high-performance customer-facing shopping application featuring a reactive AI shopping concierge whose face dynamically reacts to agent actions (`idle`, `thinking`, `generating`).

## Key Highlights

- **Framework**: Next.js App Router with Turbopack
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`) with CSS custom properties
- **Theming**: Instant dark/light mode toggle via `data-theme`
- **Living Assistant**: Dynamic bot avatar reacting across three operational states:
  - `idle`: `/bot-idle.gif`
  - `thinking`: `/bot-thinking.gif` (evaluating guardrails and pgvector cosine search)
  - `generating`: `/bot-generating.gif` (streaming grounded responses)
- **Monetary Integrity**: Integer minor-unit price calculations ($1.00 = 100 minor units)
- **Guardrails**: Integrated with TypeSafe AI Jev System-One classifier (sub-300ms latency)

## Development

```bash
bun dev
```

## Production Build

```bash
bun run build
bun start
```
