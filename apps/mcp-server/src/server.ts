import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  openDatabase,
  runMigrations,
  databasePathFromEnv,
} from "@website-to-agent/database";
import {
  listApprovedTools,
  resolveTool,
  buildInputShape,
} from "@website-to-agent/tool-registry";
import { runWorkflow } from "@website-to-agent/workflow-engine/runner.js";
import { resolveKey } from "@website-to-agent/auth";
import { limiterFromEnv } from "@website-to-agent/rate-limit";
import { countEvent } from "@website-to-agent/observability";

const toolLimiter = limiterFromEnv();

function tenantIdFrom(
  db: ReturnType<typeof openDatabase>,
  req: { headers: Record<string, unknown> }
): string | null {
  const raw = req.headers["x-mcp-key"];
  if (typeof raw !== "string" || !raw) return null;
  return resolveKey(db, raw.trim())?.tenantId ?? null;
}

export function buildMcpServer(dbPath?: string) {
  const app = Fastify({ logger: false });
  const path = dbPath ?? databasePathFromEnv();
  const db = openDatabase(path);
  runMigrations(db);
  app.decorate("db", db);
  app.addHook("onClose", async () => {
    db.close();
  });

  app.get("/health", async () => ({ ok: true, service: "website-to-agent-mcp" }));

  const handleMcp = async (
    req: { headers: Record<string, unknown>; body: unknown; raw: import("node:http").IncomingMessage },
    rawRes: import("node:http").ServerResponse,
    hijack: () => void
  ) => {
    const tenantId = tenantIdFrom(db, req);
    if (!tenantId) {
      countEvent("auth.failure");
      rawRes.writeHead(401, { "content-type": "application/json" });
      rawRes.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    hijack();
    const tools = listApprovedTools(db, tenantId);
    const server = new McpServer({ name: "website-to-agent", version: "0.1.0" });
    for (const tool of tools) {
      const resolved = resolveTool(db, tenantId, tool.name);
      if (!resolved) continue;
      const shape = buildInputShape(
        (resolved.definition as { inputs?: Record<string, { maxLength?: number; required?: boolean }> }).inputs
          ? { inputs: (resolved.definition as { inputs: Record<string, { maxLength?: number; required?: boolean }> }).inputs }
          : {}
      );
      const versionId = resolved.workflowVersionId;
      const definition = resolved.definition;
      const baseUrl = resolved.baseUrl;
      server.tool(tool.name, tool.description, shape, async (args) => {
        const gate = toolLimiter.begin(`mcp:${tenantId}`);
        if (!gate.allowed) {
          countEvent("rate_limited", tenantId);
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ status: "rate_limited", retryAfterSec: gate.retryAfterSec }) }],
            isError: true,
          };
        }
        try {
          const inputs: Record<string, string> = {};
          for (const [k, v] of Object.entries(args ?? {})) inputs[k] = String(v);
          const executionId = randomUUID();
          db.prepare(
            "INSERT INTO execution_runs (id, tenant_id, workflow_version_id, status) VALUES (?, ?, ?, 'running')"
          ).run(executionId, tenantId, versionId);
          const result = await runWorkflow({
            baseUrl,
            definition: definition as never,
            inputs,
            timeoutMs: tool.timeoutMs,
          });
          db.prepare("UPDATE execution_runs SET status = ?, duration_ms = ? WHERE id = ?").run(
            result.status,
            result.durationMs,
            executionId
          );
        if (result.status === "succeeded") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ status: result.status, extracted: result.extracted }),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ status: result.status, error: result.error ?? "failed" }),
            },
          ],
          isError: true,
        };
        } finally {
          toolLimiter.end(`mcp:${tenantId}`);
        }
      });
    }
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    try {
      await transport.handleRequest(req.raw, rawRes, req.body);
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  };

  app.post("/mcp", async (req, reply) => {
    await handleMcp(req, reply.raw, () => reply.hijack());
  });
  app.get("/mcp", async (req, reply) => {
    await handleMcp(req, reply.raw, () => reply.hijack());
  });
  app.delete("/mcp", async (req, reply) => {
    await handleMcp(req, reply.raw, () => reply.hijack());
  });

  return app;
}
