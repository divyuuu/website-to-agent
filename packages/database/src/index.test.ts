import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openDatabase, runMigrations, countByTenant } from "./index.js";

let dir: string;
let dbPath: string;
let db: DatabaseSync;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "w2a-"));
  dbPath = join(dir, "test.db");
  db = openDatabase(dbPath);
  runMigrations(db);
});

afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("database tenant scoping", () => {
  it("isolates connections by tenant", () => {
    db.prepare("INSERT INTO tenants (id, name) VALUES (?, ?)").run("t_a", "A");
    db.prepare("INSERT INTO tenants (id, name) VALUES (?, ?)").run("t_b", "B");
    db.prepare(
      "INSERT INTO website_connections (id, tenant_id, base_url) VALUES (?, ?, ?)"
    ).run("c_1", "t_a", "http://localhost:4100");

    expect(countByTenant(db, "website_connections", "t_a")).toBe(1);
    expect(countByTenant(db, "website_connections", "t_b")).toBe(0);
  });
});
