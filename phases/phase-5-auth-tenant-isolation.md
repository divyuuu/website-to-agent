# Phase 5 — Auth + Tenant Isolation + Audit

Status: NOT_STARTED
Branch: TBD
PR: TBD
Author: divyuuu

## Objective

Prove Tenant A cannot see or run Tenant B data, tools, secrets, or jobs. All calls authenticated and audited.

## Why

Without this, it is a demo, not a product.

## Scope IN

- `packages/auth`: platform user session, per-tenant MCP credentials (revocable, scoped, rotatable), role checks (owner/admin/operator/viewer)
- `packages/secrets`: abstraction over env + local encrypted file (dev) with redaction; never plaintext passwords/cookies in DB/logs
- Tenant scoping: every query filtered by `tenant_id` derived from auth, never from tool args; separate Playwright context per execution; tenant-prefixed jobs/artifacts
- `audit_events`: append-only (workflow publish, credential change, permission change, high-impact actions)
- Negative tests: cross-tenant list/read/run for every resource type must fail

## Scope OUT

- No OAuth to external IdP yet (simple token + session first), no billing
- No destructive/financial actions

## Exit criteria

1. Second tenant created; all cross-tenant access tests pass.
2. Revoked credential cannot call tools.
3. No secrets in logs or git; audit log shows publish + execution entries.

## Human checkpoints

- Confirm initial roles (who is owner).
- Confirm secret rotation/revocation procedure.
- Approve merge only after negative tests shown passing.

## Memory update on completion

- Status DONE + isolation test evidence.
