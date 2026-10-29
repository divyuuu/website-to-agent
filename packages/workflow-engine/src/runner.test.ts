import { describe, expect, it } from "vitest";
import { buildFixtureServer } from "@website-to-agent/fixture-site";
import { runWorkflow } from "./runner.js";

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
} as const;

describe("runner", () => {
  it("searches and extracts verified rows", async () => {
    const app = buildFixtureServer();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const addr = app.server.address();
    const port = typeof addr === "object" && addr ? addr.port : 4100;
    try {
      const result = await runWorkflow({
        baseUrl: `http://127.0.0.1:${port}`,
        definition: JSON.parse(JSON.stringify(definition)),
        inputs: { student_id: "STU-001" },
      });
      expect(result.status).toBe("succeeded");
      const rows = (result.extracted?.rows ?? []) as string[][];
      expect(rows.some((r) => r.join(" ").includes("STU-001"))).toBe(true);
    } finally {
      await app.close();
    }
  }, 60000);

  it("returns empty rows for unknown student", async () => {
    const app = buildFixtureServer();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const addr = app.server.address();
    const port = typeof addr === "object" && addr ? addr.port : 4100;
    try {
      const result = await runWorkflow({
        baseUrl: `http://127.0.0.1:${port}`,
        definition: JSON.parse(JSON.stringify(definition)),
        inputs: { student_id: "ZZZ-NOPE" },
      });
      expect(result.status).toBe("succeeded");
      expect((result.extracted?.rows ?? []) as string[][]).toHaveLength(0);
    } finally {
      await app.close();
    }
  }, 60000);

  it("fails on changed locator", async () => {
    const app = buildFixtureServer();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const addr = app.server.address();
    const port = typeof addr === "object" && addr ? addr.port : 4100;
    try {
      const broken = JSON.parse(JSON.stringify(definition));
      broken.steps[2] = { click: { locator: { role: "button", name: "NoSuchButton" } } };
      const result = await runWorkflow({
        baseUrl: `http://127.0.0.1:${port}`,
        definition: broken,
        inputs: { student_id: "STU-001" },
      });
      expect(["failed", "timed_out"]).toContain(result.status);
    } finally {
      await app.close();
    }
  }, 60000);

  it("times out on missing element with short budget", async () => {
    const app = buildFixtureServer();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const addr = app.server.address();
    const port = typeof addr === "object" && addr ? addr.port : 4100;
    try {
      const waiting = JSON.parse(JSON.stringify(definition));
      waiting.steps = [{ waitFor: { locator: { role: "button", name: "NeverAppears" }, timeoutMs: 500 } }];
      const result = await runWorkflow({
        baseUrl: `http://127.0.0.1:${port}`,
        definition: waiting,
        inputs: { student_id: "STU-001" },
      });
      expect(result.status).toBe("timed_out");
    } finally {
      await app.close();
    }
  }, 60000);
});
