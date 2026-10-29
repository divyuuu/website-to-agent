import { describe, expect, it } from "vitest";
import { buildFixtureServer } from "./server.js";

describe("fixture site", () => {
  it("serves login and guards students", async () => {
    const app = buildFixtureServer();
    const login = await app.inject({ method: "GET", url: "/" });
    expect(login.statusCode).toBe(200);
    expect(login.body).toContain("Demo School Login");

    const blocked = await app.inject({ method: "GET", url: "/students" });
    expect(blocked.statusCode).toBe(302);

    const ok = await app.inject({
      method: "POST",
      url: "/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "username=demo&password=demo123",
    });
    expect(ok.statusCode).toBe(302);
    const cookie = String(ok.headers["set-cookie"] ?? "");
    expect(cookie).toContain("w2a_session=demo");

    const students = await app.inject({
      method: "GET",
      url: "/students?q=STU-001",
      headers: { cookie: "w2a_session=demo" },
    });
    expect(students.statusCode).toBe(200);
    expect(students.body).toContain("STU-001");
  });
});
