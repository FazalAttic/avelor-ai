# Contributing to Avelor AI

Thank you for your interest in contributing to Avelor AI!

## Engineering Standard: Ponytail Mode

All contributors and AI coding assistants must adhere to the **Ponytail rules** documented in [`ponytail.md`](./ponytail.md) and the [`avelor-ai-engineering-blueprint.md`](./avelor-ai-engineering-blueprint.md).

Core tenets:
1. **Inspect before editing:** Read relevant files and trace real flow end-to-end first.
2. **Apply YAGNI:** Question complex requests and avoid speculative abstractions.
3. **Reuse before rebuilding:** Rely on existing code, standard libraries, or installed dependencies.
4. **Shortest working diff:** Keep PRs focused, minimal, and free of formatting churn.
5. **No shortcuts on safety:** Validate all inputs, enforce tenant isolation, and ensure secure auth.
6. **Every non-trivial change leaves a check:** Include reproducible unit/integration tests (`bun test`).

## Development Workflow

### Prerequisites
- [Bun](https://bun.sh) (v1.2+ recommended)
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/avelor-ai/avelor-ai.git
cd avelor-ai

# Install dependencies
bun install

# Verify setup
bun run check
bun test
```

### Scripts
- `bun run dev`: Start API server with hot-reload (`http://localhost:3000`)
- `bun test`: Run test suite across packages
- `bun run typecheck`: Run TypeScript compiler checks
- `bun run lint`: Check linting and formatting with Biome
- `bun run format`: Auto-format code with Biome
- `bun run check`: Run typecheck and lint together

### Submitting a Pull Request
1. Branch off `main` with a clear prefix (`feat/`, `fix/`, `docs/`, `test/`).
2. Keep diffs focused and small.
3. Ensure `bun run check` and `bun test` pass locally without errors or warnings.
4. Open a pull request describing what changed and what checks were run.
