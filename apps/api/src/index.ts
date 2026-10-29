import Fastify from "fastify";
import { loadConfig } from "@website-to-agent/config";

export function buildServer() {
  const server = Fastify({ logger: false });

  server.get("/health", async () => ({
    ok: true,
    service: "website-to-agent-api",
  }));

  server.get("/ready", async () => ({
    ok: true,
  }));

  return server;
}

const isMain =
  !!process.argv[1] &&
  (process.argv[1].endsWith("apps/api/src/index.ts") ||
    process.argv[1].endsWith("apps\\api\\src\\index.ts") ||
    process.argv[1].endsWith("index.ts"));

if (isMain) {
  const config = loadConfig();
  const server = buildServer();
  server.listen({ port: config.apiPort, host: "0.0.0.0" }).then(() => {
    console.log(`API listening on ${config.apiPort}`);
  });
}
