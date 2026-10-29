# Phase 3 — Execution Engine

Status: NOT_STARTED
Branch: TBD
PR: TBD
Author: divyuuu

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

- Status DONE + execution IDs + success rate evidence.
