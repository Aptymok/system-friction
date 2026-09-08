import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/runtime/supabase/server';
import { buildStudioCulturalLens } from '@/lib/studio/culturalLens';
import { isConfiguredFounderIdentity } from '@/lib/system/access/founderAuthority';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isRootRouteUser(userId?: string | null, role?: string | null, email?: string | null) {
  return isConfiguredFounderIdentity({ userId, email })
    || role === 'root'
    || role === 'system';
}

function isStudioRouteUser(userId?: string | null, role?: string | null, email?: string | null) {
  if (isRootRouteUser(userId, role, email)) return true;
  const allowed = (process.env.STUDIO_AUTHORIZED_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

async function authorizeStudio() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) };

  let role: string | null = null;
  try {
    const service = createServiceSupabaseClient();
    const { data: profile } = await service.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
    role = typeof profile?.role === 'string' ? profile.role : null;
  } catch {
    role = null;
  }

  if (!isStudioRouteUser(user.id, role, user.email)) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: 'studio_forbidden' }, { status: 403 }) };
  }

  return { ok: true as const, user };
}

export async function GET() {
  const auth = await authorizeStudio();
  if (!auth.ok) return auth.response;

  try {
    const lens = await buildStudioCulturalLens();
    return NextResponse.json({ ok: true, lens });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      lens: null,
      reason: 'world_context_unavailable',
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 200 });
  }
}