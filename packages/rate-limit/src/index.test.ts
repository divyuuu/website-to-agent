import { describe, expect, it } from "vitest";
import { TenantLimiter } from "./index.js";

describe("tenant limiter", () => {
  it("caps rate per minute", () => {
    const limiter = new TenantLimiter({ maxPerMin: 2, maxConcurrent: 10 });
    expect(limiter.begin("t", 1000).allowed).toBe(true);
    limiter.end("t");
    expect(limiter.begin("t", 2000).allowed).toBe(true);
    limiter.end("t");
    expect(limiter.begin("t", 3000).allowed).toBe(false);
  });

  it("caps concurrency", () => {
    const limiter = new TenantLimiter({ maxPerMin: 100, maxConcurrent: 1 });
    expect(limiter.begin("t").allowed).toBe(true);
    expect(limiter.begin("t").allowed).toBe(false);
    limiter.end("t");
    expect(limiter.begin("t").allowed).toBe(true);
    limiter.end("t");
  });

  it("isolates tenants", () => {
    const limiter = new TenantLimiter({ maxPerMin: 1, maxConcurrent: 1 });
    expect(limiter.begin("a", 1000).allowed).toBe(true);
    expect(limiter.begin("b", 1000).allowed).toBe(true);
    limiter.end("a");
    limiter.end("b");
  });
});
