import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openDatabase, runMigrations } from "@website-to-agent/database";
import {
  createMcpKey,
  revokeMcpKey,
  resolveAuth,
  resolveKey,
  canPerform,
  hashKey,
} from "./index.js";

let dir: string;
let db: DatabaseSync;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "w2a-auth-"));
  db = openDatabase(join(dir, "auth.db"));
  runMigrations(db);
});

afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("auth keys", () => {
  it("creates, resolves, and revokes", () => {
    const { plaintext } = createMcpKey(db, "t_a", "ci", "operator");
    expect(plaintext.startsWith("w2a_")).toBe(true);
    const stored = db
      .prepare("SELECT key_hash AS h FROM mcp_keys")
      .get() as { h: string };
    expect(stored.h).toBe(hashKey(plaintext));
    expect(stored.h).not.toContain(plaintext.slice(4, 10));

    expect(resolveKey(db, plaintext)?.tenantId).toBe("t_a");
    expect(resolveAuth(db, { "x-mcp-key": plaintext })?.role).toBe("operator");

    const id = (db.prepare("SELECT id FROM mcp_keys").get() as { id: string }).id;
    expect(revokeMcpKey(db, "t_a", id)).toBe(true);
    expect(resolveKey(db, plaintext)).toBeNull();
  });

  it("enforces role hierarchy", () => {
    expect(canPerform("viewer", "viewer")).toBe(true);
    expect(canPerform("viewer", "operator")).toBe(false);
    expect(canPerform("operator", "viewer")).toBe(true);
    expect(canPerform("owner", "operator")).toBe(true);
  });

  it("isolates keys by tenant on revoke", () => {
    const { id } = createMcpKey(db, "t_a", "k", "owner");
    expect(revokeMcpKey(db, "t_b", id)).toBe(false);
    expect(revokeMcpKey(db, "t_a", id)).toBe(true);
  });
});
