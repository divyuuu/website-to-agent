# Phase 3 — Execution Engine

Status: DONE
Branch: feat/phase-3-execution
PR: TBD (link after merge)
Author: divyuuu
Completed: 2026-10-30

## Objective

Execute one approved read-only workflow against the fixture site and verify the business outcome.

## Why

Proves the task actually succeeded, not just that Playwright did not throw.

## Scope IN

- `packages/workflow-engine/runner`: loads pinned `workflow_version`, checks policy, runs steps with bounded timeouts, verifies `assert` + `extract` postconditions
- `apps/worker`: queue (DB-backed, in-process for now) + isolated Playwright context per run
- States: `queued, running, succeeded, failed, timed_out, blocked_for_auth, needs_approval, cancelled`
- Idempotency: safe retry for reads only, stable execution ID, no blind retry of writes
- Tests (Browser E2E): login fixture, search success, no-result case, expired session, changed locator, timeout

## Scope OUT

- No MCP exposure yet, no multi-tenant enforcement yet (Phase 4-5)
- No write actions

## Exit criteria

1. `search_students(student_id=STU-001)` returns correct subjects/scores from fixture, verified by assert.
2. Failed run returns bounded error + redacted trace reference, no secrets.
3. Execution history persisted in SQLite with duration.

## Human checkpoints

- Confirm test student IDs/seed data.
- Confirm timeout budgets (default 30s per run).

## Memory update on completion

- Status DONE + test evidence.

## Evidence (2026-10-30)

- `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (10 files, 22 tests)
- Runner: search STU-001 succeeded with verified rows, unknown student empty rows, changed locator failed, short wait timed_out
- API: unapproved 409, approved succeeded, idempotencyKey returns same executionId with duplicate:true, status lookup works
- Migration 002 adds idempotency_key; runMigrations now runs all *.sql sorted
- Note: execution runs in-process with isolated browser context per run; dedicated worker process deferred (extraction when scaling)
- Fixture demo login (demo/demo123) used for localhost only; secret store comes in Phase 5
- Rollback: revert merge commit of this phase PR
