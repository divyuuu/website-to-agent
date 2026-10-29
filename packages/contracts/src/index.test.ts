import { describe, expect, it } from "vitest";
import { tenantSchema, websiteConnectionSchema } from "./index.js";

describe("contracts", () => {
  it("accepts a valid tenant", () => {
    const parsed = tenantSchema.safeParse({
      id: "t_1",
      name: "demo",
      status: "active",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects cross-tenant missing tenantId", () => {
    const parsed = websiteConnectionSchema.safeParse({
      id: "c_1",
      baseUrl: "http://localhost:4100",
      status: "active",
    });
    expect(parsed.success).toBe(false);
  });
});
