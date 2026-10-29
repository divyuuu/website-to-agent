import { describe, expect, it } from "vitest";
import { buildServer } from "./index.js";

describe("api health", () => {
  it("returns ok", async () => {
    const server = buildServer();
    const res = await server.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
  });
});
