# Phase 1 — Fixture Site + Inspection

Status: NOT_STARTED
Branch: TBD
PR: TBD
Author: divyuuu

## Objective

Local fake website with deterministic data + Playwright inspection that outputs sanitized element inventory as JSON.

## Why

Never test against real customer production. Need a stable target to prove inspection works.

## Scope IN

- `packages/test-fixtures/site`: login page, search form (Student ID), results table, one harmless action, seeded fake data (3-5 students)
- `packages/inspection`: Playwright script, allowed-origin enforcement (localhost only), bounded timeout, DOM/accessibility snapshot, redaction
- CLI: `pnpm inspect --url http://localhost:4100 --out inspection.json`
- Tests: repeatable inspection test (same input -> same inventory shape), blocked-origin test

## Scope OUT

- No AI workflow generation yet, no execution, no MCP
- No real external websites

## Deliverables

- [ ] Fixture site runs via `pnpm fixture:dev`
- [ ] Inspection JSON contains pages, forms, buttons by role/name, no passwords/cookies
- [ ] Screenshots/traces on failure only, redacted, git-ignored

## Exit criteria

1. `pnpm fixture:dev` + `pnpm inspect` produces valid JSON twice with same structure.
2. Inspection of disallowed host is rejected.
3. No secrets in inspection output or logs.

## Human checkpoints

- Confirm fixture port (default 4100) is free.
- Confirm Playwright browser install (`pnpm exec playwright install chromium`) — needs owner approval if download is large/slow.

## Memory update on completion

- Status DONE + sample inspection.json path + test evidence.
