import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildServer } from "./index.js";

describe("api health", () => {
  it("returns ok", async () => {
    const dir = mkdtempSync(join(tmpdir(), "w2a-api-"));
    const server = buildServer(join(dir, "health.db"));
    try {
      const res = await server.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ ok: true });
    } finally {
      await server.close();
    }
  });
});
