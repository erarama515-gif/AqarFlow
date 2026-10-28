# syntax=docker/dockerfile:1.7

# ----------------------------------------------------------------------------
# Stage 1 — build the NestJS bundle
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ openssl
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

WORKDIR /workspace

# Copy workspace manifests first for better cache reuse
COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/

RUN pnpm install --filter @aqarflow/api... --frozen-lockfile=false

# Now copy sources and build
COPY apps/api/ apps/api/
RUN pnpm --filter @aqarflow/api prisma generate
RUN pnpm --filter @aqarflow/api build

# Prune devDependencies for a smaller runtime image
RUN pnpm --filter @aqarflow/api deploy --prod /out

# ----------------------------------------------------------------------------
# Stage 2 — minimal runtime
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl dumb-init
USER node
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --chown=node:node --from=builder /out/node_modules ./node_modules
COPY --chown=node:node --from=builder /workspace/apps/api/dist ./dist
COPY --chown=node:node --from=builder /workspace/apps/api/prisma ./prisma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
