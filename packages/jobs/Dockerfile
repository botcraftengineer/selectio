FROM oven/bun:1.3.3-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache openssl openssl-dev ca-certificates

# --- Dependencies Stage ---
FROM base AS deps
# Copy package.json files
COPY package.json bun.lock turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/db/package.json ./packages/db/
COPY packages/lib/package.json ./packages/lib/
COPY packages/telegram-bot/package.json ./packages/telegram-bot/
COPY tooling/typescript/package.json ./tooling/typescript/

# Install dependencies
RUN bun install --ignore-scripts

# --- Builder Stage ---
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package.json bun.lock turbo.json ./
COPY packages/config ./packages/config
COPY packages/jobs ./packages/jobs
COPY packages/db ./packages/db
COPY packages/lib ./packages/lib
COPY packages/telegram-bot ./packages/telegram-bot
COPY tooling/typescript ./tooling/typescript

# Generate Prisma Client
RUN bunx prisma generate

# Build the project
RUN bun run build

# --- Runner Stage ---
FROM oven/bun:1.3.3-alpine AS runner
WORKDIR /app

# Install system dependencies including Chromium for Puppeteer
RUN apk add --no-cache \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set environment variables
ENV NODE_ENV=production \
    PORT=8000 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser

# Copy artifacts
COPY --from=builder --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:nodejs /app/packages ./packages
COPY --from=builder --chown=bunuser:nodejs /app/tooling ./tooling
COPY --from=builder --chown=bunuser:nodejs /app/package.json ./package.json

USER bunuser

EXPOSE 8000

CMD ["bun", "run", "packages/jobs/src/inngest/server.ts"]
