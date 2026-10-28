# AqarFlow — Real Estate CRM for MENA

> A production-grade, multi-tenant SaaS CRM purpose-built for real-estate brokerages and developers across Saudi Arabia, the UAE, Egypt, and the broader MENA region. Arabic-native, off-plan-aware, and free of every paid third-party dependency by design.

[![CI](https://img.shields.io/badge/CI-passing-success)](.github/workflows/ci.yml)
[![License: Proprietary](https://img.shields.io/badge/license-proprietary-blue.svg)](LICENSE)

---

## ✨ Why AqarFlow

| Feature | Status |
| --- | --- |
| Multi-tenant SaaS with subdomain isolation | ✅ |
| Arabic-native UX (full RTL) | ✅ |
| Lead capture, dedup (phone E.164 + Arabic name normalizer), distribution, SLA monitor | ✅ |
| Property & inventory with off-plan hierarchy (project → tower → floor → unit) | ✅ |
| Payment plan builder (10/90, 40/60, milestone-linked, post-handover) | ✅ |
| Time-limited reservation timers with auto-release | ✅ |
| Deal pipeline with customisable stages + Kanban view | ✅ |
| Commission engine: multi-party splits, VAT per country, approval workflow | ✅ |
| Property matching engine (rule-based) | ✅ |
| In-app notifications + real-time WebSocket push + email mirroring | ✅ |
| Calendar, activities, viewings with conflict detection | ✅ |
| Immutable audit log + outbox-pattern domain events | ✅ |
| RBAC with seeded roles + permission strings + field-level guards | ✅ |
| Public lead-capture webhooks for Meta Ads, Google Ads, web forms | ✅ |
| Open-source stack only — **zero paid dependencies** | ✅ |

WhatsApp Business Cloud, portal sync (Property Finder, Bayut, Aqar), AI lead scoring, and e-signature are documented in `docs/ARCHITECTURE.md` as post-MVP add-ons activated behind the existing adapter interfaces.

---

## 🚀 Quickstart

```bash
pnpm install
cp .env.example .env
pnpm infra:up           # Postgres + Redis + MinIO + Mailpit
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then open:

- **Web app:** http://localhost:3001
- **API:** http://localhost:3000 (Swagger at `/docs`)
- **Mailpit:** http://localhost:8025
- **MinIO console:** http://localhost:9001
- **Adminer:** http://localhost:8080

Demo logins (after `pnpm db:seed`):

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@acme.test` | `Owner123!` |
| Sales Manager | `manager@acme.test` | `Manager123!` |
| Agent | `agent@acme.test` | `Agent123!` |

Tenant subdomain: `acme`.

For full setup instructions including production deployment, see **[docs/QUICKSTART.md](docs/QUICKSTART.md)**.

---

## 🏗️ Stack (100 % open source, $0 baseline)

| Layer | Technology |
| --- | --- |
| Backend | NestJS 10 + TypeScript |
| Database | PostgreSQL 16 + PostGIS |
| ORM | Prisma 5 |
| Cache / Queue | Redis 7 + BullMQ |
| Object Storage | MinIO (S3-compatible) |
| Realtime | Socket.IO |
| Email | SMTP (Mailpit for dev, any SMTP for prod) |
| Web app | Next.js 14 App Router + Tailwind CSS + shadcn/ui patterns |
| Charts & maps | Recharts + Leaflet (OpenStreetMap) |
| CI/CD | GitHub Actions |
| Deployment | Docker Compose (dev + prod) |

---

## 📁 Repository Layout

```
aqarflow/
├── apps/
│   ├── api/                NestJS modular monolith (backend)
│   │   ├── src/
│   │   │   ├── modules/    Bounded contexts (iam, tenant, lead, ...)
│   │   │   └── shared/     Cross-cutting (prisma, redis, outbox, ...)
│   │   ├── prisma/         Schema + migrations + seed
│   │   └── Dockerfile
│   └── web/                Next.js 14 web app (RTL, Arabic-first)
│       └── Dockerfile
├── infra/
│   └── docker/             Compose stacks for dev + production
├── docs/                   Architecture, quickstart, pricing, sales pitch
└── .github/workflows/      CI pipeline
```

---

## 📚 Documentation

- [`docs/QUICKSTART.md`](docs/QUICKSTART.md) — local & production setup, demo creds, troubleshooting.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — modules, events, multi-tenancy, scaling path.
- [`docs/PRICING.md`](docs/PRICING.md) — recommended tiers and competitive positioning.
- [`docs/SALES_PITCH.md`](docs/SALES_PITCH.md) — the narrative for go-to-market conversations.

---

## 🧪 Smoke Test (verify everything works)

After `pnpm dev` is running:

```bash
# 1. Sign up a new tenant
curl -X POST http://localhost:3000/api/v1/tenants/signup \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName":"Demo Co",
    "subdomain":"demo",
    "country":"SA",
    "ownerEmail":"demo@demo.test",
    "ownerPassword":"Demo123Pass",
    "ownerFirstName":"Demo",
    "ownerLastName":"Owner"
  }'

# 2. Log in and grab the access token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@demo.test","password":"Demo123Pass","tenantHint":"demo"}' \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['accessToken'])")

# 3. Create a lead with auto phone normalization & dedup
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName":"محمد الأحمد",
    "phone":"0501234567",
    "email":"mohammed@example.com",
    "interestType":"BUY",
    "budgetMax":1200000,
    "currency":"SAR"
  }'
```

---

## 🔒 Security

- Passwords hashed with Argon2id + per-deployment pepper
- JWT access tokens (15 min) with rotating refresh tokens (SHA-256-hashed at rest)
- Tenant isolation enforced at the application layer + ready for Postgres RLS as a flip-of-the-switch upgrade
- All cross-tenant boundaries audited via `audit_logs` (immutable)
- Validation via `class-validator` + `zod` on env vars (fail-fast)
- Helmet + CORS + ThrottlerGuard at the edge

---

## 🗺️ Roadmap (post-MVP)

| Theme | Items |
| --- | --- |
| Communication | WhatsApp Business Cloud direct API, SMS (Unifonic / Twilio) |
| Portal sync | Property Finder, Bayut, Aqar, Dubizzle |
| AI | Lead scoring uplift, property recommendations, voice-note OCR |
| Compliance | ZATCA FATOORA Phase 2 e-invoicing, UAE FTA, Egypt ETA |
| Payments | Stripe, Tap, HyperPay, PayTabs, Fawry, Geidea (manual invoicing today) |
| Identity | UAE PASS, Saudi Nafath, SAML SSO for enterprise |
| Mobile | React Native (Expo) companion app with offline mode |
| Field productivity | Voice notes → lead extraction, business card OCR |

Every item above already has an adapter interface or a clearly named module placeholder so it can be enabled without rewriting the domain.

---

## 📄 License

Proprietary — see [`LICENSE`](LICENSE). All rights reserved.

For demos, partnerships, or commercial inquiries: **sales@aqarflow.io**.

---

Built with care for the MENA real-estate community. 🇸🇦 🇦🇪 🇪🇬
