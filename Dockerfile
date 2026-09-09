# Multi-stage Dockerfile for Ontario Economic Intelligence Platform
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock tsconfig.json vite.config.ts ./

# Install all dependencies including devDependencies for build
RUN bun install --frozen-lockfile

# Copy source code and build assets
COPY index.html ./
COPY public ./public
COPY src ./src

# Build client production SPA into dist/
RUN bun run build

# Runtime Stage
FROM oven/bun:1.3-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy built application and runtime dependencies
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY src ./src
COPY --from=builder /app/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["bun", "run", "src/server/index.ts"]
