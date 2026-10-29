import { randomBytes, randomUUID, createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export type KeyRole = "owner" | "operator" | "viewer";

export interface AuthContext {
  tenantId: string;
  role: KeyRole;
  keyId: string | null;
  viaHeader: boolean;
}

const RANK: Record<KeyRole, number> = { viewer: 1, operator: 2, owner: 3 };
const ROLES: KeyRole[] = ["owner", "operator", "viewer"];

export function isKeyRole(raw: unknown): raw is KeyRole {
  return typeof raw === "string" && (ROLES as string[]).includes(raw);
}

export function canPerform(role: KeyRole, required: KeyRole): boolean {
  return (RANK[role] ?? 0) >= (RANK[required] ?? 0);
}

export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function newKeyPlaintext(): string {
  return `w2a_${randomBytes(16).toString("hex")}`;
}

export function headerAuthAllowed(): boolean {
  return process.env.ALLOW_HEADER_AUTH !== "false";
}

function ensureTenant(db: DatabaseSync, tenantId: string): void {
  db.prepare("INSERT OR IGNORE INTO tenants (id, name) VALUES (?, ?)").run(tenantId, tenantId);
}

export function createMcpKey(
  db: DatabaseSync,
  tenantId: string,
  name: string,
  role: KeyRole
): { id: string; plaintext: string } {
  ensureTenant(db, tenantId);
  const id = randomUUID();
  const plaintext = newKeyPlaintext();
  db.prepare(
    "INSERT INTO mcp_keys (id, tenant_id, key_hash, name, role, revoked) VALUES (?, ?, ?, ?, ?, 0)"
  ).run(id, tenantId, hashKey(plaintext), name, role);
  db.prepare(
    "INSERT INTO audit_events (id, tenant_id, actor, action, target) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), tenantId, tenantId, "key.create", id);
  return { id, plaintext };
}

export function revokeMcpKey(db: DatabaseSync, tenantId: string, keyId: string): boolean {
  const row = db
    .prepare("SELECT id FROM mcp_keys WHERE id = ? AND tenant_id = ? AND revoked = 0")
    .get(keyId, tenantId) as { id: string } | undefined;
  if (!row) return false;
  db.prepare("UPDATE mcp_keys SET revoked = 1 WHERE id = ?").run(keyId);
  db.prepare(
    "INSERT INTO audit_events (id, tenant_id, actor, action, target) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), tenantId, tenantId, "key.revoke", keyId);
  return true;
}

export function resolveKey(
  db: DatabaseSync,
  plaintext: string
): { tenantId: string; role: KeyRole; keyId: string } | null {
  if (!plaintext.startsWith("w2a_")) return null;
  const row = db
    .prepare("SELECT id, tenant_id AS tenantId, role, revoked FROM mcp_keys WHERE key_hash = ?")
    .get(hashKey(plaintext)) as
    | { id: string; tenantId: string; role: string; revoked: number }
    | undefined;
  if (!row || row.revoked) return null;
  if (!isKeyRole(row.role)) return null;
  return { tenantId: row.tenantId, role: row.role, keyId: row.id };
}

export function resolveAuth(
  db: DatabaseSync,
  headers: Record<string, unknown>
): AuthContext | null {
  const rawKey = headers["x-mcp-key"];
  if (typeof rawKey === "string" && rawKey) {
    const hit = resolveKey(db, rawKey.trim());
    if (!hit) return null;
    return { tenantId: hit.tenantId, role: hit.role, keyId: hit.keyId, viaHeader: false };
  }
  const rawTenant = headers["x-tenant-id"];
  if (typeof rawTenant === "string" && rawTenant.trim() && headerAuthAllowed()) {
    const tenantId = rawTenant.trim().slice(0, 64);
    ensureTenant(db, tenantId);
    return { tenantId, role: "owner", keyId: null, viaHeader: true };
  }
  return null;
}
