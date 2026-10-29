import { openDatabase, runMigrations, databasePathFromEnv } from "../src/index.js";

const days = Math.max(1, Number(process.env.EXEC_RETENTION_DAYS ?? "90"));
const path = databasePathFromEnv();
const db = openDatabase(path);
runMigrations(db);
const result = db
  .prepare(
    "DELETE FROM execution_runs WHERE created_at < datetime('now', ?)"
  )
  .run(`-${days} days`);
db.close();
console.log(`Retention: deleted ${result.changes} execution_runs older than ${days}d at ${path}. Audit events retained.`);
