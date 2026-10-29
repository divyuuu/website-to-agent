import { describe, expect, it } from "vitest";
import { inspectPage, validateAllowedUrl } from "./inspect.js";
import { buildFixtureServer } from "@website-to-agent/fixture-site";

describe("inspection", () => {
  it("blocks non-localhost origins", () => {
    expect(() => validateAllowedUrl("https://example.com/")).toThrow(
      /Only http/
    );
    expect(() => validateAllowedUrl("http://example.com/")).toThrow(
      /Blocked origin/
    );
  });

  it("inspects the fixture login page repeatably", async () => {
    const app = buildFixtureServer();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const addr = app.server.address();
    const port =
      typeof addr === "object" && addr ? addr.port : 4100;
    try {
      const first = await inspectPage(`http://127.0.0.1:${port}/`);
      const second = await inspectPage(`http://127.0.0.1:${port}/`);
      expect(first.title).toContain("Login");
      expect(first.elements.some((e) => e.role === "button")).toBe(true);
      const shape = (r: typeof first) =>
        r.elements.map((e) => `${e.tag}:${e.role}:${e.name}`).join("|");
      expect(shape(first)).toBe(shape(second));
      const names = first.elements.map((e) => e.name).join(" ");
      expect(names).not.toContain("demo123");
    } finally {
      await app.close();
    }
  }, 60000);
});
