# Contributing to AqarFlow

Thanks for your interest in contributing! This document covers the basics of getting set up, the coding standards we follow, and the workflow for submitting changes.

## Ground rules

- Be respectful in code review and in issue threads.
- Discuss large changes in an issue first; small improvements can go straight to a PR.
- Keep PRs focused — one logical change per PR makes review much faster.

## Development setup

```bash
git clone <repo>
cd aqarflow
pnpm install
cp .env.example .env
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

See [`docs/QUICKSTART.md`](docs/QUICKSTART.md) for the full walkthrough.

## Project conventions

- **Language**: TypeScript with `strict: true`. No `any` unless absolutely necessary, and always paired with a comment explaining why.
- **Layout**: Each module under `apps/api/src/modules/<name>` follows `domain/`, `application/`, `infrastructure/`, `presentation/`. Resist the urge to skip this even for "small" features — it keeps the codebase predictable.
- **Events first**: When one module needs to react to another, append a row to `outbox_events` from inside the producing transaction. Subscribers wire up in their module's `onModuleInit` against `OutboxPublisher.on(...)`.
- **DTOs validated**: Every controller input uses a class-validator DTO. Reject silently is never acceptable — throw a typed error or return 422.
- **Tenant safety**: Every Prisma query passes `tenantId` in the `where` clause. Add a test for any code path that reads/writes tenant data.
- **Comments are signal, not noise**: Document the *why*, not the *what*. If a comment restates the code, delete it.

## Commit style

Conventional Commits, plain English:

```
feat(lead): add Arabic-name fuzzy dedup
fix(commission): apply VAT before splitting between parties
docs(architecture): explain outbox publisher cadence
chore(ci): bump Node to 20.11
```

Keep the subject line under 72 characters. Reference issues with `Closes #123` in the body.

## Branching

- Branch from `main`.
- Use `feature/<short-name>`, `fix/<short-name>`, or `chore/<short-name>`.
- Rebase on top of `main` before opening the PR.

## Pull requests

A great PR description includes:

1. **What** — a one-paragraph summary.
2. **Why** — link to the issue or motivation.
3. **Risks** — anything that could go sideways, and the mitigation.
4. **Test plan** — the manual or automated steps you ran.

CI must be green before merging.

## Testing

- Unit tests live next to the code they cover (`*.spec.ts`).
- Run them with `pnpm --filter @aqarflow/api test`.
- We use Jest. Coverage for new business logic is expected; ask in the PR if you aren't sure how to test something.

## Code review

Every PR needs at least one approval from a maintainer. Reviewers focus on:

- Correctness — does it do what the description says?
- Multi-tenancy — does it leak across tenants?
- Performance — does it add an N+1, missing index, or unbounded query?
- Audit — does it record sensitive changes in `audit_logs`?
- Tests — is the new behaviour exercised?

Thanks again for contributing! 🤝
