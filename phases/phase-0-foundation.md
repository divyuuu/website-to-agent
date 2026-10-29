# Phase 0 — Foundation & Guardrails

Status: NOT_STARTED
Branch: TBD
PR: TBD
Author: divyuuu

## Objective

Clean, runnable TypeScript monorepo with guardrails. Fresh clone can install, lint, typecheck, test, and start.

## Why first

Without this, later phases drift (duplicate schemas, secrets in git, broken setup).

## Scope IN

- pnpm workspace + TypeScript base config + eslint + prettier + vitest
- `apps/api`, `packages/contracts`, `packages/database` (SQLite + migrations), `packages/config`
- `.env.example` with placeholders, `.gitignore` (covers `.env`, `*.db`, `*.sqlite`, traces, downloads, browser profiles)
- `README.md` rewritten: setup steps, author divyuuu, no other attributions
- `LICENSE` with divyuuu
- `package.json` author field = divyuuu
- Health endpoint + env validation (fail fast)
- `infra/compose.yaml` minimal (app only, no Postgres — SQLite is file-based)
- This `phases/` memory kept up to date

## Scope OUT

- No Playwright yet, no MCP yet, no dashboard, no fixture site (Phase 1)
- No Postgres, Redis, Kubernetes, vector DB

## Deliverables

- [ ] `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm dev` all pass
- [ ] SQLite migration runs: creates `tenants`, `website_connections`, `workflows`, `workflow_versions`, `execution_runs`, `audit_events`
- [ ] No `*.db` committed, no secrets in logs
- [ ] README shows divyuuu only

## Exit criteria (must all be true)

1. Fresh clone + `pnpm install` + `pnpm db:migrate` + `pnpm test` passes on Windows.
2. `grep -r` for other author/bot names returns nothing (manual check).
3. PR merged to `main` with rollback note.

## Human checkpoints (stop and ask)

- Confirm Node 24 + pnpm 12 OK, or install needed.
- Confirm LICENSE type (MIT vs Apache-2.0 vs proprietary).
- Confirm merge of Phase 0 PR.

## Memory update on completion

- Set Status DONE, add dates, PR link, test output summary.
- Update `00-overview.md` table.
