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
| 0 | Foundation & Guardrails | Clean repo, TS monorepo, lint/test, SQLite, README/LICENSE as divyuuu | NOT_STARTED |
| 1 | Fixture Site + Inspection | Local demo site + Playwright inspection JSON | NOT_STARTED |
| 2 | Workflow Schema + Approval | Declarative schema, validation, approve/reject | NOT_STARTED |
| 3 | Execution Engine | Run approved read-only workflow + verify outcome | NOT_STARTED |
| 4 | MCP Server | Expose 1-2 tools via MCP, call from real MCP client | NOT_STARTED |
| 5 | Auth + Tenant Isolation + Audit | Multi-tenant isolation, credentials, audit log | NOT_STARTED |
| 6 | Hardening + Pilot Ready | Rate limits, redaction, E2E/regression, runbook | NOT_STARTED |

## How to update this memory

- Each phase file has `Status: NOT_STARTED | IN_PROGRESS | BLOCKED_NEED_HUMAN | DONE`.
- When a phase starts: set to IN_PROGRESS + branch name + date.
- When blocked on human: set to BLOCKED_NEED_HUMAN + what is needed from owner.
- When done: set to DONE + PR link + test evidence + known limitations.
- Update this table at the same time.

## Current position

- Today: project start. On branch `chore/phases-memory` to create this memory.
- Next: Phase 0 after owner confirms this plan.

## Rollback rule

- All changes go via PR to `main`. Each PR must list: changed files, tests run, how to roll back (revert commit hash).
- SQLite file (`*.db`, `*.sqlite`) is never committed. Only migrations/schema + seed scripts are committed.
