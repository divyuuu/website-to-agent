# Runbook — Website-to-Agent MCP Bridge (pilot)

Author: divyuuu

## Services

- Admin API: `pnpm dev` (port `API_PORT`, default 3000). Health: `GET /health`, `GET /ready`.
- MCP server: `pnpm mcp:dev` (port `MCP_PORT`, default 3001). Health: `GET /health`. Tools: `POST /mcp` with `x-mcp-key`.
- Fixture site (local testing only): `pnpm fixture:dev` (port 4100, login demo/demo123).
- Database: SQLite file at `DATABASE_PATH` (default `./data/app.db`).

## Backup and restore

```sh
cp ./data/app.db ./backups/app-$(date +%F).db
# restore
cp ./backups/app-<date>.db ./data/app.db
pnpm db:migrate
```

`*.db` files are never committed. Only `packages/database/migrations/*.sql` are versioned.

## Credentials

- Create: `POST /mcp-keys { name, role }` as owner. Plaintext key is returned once — store it in the secret manager immediately.
- Rotate: create a new key, switch the client, then `POST /mcp-keys/:id/revoke`.
- Revoked or unknown keys get 401 on both API and MCP. Set `ALLOW_HEADER_AUTH=false` in production so the local `x-tenant-id` bootstrap is disabled.

## Kill switch drill (tested in `hardening.test.ts`)

```sh
POST /workflows/:id/disable      # owner only, audited as workflow.disable
POST /connections/:id/disable    # owner only, audited as connection.disable
```

Disabled workflows disappear from MCP tool listing (only `approved` listed) and executions fail closed with 409. Disabled connections fail executions with `connection_disabled`.

## Retention

- Logs/traces: 7 days. Downloads: 24 hours or less. No traces or downloads are committed.
- Executions: `EXEC_RETENTION_DAYS` (default 90). Run `pnpm retention` to delete old `execution_runs`.
- Audit events: retained indefinitely (append-only, no update/delete paths).

```sh
pnpm retention
```

## Monitoring

- `GET /metrics` (any authenticated role): executions by status, p50/p95 durations, per-version breakdown, auth-failure and rate-limit counters.
- Structured JSON lines on stdout for `execution`, `auth.failure`, `rate_limited` (all redacted).
- Rate limits: `EXEC_RATE_LIMIT_PER_MIN` (default 30), `EXEC_MAX_CONCURRENT` (default 2) per tenant. Limited callers get 429 + `retry-after`.
- Execution timeout: `EXEC_TIMEOUT_MS` (default 30000).

## Incident response

1. Leaked key: revoke it, check `audit_events` for `execution.run` rows under that tenant, rotate, set `ALLOW_HEADER_AUTH=false`.
2. Cross-tenant suspicion: run `pnpm test` (negative isolation tests), inspect `audit_events` for key/workflow changes.
3. Unintended action: disable the workflow/connection first, then investigate the execution row + duration before re-enabling with a new approved version.

## Regression rule

Every approved workflow keeps a repeatable test: schema test + runner test (verified extraction) + API execution test + MCP call test. A repair ships as a new workflow version, never an in-place edit.
