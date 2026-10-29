import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildServer } from "./index.js";
import { executionLimiter } from "./executions.js";

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

describe("hardening", () => {
  it("kill switch disables workflows and connections immediately", async () => {
    const dir = mkdtempSync(join(tmpdir(), "w2a-kill-"));
    const server = buildServer(join(dir, "kill.db"));
    try {
      const h = { "x-tenant-id": "tenant_a" };
      const conn = await server.inject({
        method: "POST",
        url: "/connections",
        headers: h,
        payload: { baseUrl: "http://localhost:4100" },
      });
      const connectionId = conn.json().id as string;
      const created = await server.inject({
        method: "POST",
        url: "/workflows",
        headers: h,
        payload: { stableName: "search_students", connectionId },
      });
      const workflowId = created.json().id as string;
      await server.inject({
        method: "POST",
        url: `/workflows/${workflowId}/propose`,
        headers: h,
        payload: { definition },
      });
      await server.inject({ method: "POST", url: `/workflows/${workflowId}/approve`, headers: h });

      const off = await server.inject({
        method: "POST",
        url: `/workflows/${workflowId}/disable`,
        headers: h,
      });
      expect(off.statusCode).toBe(200);
      const runOff = await server.inject({
        method: "POST",
        url: "/executions",
        headers: h,
        payload: { workflowId, inputs: { student_id: "STU-001" } },
      });
      expect(runOff.statusCode).toBe(409);

      const conn2 = await server.inject({
        method: "POST",
        url: "/connections",
        headers: h,
        payload: { baseUrl: "http://localhost:4100" },
      });
      const created2 = await server.inject({
        method: "POST",
        url: "/workflows",
        headers: h,
        payload: { stableName: "search_students_two", connectionId: conn2.json().id },
      });
      const wf2 = created2.json().id as string;
      await server.inject({
        method: "POST",
        url: `/workflows/${wf2}/propose`,
        headers: h,
        payload: { definition: { ...definition, name: "search_students_two" } },
      });
      await server.inject({ method: "POST", url: `/workflows/${wf2}/approve`, headers: h });
      await server.inject({
        method: "POST",
        url: `/connections/${conn2.json().id}/disable`,
        headers: h,
      });
      const runConnOff = await server.inject({
        method: "POST",
        url: "/executions",
        headers: h,
        payload: { workflowId: wf2, inputs: { student_id: "STU-001" } },
      });
      expect(runConnOff.statusCode).toBe(409);
      expect(runConnOff.json().error).toBe("connection_disabled");
    } finally {
      await server.close();
    }
  });

  it("rate limits executions and serves metrics", async () => {
    const dir = mkdtempSync(join(tmpdir(), "w2a-rl-"));
    const server = buildServer(join(dir, "rl.db"));
    try {
      const h = { "x-tenant-id": "tenant_a" };
      const conn = await server.inject({
        method: "POST",
        url: "/connections",
        headers: h,
        payload: { baseUrl: "http://localhost:4100" },
      });
      const created = await server.inject({
        method: "POST",
        url: "/workflows",
        headers: h,
        payload: { stableName: "search_students", connectionId: conn.json().id },
      });
      const workflowId = created.json().id as string;

      executionLimiter.reset();
      executionLimiter.configure({ maxPerMin: 1, maxConcurrent: 10 });
      const first = await server.inject({
        method: "POST",
        url: "/executions",
        headers: h,
        payload: { workflowId, inputs: {} },
      });
      expect([409, 200]).toContain(first.statusCode);
      const second = await server.inject({
        method: "POST",
        url: "/executions",
        headers: h,
        payload: { workflowId, inputs: {} },
      });
      expect(second.statusCode).toBe(429);
      expect(second.headers["retry-after"]).toBeDefined();
      executionLimiter.reset();
      executionLimiter.configure({ maxPerMin: 30, maxConcurrent: 2 });

      await server.inject({ method: "GET", url: "/workflows" });
      const metrics = await server.inject({ method: "GET", url: "/metrics", headers: h });
      expect(metrics.statusCode).toBe(200);
      const body = metrics.json();
      expect(body.executions).toBeDefined();
      expect(body.executions.durationMs).toBeDefined();
      expect(typeof body.authFailures).toBe("number");
    } finally {
      await server.close();
    }
  });
});
