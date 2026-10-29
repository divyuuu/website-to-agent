import Fastify from "fastify";
import { loadConfig } from "@website-to-agent/config";
import {
  openDatabase,
  runMigrations,
  databasePathFromEnv,
} from "@website-to-agent/database";
import { registerWorkflowRoutes } from "./workflows.js";

export function buildServer(dbPath?: string) {
  const server = Fastify({ logger: false });

  server.get("/health", async () => ({
    ok: true,
    service: "website-to-agent-api",
  }));

  server.get("/ready", async () => ({
    ok: true,
  }));

  const path = dbPath ?? databasePathFromEnv();
  const db = openDatabase(path);
  runMigrations(db);
  registerWorkflowRoutes(server, db);
  server.addHook("onClose", async () => {
    db.close();
  });

  return server;
}

const isApiMain =
  !!process.argv[1] &&
  (process.argv[1].endsWith("apps/api/src/index.ts") ||
    process.argv[1].endsWith("apps\\api\\src\\index.ts"));

if (isApiMain) {
  const config = loadConfig();
  const server = buildServer(config.databasePath);
  server.listen({ port: config.apiPort, host: "0.0.0.0" }).then(() => {
    console.log(`API listening on ${config.apiPort}`);
  });
}
