import 'server-only';

import type { User } from '@supabase/supabase-js';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { requireInstitutionalAccountAdmin } from './server';
import {
  assignableInstitutionalRoles,
  canAssignInstitutionalRole,
  institutionalModuleAccessForRole,
  institutionalTitle,
  isInstitutionalDomain,
  isInstitutionalRole,
  technicalRoleForInstitutionalRole,
  type SfiAccountAdminAuthority,
  type SfiInstitutionalDomain,
  type SfiInstitutionalRoleKey,
} from './institutionalRoles';

export type InstitutionalAccountAdminContext = Awaited<ReturnType<typeof requireInstitutionalAccountAdmin>>;

export type InstitutionalAccountView = {
  userId: string;
  email: string | null;
  alias: string;
  displayTitle: string;
  institutionalRole: SfiInstitutionalRoleKey;
  domain: SfiInstitutionalDomain;
  technicalRole: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  createdAt: string | null;
  lastSignInAt: string | null;
  editable: boolean;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function institutionalRoleFromProfile(profile: { role?: unknown; module_access?: unknown }): SfiInstitutionalRoleKey | null {
  const access = record(profile.module_access);
  const explicit = access.institutional_role;
  if (isInstitutionalRole(explicit)) return explicit;
  if (profile.role === 'root' || profile.role === 'system') return 'founder_root';
  return null;
}

function domainFromProfile(profile: { module_access?: unknown }): SfiInstitutionalDomain {
  const access = record(profile.module_access);
  return isInstitutionalDomain(access.institutional_domain) ? access.institutional_domain : 'institution';
}

function isFounderTarget(profile: { role?: unknown; module_access?: unknown }) {
  return institutionalRoleFromProfile(profile) === 'founder_root' || profile.role === 'root' || profile.role === 'system';
}

function statusForUser(user: User): InstitutionalAccountView['status'] {
  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) return 'SUSPENDED';
  if (!user.last_sign_in_at) return 'INVITED';
  return 'ACTIVE';
}

async function allAuthUsers() {
  const service = createServiceSupabaseClient();
  const users: User[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const result = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (result.error) throw result.error;
    users.push(...result.data.users);
    if (result.data.users.length < 200) break;
  }
  return users;
}

function canEditTarget(
  authority: SfiAccountAdminAuthority,
  actorId: string,
  target: { user_id: string; role: unknown; module_access: unknown },
) {
  if (isFounderTarget(target)) return false; // ROOT changes are constitutional, never generic account administration.
  if (authority === 'institutional_director' && target.user_id === actorId) return false; // No self-elevation/self-rewrite.
  const targetRole = institutionalRoleFromProfile(target);
  if (!targetRole) return false;
  if (authority === 'institutional_director' && targetRole === 'institutional_director') return false;
  return true;
}

export async function listInstitutionalAccounts(context: InstitutionalAccountAdminContext) {
  const service = createServiceSupabaseClient();
  const [users, profilesResult] = await Promise.all([
    allAuthUsers(),
    service
      .from('profiles')
      .select('user_id,alias,email,role,module_access,subscription_tier')
      .order('alias', { ascending: true }),
  ]);
  if (profilesResult.error) throw profilesResult.error;

  const userById = new Map(users.map((user) => [user.id, user]));
  const accounts: InstitutionalAccountView[] = [];

  for (const profile of profilesResult.data ?? []) {
    const institutionalRole = institutionalRoleFromProfile(profile);
    if (!institutionalRole) continue;
    if (context.accountAuthority === 'institutional_director' && institutionalRole === 'founder_root') continue;

    const user = userById.get(profile.user_id);
    const access = record(profile.module_access);
    const domain = domainFromProfile(profile);
    accounts.push({
      userId: profile.user_id,
      email: user?.email ?? profile.email ?? null,
      alias: String(profile.alias || user?.email?.split('@')[0] || 'member'),
      displayTitle: String(access.display_title || institutionalTitle(institutionalRole, domain)),
      institutionalRole,
      domain,
      technicalRole: String(profile.role || ''),
      status: user ? statusForUser(user) : 'INVITED',
      createdAt: user?.created_at ?? null,
      lastSignInAt: user?.last_sign_in_at ?? null,
      editable: canEditTarget(context.accountAuthority, context.user.id, profile),
    });
  }

  return {
    accounts,
    authority: context.accountAuthority,
    assignableRoles: assignableInstitutionalRoles(context.accountAuthority),
  };
}

function normalizeInvitationInput(input: {
  email?: unknown;
  alias?: unknown;
  institutionalRole?: unknown;
  domain?: unknown;
}) {
  const email = String(input.email || '').trim().toLowerCase();
  const alias = String(input.alias || '').trim();
  if (!email || !email.includes('@')) throw new Error('A valid email is required.');
  if (!alias) throw new Error('Display name is required.');
  if (!isInstitutionalRole(input.institutionalRole)) throw new Error('A valid institutional role is required.');
  if (!isInstitutionalDomain(input.domain)) throw new Error('A valid institutional domain is required.');
  const role = input.institutionalRole;
  const domain = role === 'institutional_director' ? 'institution' : input.domain;
  if (role === 'domain_director' && domain === 'institution') {
    throw new Error('A Domain Director requires a specific domain.');
  }
  return { email, alias, role, domain } as const;
}

export async function inviteInstitutionalAccount(
  context: InstitutionalAccountAdminContext,
  input: { email?: unknown; alias?: unknown; institutionalRole?: unknown; domain?: unknown },
) {
  const service = createServiceSupabaseClient();
  const normalized = normalizeInvitationInput(input);
  if (!canAssignInstitutionalRole(context.accountAuthority, normalized.role)) {
    throw new Error('This authority cannot assign the requested institutional role.');
  }

  const invited = await service.auth.admin.inviteUserByEmail(normalized.email, {
    data: {
      display_name: normalized.alias,
      sfi_institutional_role: normalized.role,
      sfi_institutional_domain: normalized.domain,
    },
  });
  if (invited.error || !invited.data.user) {
    throw invited.error ?? new Error('Supabase did not return an invited user.');
  }

  const user = invited.data.user;
  const moduleAccess = institutionalModuleAccessForRole(normalized.role, normalized.domain);
  const profileWrite = await service.from('profiles').upsert({
    user_id: user.id,
    alias: normalized.alias,
    email: normalized.email,
    role: technicalRoleForInstitutionalRole(normalized.role),
    subscription_tier: 'enterprise',
    module_access: moduleAccess,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (profileWrite.error) throw profileWrite.error;

  const audit = await service.from('sfi_audit_events').insert({
    actor_id: context.user.id,
    action: 'SFI_INSTITUTIONAL_ACCOUNT_INVITED',
    target_type: 'auth_user',
    target_id: user.id,
    before_state: null,
    after_state: {
      email: normalized.email,
      alias: normalized.alias,
      institutional_role: normalized.role,
      institutional_domain: normalized.domain,
    },
    context: { account_authority: context.accountAuthority, source: '/institution/access' },
  });
  if (audit.error) throw audit.error;

  return { userId: user.id };
}

export async function updateInstitutionalAccount(
  context: InstitutionalAccountAdminContext,
  input: { userId?: unknown; alias?: unknown; institutionalRole?: unknown; domain?: unknown },
) {
  const service = createServiceSupabaseClient();
  const userId = String(input.userId || '').trim();
  const alias = String(input.alias || '').trim();
  if (!userId || !alias) throw new Error('Account id and display name are required.');
  if (!isInstitutionalRole(input.institutionalRole)) throw new Error('A valid institutional role is required.');
  if (!isInstitutionalDomain(input.domain)) throw new Error('A valid institutional domain is required.');
  const role = input.institutionalRole;
  const domain = role === 'institutional_director' ? 'institution' : input.domain;
  if (role === 'domain_director' && domain === 'institution') throw new Error('A Domain Director requires a specific domain.');
  if (!canAssignInstitutionalRole(context.accountAuthority, role)) {
    throw new Error('This authority cannot assign the requested institutional role.');
  }

  const existing = await service
    .from('profiles')
    .select('user_id,alias,email,role,module_access,subscription_tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw new Error('Institutional account profile not found.');
  if (!canEditTarget(context.accountAuthority, context.user.id, existing.data)) {
    throw new Error('This account is outside the caller account-management ceiling.');
  }

  const beforeRole = institutionalRoleFromProfile(existing.data);
  const beforeDomain = domainFromProfile(existing.data);
  const nextAccess = institutionalModuleAccessForRole(role, domain, record(existing.data.module_access));
  const updated = await service.from('profiles').update({
    alias,
    role: technicalRoleForInstitutionalRole(role),
    subscription_tier: 'enterprise',
    module_access: nextAccess,
    last_seen_at: new Date().toISOString(),
  }).eq('user_id', userId);
  if (updated.error) throw updated.error;

  const audit = await service.from('sfi_audit_events').insert({
    actor_id: context.user.id,
    action: 'SFI_INSTITUTIONAL_ACCOUNT_UPDATED',
    target_type: 'profile',
    target_id: userId,
    before_state: {
      alias: existing.data.alias,
      institutional_role: beforeRole,
      institutional_domain: beforeDomain,
      technical_role: existing.data.role,
    },
    after_state: {
      alias,
      institutional_role: role,
      institutional_domain: domain,
      technical_role: technicalRoleForInstitutionalRole(role),
    },
    context: { account_authority: context.accountAuthority, source: '/institution/access' },
  });
  if (audit.error) throw audit.error;

  return { userId };
}
