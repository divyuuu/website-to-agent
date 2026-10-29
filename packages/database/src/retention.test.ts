import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openDatabase, runMigrations } from "./index.js";

let dir: string;
let db: DatabaseSync;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "w2a-ret-"));
  db = openDatabase(join(dir, "ret.db"));
  runMigrations(db);
});

afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("retention", () => {
  it("deletes old executions but keeps audit", () => {
    db.prepare("INSERT INTO tenants (id, name) VALUES ('t','t')").run();
    db.prepare(
      "INSERT INTO execution_runs (id, tenant_id, status, created_at) VALUES ('old', 't', 'succeeded', datetime('now', '-100 days'))"
    ).run();
    db.prepare("INSERT INTO audit_events (id, tenant_id, actor, action, target) VALUES ('a','t','t','x','y')").run();
    const deleted = db
      .prepare("DELETE FROM execution_runs WHERE created_at < datetime('now', '-90 days')")
      .run();
    expect(deleted.changes).toBe(1);
    const audits = db.prepare("SELECT COUNT(*) AS n FROM audit_events").get() as { n: number };
    expect(audits.n).toBe(1);
  });
});
