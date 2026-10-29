# Phase 0 — Foundation & Guardrails

Status: DONE
Branch: chore/phase-0-foundation
PR: TBD (link after merge)
Author: divyuuu
Completed: 2026-10-29

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

- [x] `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm dev` all pass
- [x] SQLite migration runs: creates `tenants`, `website_connections`, `workflows`, `workflow_versions`, `execution_runs`, `audit_events`
- [x] No `*.db` committed, no secrets in logs
- [x] README shows divyuuu only

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

## Evidence (2026-10-29, Windows, Node v24.18.0, pnpm 12.8.2)

- `pnpm install` exit 0
- `pnpm lint` exit 0
- `pnpm typecheck` exit 0
- `pnpm test` exit 0 (3 files, 4 tests passed)
- `pnpm db:migrate` exit 0 (Migrated SQLite database at ./data/app.db)
- `GET /health` -> {"ok":true,"service":"website-to-agent-api"}
- `GET /ready` -> {"ok":true}
- Attribution grep for Muse/OpenCode/LLM/Generated-by: no matches
- LICENSE: MIT (c) divyuuu (default, change on request)
- Rollback: revert merge commit of this phase PR
