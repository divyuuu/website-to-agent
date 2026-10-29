# Phase 6 — Hardening + Pilot Ready

Status: NOT_STARTED
Branch: TBD
PR: TBD
Author: divyuuu

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

- Status DONE + tag + metrics snapshot + next real-site candidate (if any).
