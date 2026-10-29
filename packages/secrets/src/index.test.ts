import { describe, expect, it } from "vitest";
import { redactText } from "./index.js";

describe("secrets redaction", () => {
  it("redacts keys, sessions, and passwords", () => {
    const raw = 'key w2a_abc123 session w2a_session=demo {"password": "hunter2"} Authorization: Bearer xyz';
    const out = redactText(raw);
    expect(out).not.toContain("w2a_abc123");
    expect(out).not.toContain("hunter2");
    expect(out).toContain("[redacted]");
  });

  it("leaves normal text alone", () => {
    expect(redactText("hello STU-001")).toBe("hello STU-001");
  });
});
