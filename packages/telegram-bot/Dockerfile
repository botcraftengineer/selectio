FROM oven/bun:1.3.3-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app
RUN bun add -g turbo
COPY . .
RUN turbo prune @selectio/telegram-bot --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN bun install

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .

RUN bunx turbo build --filter=@selectio/telegram-bot

FROM base AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Don't run production as root
RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 bunjs

# Create storage directory with proper permissions
RUN mkdir -p /app/storage && chown -R bunjs:bunjs /app/storage

USER bunjs

COPY --from=installer /app .

CMD ["bun", "run", "packages/telegram-bot/src/start.ts"]
