import 'server-only';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/runtime/supabase/server';
import { findInstitutionalMember } from './institutionalMembers';

export class AccessDeniedError extends Error {
  constructor(
    public readonly status: 401 | 403 | 404,
    public readonly code: 'AUTH_REQUIRED' | 'FOUNDER_REQUIRED' | 'FIELD_USER_REQUIRED' | 'SFI_MEMBER_REQUIRED' | 'OWNER_REQUIRED' | 'NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'AccessDeniedError';
  }
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

export async function requireAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new AccessDeniedError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }
  return { supabase, user: data.user };
}

async function readOrProvisionInstitutionalProfile(user: { id: string; email?: string | null }) {
  const member = findInstitutionalMember(user.email);
  const service = createServiceSupabaseClient();
  const existing = await service
    .from('profiles')
    .select('user_id,alias,email,role,module_access,subscription_tier')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return { profile: existing.data, member };
  if (!member) return { profile: null, member: null };

  const inserted = await service
    .from('profiles')
    .insert({
      user_id: user.id,
      alias: member.displayName,
      email: member.email,
      role: member.role,
      subscription_tier: 'enterprise',
      module_access: {
        observatory: member.modules.observatory,
        planner: member.modules.field,
        simulator: member.modules.studio,
        executor: false,
        social: member.modules.worldField,
        field: member.modules.field,
        studio: member.modules.studio,
        world_field: member.modules.worldField,
        root: member.modules.root,
        root_observe: member.modules.root,
      },
      last_seen_at: new Date().toISOString(),
    })
    .select('user_id,alias,email,role,module_access,subscription_tier')
    .single();

  if (inserted.error || !inserted.data) throw inserted.error ?? new Error('SFI member profile could not be created.');
  return { profile: inserted.data, member };
}

export async function requireSfiMember() {
  const context = await requireAuthenticatedUser();
  const resolved = await readOrProvisionInstitutionalProfile(context.user);
  const allowedRoles = new Set(['operator', 'controller', 'observer', 'root', 'system']);
  if (!resolved.profile || (!allowedRoles.has(String(resolved.profile.role)) && !resolved.member)) {
    throw new AccessDeniedError(403, 'SFI_MEMBER_REQUIRED', 'An active SFI institutional membership is required.');
  }
  return { ...context, profile: resolved.profile, member: resolved.member };
}

export async function requireSfiMemberPage(nextPath = '/member') {
  try {
    return await requireSfiMember();
  } catch (error) {
    if (error instanceof AccessDeniedError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
    redirect('/unauthorized');
  }
}

export async function requireFieldUser() {
  const context = await requireAuthenticatedUser();
  const resolved = await readOrProvisionInstitutionalProfile(context.user);
  if (!resolved.profile) {
    throw new AccessDeniedError(403, 'FIELD_USER_REQUIRED', 'A FIELD profile is required.');
  }
  return { ...context, profile: resolved.profile };
}

export async function requireFounder() {
  const context = await requireAuthenticatedUser();
  const { data: profile } = await context.supabase
    .from('profiles')
    .select('role')
    .eq('user_id', context.user.id)
    .maybeSingle();

  const email = context.user.email?.toLowerCase() || null;
  const allowed =
    founderIds().has(context.user.id) ||
    Boolean(email && founderEmails().has(email)) ||
    profile?.role === 'root' ||
    profile?.role === 'system';

  if (!allowed) {
    throw new AccessDeniedError(403, 'FOUNDER_REQUIRED', 'Founder authorization is required.');
  }

  return { ...context, profile };
}

export async function requireFounderPage(nextPath = '/root') {
  try {
    return await requireFounder();
  } catch (error) {
    if (error instanceof AccessDeniedError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
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
