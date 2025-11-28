FROM oven/bun:1.3.3-alpine AS base

# Install dependencies for Puppeteer (Chromium)
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs

# Tell Puppeteer to skip installing Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Stage: deps - Install dependencies
FROM base AS deps
COPY package.json bun.lock turbo.json ./
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/lib/package.json ./packages/lib/
COPY packages/telegram-bot/package.json ./packages/telegram-bot/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY tooling/typescript/package.json ./tooling/typescript/

RUN bun install

# Stage: builder - Build the project
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/turbo.json ./turbo.json

# Copy source files for all packages
COPY packages/jobs ./packages/jobs
COPY packages/lib ./packages/lib
COPY packages/telegram-bot ./packages/telegram-bot
COPY packages/db ./packages/db
COPY packages/config ./packages/config
COPY tooling/typescript ./tooling/typescript

# Build the project
ENV CI=true
RUN bun run build --filter=@selectio/jobs...

# Stage: production-deps - Install only production dependencies
FROM base AS production-deps
COPY package.json bun.lock turbo.json ./
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/lib/package.json ./packages/lib/
COPY packages/telegram-bot/package.json ./packages/telegram-bot/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY tooling/typescript/package.json ./tooling/typescript/

RUN bun install

# Stage: runner - Run the application
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 bunjs && \
    adduser --system --uid 1001 bunuser

# Copy production dependencies
COPY --from=production-deps --chown=bunuser:bunjs /app/node_modules ./node_modules

# Copy built artifacts
COPY --from=builder --chown=bunuser:bunjs /app/packages/jobs/dist ./packages/jobs/dist
COPY --from=builder --chown=bunuser:bunjs /app/packages/jobs/package.json ./packages/jobs/package.json
COPY --from=builder --chown=bunuser:bunjs /app/packages/db ./packages/db
COPY --from=builder --chown=bunuser:bunjs /app/packages/lib ./packages/lib
COPY --from=builder --chown=bunuser:bunjs /app/packages/telegram-bot ./packages/telegram-bot
COPY --from=builder --chown=bunuser:bunjs /app/packages/config ./packages/config
COPY --from=builder --chown=bunuser:bunjs /app/package.json ./package.json

# Set environment variables
ENV NODE_ENV=production \
    PORT=8000

# Switch to non-root user
USER bunuser

EXPOSE 8000

CMD ["bun", "run", "packages/jobs/src/inngest/server.ts"]
