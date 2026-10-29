# Phase 2 — Workflow Schema + Approval

Status: NOT_STARTED
Branch: TBD
PR: TBD
Author: divyuuu

## Objective

Strict declarative workflow definition with validation and owner approve/reject. No arbitrary JavaScript.

## Why

This is the safety gate. AI can suggest, owner approves, runtime enforces.

## Scope IN

- `packages/workflow-engine/schema`: step types `navigate, click, fill, select, waitFor, assert, extract` (+ `download` only if needed, restricted)
- `packages/contracts`: shared Zod schemas for workflow, inputs, outputs
- States: `draft -> proposed -> approved | rejected`, versions immutable (`v1, v2...`)
- Risk labels: `read_only` (Phase 2-4 only), `reversible_write` reserved for later
- Admin API: create/propose/approve/reject/list + validation errors
- Tests: accept valid `get_latest_test_results`, reject unknown step, ambiguous locator, unapproved origin

Example tool in scope: `search_students`, `get_latest_test_results` (read-only).

## Scope OUT

- No execution yet (Phase 3), no MCP yet (Phase 4)
- No auto-approval, no auto-repair

## Exit criteria

1. Invalid/unsafe workflows are rejected with clear errors.
2. Approved version cannot be edited in place — new version required.
3. Unit tests cover schema, risk, tenant scoping.

## Human checkpoints

- Approve the exact v1 step types list before coding.
- Review sample workflow YAML/JSON for `get_latest_test_results`.

## Memory update on completion

- Status DONE + schema version + sample approved workflow id.
