ALTER TABLE execution_runs ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_idem
  ON execution_runs(tenant_id, workflow_version_id, idempotency_key);
