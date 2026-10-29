import { describe, expect, it } from "vitest";
import { percentile, countEvent, eventCount, resetMetrics } from "./index.js";

describe("observability", () => {
  it("computes percentiles", () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([10, 20, 30, 40], 95)).toBe(40);
  });

  it("counts events per key", () => {
    resetMetrics();
    countEvent("auth.failure", "t_a");
    countEvent("auth.failure", "t_a");
    countEvent("auth.failure", "t_b");
    expect(eventCount("auth.failure", "t_a")).toBe(2);
    expect(eventCount("auth.failure", "t_b")).toBe(1);
    resetMetrics();
  });
});
