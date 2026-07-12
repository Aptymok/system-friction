import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type AuditInput = {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  context?: Record<string, unknown>;
};

function jsonValue(value: unknown) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

function sanitizeContext(context: Record<string, unknown> = {}) {
  const blocked = new Set(['authorization', 'cookie', 'token', 'access_token', 'refresh_token', 'signed_url', 'service_role']);
  return Object.fromEntries(
    Object.entries(context).filter(([key]) => !blocked.has(key.toLowerCase())),
  );
}

export async function recordAuditEvent(input: AuditInput) {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('sfi_audit_events')
    .insert({
      actor_id: input.actorId,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId,
      before_state: jsonValue(input.before),
      after_state: jsonValue(input.after),
      context: sanitizeContext(input.context),
    })
    .select('id, created_at')
    .single();

  if (error) throw new Error(`AUDIT_WRITE_FAILED:${error.message}`);
  return data;
}
