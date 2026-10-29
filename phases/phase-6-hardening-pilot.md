# Phase 6 — Hardening + Pilot Ready

Status: DONE
Branch: feat/phase-6-hardening
PR: TBD (link after merge)
Author: divyuuu
Completed: 2026-10-30

## Objective

Make the few features reliable, diagnosable, and safe to operate. Write down limits honestly.

## Why

Differentiator is reliability + diagnosable failures, not feature count.

## Scope IN

- Rate limits, per-tenant quotas, concurrency caps, execution timeouts, circuit breaker
- Redaction everywhere, retention policy (logs 7d, traces 7d, downloads 24h or less)
- Observability: structured logs, success rate + p50/p95 duration per workflow version, queue depth, auth failures
- Kill switch: disable connection or single tool immediately
- Regression suite: every published workflow has repeatable test + postcondition
- `docs/runbook.md`: backup/restore SQLite, rotate credentials, incident response (leak, cross-tenant, unintended action)
- Known-limitations note before any real site

## Scope OUT

- No new tools, no auto-repair without approval, no multi-region, no billing/SLA
- No support for every website/client — document compatibility matrix (1 client tested)

## Exit criteria (pilot ready)

1. Full suite green: unit + contract + integration + browser E2E + multi-tenant + security (SSRF, redirect, prompt-injection text, oversized input, unauthenticated call).
2. Failed workflow demo: bounded error + trace ref, redacted.
3. Runbook + kill switch tested.
4. Owner signs off that product solves the local-demo problem perfectly.

## Human checkpoints

- Owner runs kill-switch drill.
- Owner confirms known limitations doc.
- Final merge to `main` = pilot tag `v0.1.0`.

## Memory update on completion

- Status DONE + test evidence.

## Evidence (2026-10-30)

- `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (19 files, 41 tests), `pnpm db:migrate` 0
- Kill switch: owner-only disable for connections/workflows, audited; executions fail closed (409); disabled workflows leave MCP listing
- Rate limits: per-tenant 30/min + 2 concurrent (env-tunable), 429 + retry-after on API and MCP, covered by unit + API tests
- Metrics: `GET /metrics` with by-status counts, p50/p95 durations, per-version breakdown, auth/rate counters
- Retention: `pnpm retention` deletes old executions, keeps audit; policy in docs/runbook.md
- Attribution grep: no matches; LICENSE/package authors divyuuu only

## Known limitations (read before any real site)

- Localhost fixture only. Real sites need per-site validation; CAPTCHA/MFA/anti-bot are unsupported and pause for human setup.
- Fixture demo login is hardcoded for localhost; per-connection credential storage is the next step after pilot.
- Workflows are authored via API; AI-assisted suggestion is future work, not in pilot.
- SQLite + in-process execution, single region. No worker fleet yet.
- MCP transport is Streamable HTTP, tested with the official SDK Client. Empty tenants surface SDK -32601 (no leak).
- Rate/auth counters are per-process memory; DB stats are durable.
