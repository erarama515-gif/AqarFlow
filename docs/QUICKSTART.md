# AqarFlow — Quickstart

This guide walks you from a fresh clone to a running development environment with seed data, then to a production-style deployment using only open-source/free components.

---

## 1. Prerequisites

- **Node.js 20 LTS** (use `nvm install 20` if you don't have it)
- **pnpm 8** (`corepack enable && corepack prepare pnpm@8.15.4 --activate`)
- **Docker** + **Docker Compose v2** (Docker Desktop on Mac/Windows is fine)

> No paid services required. Everything below runs on free, open-source software.

---

## 2. First-Run Setup (Local Development)

```bash
# 1. Install all workspace deps
pnpm install

# 2. Copy env and adjust secrets if you want
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# 3. Bring up infrastructure (Postgres + Redis + MinIO + Mailpit)
pnpm infra:up

# 4. Migrate the database and seed demo data
pnpm db:migrate
pnpm db:seed

# 5. Start the API and Web in parallel
pnpm dev
```

You'll see:
- **API**: http://localhost:3000 (Swagger UI at http://localhost:3000/docs)
- **Web**: http://localhost:3001
- **Mailpit**: http://localhost:8025 (catches all outbound email)
- **MinIO console**: http://localhost:9001 (login: `aqarflow` / `aqarflow-secret`)
- **Adminer (DB)**: http://localhost:8080 (server: `postgres`, user/password/db: `aqarflow`)

### Demo logins (after running the seed)

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@acme.test` | `Owner123!` |
| Sales Manager | `manager@acme.test` | `Manager123!` |
| Agent | `agent@acme.test` | `Agent123!` |

Tenant subdomain hint: `acme`.

---

## 3. Trying It Out

Once logged in as the agent you can:
1. **Open `/leads`** → click `عميل جديد` to create a lead. The phone is auto-normalized to E.164, and the SLA timer starts.
2. **Open `/properties`** → browse the seeded Aqar Park Towers units.
3. **Open `/deals`** → see the Kanban board with the default sales pipeline.
4. **Open `/commissions`** → see your accrued commission entries (after winning a deal).

For inbound leads via webhook (Meta Ads, website forms), POST to:

```
POST /api/v1/webhooks/leads/acme/META
Headers:
  X-Webhook-Key: demo-meta-key-456
  Content-Type: application/json
Body:
  {
    "fullName": "Test Lead",
    "phone": "+966500000000",
    "email": "test@example.com",
    "utm_source": "facebook",
    "utm_campaign": "spring-sale"
  }
```

---

## 4. Production Deployment (Single Host)

For a low-cost single-server deployment (e.g., a $10 Hetzner VPS):

```bash
# 1. Generate strong secrets
export JWT_ACCESS_SECRET=$(openssl rand -base64 48)
export JWT_REFRESH_SECRET=$(openssl rand -base64 48)
export PASSWORD_PEPPER=$(openssl rand -base64 48)

# 2. Configure prod env
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
PASSWORD_PEPPER=$PASSWORD_PEPPER
APP_URL=https://crm.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
ROOT_DOMAIN=yourdomain.com
EOF

# 3. Build and run
docker compose -f infra/docker/docker-compose.prod.yml up -d --build

# 4. Run migrations
docker compose -f infra/docker/docker-compose.prod.yml exec api \
  pnpm --filter @aqarflow/api prisma migrate deploy

# 5. Put it behind a reverse proxy (Caddy / nginx / Traefik) with TLS
```

That's it. Total monthly cost: $10–$20 for a single VPS handling 100+ tenants.

---

## 5. Project Layout (Cheat Sheet)

```
apps/
  api/                 NestJS modular monolith
    src/
      modules/         Bounded contexts (iam, tenant, lead, ...)
      shared/          Cross-cutting (prisma, redis, tenant ctx, outbox)
    prisma/            Schema + migrations + seed
  web/                 Next.js 14 (App Router, RTL, Tailwind)
infra/docker/          Compose stacks for dev + prod
docs/                  This file and architecture notes
.github/workflows/     CI pipeline
```

---

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Environment validation failed` on API startup | Copy `.env.example` to `.env` and fill required vars (especially the JWT secrets which must be ≥ 32 chars). |
| Login returns 401 | Make sure you signed up first; the seed creates a tenant for `acme` — use the subdomain hint `acme` on the login screen. |
| `prisma migrate dev` hangs | Confirm Postgres is healthy: `pnpm infra:logs postgres`. |
| Web app can't reach API | Check `NEXT_PUBLIC_API_URL` matches your running API origin. |

For anything else, open an issue with the exact command, logs, and `pnpm --version && node --version`.
