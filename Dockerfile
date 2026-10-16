FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies based on lockfile
FROM base AS deps
COPY package.json bun.lock tsconfig.base.json tsconfig.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/core/package.json ./packages/core/
COPY packages/database/package.json ./packages/database/
COPY packages/ai/package.json ./packages/ai/
RUN bun install --frozen-lockfile

# Final runner stage
FROM base AS runner
WORKDIR /app
COPY --from=deps /app ./
COPY . .

EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "apps/api/src/server.ts"]
