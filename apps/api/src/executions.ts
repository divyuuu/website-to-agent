import type { FastifyInstance, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { runWorkflow } from "@website-to-agent/workflow-engine/runner.js";
import { canPerform, type AuthContext } from "@website-to-agent/auth";
import { redactError } from "@website-to-agent/secrets";

function authOf(req: FastifyRequest): AuthContext {
  return (req as unknown as { auth: AuthContext }).auth;
}

export function registerExecutionRoutes(app: FastifyInstance, db: DatabaseSync): void {
  app.post("/executions", async (req, reply) => {
    if (!canPerform(authOf(req).role, "operator")) {
      return reply.code(403).send({ ok: false, error: "forbidden" });
    }
    const tenantId = authOf(req).tenantId;
    const body = req.body as {
      workflowId?: string;
      inputs?: Record<string, string>;
      idempotencyKey?: string;
    };
    if (typeof body?.workflowId !== "string" || !body.workflowId) {
      return reply.code(400).send({ ok: false, error: "invalid workflowId" });
    }
    const inputs = body.inputs ?? {};
    if (typeof inputs !== "object" || Array.isArray(inputs)) {
      return reply.code(400).send({ ok: false, error: "invalid inputs" });
    }
    const idem = typeof body.idempotencyKey === "string" && body.idempotencyKey
      ? body.idempotencyKey.slice(0, 64)
      : null;

    const wf = db
      .prepare(
        "SELECT id, connection_id AS connectionId, status FROM workflows WHERE id = ? AND tenant_id = ?"
      )
      .get(body.workflowId, tenantId) as
      | { id: string; connectionId: string; status: string }
      | undefined;
    if (!wf) return reply.code(404).send({ ok: false, error: "workflow not found" });
    if (wf.status !== "approved") {
      return reply.code(409).send({ ok: false, error: "needs_approval", status: wf.status });
    }

    const ver = db
      .prepare(
        "SELECT id, version, definition FROM workflow_versions WHERE workflow_id = ? ORDER BY version DESC LIMIT 1"
      )
      .get(wf.id) as { id: string; version: number; definition: string } | undefined;
    if (!ver) return reply.code(409).send({ ok: false, error: "no approved version" });

    if (idem) {
      const existing = db
        .prepare(
          "SELECT id, status FROM execution_runs WHERE tenant_id = ? AND workflow_version_id = ? AND idempotency_key = ?"
        )
        .get(tenantId, ver.id, idem) as { id: string; status: string } | undefined;
      if (existing) {
        return reply.send({ ok: true, executionId: existing.id, status: existing.status, duplicate: true });
      }
    }

    const conn = db
      .prepare("SELECT base_url AS baseUrl FROM website_connections WHERE id = ? AND tenant_id = ?")
      .get(wf.connectionId, tenantId) as { baseUrl: string } | undefined;
    if (!conn) return reply.code(404).send({ ok: false, error: "connection not found" });

    const executionId = randomUUID();
    db.prepare(
      "INSERT INTO execution_runs (id, tenant_id, workflow_version_id, status, idempotency_key) VALUES (?, ?, ?, 'running', ?)"
    ).run(executionId, tenantId, ver.id, idem);

    const started = Date.now();
    const result = await runWorkflow({
      baseUrl: conn.baseUrl,
      definition: JSON.parse(ver.definition),
      inputs,
      timeoutMs: 30000,
    });

    db.prepare("UPDATE execution_runs SET status = ?, duration_ms = ? WHERE id = ?").run(
      result.status,
      result.durationMs ?? Date.now() - started,
      executionId
    );
    db.prepare(
      "INSERT INTO audit_events (id, tenant_id, actor, action, target) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), tenantId, tenantId, "execution.run", executionId);

    return reply.send({
      ok: result.status === "succeeded",
      executionId,
      status: result.status,
      extracted: result.extracted,
      error: result.error ? redactError(result.error) : undefined,
      durationMs: result.durationMs,
    });
  });

  app.get("/executions/:id", async (req, reply) => {
    const tenantId = authOf(req).tenantId;
    const { id } = req.params as { id: string };
    const row = db
      .prepare(
        "SELECT id, status, duration_ms AS durationMs FROM execution_runs WHERE id = ? AND tenant_id = ?"
      )
      .get(id, tenantId) as { id: string; status: string; durationMs: number } | undefined;
    if (!row) return reply.code(404).send({ ok: false, error: "execution not found" });
    return reply.send({ ok: true, execution: row });
  });
}
