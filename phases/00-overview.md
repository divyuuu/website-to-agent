# Website-to-Agent MCP Bridge — Phases Overview

Author: divyuuu
Status: ACTIVE MEMORY — this folder is the source of truth for project progress.
Database: SQLite (single file, zero setup)
First target: Local demo fixture site only (login + search + results table)
Workflow: branch -> commit -> PR -> merge to `main`. No direct pushes to `main`.

## Global rules (apply to all phases)

1. Sole developer is `divyuuu`. Do not add any other author, bot, or tool names anywhere in code, docs, LICENSE, or package metadata.
2. Few features, but working perfectly. Prefer 2-3 verified read-only tools over many broken ones.
3. Real product, not a demo. Every phase must end with tests passing and rollback possible.
4. `phases/` is memory. After completing any phase, update that phase file status + dates + commit/PR links before starting the next phase.
5. Developer handles frontend to backend to testing. Stop and ask the owner for any manual step (secrets, logins, installs, approvals, merges) and continue only after explicit confirmation.
6. Never bypass login, MFA, CAPTCHA, or bot defenses. Pause for authorized human setup.
7. Every tool execution is pinned to an approved workflow version, tenant-scoped, validated, and audited.

## Phase list

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| 0 | Foundation & Guardrails | Clean repo, TS monorepo, lint/test, SQLite, README/LICENSE as divyuuu | DONE |
| 1 | Fixture Site + Inspection | Local demo site + Playwright inspection JSON | DONE |
| 2 | Workflow Schema + Approval | Declarative schema, validation, approve/reject | DONE |
| 3 | Execution Engine | Run approved read-only workflow + verify outcome | DONE |
| 4 | MCP Server | Expose 1-2 tools via MCP, call from real MCP client | DONE |
| 5 | Auth + Tenant Isolation + Audit | Multi-tenant isolation, credentials, audit log | DONE |
| 6 | Hardening + Pilot Ready | Rate limits, redaction, E2E/regression, runbook | DONE |

## How to update this memory

- Each phase file has `Status: NOT_STARTED | IN_PROGRESS | BLOCKED_NEED_HUMAN | DONE`.
- When a phase starts: set to IN_PROGRESS + branch name + date.
- When blocked on human: set to BLOCKED_NEED_HUMAN + what is needed from owner.
- When done: set to DONE + PR link + test evidence + known limitations.
- Update this table at the same time.

## Current position

- Phase 0 DONE on branch `chore/phase-0-foundation` (2026-10-29). Evidence: pnpm lint/typecheck/test/db:migrate all exit 0, /health + /ready return ok.
- Phase 1 DONE on branch `feat/phase-1-fixture` (2026-10-30). Evidence: 5 files/7 tests green, live CLI inspection verified with redaction.
- Phase 2 DONE on branch `feat/phase-2-workflow` (2026-10-30). Evidence: 8 files/17 tests green, approval flow + cross-tenant isolation verified.
- Phase 3 DONE on branch `feat/phase-3-execution` (2026-10-30). Evidence: 10 files/22 tests green, verified extraction + idempotency.
- Phase 4 DONE on branch `feat/phase-4-mcp` (2026-10-30). Evidence: 12 files/27 tests green, real MCP Client list+call verified.
- Phase 5 DONE on branch `feat/phase-5-auth` (2026-10-30). Evidence: 15 files/33 tests green, keys/roles/revocation/isolation verified.
- Phase 6 DONE on branch `feat/phase-6-hardening` (2026-10-30). Evidence: 19 files/41 tests green, kill switch + limits + metrics + runbook.
- Pilot ready. Tag `v0.1.0` after merge. See phase-6 file for known limitations.

## Rollback rule

- All changes go via PR to `main`. Each PR must list: changed files, tests run, how to roll back (revert commit hash).
- SQLite file (`*.db`, `*.sqlite`) is never committed. Only migrations/schema + seed scripts are committed.
