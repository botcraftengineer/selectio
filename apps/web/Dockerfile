FROM oven/bun:1.3.3-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN bun install -g turbo
COPY . .
RUN turbo prune @selectio/web --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN bun install --frozen-lockfile

COPY --from=builder /app/out/full/ .

ENV VERCEL_ENV="production"
ENV CI=true
ENV NODE_ENV="production"

ARG POSTGRES_URL
ENV POSTGRES_URL=${POSTGRES_URL}

ARG PORT
ENV PORT=${PORT}

RUN bun run build --filter=@selectio/web...

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

ENV HOSTNAME="0.0.0.0"
CMD ["bun", "run", "apps/web/server.js"]