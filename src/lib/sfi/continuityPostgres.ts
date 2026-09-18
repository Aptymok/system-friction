import 'server-only';

import postgres from 'postgres';

type JsonRecord = Record<string, unknown>;

let continuitySql: ReturnType<typeof postgres> | null = null;

function connectionString() {
  return (process.env.SFI_CONTINUITY_DATABASE_URL || '').trim();
}

export function isSfiContinuityConfigured() {
  return Boolean(connectionString());
}

function db() {
  const url = connectionString();
  if (!url) throw new Error('SFI_CONTINUITY_DATABASE_URL_NOT_CONFIGURED');
  if (!continuitySql) {
    continuitySql = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 5,
      prepare: false,
    });
  }
  return continuitySql;
}

export async function readContinuityOAuthClient(clientId: string) {
  const sql = db();
  const rows = await sql`
    select client_id, client_secret_hash, name, created_by, redirect_uris,
           allowed_scopes, audience, status
      from sfi_oauth_clients
     where client_id = ${clientId}
       and status = 'ACTIVE'
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function touchContinuityOAuthClient(clientId: string) {
  const sql = db();
  await sql`
    update sfi_oauth_clients
       set last_used_at = now(),
           updated_at = now()
     where client_id = ${clientId}
       and status = 'ACTIVE'
  `;
}

export type ContinuityAuthorizationCodeInput = {
  code_hash: string;
  client_id: string;
  redirect_uri: string;
  subject_id: string;
  actor_id: string;
  label: string | null;
  role: string;
  tenant_id: string;
  scopes: string[];
  code_challenge: string | null;
  code_challenge_method: string | null;
  expires_at: string;
};

export async function insertContinuityAuthorizationCode(input: ContinuityAuthorizationCodeInput) {
  const sql = db();
  const scopesJson = JSON.stringify(input.scopes);
  await sql`
    insert into sfi_oauth_authorization_codes (
      code_hash, client_id, redirect_uri, subject_id, actor_id, label, role,
      tenant_id, scopes, code_challenge, code_challenge_method, expires_at
    ) values (
      ${input.code_hash},
      ${input.client_id},
      ${input.redirect_uri},
      ${input.subject_id}::uuid,
      ${input.actor_id},
      ${input.label},
      ${input.role},
      ${input.tenant_id},
      array(select jsonb_array_elements_text(${scopesJson}::jsonb)),
      ${input.code_challenge},
      ${input.code_challenge_method},
      ${input.expires_at}::timestamptz
    )
  `;
}

export async function findContinuityAuthorizationCode(input: {
  codeHash: string;
  clientId: string;
  redirectUri: string;
  now: string;
}) {
  const sql = db();
  const rows = await sql`
    select id, subject_id, actor_id, label, role, tenant_id, scopes,
           code_challenge, code_challenge_method
      from sfi_oauth_authorization_codes
     where code_hash = ${input.codeHash}
       and client_id = ${input.clientId}
       and redirect_uri = ${input.redirectUri}
       and consumed_at is null
       and expires_at > ${input.now}::timestamptz
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function consumeContinuityAuthorizationCode(id: string, consumedAt: string) {
  const sql = db();
  const rows = await sql`
    update sfi_oauth_authorization_codes
       set consumed_at = ${consumedAt}::timestamptz
     where id = ${id}::uuid
       and consumed_at is null
    returning id
  `;
  return Boolean(rows[0]);
}

export async function readContinuityProfile(userId: string) {
  const sql = db();
  const rows = await sql`
    select user_id, alias, email, role, module_access, subscription_tier
      from profiles
     where user_id = ${userId}::uuid
     limit 1
  `;
  return (rows[0] as JsonRecord | undefined) ?? null;
}

export async function recordContinuityEvent(input: {
  eventType: string;
  entityType?: string;
  entityId?: string;
  operation: string;
  status: string;
  details?: Record<string, unknown>;
}) {
  const sql = db();
  const detailsJson = JSON.stringify(input.details ?? {});
  await sql`
    insert into sfi_continuity_ledger (
      event_type, source_store, target_store, entity_type, entity_id,
      operation, status, details
    ) values (
      ${input.eventType},
      'SUPABASE',
      'NEON',
      ${input.entityType ?? null},
      ${input.entityId ?? null},
      ${input.operation},
      ${input.status},
      ${detailsJson}::jsonb
    )
  `;
}
