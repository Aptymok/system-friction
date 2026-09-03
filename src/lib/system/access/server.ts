import 'server-only';

import { redirect } from 'next/navigation';
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
  getVerifiedServerUser,
  SfiAuthUnavailableError,
} from '@/runtime/supabase/server';
import { findInstitutionalMember } from './institutionalMembers';

export class AccessDeniedError extends Error {
  constructor(
    public readonly status: 401 | 403 | 404 | 503,
    public readonly code: 'AUTH_REQUIRED' | 'AUTH_UNAVAILABLE' | 'FOUNDER_REQUIRED' | 'FIELD_USER_REQUIRED' | 'SFI_MEMBER_REQUIRED' | 'OWNER_REQUIRED' | 'NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function founderIds() {
  return new Set(
    (process.env.SFI_FOUNDER_USER_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function founderEmails() {
  return new Set(
    [process.env.SYSTEM_ROOT_EMAIL, ...(process.env.SFI_FOUNDER_EMAILS || '').split(',')]
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );
}

function institutionalModuleAccess(
  member: NonNullable<ReturnType<typeof findInstitutionalMember>>,
  current?: unknown,
) {
  return {
    ...record(current),
    display_title: member.title,
    observatory: member.modules.observatory,
    planner: member.modules.field,
    simulator: member.modules.studio,
    social: member.modules.worldField,
    field: member.modules.field,
    studio: member.modules.studio,
    world_field: member.modules.worldField,
    root: member.modules.root,
    root_observe: member.modules.root,
    full_access: false,
    executor: false,
    root_execution: false,
    governance_write: false,
    sovereign_actions: false,
    canonical_promotion: false,
  };
}

function personalModuleAccess(current?: unknown) {
  return {
    ...record(current),
    field: true,
    studio: true,
    personal_lab: true,
    personal_cognitive: true,
    external_agent: true,
    root: false,
    root_observe: false,
    full_access: false,
    executor: false,
    root_execution: false,
    governance_write: false,
    sovereign_actions: false,
    canonical_promotion: false,
  };
}

function defaultAlias(user: { email?: string | null }) {
  const local = user.email?.split('@')[0]?.trim();
  return local || 'member';
}

export async function requireAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  try {
    const user = await getVerifiedServerUser(supabase);
    if (!user) {
      throw new AccessDeniedError(401, 'AUTH_REQUIRED', 'Authentication is required.');
    }
    return { supabase, user };
  } catch (error) {
    if (error instanceof AccessDeniedError) throw error;
    if (error instanceof SfiAuthUnavailableError) {
      throw new AccessDeniedError(
        503,
        'AUTH_UNAVAILABLE',
        'Authentication is temporarily unavailable. The session was not reclassified as anonymous.',
      );
    }
    throw error;
  }
}

async function ensureFieldProfile(user: { id: string; email?: string | null }, displayName: string) {
  const service = createServiceSupabaseClient();
  const existing = await service
    .from('field_profiles')
    .select('user_id,display_name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    if (existing.data.display_name !== displayName) {
      const updated = await service.from('field_profiles')
        .update({ display_name: displayName })
        .eq('user_id', user.id);
      if (updated.error) throw updated.error;
    }
    return;
  }
  const inserted = await service.from('field_profiles').insert({
    user_id: user.id,
    display_name: displayName,
  });
  if (inserted.error) throw inserted.error;
}

async function readOrProvisionUserProfile(user: { id: string; email?: string | null }) {
  const member = findInstitutionalMember(user.email);
  const service = createServiceSupabaseClient();
  const existing = await service
    .from('profiles')
    .select('user_id,alias,email,role,module_access,subscription_tier')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data && member) {
    const desiredAccess = institutionalModuleAccess(member, existing.data.module_access);
    const currentAccess = record(existing.data.module_access);
    const accessKeys = [
      'display_title','observatory','planner','simulator','social','field','studio','world_field','root','root_observe',
      'full_access','executor','root_execution','governance_write','sovereign_actions','canonical_promotion',
    ] as const;
    const requiresReconcile =
      existing.data.alias !== member.displayName ||
      existing.data.email !== member.email ||
      existing.data.role !== member.role ||
      existing.data.subscription_tier !== 'enterprise' ||
      accessKeys.some((key) => currentAccess[key] !== desiredAccess[key]);

    let profile = existing.data;
    if (requiresReconcile) {
      const reconciled = await service
        .from('profiles')
        .update({
          alias: member.displayName,
          email: member.email,
          role: member.role,
          subscription_tier: 'enterprise',
          module_access: desiredAccess,
          last_seen_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select('user_id,alias,email,role,module_access,subscription_tier')
        .single();

      if (reconciled.error || !reconciled.data) {
        throw reconciled.error ?? new Error('SFI member profile could not be reconciled.');
      }
      profile = reconciled.data;
    }

    await ensureFieldProfile(user, member.displayName);
    return { profile, member };
  }

  if (existing.data) {
    await ensureFieldProfile(user, String(existing.data.alias || defaultAlias(user)));
    return { profile: existing.data, member };
  }

  if (member) {
    const inserted = await service
      .from('profiles')
      .insert({
        user_id: user.id,
        alias: member.displayName,
        email: member.email,
        role: member.role,
        subscription_tier: 'enterprise',
        module_access: institutionalModuleAccess(member),
        last_seen_at: new Date().toISOString(),
      })
      .select('user_id,alias,email,role,module_access,subscription_tier')
      .single();

    if (inserted.error || !inserted.data) throw inserted.error ?? new Error('SFI member profile could not be created.');
    await ensureFieldProfile(user, member.displayName);
    return { profile: inserted.data, member };
  }

  // A normal account receives a private, owner-scoped workspace. This does not
  // make the user an institutional SFI member and cannot grant ROOT/canonical
  // authority. Institutional membership remains an independent registry fact.
  const alias = defaultAlias(user);
  const inserted = await service
    .from('profiles')
    .insert({
      user_id: user.id,
      alias,
      email: user.email ?? null,
      role: 'operator',
      subscription_tier: 'solo',
      module_access: personalModuleAccess(),
      last_seen_at: new Date().toISOString(),
    })
    .select('user_id,alias,email,role,module_access,subscription_tier')
    .single();
  if (inserted.error || !inserted.data) throw inserted.error ?? new Error('Personal SFI profile could not be created.');
  await ensureFieldProfile(user, alias);
  return { profile: inserted.data, member: null };
}

export async function requireUserProfile() {
  const context = await requireAuthenticatedUser();
  const resolved = await readOrProvisionUserProfile(context.user);
  return { ...context, profile: resolved.profile, member: resolved.member };
}

export async function requireSfiMember() {
  const context = await requireUserProfile();
  const role = String(context.profile.role || '').toLowerCase();
  const institutional = Boolean(context.member) || role === 'root' || role === 'system';
  if (!institutional) {
    throw new AccessDeniedError(403, 'SFI_MEMBER_REQUIRED', 'An active SFI institutional membership is required.');
  }
  return context;
}

async function readMemberWorkspaceCounts(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const [cases, objects, returns] = await Promise.all([
    supabase.from('field_cases').select('id', { count: 'exact', head: true }).eq('owner_id', userId).is('deleted_at', null),
    supabase.from('studio_objects').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('field_returns').select('id', { count: 'exact', head: true }).eq('owner_id', userId).is('returned_at', null),
  ]);
  return { caseCount: cases.count ?? 0, objectCount: objects.count ?? 0, pendingReturnCount: returns.count ?? 0, warnings: [cases.error?.message, objects.error?.message, returns.error?.message].filter((v): v is string => Boolean(v)) };
}

function authFailureRedirect(error: AccessDeniedError, nextPath: string) {
  const encoded = encodeURIComponent(nextPath);
  if (error.status === 401) redirect(`/login?next=${encoded}`);
  if (error.status === 503) redirect(`/auth-unavailable?next=${encoded}`);
}

export async function requireSfiMemberPage(nextPath = '/member') {
  try {
    const context = await requireSfiMember();
    const workspace = await readMemberWorkspaceCounts(context.supabase, context.user.id);
    return { ...context, workspace };
  } catch (error) {
    if (error instanceof AccessDeniedError) authFailureRedirect(error, nextPath);
    redirect('/unauthorized');
  }
}

export async function requireFieldUser() {
  const context = await requireUserProfile();
  if (!context.profile) {
    throw new AccessDeniedError(403, 'FIELD_USER_REQUIRED', 'A FIELD profile is required.');
  }
  return context;
}

export async function requireFounder() {
  const context = await requireAuthenticatedUser();
  const service = createServiceSupabaseClient();
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('role,module_access')
    .eq('user_id', context.user.id)
    .maybeSingle();

  if (profileError) {
    throw new AccessDeniedError(
      503,
      'AUTH_UNAVAILABLE',
      `Founder authorization context is temporarily unavailable: ${profileError.message}`,
    );
  }

  const email = context.user.email?.toLowerCase() || null;
  const institutionalMember = findInstitutionalMember(email);
  const moduleAccess = record(profile?.module_access);
  const hasExplicitSovereignProfile =
    !institutionalMember &&
    (profile?.role === 'root' || profile?.role === 'system') &&
    moduleAccess.full_access === true;

  const allowed =
    founderIds().has(context.user.id) ||
    Boolean(email && founderEmails().has(email)) ||
    hasExplicitSovereignProfile;

  if (!allowed) {
    throw new AccessDeniedError(403, 'FOUNDER_REQUIRED', 'Founder authorization is required.');
  }

  return { ...context, profile };
}

export async function requireFounderPage(nextPath = '/root') {
  try {
    return await requireFounder();
  } catch (error) {
    if (error instanceof AccessDeniedError) authFailureRedirect(error, nextPath);
    redirect('/unauthorized');
  }
}

export async function requireCaseOwner(caseId: string) {
  const context = await requireFieldUser();
  const { data: fieldCase, error } = await context.supabase
    .from('field_cases')
    .select('id, owner_id')
    .eq('id', caseId)
    .maybeSingle();

  if (error || !fieldCase) {
    throw new AccessDeniedError(404, 'NOT_FOUND', 'FIELD case not found.');
  }
  if (fieldCase.owner_id !== context.user.id) {
    throw new AccessDeniedError(403, 'OWNER_REQUIRED', 'Case ownership is required.');
  }
  return { ...context, fieldCase };
}

export async function requireObjectOwner(objectId: string) {
  const context = await requireAuthenticatedUser();
  const service = createServiceSupabaseClient();
  const { data: object, error } = await service
    .from('studio_objects')
    .select('id, owner_id')
    .eq('id', objectId)
    .maybeSingle();

  if (error || !object) {
    throw new AccessDeniedError(404, 'NOT_FOUND', 'Studio object not found.');
  }
  if (!object.owner_id || object.owner_id !== context.user.id) {
    try {
      await requireFounder();
    } catch {
      throw new AccessDeniedError(403, 'OWNER_REQUIRED', 'Object ownership is required.');
    }
  }
  return { ...context, object };
}

export async function requirePublicationAuthority() {
  return requireFounder();
}
