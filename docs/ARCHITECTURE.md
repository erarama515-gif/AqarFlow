# AqarFlow — Architecture

## 1. High-Level View

Two top-level applications:

| App | Stack | Responsibility |
| --- | --- | --- |
| `apps/api` | NestJS 10 + Prisma + PostgreSQL + Redis | Business logic, REST API, WebSocket realtime, jobs |
| `apps/web` | Next.js 14 + Tailwind | Tenant-facing web UI (RTL-first, Arabic + English) |

## 2. Multi-Tenancy

Schema-shared, row-keyed:

- Every tenant-owned table has `tenant_id UUID`.
- `TenantContextMiddleware` resolves the tenant from subdomain → `X-Tenant-Id` header → JWT `tid` claim.
- Resolved id is stored in CLS (async-context) so every service writes the same value automatically.
- Postgres RLS is one migration away for defense-in-depth.

## 3. Module Layout (DDD-Lite)

```
modules/<name>/
  domain/         Entities, value objects, services, events
  application/    Use-case orchestration
  infrastructure/ Adapters (Prisma repositories, external clients)
  presentation/   HTTP controllers + DTOs
```

Cross-module communication uses the **Outbox + Event Emitter** pattern:

1. Use case writes business record + `outbox_events` row in the same Prisma transaction.
2. `OutboxPublisher` polls the table every 5s and fans events to in-process listeners.
3. Other modules subscribe (e.g., `CommissionModule` listens to `deal.won`).

At-least-once delivery without Kafka. The same outbox table can later feed a CDC pipeline.

## 4. Domain Events

| Event | Producer | Consumer |
| --- | --- | --- |
| `tenant.created` | tenant.signup | (welcome later) |
| `lead.captured` | lead.capture | Notification |
| `lead.assigned` | lead.capture/assign | Notification |
| `lead.sla_breached` | SlaMonitorJob | Notification |
| `deal.won` | deal.moveToStage(WON) | Commission, Notification |
| `commission.calculated` | commission.calculateForDeal | Notification |
| `viewing.scheduled` | viewing.schedule | Notification |
| `property.reserved` / `reservation.expired` | reservation.* | Notification |

## 5. Identity & Permissions

- JWT (15-minute access) with rotating SHA-256-hashed refresh tokens.
- Argon2id password hashing with per-deployment pepper.
- Declarative permissions (`lead:read`, `commission:approve`).
- Built-in roles: `OWNER`, `ADMIN`, `SALES_MANAGER`, `AGENT`, `MARKETING`, `FINANCE`, `READ_ONLY`.
- Decorator: `@RequirePermissions('lead:create')` wires JwtAuthGuard + PermissionsGuard.
- Wildcards: `*`, `lead:*`, `lead:read.own`.

## 6. Lead Quality Pipeline

```
Inbound payload
  ↓
PhoneNormalizer      E.164 + Arabic-Indic digits
  ↓
ArabicNameNormalizer Hamza variants, Ta marbuta vs Heh
  ↓
LeadDeduplicator     Phone (100%), national ID (100%), email (85%)
  ↓
DistributionEngine   round-robin / weighted / manual, Redis-backed
  ↓
LeadScorer           Deterministic 0–100 + urgency
  ↓
Persist + LeadAssignment + outbox event
  ↓
SlaMonitorJob        Emits lead.sla_breached every minute
```

## 7. Commission Engine

On `deal.won`:

1. `DealService.moveToStage` writes new stage + outbox event.
2. `OutboxPublisher` invokes `CommissionModule` subscriber.
3. `CommissionService.calculateForDeal` loads the rule, computes gross, splits across roles, applies VAT (SA 15%, AE 5%, EG 14%), inserts `CommissionEntry` rows.
4. `approve()` → `markPaid()` lifecycle via guarded controllers.
5. Clawback via `clawbackExpiresAt` (job ready).

## 8. Realtime & Notifications

- Socket.IO `/realtime` namespace, each socket joins `user:<id>` room.
- Notifications persisted for an in-app inbox + WebSocket push.
- HIGH/URGENT events mirrored to email via SMTP (Mailpit in dev).
- Subscription map in `NotificationService.onModuleInit`.

## 9. Scaling Path

1. **Phase 1**: single API process, single Postgres, in-process BullMQ.
2. **Phase 2 (≥ 100 tenants)**: separate worker deployment, 1–2 read replicas.
3. **Phase 3 (≥ 1k tenants)**: extract Communication / Integration / Reporting, Debezium → Kafka.

Producer code stays the same because everyone writes to `outbox_events`.

## 10. Deferred Features (Adapter Stubs Ready)

- WhatsApp Business Cloud API
- Property Finder / Bayut / Aqar two-way sync
- Twilio / Unifonic SMS
- Stripe / Tap / HyperPay billing
- AI / ML enhancements
- E-signature integration

Each is post-MVP, behind the existing port, zero domain-layer impact.
