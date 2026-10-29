import Fastify, { type FastifyInstance } from "fastify";
import { STUDENTS, searchStudents } from "./data.js";

const DEMO_USER = "demo";
const DEMO_PASS = "demo123";
const SESSION_COOKIE = "w2a_session=demo; Path=/; HttpOnly; SameSite=Lax";

function loginPage(error?: string): string {
  return `<!doctype html><html><head><title>Login - Demo School</title></head><body>
<main><h1>Demo School Login</h1>
${error ? `<p role="alert">${error}</p>` : ""}
<form method="post" action="/login">
<label for="username">Username</label>
<input id="username" name="username" type="text" autocomplete="username" />
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" />
<button type="submit">Sign in</button>
</form></main></body></html>`;
}

function studentsPage(query: string): string {
  const results = searchStudents(query);
  const rows = results
    .map(
      (s) => `<tr><td>${s.id}</td><td>${s.name}</td><td>${
        s.results.map((r) => `${r.subject}:${r.score}`).join(", ")
      }</td></tr>`
    )
    .join("");
  return `<!doctype html><html><head><title>Students - Demo School</title></head><body>
<main><h1>Student Results</h1>
<form method="get" action="/students">
<label for="q">Student ID</label>
<input id="q" name="q" type="text" value="${query.replace(/"/g, "&quot;")}" />
<button type="submit">Search</button>
</form>
<table><thead><tr><th>ID</th><th>Name</th><th>Results</th></tr></thead><tbody>${rows}</tbody></table>
<form method="post" action="/students/view"><button type="submit">Mark viewed</button></form>
</main></body></html>`;
}

function isAuthed(cookieHeader: string | undefined): boolean {
  return !!cookieHeader && cookieHeader.includes("w2a_session=demo");
}

export function buildFixtureServer(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (req, body, done) => {
      const params = new URLSearchParams(body as string);
      done(null, Object.fromEntries(params.entries()));
    }
  );

  app.get("/", async (_req, reply) => {
    return reply.type("text/html").send(loginPage());
  });

  app.post("/login", async (req, reply) => {
    const body = req.body as Record<string, string>;
    if (body.username === DEMO_USER && body.password === DEMO_PASS) {
      return reply
        .header("set-cookie", SESSION_COOKIE)
        .redirect("/students");
    }
    return reply.type("text/html").send(loginPage("Invalid credentials."));
  });

  app.get("/students", async (req, reply) => {
    if (!isAuthed(req.headers.cookie)) return reply.redirect("/");
    const q = ((req.query as Record<string, string>).q ?? "").slice(0, 40);
    return reply.type("text/html").send(studentsPage(q));
  });

  app.get("/api/students", async (req, reply) => {
    if (!isAuthed(req.headers.cookie))
      return reply.code(401).send({ ok: false, error: "unauthorized" });
    const q = ((req.query as Record<string, string>).q ?? "").slice(0, 40);
    return { ok: true, students: searchStudents(q) };
  });

  app.post("/students/view", async (req, reply) => {
    if (!isAuthed(req.headers.cookie))
      return reply.code(401).send({ ok: false, error: "unauthorized" });
    return { ok: true, viewed: true };
  });

  return app;
}

const isMain =
  !!process.argv[1] &&
  (process.argv[1].endsWith("site/src/server.ts") ||
    process.argv[1].endsWith("server.ts"));

if (isMain) {
  const port = Number(process.env.FIXTURE_PORT ?? "4100");
  const app = buildFixtureServer();
  app.listen({ port, host: "127.0.0.1" }).then(() => {
    console.log(`Fixture site listening on ${port}`);
  });
}

export { STUDENTS };
