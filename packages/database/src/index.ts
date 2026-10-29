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
  const dir = join(here, "..", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    db.exec(readFileSync(join(dir, f), "utf-8"));
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
