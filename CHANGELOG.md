# Changelog

All notable changes to AqarFlow are documented here. The project follows [SemVer](https://semver.org/) once it ships a 1.0.0 release.

## [0.1.0] — MVP

### Added

- **Multi-tenant foundation**: Tenant signup (subdomain validation, country presets, automatic role + pipeline + default lead source seeding), JWT auth with rotating refresh tokens, Argon2id password hashing with pepper, RBAC with built-in roles (`OWNER`, `ADMIN`, `SALES_MANAGER`, `AGENT`, `MARKETING`, `FINANCE`, `READ_ONLY`).
- **Lead Management**: Phone E.164 normalization with Arabic-Indic digit handling, Arabic name canonicalization for fuzzy dedup, distribution engine (round-robin / weighted / manual) backed by Redis counters, deterministic lead scorer with 0–100 score + urgency label, SLA monitor cron with breach events, public partner webhook endpoint.
- **Contact Management**: Unified 360° profile with multi-role flags (buyer / seller / tenant / landlord / investor), Arabic-aware fuzzy search, dedup helpers shared with Lead.
- **Property & Inventory**: Master project hierarchy (project → tower → floor → unit), bulk unit creation, inventory state machine (DRAFT → AVAILABLE → RESERVED → BOOKED → SOLD), price history audit, publish workflow with media + title + price validation, reservation timers with auto-release cron, payment plan builder with installment validation.
- **Deal Pipeline**: Customisable pipelines + stages with probability, Kanban view, stage history audit, automatic property status transitions on deal won, sales forecast endpoint.
- **Activity & Calendar**: Polymorphic activity records (call / meeting / email / WhatsApp / SMS / note / task), viewings with conflict detection, calendar window query.
- **Matching Engine**: Rule-based lead ↔ property matcher producing explanatory reasons (budget, location, type, beds, listing alignment, recency).
- **Commission Engine**: Rule builder (percentage / fixed / tiered) with multi-party splits, per-country VAT defaults (SA 15 %, AE 5 %, EG 14 %), approval + paid lifecycle, clawback timestamps, agent self-service view.
- **Notification**: In-app inbox + real-time WebSocket push (Socket.IO with token auth), email mirroring for HIGH / URGENT events, subscription wiring to lead / deal / commission / viewing / reservation events.
- **Audit log** for all sensitive mutations.
- **Outbox pattern** with 5-second publisher loop and bounded retry budget for guaranteed at-least-once domain event delivery.

### Web app

- Arabic-first RTL UI, Tailwind theming, Next.js 14 App Router.
- Landing page, signup, login, dashboard, leads list with create modal, properties grid, deals Kanban, contacts list, calendar week view, commissions view, reports (status + source charts), settings.
- Realtime WebSocket toast notifications (post-MVP polish on roadmap).

### Infrastructure

- Dev compose stack (Postgres + PostGIS, Redis, MinIO, Mailpit, Adminer).
- Production compose stack with the same components plus the API and web services.
- GitHub Actions CI: typecheck, build, and smoke-test on Postgres + Redis services.
- Hardened API Dockerfile (multi-stage, non-root user, dumb-init, healthcheck).
- Web Dockerfile producing a slim production image.

### Documentation

- `docs/QUICKSTART.md`, `docs/ARCHITECTURE.md`, `docs/PRICING.md`, `docs/SALES_PITCH.md`.
- Comprehensive README with smoke test and demo credentials.
