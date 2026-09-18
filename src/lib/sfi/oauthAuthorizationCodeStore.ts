import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  consumeContinuityAuthorizationCode,
  findContinuityAuthorizationCode,
  insertContinuityAuthorizationCode,
  isSfiContinuityConfigured,
  recordContinuityEvent,
  type ContinuityAuthorizationCodeInput,
} from '@/lib/sfi/continuityPostgres';

type Row = Record<string, unknown>;

export type SfiOAuthAuthorizationCodeRecord = {
  id: string;
  subject_id: string;
  actor_id: string;
  label: string | null;
  role: string;
  tenant_id: string;
  scopes: string[];
  code_challenge: string | null;
  code_challenge_method: string | null;
};

export type SfiOAuthAuthorizationCodeStore = 'supabase' | 'continuity';

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalize(row: Row): SfiOAuthAuthorizationCodeRecord {
  return {
    id: text(row.id),
    subject_id: text(row.subject_id),
    actor_id: text(row.actor_id),
    label: row.label == null ? null : text(row.label),
    role: text(row.role) || 'agent',
    tenant_id: text(row.tenant_id) || 'sfi',
    scopes: stringArray(row.scopes),
    code_challenge: row.code_challenge == null ? null : text(row.code_challenge),
    code_challenge_method: row.code_challenge_method == null ? null : text(row.code_challenge_method),
  };
}

export async function issueSfiOAuthAuthorizationCode(input: ContinuityAuthorizationCodeInput) {
  const db = createServiceSupabaseClient();
  const stored = await db.from('sfi_oauth_authorization_codes').insert(input);
  if (!stored.error) return { store: 'supabase' as const };

  if (!isSfiContinuityConfigured()) {
    throw new Error(`SFI_OAUTH_CODE_PRIMARY_STORE_FAILED:${stored.error.message}`);
  }

  try {
    await insertContinuityAuthorizationCode(input);
    await recordContinuityEvent({
      eventType: 'OAUTH_CONTINUITY_CODE_ISSUED',
      entityType: 'OAUTH_AUTHORIZATION_CODE',
      entityId: input.client_id,
      operation: 'INSERT',
      status: 'COMPLETED',
      details: { primaryFailure: stored.error.message },
    }).catch(() => undefined);
    return { store: 'continuity' as const };
  } catch (error) {
    throw new Error(
      `SFI_OAUTH_CODE_ALL_STORES_FAILED:primary=${stored.error.message};continuity=${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function findSfiOAuthAuthorizationCode(input: {
  codeHash: string;
  clientId: string;
  redirectUri: string;
  now: string;
}): Promise<{ record: SfiOAuthAuthorizationCodeRecord; store: SfiOAuthAuthorizationCodeStore } | null> {
  const db = createServiceSupabaseClient();
  const primary = await db
    .from('sfi_oauth_authorization_codes')
    .select('id,subject_id,actor_id,label,role,tenant_id,scopes,code_challenge,code_challenge_method')
    .eq('code_hash', input.codeHash)
    .eq('client_id', input.clientId)
    .eq('redirect_uri', input.redirectUri)
    .is('consumed_at', null)
    .gt('expires_at', input.now)
    .maybeSingle();

  if (!primary.error && primary.data) {
    return { record: normalize(primary.data as Row), store: 'supabase' };
  }

  if (!isSfiContinuityConfigured()) {
    if (primary.error) throw new Error(`SFI_OAUTH_CODE_PRIMARY_READ_FAILED:${primary.error.message}`);
    return null;
  }

  try {
    const continuity = await findContinuityAuthorizationCode(input);
    if (continuity) {
      return { record: normalize(continuity), store: 'continuity' };
    }
  } catch (error) {
    if (primary.error) {
      throw new Error(
        `SFI_OAUTH_CODE_ALL_STORES_READ_FAILED:primary=${primary.error.message};continuity=${error instanceof Error ? error.message : String(error)}`,
      );
    }
    throw error;
  }

  if (primary.error) {
    throw new Error(`SFI_OAUTH_CODE_PRIMARY_READ_FAILED:${primary.error.message}`);
  }
  return null;
}

export async function consumeSfiOAuthAuthorizationCode(
  store: SfiOAuthAuthorizationCodeStore,
  id: string,
  consumedAt: string,
) {
  if (store === 'continuity') {
    const consumed = await consumeContinuityAuthorizationCode(id, consumedAt);
    if (consumed) {
      await recordContinuityEvent({
        eventType: 'OAUTH_CONTINUITY_CODE_CONSUMED',
        entityType: 'OAUTH_AUTHORIZATION_CODE',
        entityId: id,
        operation: 'CONSUME',
        status: 'COMPLETED',
      }).catch(() => undefined);
    }
    return consumed;
  }

  const db = createServiceSupabaseClient();
  const consumed = await db
    .from('sfi_oauth_authorization_codes')
    .update({ consumed_at: consumedAt })
    .eq('id', id)
    .is('consumed_at', null)
    .select('id')
    .maybeSingle();

  if (consumed.error) throw new Error(`SFI_OAUTH_CODE_CONSUME_FAILED:${consumed.error.message}`);
  return Boolean(consumed.data);
}
