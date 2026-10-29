import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  openDatabase,
  runMigrations,
} from "@website-to-agent/database";
import { createMcpKey, revokeMcpKey } from "@website-to-agent/auth";
import { buildFixtureServer } from "@website-to-agent/fixture-site";
import { buildMcpServer } from "./server.js";

const definition = {
  name: "search_students",
  version: 1,
  risk: "read_only",
  inputs: { student_id: { type: "string", required: true, maxLength: 40 } },
  preconditions: ["authenticated_session"],
  steps: [
    { navigate: "/students" },
    {
      fill: {
        locator: { role: "textbox", name: "Student ID" },
        valueFrom: "inputs.student_id",
      },
    },
    { click: { locator: { role: "button", name: "Search" } } },
    { assert: { locator: { role: "heading", name: "Student Results" } } },
    { extract: { fields: ["subject", "score", "test_date"] } },
  ],
  output: { type: "object", fields: ["student_id", "results"] },
};

function seedTenant(dbPath: string, tenant: string, baseUrl: string): string {
  const db = openDatabase(dbPath);
  runMigrations(db);
  db.prepare("INSERT OR IGNORE INTO tenants (id, name) VALUES (?, ?)").run(tenant, tenant);
  const conn = randomUUID();
  db.prepare(
    "INSERT INTO website_connections (id, tenant_id, base_url, status) VALUES (?, ?, ?, 'active')"
  ).run(conn, tenant, baseUrl);
  const wf = randomUUID();
  db.prepare(
    "INSERT INTO workflows (id, tenant_id, connection_id, stable_name, status) VALUES (?, ?, ?, ?, 'approved')"
  ).run(wf, tenant, conn, "search_students");
  db.prepare(
    "INSERT INTO workflow_versions (id, workflow_id, tenant_id, version, definition, approved_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(randomUUID(), wf, tenant, 1, JSON.stringify(definition), tenant);
  const { plaintext } = createMcpKey(db, tenant, "test-key", "operator");
  db.close();
  return plaintext;
}

async function startServer(dbPath: string) {
  const app = buildMcpServer(dbPath);
  await app.listen({ port: 0, host: "127.0.0.1" });
  const addr = app.server.address();
  const port = typeof addr === "object" && addr ? addr.port : 3001;
  return { app, port };
}

describe("mcp server contract", () => {
  it("lists and calls an approved tool end to end", async () => {
    const fixture = buildFixtureServer();
    await fixture.listen({ port: 0, host: "127.0.0.1" });
    const fAddr = fixture.server.address();
    const fPort = typeof fAddr === "object" && fAddr ? fAddr.port : 4100;
    const dir = mkdtempSync(join(tmpdir(), "w2a-mcp-"));
    const dbPath = join(dir, "mcp.db");
    const key = seedTenant(dbPath, "tenant_a", `http://127.0.0.1:${fPort}`);
    const { app, port } = await startServer(dbPath);
    const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
      requestInit: { headers: { "x-mcp-key": key } },
    });
    const client = new Client({ name: "phase4-test", version: "0.1.0" }, { capabilities: {} });
    try {
      await client.connect(transport);
      const listed = await client.listTools();
      expect(listed.tools.map((t) => t.name)).toContain("search_students");
      const called = await client.callTool({ name: "search_students", arguments: { student_id: "STU-002" } });
      const text = (called.content as { type: string; text?: string }[]).map((c) => c.text ?? "").join("");
      expect(text).toContain("succeeded");
      expect(text).toContain("STU-002");
    } finally {
      await client.close().catch(() => undefined);
      await app.close();
      await fixture.close();
    }
  }, 120000);

  it("rejects unauthenticated, revoked, and cross-tenant access", async () => {
    const dir = mkdtempSync(join(tmpdir(), "w2a-mcp-"));
    const dbPath = join(dir, "mcp.db");
    const keyA = seedTenant(dbPath, "tenant_a", "http://127.0.0.1:4100");
    const db = openDatabase(dbPath);
    runMigrations(db);
    const { plaintext: keyB } = createMcpKey(db, "tenant_b", "b-key", "operator");
    const rowA = db.prepare("SELECT id FROM mcp_keys WHERE tenant_id = 'tenant_a'").get() as {
      id: string;
    };
    db.close();
    const { app, port } = await startServer(dbPath);
    try {
      const anon = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
      expect(anon.status).toBe(401);

      const legacy = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-tenant-id": "tenant_a" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
      expect(legacy.status).toBe(401);

      const otherTransport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${port}/mcp`),
        { requestInit: { headers: { "x-mcp-key": keyB } } }
      );
      const otherClient = new Client({ name: "phase4-test", version: "0.1.0" }, { capabilities: {} });
      try {
        await otherClient.connect(otherTransport);
        try {
          const listed = await otherClient.listTools();
          expect(listed.tools).toHaveLength(0);
        } catch (err) {
          expect(String(err)).toContain("-32601");
        }
      } finally {
        await otherClient.close().catch(() => undefined);
      }

      const db2 = openDatabase(dbPath);
      runMigrations(db2);
      revokeMcpKey(db2, "tenant_a", rowA.id);
      db2.close();
      void keyA;

      const revoked = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-mcp-key": keyA },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
      expect(revoked.status).toBe(401);
    } finally {
      await app.close();
    }
  }, 60000);
});
