import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function databasePathFromEnv(): string {
  return process.env.DATABASE_PATH ?? "./data/app.db";
}

export function openDatabase(path: string): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export function runMigrations(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));"
  );
  const applied = new Set(
    (
      db.prepare("SELECT filename FROM schema_migrations").all() as {
        filename: string;
      }[]
    ).map((r) => r.filename)
  );
  const dir = join(here, "..", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    if (applied.has(f)) continue;
    if (f === "002_idempotency.sql") {
      const cols = db.prepare("PRAGMA table_info(execution_runs)").all() as {
        name: string;
      }[];
      if (!cols.some((c) => c.name === "idempotency_key")) {
        db.exec("ALTER TABLE execution_runs ADD COLUMN idempotency_key TEXT;");
      }
      db.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_idem ON execution_runs(tenant_id, workflow_version_id, idempotency_key);"
      );
    } else {
      db.exec(readFileSync(join(dir, f), "utf-8"));
    }
    db.prepare("INSERT OR IGNORE INTO schema_migrations (filename) VALUES (?)").run(f);
  }
}

export function countByTenant(
  db: DatabaseSync,
  table: string,
  tenantId: string
): number {
  const allowed = new Set([
    "website_connections",
    "workflows",
    "workflow_versions",
    "execution_runs",
    "audit_events",
  ]);
  if (!allowed.has(table)) throw new Error("Invalid table");
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE tenant_id = ?`)
    .get(tenantId) as { n: number };
  return row.n;
}
