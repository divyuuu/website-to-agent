import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

export interface ToolDef {
  name: string;
  description: string;
  version: number;
  risk: string;
  timeoutMs: number;
}

export interface ResolvedTool {
  workflowVersionId: string;
  version: number;
  definition: Record<string, unknown>;
  baseUrl: string;
  risk: string;
}

export function listApprovedTools(db: DatabaseSync, tenantId: string): ToolDef[] {
  const rows = db
    .prepare(
      `SELECT w.stable_name AS name, v.version AS version, v.definition AS definition
       FROM workflows w
       JOIN workflow_versions v ON v.workflow_id = w.id
       WHERE w.tenant_id = ? AND w.status = 'approved'
         AND v.version = (SELECT MAX(version) FROM workflow_versions WHERE workflow_id = w.id)
       ORDER BY w.stable_name`
    )
    .all(tenantId) as { name: string; version: number; definition: string }[];
  return rows.map((r) => {
    const def = JSON.parse(r.definition) as { risk?: string };
    return {
      name: r.name,
      description: `Run approved workflow ${r.name} (v${r.version}). Read-only website task.`,
      version: r.version,
      risk: def.risk ?? "read_only",
      timeoutMs: 30000,
    };
  });
}

export function resolveTool(
  db: DatabaseSync,
  tenantId: string,
  toolName: string
): ResolvedTool | null {
  const row = db
    .prepare(
      `SELECT v.id AS versionId, v.version AS version, v.definition AS definition, c.base_url AS baseUrl
       FROM workflows w
       JOIN workflow_versions v ON v.workflow_id = w.id
       JOIN website_connections c ON c.id = w.connection_id
       WHERE w.tenant_id = ? AND w.stable_name = ? AND w.status = 'approved'
         AND v.version = (SELECT MAX(version) FROM workflow_versions WHERE workflow_id = w.id)`
    )
    .get(tenantId, toolName) as
    | { versionId: string; version: number; definition: string; baseUrl: string }
    | undefined;
  if (!row) return null;
  const definition = JSON.parse(row.definition) as Record<string, unknown>;
  const risk = (definition.risk as string) ?? "read_only";
  return {
    workflowVersionId: row.versionId,
    version: row.version,
    definition,
    baseUrl: row.baseUrl,
    risk,
  };
}

export function buildInputShape(definition: {
  inputs?: Record<string, { maxLength?: number; required?: boolean }>;
}): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, def] of Object.entries(definition.inputs ?? {})) {
    const max = Math.min(Math.max(def.maxLength ?? 200, 1), 200);
    let field = z.string().max(max);
    if (!def.required) field = field.optional() as unknown as typeof field;
    shape[name] = field;
  }
  return shape;
}
