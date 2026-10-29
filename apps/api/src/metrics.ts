import type { FastifyInstance, FastifyRequest } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import type { AuthContext } from "@website-to-agent/auth";
import { percentile, eventCount } from "@website-to-agent/observability";

function authOf(req: FastifyRequest): AuthContext {
  return (req as unknown as { auth: AuthContext }).auth;
}

function quantiles(values: number[]): { p50: number | null; p95: number | null } {
  const sorted = [...values].sort((a, b) => a - b);
  return { p50: percentile(sorted, 50), p95: percentile(sorted, 95) };
}

export function registerMetricsRoutes(app: FastifyInstance, db: DatabaseSync): void {
  app.get("/metrics", async (req) => {
    const tenantId = authOf(req).tenantId;
    const byStatus = db
      .prepare(
        "SELECT status, COUNT(*) AS n FROM execution_runs WHERE tenant_id = ? GROUP BY status"
      )
      .all(tenantId) as { status: string; n: number }[];
    const durations = (
      db
        .prepare("SELECT duration_ms AS d FROM execution_runs WHERE tenant_id = ? AND duration_ms IS NOT NULL")
        .all(tenantId) as { d: number }[]
    ).map((r) => r.d);
    const perVersion = db
      .prepare(
        `SELECT workflow_version_id AS versionId, status, COUNT(*) AS n,
                AVG(duration_ms) AS avgMs
         FROM execution_runs WHERE tenant_id = ? GROUP BY workflow_version_id, status`
      )
      .all(tenantId);
    return {
      ok: true,
      executions: {
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])),
        durationMs: quantiles(durations),
        perVersion,
      },
      authFailures: eventCount("auth.failure"),
      rateLimited: eventCount("rate_limited", tenantId),
    };
  });
}
