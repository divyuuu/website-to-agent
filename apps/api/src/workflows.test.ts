import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildServer } from "./index.js";

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

function headers(tenant: string) {
  return { "x-tenant-id": tenant };
}

describe("workflow approval flow", () => {
  it("creates, proposes, approves, and isolates tenants", async () => {
    const dir = mkdtempSync(join(tmpdir(), "w2a-wf-"));
    const server = buildServer(join(dir, "wf.db"));
    try {
      const conn = await server.inject({
        method: "POST",
        url: "/connections",
        headers: headers("tenant_a"),
        payload: { baseUrl: "http://localhost:4100" },
      });
      expect(conn.statusCode).toBe(201);
      const connectionId = conn.json().id as string;

      const created = await server.inject({
        method: "POST",
        url: "/workflows",
        headers: headers("tenant_a"),
        payload: { stableName: "search_students", connectionId },
      });
      expect(created.statusCode).toBe(201);
      const workflowId = created.json().id as string;

      const direct = await server.inject({
        method: "POST",
        url: `/workflows/${workflowId}/approve`,
        headers: headers("tenant_a"),
      });
      expect(direct.statusCode).toBe(409);

      const bad = await server.inject({
        method: "POST",
        url: `/workflows/${workflowId}/propose`,
        headers: headers("tenant_a"),
        payload: { definition: { ...definition, steps: [{ evaluate: "x" }] } },
      });
      expect(bad.statusCode).toBe(400);

      const proposed = await server.inject({
        method: "POST",
        url: `/workflows/${workflowId}/propose`,
        headers: headers("tenant_a"),
        payload: { definition },
      });
      expect(proposed.statusCode).toBe(200);

      const approved = await server.inject({
        method: "POST",
        url: `/workflows/${workflowId}/approve`,
        headers: headers("tenant_a"),
      });
      expect(approved.statusCode).toBe(200);

      const cross = await server.inject({
        method: "GET",
        url: `/workflows/${workflowId}`,
        headers: headers("tenant_b"),
      });
      expect(cross.statusCode).toBe(404);

      const listB = await server.inject({
        method: "GET",
        url: "/workflows",
        headers: headers("tenant_b"),
      });
      expect(listB.json().workflows).toHaveLength(0);
    } finally {
      await server.close();
    }
  });
});
