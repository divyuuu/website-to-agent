import { openDatabase, runMigrations, databasePathFromEnv } from "../src/index.js";

const path = databasePathFromEnv();
const db = openDatabase(path);
runMigrations(db);
db.close();
console.log(`Migrated SQLite database at ${path}`);
