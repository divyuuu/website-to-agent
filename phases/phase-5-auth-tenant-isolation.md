# Phase 5 — Auth + Tenant Isolation + Audit

Status: DONE
Branch: feat/phase-5-auth
PR: TBD (link after merge)
Author: divyuuu
Completed: 2026-10-30

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

- Status DONE + test evidence.

## Evidence (2026-10-30)

- `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (15 files, 33 tests)
- Keys: `w2a_` + 32 hex, SHA-256 stored (plaintext never in DB), create/list/revoke, no hashes in list output
- Roles: viewer < operator < owner; approve/reject + key mgmt owner-only; writes operator+; reads viewer+
- MCP server now requires `x-mcp-key`; legacy header -> 401; revoked key -> 401; tenant_b sees zero tenant_a tools
- Secrets: redactText covers keys, sessions, Authorization, passwords; error handler + execution errors redacted
- Audit: key.create/key.revoke/workflow.approve/execution.run all appended; no update/delete paths
- Negative tests: cross-tenant 404s, viewer 403s, revoked 401s, unauthenticated 401s
- `ALLOW_HEADER_AUTH` gates the local header bootstrap (set false in production)
- Rollback: revert merge commit of this phase PR
