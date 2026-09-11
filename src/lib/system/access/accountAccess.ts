import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SfiExternalScope, SfiInstitutionalMember } from './institutionalMembers';

export type SfiAccountAccessClass = 'INSTITUTIONAL_OBSERVER' | 'INSTITUTIONAL_OPERATOR';
export type SfiAccountAccessStatus = 'PENDING' | 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'INVITE_FAILED';

export type SfiAccountAccessGrant = {
  id: string;
  email: string;
  userId: string | null;
  displayName: string;
  title: string;
  accessClass: SfiAccountAccessClass;
  status: SfiAccountAccessStatus;
};

const OBSERVER_SCOPES: readonly SfiExternalScope[] = ['observe', 'cases:read', 'lab:read', 'studio:read'];
const OPERATOR_SCOPES: readonly SfiExternalScope[] = [
  'observe','propose','cases:read','cases:write','lab:read','lab:write','lab:run','studio:read','studio:content','studio:run',
];

export function normalizeAccountAccessEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function rowToGrant(row: Record<string, unknown>): SfiAccountAccessGrant | null {
  const accessClass = String(row.access_class || '') as SfiAccountAccessClass;
  const status = String(row.status || '') as SfiAccountAccessStatus;
  if (!['INSTITUTIONAL_OBSERVER','INSTITUTIONAL_OPERATOR'].includes(accessClass)) return null;
  if (!['PENDING','INVITED','ACTIVE','SUSPENDED','INVITE_FAILED'].includes(status)) return null;
  const id = String(row.id || '');
  const email = normalizeAccountAccessEmail(String(row.email || ''));
  const displayName = String(row.display_name || '').trim();
  const title = String(row.title || '').trim();
  if (!id || !email || !displayName || !title) return null;
  return {
    id,
    email,
    userId: row.user_id ? String(row.user_id) : null,
    displayName,
    title,
    accessClass,
    status,
  };
}

export async function resolveAccountAccessGrant(
  service: SupabaseClient,
  email: string | null | undefined,
): Promise<SfiAccountAccessGrant | null> {
  const normalized = normalizeAccountAccessEmail(email);
  if (!normalized) return null;
  const result = await service
    .from('sfi_account_access_grants')
    .select('id,email,user_id,display_name,title,access_class,status')
    .eq('email', normalized)
    .in('status', ['INVITED','ACTIVE'])
    .maybeSingle();
  if (result.error) {
    // Keep pre-migration deployments compatible while the new account lifecycle is staged.
    if (/does not exist|schema cache/i.test(result.error.message)) return null;
    throw result.error;
  }
  return result.data ? rowToGrant(result.data as Record<string, unknown>) : null;
}

export async function bindActivatedAccountAccess(
  service: SupabaseClient,
  grant: SfiAccountAccessGrant,
  userId: string,
) {
  if (grant.userId && grant.userId !== userId) throw new Error('SFI_ACCOUNT_ACCESS_BOUND_TO_DIFFERENT_USER');
  if (grant.status === 'ACTIVE' && grant.userId === userId) return grant;
  const updated = await service
    .from('sfi_account_access_grants')
    .update({
      user_id: userId,
      status: 'ACTIVE',
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_invite_error: null,
    })
    .eq('id', grant.id)
    .in('status', ['INVITED','ACTIVE'])
    .select('id,email,user_id,display_name,title,access_class,status')
    .single();
  if (updated.error || !updated.data) throw updated.error ?? new Error('SFI_ACCOUNT_ACCESS_ACTIVATION_FAILED');
  const resolved = rowToGrant(updated.data as Record<string, unknown>);
  if (!resolved) throw new Error('SFI_ACCOUNT_ACCESS_ACTIVATION_INVALID');
  return resolved;
}

export function accountAccessAsInstitutionalMember(grant: SfiAccountAccessGrant): SfiInstitutionalMember {
  const observer = grant.accessClass === 'INSTITUTIONAL_OBSERVER';
  return {
    email: grant.email,
    displayName: grant.displayName,
    title: grant.title,
    role: observer ? 'observer' : 'operator',
    workspace: observer ? '/root' : '/member',
    modules: {
      field: true,
      studio: !observer,
      observatory: true,
      worldField: true,
      root: observer,
    },
    external: {
      role: 'institutional_operator',
      scopes: observer ? OBSERVER_SCOPES : OPERATOR_SCOPES,
    },
  };
}
