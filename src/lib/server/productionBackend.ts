import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
  getVerifiedServerUser,
  SfiAuthUnavailableError,
} from '@/runtime/supabase/server';
import { findInstitutionalMember } from '@/lib/system/access/institutionalMembers';

export const PRODUCTION_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';

export const SFI_FOUNDER_IDENTITY = {
  displayName: 'Juan Antonio Marín Liera',
  title: 'Founder — System Friction Institute',
} as const;

export const ROOT_ENTITLEMENTS = {
  full_access: true,
  cognitive_twin: true,
  orchestrator: true,
  telemetry: true,
  media_room: true,
  amv: true,
  experimental: true,
  display_title: SFI_FOUNDER_IDENTITY.title,
};

export function isRootRole(role?: string | null) {
  return role === 'root' || role === 'system';
}

export function isInstitutionalObserverRole(role?: string | null) {
  return role === 'observer';
}

export function isRootUser(
  role?: string | null,
  email?: string | null
) {
  const rootEmail = process.env.SYSTEM_ROOT_EMAIL;

  return (
    isRootRole(role) ||
    Boolean(
      rootEmail &&
        email &&
        email.toLowerCase() === rootEmail.toLowerCase()
    )
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isConfiguredRootEmail(email?: string | null) {
  const rootEmail = process.env.SYSTEM_ROOT_EMAIL;
  return Boolean(
    rootEmail &&
      email &&
      email.toLowerCase() === rootEmail.toLowerCase()
  );
}

function isRegisteredInstitutionalRootObserver(email?: string | null) {
  const member = findInstitutionalMember(email);
  return Boolean(member && member.modules.root === true);
}

function hasSovereignRootAuthority(
  profile: Record<string, unknown> | null,
  email?: string | null,
) {
  if (isConfiguredRootEmail(email)) return true;
  if (!profile) return false;

  const role = typeof profile.role === 'string' ? profile.role : null;
  if (!isRootRole(role)) return false;

  const moduleAccess = record(profile.module_access);
  return moduleAccess.full_access === true;
}

export function canObserveRoot(
  role?: string | null,
  email?: string | null
) {
  return (
    isRootUser(role, email) ||
    isInstitutionalObserverRole(role) ||
    isRegisteredInstitutionalRootObserver(email)
  );
}

export async function getServerUserContext() {
  const supabase = await createServerSupabaseClient();
  const service = createServiceSupabaseClient();

  let user = null;
  try {
    user = await getVerifiedServerUser(supabase);
  } catch (error) {
    if (error instanceof SfiAuthUnavailableError) {
      return {
        supabase,
        service,
        user: null,
        profile: null,
        isRoot: false,
        canObserveRoot: false,
        authState: 'unavailable' as const,
        authError: error.message,
      };
    }
    throw error;
  }

  if (!user) {
    return {
      supabase,
      service,
      user: null,
      profile: null,
      isRoot: false,
      canObserveRoot: false,
      authState: 'anonymous' as const,
      authError: null,
    };
  }

  const profileRead = await service
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  let profile = profileRead.data;
  const profileReadError = profileRead.error;

  const institutionalMember = findInstitutionalMember(user.email);

  // A failed profile read is not evidence that the profile is absent. Never
  // provision on top of an indeterminate read; that was the source of the
  // duplicate profiles_pkey write storm observed during DB timeouts.
  if (profileReadError) {
    console.error('PROFILE READ ERROR', {
      userId: user.id,
      message: profileReadError.message,
    });
  }

  // Only explicitly recognized institutional identities may be provisioned here.
  // Unknown authenticated users must never become ROOT observers by fallback.
  if (!profile && !profileReadError && (isConfiguredRootEmail(user.email) || institutionalMember)) {
    const role = isConfiguredRootEmail(user.email)
      ? 'root'
      : institutionalMember?.role ?? 'observer';

    const alias = isConfiguredRootEmail(user.email)
      ? SFI_FOUNDER_IDENTITY.displayName
      : institutionalMember?.displayName ?? user.email?.split('@')[0] ?? 'observador';
    const moduleAccess = role === 'root'
      ? ROOT_ENTITLEMENTS
      : institutionalMember
        ? {
            display_title: institutionalMember.title,
            field: institutionalMember.modules.field,
            studio: institutionalMember.modules.studio,
            observatory: institutionalMember.modules.observatory,
            world_field: institutionalMember.modules.worldField,
            root: institutionalMember.modules.root,
            root_observe: institutionalMember.modules.root,
            executor: false,
            root_execution: false,
            governance_write: false,
            sovereign_actions: false,
            canonical_promotion: false,
          }
        : {};

    const {
      data: createdProfile,
      error: profileError,
    } = await service
      .from('profiles')
      .insert({
        user_id: user.id,
        alias,
        email: user.email || `${user.id}@systemfriction.local`,
        role,
        module_access: moduleAccess,
      })
      .select('*')
      .single();

    if (profileError) {
      console.error('PROFILE CREATION ERROR', profileError);
    }

    profile = createdProfile;
  }

  const profileRecord = profile ? record(profile) : null;
  const role = typeof profile?.role === 'string' ? profile.role : null;
  const isRoot = hasSovereignRootAuthority(profileRecord, user.email);
  const legacyRootWithoutAuthority = isRootRole(role) && !isRoot;
  const registeredObserver = isRegisteredInstitutionalRootObserver(user.email);

  return {
    supabase,
    service,
    user,
    profile,
    isRoot,
    canObserveRoot:
      isRoot ||
      isInstitutionalObserverRole(role) ||
      legacyRootWithoutAuthority ||
      registeredObserver,
    authState: 'authenticated' as const,
    authError: profileReadError?.message ?? null,
  };
}

export async function ensureOwnedNode(
  nodeId?: string | null
) {
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return {
      ...ctx,
      node: null,
      error: NextResponse.json(
        ctx.authState === 'unavailable'
          ? { error: 'AUTH_UNAVAILABLE', message: 'Authentication is temporarily unavailable; the session was not invalidated.' }
          : { error: 'Unauthorized' },
        { status: ctx.authState === 'unavailable' ? 503 : 401 }
      ),
    };
  }

  let query = ctx.service
    .from('nodes')
    .select('*');

  if (nodeId) {
    query = query.eq('id', nodeId);
  } else {
    query = query.eq(
      'user_id',
      ctx.user.id
    );
  }

  const { data: nodes } = await query
    .order('created_at', {
      ascending: false,
    })
    .limit(1);

  const node = nodes?.[0] || null;

  if (!node) {
    return {
      ...ctx,
      node: null,
      error: NextResponse.json(
        {
          error: 'node_not_found',
          epistemicStatus: 'MISSING',
          message: 'No persisted node exists for this actor. SFI will not synthesize IHG, NTI or LDI values.',
        },
        { status: 404 }
      ),
    };
  }

  if (
    !ctx.isRoot &&
    node.user_id !== ctx.user.id
  ) {
    return {
      ...ctx,
      node: null,
      error: NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      ),
    };
  }

  return {
    ...ctx,
    node,
    error: null,
  };
}

function finiteMetric(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

export function denseFragment(
  metrics: {
    ihg?: number;
    nti?: number;
    ldi?: number;
    phi?: number;
  },
  hint?: string
) {
  const ihg = finiteMetric(metrics.ihg);
  const nti = finiteMetric(metrics.nti);
  const ldi = finiteMetric(metrics.ldi);
  const explicitPhi = finiteMetric(metrics.phi);

  if (ihg === null || nti === null || ldi === null) {
    return `MISSING · lectura insuficiente para interpretar IHG/NTI/LDI.${hint ? ` Vector declarado: ${hint}.` : ''}`;
  }

  const phi = explicitPhi ?? (ihg * nti) / (1 + ldi);

  const ldiMark =
    ldi > 1
      ? 'LDI ↑'
      : 'LDI estable';

  const coherence =
    ihg > 0.55
      ? 'coherencia estable'
      : 'coherencia frágil';

  const trace =
    nti > 0.55
      ? 'trazabilidad suficiente'
      : 'trazabilidad baja';

  const pressure =
    phi < 0.25
      ? 'presión semántica alta'
      : 'presión semántica contenida';

  const action =
    hint ||
    (ldi > 1
      ? 'reducir latencia observable'
      : 'registrar residuo mínimo');

  return `${ldiMark} · ${coherence} · ${trace} · ${pressure} · vector recomendado: ${action}.`;
}
