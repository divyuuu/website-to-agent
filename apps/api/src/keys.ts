import type { FastifyInstance, FastifyRequest } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import {
  createMcpKey,
  revokeMcpKey,
  isKeyRole,
  canPerform,
  type AuthContext,
} from "@website-to-agent/auth";

function authOf(req: FastifyRequest): AuthContext {
  return (req as unknown as { auth: AuthContext }).auth;
}

export function registerKeyRoutes(app: FastifyInstance, db: DatabaseSync): void {
  app.post("/mcp-keys", async (req, reply) => {
    if (!canPerform(authOf(req).role, "owner")) {
      return reply.code(403).send({ ok: false, error: "forbidden" });
    }
    const tenantId = authOf(req).tenantId;
    const body = req.body as { name?: string; role?: string };
    const name = typeof body?.name === "string" ? body.name.slice(0, 80) : "";
    if (!name) return reply.code(400).send({ ok: false, error: "invalid name" });
    if (!isKeyRole(body?.role)) {
      return reply.code(400).send({ ok: false, error: "invalid role" });
    }
    const created = createMcpKey(db, tenantId, name, body.role);
    return reply.code(201).send({ ok: true, ...created, role: body.role });
  });

  app.get("/mcp-keys", async (req, reply) => {
    if (!canPerform(authOf(req).role, "owner")) {
      return reply.code(403).send({ ok: false, error: "forbidden" });
    }
    const tenantId = authOf(req).tenantId;
    const rows = db
      .prepare(
        "SELECT id, name, role, revoked, created_at AS createdAt FROM mcp_keys WHERE tenant_id = ? ORDER BY created_at"
      )
      .all(tenantId);
    return { ok: true, keys: rows };
  });

  app.post("/mcp-keys/:id/revoke", async (req, reply) => {
    if (!canPerform(authOf(req).role, "owner")) {
      return reply.code(403).send({ ok: false, error: "forbidden" });
    }
    const tenantId = authOf(req).tenantId;
    const { id } = req.params as { id: string };
    if (!revokeMcpKey(db, tenantId, id)) {
      return reply.code(404).send({ ok: false, error: "key not found" });
    }
    return reply.send({ ok: true, revoked: true });
  });
}
