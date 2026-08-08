import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from '@/runtime/supabase/server';

export const PRODUCTION_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';

export const ROOT_ENTITLEMENTS = {
  full_access: true,
  cognitive_twin: true,
  orchestrator: true,
  telemetry: true,
  media_room: true,
  amv: true,
  experimental: true,
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

export function canObserveRoot(
  role?: string | null,
  email?: string | null
) {
  return isRootUser(role, email) || isInstitutionalObserverRole(role);
}

export async function getServerUserContext() {
  const supabase = await createServerSupabaseClient();
  const service = createServiceSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log('===== SUPABASE AUTH =====');
  console.log({
    user: user?.id ?? null,
    email: user?.email ?? null,
    error,
  });

  if (!user) {
    return {
      supabase,
      service,
      user: null,
      profile: null,
      isRoot: false,
      canObserveRoot: false,
    };
  }

  let { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    const rootEmail = process.env.SYSTEM_ROOT_EMAIL;

    const role =
      rootEmail &&
      user.email?.toLowerCase() === rootEmail.toLowerCase()
        ? 'root'
        : 'observer';

    const alias =
      user.email?.split('@')[0] || 'observador';

    const {
      data: createdProfile,
      error: profileError,
    } = await service
      .from('profiles')
      .insert({
        user_id: user.id,
        alias,
        email:
          user.email ||
          `${user.id}@systemfriction.local`,
        role,
      })
      .select('*')
      .single();

    if (profileError) {
      console.error(
        'PROFILE CREATION ERROR',
        profileError
      );
    }

    profile = createdProfile;
  }

  const isRoot = isRootUser(
    profile?.role,
    user.email
  );

  return {
    supabase,
    service,
    user,
    profile,
    isRoot,
    canObserveRoot: canObserveRoot(profile?.role, user.email),
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
        { error: 'Unauthorized' },
        { status: 401 }
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
