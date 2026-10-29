import { loadConfig } from "@website-to-agent/config";
import { buildMcpServer } from "./server.js";

const isMain =
  !!process.argv[1] &&
  (process.argv[1].endsWith("apps/mcp-server/src/index.ts") ||
    process.argv[1].endsWith("apps\\mcp-server\\src\\index.ts"));

if (isMain) {
  const config = loadConfig();
  const app = buildMcpServer(config.databasePath);
  app.listen({ port: config.mcpPort, host: "0.0.0.0" }).then(() => {
    console.log(`MCP listening on ${config.mcpPort}`);
  });
}
