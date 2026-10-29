import { describe, expect, it } from "vitest";
import { workflowDefinitionSchema } from "./schema.js";

const valid = {
  name: "get_latest_test_results",
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

describe("workflow schema", () => {
  it("accepts a valid read-only workflow", () => {
    expect(workflowDefinitionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown step types", () => {
    const bad = { ...valid, steps: [{ evaluate: "alert(1)" }] };
    expect(workflowDefinitionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects empty locator names", () => {
    const bad = {
      ...valid,
      steps: [{ click: { locator: { role: "button", name: "" } } }],
    };
    expect(workflowDefinitionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects absolute URL navigation", () => {
    const bad = { ...valid, steps: [{ navigate: "https://evil.example/" }] };
    expect(workflowDefinitionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects valueFrom pointing at unknown input", () => {
    const bad = {
      ...valid,
      steps: [
        {
          fill: {
            locator: { role: "textbox", name: "Student ID" },
            valueFrom: "inputs.unknown_field",
          },
        },
      ],
    };
    expect(workflowDefinitionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects non-read-only risk in this phase", () => {
    const bad = { ...valid, risk: "high_impact" };
    expect(workflowDefinitionSchema.safeParse(bad).success).toBe(false);
  });
});
