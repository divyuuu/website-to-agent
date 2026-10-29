import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, runMigrations } from "@website-to-agent/database";
import { buildServer } from "./index.js";

describe("mcp keys and roles", () => {
  it("issues, enforces, and revokes per-tenant keys", async () => {
    const dir = mkdtempSync(join(tmpdir(), "w2a-keys-"));
    const server = buildServer(join(dir, "keys.db"));
    try {
      const boot = { "x-tenant-id": "tenant_a" };
      const mk = async (name: string, role: string) =>
        server.inject({ method: "POST", url: "/mcp-keys", headers: boot, payload: { name, role } });

      const owner = (await mk("owner-key", "owner")).json() as { key?: string; plaintext?: string; id: string };
      const ownerKey = (owner.plaintext ?? owner.key ?? "") as string;
      expect(ownerKey.startsWith("w2a_")).toBe(true);
      const operatorKey = ((await mk("op-key", "operator")).json() as { plaintext: string }).plaintext;
      const viewerKey = ((await mk("view-key", "viewer")).json() as { plaintext: string }).plaintext;

      const list = await server.inject({
        method: "GET",
        url: "/mcp-keys",
        headers: { "x-mcp-key": ownerKey },
      });
      expect(list.statusCode).toBe(200);
      expect(list.json().keys).toHaveLength(3);
      for (const k of list.json().keys as { key_hash?: string; plaintext?: string }[]) {
        expect(k.key_hash).toBeUndefined();
        expect(k.plaintext).toBeUndefined();
      }

      const viewerList = await server.inject({
        method: "GET",
        url: "/mcp-keys",
        headers: { "x-mcp-key": viewerKey },
      });
      expect(viewerList.statusCode).toBe(403);

      const viewerWrite = await server.inject({
        method: "POST",
        url: "/connections",
        headers: { "x-mcp-key": viewerKey },
        payload: { baseUrl: "http://localhost:4100" },
      });
      expect(viewerWrite.statusCode).toBe(403);

      const conn = await server.inject({
        method: "POST",
        url: "/connections",
        headers: { "x-mcp-key": operatorKey },
        payload: { baseUrl: "http://localhost:4100" },
      });
      expect(conn.statusCode).toBe(201);

      const created = await server.inject({
        method: "POST",
        url: "/workflows",
        headers: { "x-mcp-key": operatorKey },
        payload: { stableName: "search_students", connectionId: conn.json().id },
      });
      const workflowId = created.json().id as string;

      const opApprove = await server.inject({
        method: "POST",
        url: `/workflows/${workflowId}/approve`,
        headers: { "x-mcp-key": operatorKey },
      });
      expect(opApprove.statusCode).toBe(403);

      const cross = await server.inject({
        method: "GET",
        url: `/workflows/${workflowId}`,
        headers: { "x-tenant-id": "tenant_b" },
      });
      expect(cross.statusCode).toBe(404);

      const keyId = (list.json().keys as { id: string; name: string }[]).find(
        (k) => k.name === "op-key"
      )?.id as string;
      const revoked = await server.inject({
        method: "POST",
        url: `/mcp-keys/${keyId}/revoke`,
        headers: { "x-mcp-key": ownerKey },
      });
      expect(revoked.statusCode).toBe(200);

      const afterRevoke = await server.inject({
        method: "GET",
        url: "/workflows",
        headers: { "x-mcp-key": operatorKey },
      });
      expect(afterRevoke.statusCode).toBe(401);

      const db = openDatabase(join(dir, "keys.db"));
      runMigrations(db);
      const audits = db
        .prepare("SELECT COUNT(*) AS n FROM audit_events WHERE tenant_id = 'tenant_a'")
        .get() as { n: number };
      db.close();
      expect(audits.n).toBeGreaterThanOrEqual(3);
    } finally {
      await server.close();
    }
  });
});
