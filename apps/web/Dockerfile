# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate
WORKDIR /workspace

COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/

RUN pnpm install --filter @aqarflow/web... --frozen-lockfile=false

COPY apps/web/ apps/web/
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @aqarflow/web build

FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate
USER node
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --chown=node:node --from=builder /workspace/apps/web/.next ./.next
COPY --chown=node:node --from=builder /workspace/apps/web/package.json ./
COPY --chown=node:node --from=builder /workspace/apps/web/next.config.mjs ./
COPY --chown=node:node --from=builder /workspace/apps/web/public ./public 2>/dev/null || true
COPY --chown=node:node --from=builder /workspace/node_modules ./node_modules
COPY --chown=node:node --from=builder /workspace/apps/web/node_modules ./apps_node_modules 2>/dev/null || true

EXPOSE 3001
CMD ["pnpm", "start"]
