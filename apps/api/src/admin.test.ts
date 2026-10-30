import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildServer } from "./index.js";

describe("admin ui", () => {
  it("serves html at /admin and redirects /", async () => {
    const dir = mkdtempSync(join(tmpdir(), "w2a-admin-"));
    const server = buildServer(join(dir, "admin.db"));
    try {
      const res = await server.inject({ method: "GET", url: "/admin" });
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toMatch(/html/);
      expect(res.body).toContain("website-to-agent");
      expect(res.body).toContain("/workflows");
      expect(res.body).toContain("/executions");
      expect(res.body).toContain("Propose");
      expect(res.body).toContain("Run it");
    } finally {
      await server.close();
    }
  });
});
