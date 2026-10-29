import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "./approval.js";

describe("approval state machine", () => {
  it("allows draft -> proposed -> approved", () => {
    expect(canTransition("draft", "proposed")).toBe(true);
    expect(canTransition("proposed", "approved")).toBe(true);
    expect(canTransition("proposed", "rejected")).toBe(true);
    expect(canTransition("rejected", "proposed")).toBe(true);
  });

  it("rejects approving a draft directly", () => {
    expect(canTransition("draft", "approved")).toBe(false);
    expect(() => assertTransition("draft", "approved")).toThrow();
  });

  it("locks approved versions", () => {
    expect(canTransition("approved", "proposed")).toBe(false);
  });
});
