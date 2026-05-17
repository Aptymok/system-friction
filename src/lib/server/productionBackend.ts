import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/runtime/supabase/server';

export const PRODUCTION_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';

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

export function isRootUser(role?: string | null, email?: string | null) {
  const rootEmail = process.env.SYSTEM_ROOT_EMAIL || 'aptymok@gmail.com';
  return isRootRole(role) || Boolean(email && email.toLowerCase() === rootEmail.toLowerCase());
}

export async function getServerUserContext() {
  const supabase = await createServerSupabaseClient();
  const service = createServiceSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, service, user: null, profile: null, isRoot: false };

  let { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    const rootEmail = process.env.SYSTEM_ROOT_EMAIL;
    const role = rootEmail && user.email?.toLowerCase() === rootEmail.toLowerCase() ? 'root' : 'observer';
    const alias = user.email?.split('@')[0] || 'observador';
    const { data } = await service
      .from('profiles')
      .insert({
        user_id: user.id,
        alias,
        email: user.email || `${user.id}@systemfriction.local`,
        role,
      })
      .select('*')
      .single();
    profile = data;
  }

  return { supabase, service, user, profile, isRoot: isRootUser(profile?.role, user.email) };
}

export async function ensureOwnedNode(nodeId?: string | null) {
  const ctx = await getServerUserContext();
  if (!ctx.user) return { ...ctx, node: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  let query = ctx.service.from('nodes').select('*');
  if (nodeId) query = query.eq('id', nodeId);
  else query = query.eq('user_id', ctx.user.id);

  const { data: nodes } = await query.order('created_at', { ascending: false }).limit(1);
  let node = nodes?.[0] || null;

  if (!node && !nodeId) {
    const { data } = await ctx.service
      .from('nodes')
      .insert({ user_id: ctx.user.id, source: 'web', current_ihg: 0.52, current_nti: 0.48, current_ldi: 1.12 })
      .select('*')
      .single();
    node = data;
  }

  if (!node) return { ...ctx, node: null, error: NextResponse.json({ error: 'node_not_found' }, { status: 404 }) };
  if (!ctx.isRoot && node.user_id !== ctx.user.id) {
    return { ...ctx, node: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ...ctx, node, error: null };
}

export function denseFragment(metrics: { ihg?: number; nti?: number; ldi?: number; phi?: number }, hint?: string) {
  const ihg = Number(metrics.ihg ?? 0.5);
  const nti = Number(metrics.nti ?? 0.5);
  const ldi = Number(metrics.ldi ?? 0.5);
  const phi = Number(metrics.phi ?? (ihg * nti) / (1 + ldi));
  const ldiMark = ldi > 1 ? 'LDI ↑' : 'LDI estable';
  const coherence = ihg > 0.55 ? 'coherencia estable' : 'coherencia frágil';
  const trace = nti > 0.55 ? 'trazabilidad suficiente' : 'trazabilidad baja';
  const pressure = phi < 0.25 ? 'presión semántica alta' : 'presión semántica contenida';
  const action = hint || (ldi > 1 ? 'reducir latencia observable' : 'registrar residuo mínimo');
  return `${ldiMark} · ${coherence} · ${trace} · ${pressure} · vector recomendado: ${action}.`;
}
