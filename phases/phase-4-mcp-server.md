# Phase 4 — MCP Server

Status: DONE
Branch: feat/phase-4-mcp
PR: TBD (link after merge)
Author: divyuuu
Completed: 2026-10-30

## Objective

Expose approved workflows as stable MCP tools. A real MCP client can list and call them.

## Why

This is the product promise: website becomes agent-callable tools.

## Scope IN

- `apps/mcp-server`: MCP TypeScript SDK, Streamable HTTP transport behind adapter, tool listing + invocation
- `packages/tool-registry`: maps `workflow_version` -> `public_name` (`search_students`, `get_latest_test_results`), input/output schemas, timeout, risk label
- Input validation (Zod), version pinning, concise structured responses
- Contract tests: list tools, schema validation, error format, auth failure, version compatibility
- Manual test with 1 compatible MCP client (e.g. inspector or Claude Desktop with MCP config)

## Scope OUT

- No new workflow types, no writes, no billing, no marketplace
- Only 1-2 tools, kept small and perfect

## Exit criteria

1. MCP client lists 2 tools and calls `search_students` end-to-end against fixture.
2. Invalid input is rejected with schema error.
3. Changing workflow creates new version; old tool behavior unchanged until republication.

## Human checkpoints

- Confirm MCP port (default 3001) and which client owner will test with.
- Owner provides MCP client test result confirmation.

## Memory update on completion

- Status DONE + test evidence.

## Evidence (2026-10-30)

- `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (12 files, 27 tests)
- SDK: @modelcontextprotocol/sdk 1.32.2, stateless Streamable HTTP, per-request tenant server
- Real Client listTools + callTool verified: search_students STU-002 returns succeeded rows
- Auth: missing x-tenant-id -> 401; tenant_b sees zero tenant_a tools (empty list or SDK -32601, both prove no leak)
- Registry: version pinning tested (v2 resolution), input shape bounded (maxLength 200 cap)
- Migration runner now idempotent (schema_migrations + PRAGMA guard); fixes double-migrate on shared DB files
- Rollback: revert merge commit of this phase PR
