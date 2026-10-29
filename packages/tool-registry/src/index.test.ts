import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {
  openDatabase,
  runMigrations,
} from "@website-to-agent/database";
import { listApprovedTools, resolveTool, buildInputShape } from "./index.js";

let dir: string;
let db: DatabaseSync;

function seed(tenant: string, stableName: string, status: string, version: number): void {
  db.prepare("INSERT OR IGNORE INTO tenants (id, name) VALUES (?, ?)").run(tenant, tenant);
  const conn = randomUUID();
  db.prepare(
    "INSERT INTO website_connections (id, tenant_id, base_url, status) VALUES (?, ?, ?, 'active')"
  ).run(conn, tenant, "http://localhost:4100");
  const wf = randomUUID();
  db.prepare(
    "INSERT INTO workflows (id, tenant_id, connection_id, stable_name, status) VALUES (?, ?, ?, ?, ?)"
  ).run(wf, tenant, conn, stableName, status);
  db.prepare(
    "INSERT INTO workflow_versions (id, workflow_id, tenant_id, version, definition) VALUES (?, ?, ?, ?, ?)"
  ).run(
    randomUUID(),
    wf,
    tenant,
    version,
    JSON.stringify({
      name: stableName,
      version,
      risk: "read_only",
      inputs: { student_id: { type: "string", required: true, maxLength: 40 } },
      preconditions: [],
      steps: [{ navigate: "/students" }],
      output: { type: "object", fields: ["student_id"] },
    })
  );
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "w2a-reg-"));
  db = openDatabase(join(dir, "reg.db"));
  runMigrations(db);
});

afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("tool registry", () => {
  it("lists only approved tools for the tenant", () => {
    seed("t_a", "search_students", "approved", 1);
    seed("t_a", "draft_tool", "draft", 1);
    seed("t_b", "other_tool", "approved", 1);
    const tools = listApprovedTools(db, "t_a");
    expect(tools.map((t) => t.name)).toEqual(["search_students"]);
    expect(tools[0].description).toContain("search_students");
  });

  it("pins resolution to the latest version", () => {
    seed("t_a", "search_students", "approved", 1);
    const first = resolveTool(db, "t_a", "search_students");
    expect(first?.version).toBe(1);
    const wf = db
      .prepare("SELECT id FROM workflows WHERE tenant_id = 't_a'")
      .get() as { id: string };
    db.prepare(
      "INSERT INTO workflow_versions (id, workflow_id, tenant_id, version, definition) VALUES (?, ?, ?, ?, ?)"
    ).run(
      randomUUID(),
      wf.id,
      "t_a",
      2,
      JSON.stringify({
        name: "search_students",
        version: 2,
        risk: "read_only",
        inputs: {},
        preconditions: [],
        steps: [{ navigate: "/students" }],
        output: { type: "object", fields: ["student_id"] },
      })
    );
    expect(resolveTool(db, "t_a", "search_students")?.version).toBe(2);
  });

  it("builds a bounded input shape", () => {
    const shape = buildInputShape({
      inputs: { student_id: { maxLength: 40, required: true } },
    });
    expect(Object.keys(shape)).toEqual(["student_id"]);
  });
});
