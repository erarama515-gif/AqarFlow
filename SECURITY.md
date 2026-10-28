# Security Policy

We take security seriously. AqarFlow stores commercial real-estate transaction data — leads, contacts, deals, commissions — that brokerages and developers rely on for revenue. This document explains how we secure the platform and how to report issues.

## Supported Versions

| Version | Supported |
| --- | --- |
| 0.1.x (MVP) | ✅ |

## Reporting a Vulnerability

Please email **security@aqarflow.io** with the following information:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, ideally with a proof-of-concept request.
- The affected component (API endpoint, web page, module).
- Your contact details so we can keep you informed.

We commit to:

1. Acknowledging your report within **48 hours**.
2. Providing a preliminary triage within **5 business days**.
3. Releasing a fix or mitigation as soon as practical based on severity.

**Please do not** open public GitHub issues for security vulnerabilities.

## Security Controls in Place

### Authentication & sessions

- Passwords hashed with **Argon2id** (memory=64 MiB, iter=3, parallelism=4) using a server-side pepper that is never stored in the database.
- JWT access tokens with a 15-minute TTL and rotating opaque refresh tokens (SHA-256-hashed at rest, 7-day TTL).
- Account lockout after 5 consecutive failed logins (15-minute window).
- Refresh-token rotation — every successful refresh revokes the previous token.

### Authorization

- RBAC backed by declarative permission strings (`lead:create`, `commission:approve`, …) evaluated per-request.
- Field-level scoping with `*` wildcards and `:own` row-level variants.
- `@RequirePermissions(...)` decorator enforces JwtAuthGuard + PermissionsGuard together; routes opt out explicitly with `@Public()`.

### Multi-tenant isolation

- Every tenant-owned table carries `tenant_id`.
- `TenantContextMiddleware` resolves and validates the tenant for every request (subdomain → header → JWT) and refuses queries that try to escape the active context.
- Postgres Row-Level Security policies are designed-in and one migration away when defense-in-depth becomes a higher priority than write throughput.

### Audit & integrity

- Every sensitive mutation (login, permission change, status transition, commission approval, financial mutation) is recorded in `audit_logs` with before/after snapshots, actor IP and user agent.
- Domain events flow through an outbox so an in-flight crash never loses an audit trail or external notification.

### Transport & infrastructure

- TLS termination should be configured at the reverse proxy (Caddy / nginx / Traefik) for production deployments.
- The API hardens HTTP responses with Helmet (CSP, HSTS-friendly defaults, X-Frame-Options, etc.).
- `ThrottlerGuard` enforces a default 100 requests / minute / IP. Per-endpoint throttling can be added with `@Throttle` decorators.

### Validation

- Environment variables validated with Zod at startup — the API refuses to boot on misconfiguration.
- DTOs validated with `class-validator`; unknown fields are whitelisted out by default.
- Prisma's parameterized queries eliminate SQL injection vectors; raw `$queryRaw` calls are used only in the health probe.

### Secrets

- Recommended secret management: HashiCorp Vault, AWS Secrets Manager, or sealed Kubernetes secrets in production.
- `.env` files are git-ignored.
- The seed script ships **non-production** credentials with obvious naming (`Owner123!`, `Agent123!`) for first-run demos.

## Scope

In scope:

- All code under `apps/`.
- Default Docker Compose deployments under `infra/docker/`.
- The CI workflow.

Out of scope:

- Third-party services any integrator chooses to wire up post-MVP (WhatsApp BSPs, SMS providers, payment gateways).
- Customer-owned forks that have modified the security primitives described above.

## Hall of Fame

We are happy to credit responsible reporters here once we ship our first public release.
