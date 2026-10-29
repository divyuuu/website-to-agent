import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DatabaseSync } from "node:sqlite";
import {
  workflowDefinitionSchema,
  assertTransition,
} from "@website-to-agent/workflow-engine";

function tenantIdFrom(req: { headers: Record<string, unknown> }): string | null {
  const raw = req.headers["x-tenant-id"];
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id.length > 64) return null;
  return id;
}

function ensureTenant(db: DatabaseSync, tenantId: string): void {
  db.prepare(
    "INSERT OR IGNORE INTO tenants (id, name, status) VALUES (?, ?, 'active')"
  ).run(tenantId, tenantId);
}

function isAllowedBaseUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:") return false;
    return (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "::1"
    );
  } catch {
    return false;
  }
}

const stableNameSchema = z.string().regex(/^[a-z][a-z0-9_]*$/).max(80);

export function registerWorkflowRoutes(app: FastifyInstance, db: DatabaseSync): void {
  app.addHook("preHandler", async (req, reply) => {
    if (
      !req.url.startsWith("/workflows") &&
      !req.url.startsWith("/connections") &&
      !req.url.startsWith("/executions")
    )
      return;
    const tenantId = tenantIdFrom(req);
    if (!tenantId) {
      reply.code(401).send({ ok: false, error: "missing x-tenant-id" });
      return;
    }
    ensureTenant(db, tenantId);
  });

  app.post("/connections", async (req, reply) => {
    const tenantId = tenantIdFrom(req) as string;
    const body = req.body as { baseUrl?: string };
    if (!body?.baseUrl || !isAllowedBaseUrl(body.baseUrl)) {
      return reply.code(400).send({ ok: false, error: "baseUrl must be an http localhost URL" });
    }
    const id = randomUUID();
    db.prepare(
      "INSERT INTO website_connections (id, tenant_id, base_url, status) VALUES (?, ?, ?, 'active')"
    ).run(id, tenantId, body.baseUrl);
    return reply.code(201).send({ ok: true, id, baseUrl: body.baseUrl });
  });

  app.post("/workflows", async (req, reply) => {
    const tenantId = tenantIdFrom(req) as string;
    const body = req.body as { stableName?: string; connectionId?: string };
    const nameParsed = stableNameSchema.safeParse(body?.stableName);
    if (!nameParsed.success) {
      return reply.code(400).send({ ok: false, error: "invalid stableName" });
    }
    const connectionId = body?.connectionId;
    if (typeof connectionId !== "string" || !connectionId) {
      return reply.code(400).send({ ok: false, error: "invalid connectionId" });
    }
    const conn = db
      .prepare("SELECT id FROM website_connections WHERE id = ? AND tenant_id = ?")
      .get(connectionId, tenantId) as { id: string } | undefined;
    if (!conn) {
      return reply.code(404).send({ ok: false, error: "connection not found" });
    }
    const id = randomUUID();
    try {
      db.prepare(
        "INSERT INTO workflows (id, tenant_id, connection_id, stable_name, status) VALUES (?, ?, ?, ?, 'draft')"
      ).run(id, tenantId, connectionId, nameParsed.data);
    } catch {
      return reply.code(409).send({ ok: false, error: "stableName already exists" });
    }
    return reply.code(201).send({ ok: true, id, status: "draft" });
  });

  app.post("/workflows/:id/propose", async (req, reply) => {
    const tenantId = tenantIdFrom(req) as string;
    const { id } = req.params as { id: string };
    const row = db
      .prepare("SELECT id, stable_name AS stableName, status FROM workflows WHERE id = ? AND tenant_id = ?")
      .get(id, tenantId) as { id: string; stableName: string; status: string } | undefined;
    if (!row) return reply.code(404).send({ ok: false, error: "workflow not found" });
    if (row.status !== "draft" && row.status !== "rejected") {
      return reply.code(409).send({ ok: false, error: `cannot propose from ${row.status}` });
    }
    const parsed = workflowDefinitionSchema.safeParse((req.body as { definition?: unknown })?.definition);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: "invalid definition", issues: parsed.error.issues });
    }
    if (parsed.data.name !== row.stableName) {
      return reply.code(400).send({ ok: false, error: "definition.name must match stableName" });
    }
    const count = db
      .prepare("SELECT COUNT(*) AS n FROM workflow_versions WHERE workflow_id = ?")
      .get(id) as { n: number };
    const version = count.n + 1;
    if (parsed.data.version !== version) {
      return reply.code(400).send({ ok: false, error: `definition.version must be ${version}` });
    }
    const versionId = randomUUID();
    db.prepare(
      "INSERT INTO workflow_versions (id, workflow_id, tenant_id, version, definition) VALUES (?, ?, ?, ?, ?)"
    ).run(versionId, id, tenantId, version, JSON.stringify(parsed.data));
    db.prepare("UPDATE workflows SET status = 'proposed' WHERE id = ?").run(id);
    return reply.send({ ok: true, version, versionId, status: "proposed" });
  });

  app.post("/workflows/:id/approve", async (req, reply) => {
    const tenantId = tenantIdFrom(req) as string;
    const { id } = req.params as { id: string };
    const row = db
      .prepare("SELECT id, status FROM workflows WHERE id = ? AND tenant_id = ?")
      .get(id, tenantId) as { id: string; status: string } | undefined;
    if (!row) return reply.code(404).send({ ok: false, error: "workflow not found" });
    try {
      assertTransition(row.status as "draft", "approved");
    } catch {
      return reply.code(409).send({ ok: false, error: `cannot approve from ${row.status}` });
    }
    db.prepare("UPDATE workflows SET status = 'approved' WHERE id = ?").run(id);
    db.prepare(
      "INSERT INTO audit_events (id, tenant_id, actor, action, target) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), tenantId, tenantId, "workflow.approve", id);
    return reply.send({ ok: true, status: "approved" });
  });

  app.post("/workflows/:id/reject", async (req, reply) => {
    const tenantId = tenantIdFrom(req) as string;
    const { id } = req.params as { id: string };
    const row = db
      .prepare("SELECT id, status FROM workflows WHERE id = ? AND tenant_id = ?")
      .get(id, tenantId) as { id: string; status: string } | undefined;
    if (!row) return reply.code(404).send({ ok: false, error: "workflow not found" });
    try {
      assertTransition(row.status as "draft", "rejected");
    } catch {
      return reply.code(409).send({ ok: false, error: `cannot reject from ${row.status}` });
    }
    db.prepare("UPDATE workflows SET status = 'rejected' WHERE id = ?").run(id);
    return reply.send({ ok: true, status: "rejected" });
  });

  app.get("/workflows", async (req) => {
    const tenantId = tenantIdFrom(req) as string;
    const rows = db
      .prepare("SELECT id, stable_name AS stableName, status FROM workflows WHERE tenant_id = ? ORDER BY stable_name")
      .all(tenantId);
    return { ok: true, workflows: rows };
  });

  app.get("/workflows/:id", async (req, reply) => {
    const tenantId = tenantIdFrom(req) as string;
    const { id } = req.params as { id: string };
    const row = db
      .prepare("SELECT id, stable_name AS stableName, status FROM workflows WHERE id = ? AND tenant_id = ?")
      .get(id, tenantId) as { id: string; stableName: string; status: string } | undefined;
    if (!row) return reply.code(404).send({ ok: false, error: "workflow not found" });
    const versions = db
      .prepare("SELECT version FROM workflow_versions WHERE workflow_id = ? ORDER BY version")
      .all(id);
    return { ok: true, workflow: row, versions };
  });
}
