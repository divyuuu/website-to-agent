import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildServer } from "./index.js";
import { buildFixtureServer } from "@website-to-agent/fixture-site";

const definition = {
  name: "search_students",
  version: 1,
  risk: "read_only",
  inputs: { student_id: { type: "string", required: true, maxLength: 40 } },
  preconditions: ["authenticated_session"],
  steps: [
    { navigate: "/students" },
    {
      fill: {
        locator: { role: "textbox", name: "Student ID" },
        valueFrom: "inputs.student_id",
      },
    },
    { click: { locator: { role: "button", name: "Search" } } },
    { assert: { locator: { role: "heading", name: "Student Results" } } },
    { extract: { fields: ["subject", "score", "test_date"] } },
  ],
  output: { type: "object", fields: ["student_id", "results"] },
};

describe("executions", () => {
  it("runs an approved workflow and supports idempotency", async () => {
    const fixture = buildFixtureServer();
    await fixture.listen({ port: 0, host: "127.0.0.1" });
    const addr = fixture.server.address();
    const port = typeof addr === "object" && addr ? addr.port : 4100;
    const dir = mkdtempSync(join(tmpdir(), "w2a-exec-"));
    const server = buildServer(join(dir, "exec.db"));
    try {
      const h = { "x-tenant-id": "tenant_a" };
      const conn = await server.inject({
        method: "POST",
        url: "/connections",
        headers: h,
        payload: { baseUrl: `http://127.0.0.1:${port}` },
      });
      expect(conn.statusCode).toBe(201);

      const created = await server.inject({
        method: "POST",
        url: "/workflows",
        headers: h,
        payload: { stableName: "search_students", connectionId: conn.json().id },
      });
      const workflowId = created.json().id as string;

      const unapproved = await server.inject({
        method: "POST",
        url: "/executions",
        headers: h,
        payload: { workflowId, inputs: { student_id: "STU-001" } },
      });
      expect(unapproved.statusCode).toBe(409);

      await server.inject({
        method: "POST",
        url: `/workflows/${workflowId}/propose`,
        headers: h,
        payload: { definition },
      });
      await server.inject({
        method: "POST",
        url: `/workflows/${workflowId}/approve`,
        headers: h,
      });

      const first = await server.inject({
        method: "POST",
        url: "/executions",
        headers: h,
        payload: { workflowId, inputs: { student_id: "STU-001" }, idempotencyKey: "k1" },
      });
      expect(first.statusCode).toBe(200);
      expect(first.json().status).toBe("succeeded");
      const rows = (first.json().extracted?.rows ?? []) as string[][];
      expect(rows.some((r) => r.join(" ").includes("STU-001"))).toBe(true);

      const second = await server.inject({
        method: "POST",
        url: "/executions",
        headers: h,
        payload: { workflowId, inputs: { student_id: "STU-001" }, idempotencyKey: "k1" },
      });
      expect(second.json().duplicate).toBe(true);
      expect(second.json().executionId).toBe(first.json().executionId);

      const lookup = await server.inject({
        method: "GET",
        url: `/executions/${first.json().executionId}`,
        headers: h,
      });
      expect(lookup.json().execution.status).toBe("succeeded");
    } finally {
      await server.close();
      await fixture.close();
    }
  }, 120000);
});
