-- institutional_memory_audit_log.sql
CREATE TABLE IF NOT EXISTS institutional_memory_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ATTEMPT', 'SUCCESS', 'FAILURE')),
  error TEXT,
  written_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON institutional_memory_audit_log ((request->>'entityType'), (request->>'entityId'));
CREATE INDEX idx_audit_component ON institutional_memory_audit_log ((request->'source'->>'component'));
CREATE INDEX idx_audit_written_at ON institutional_memory_audit_log(written_at DESC);