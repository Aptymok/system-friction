import 'server-only';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function finite(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
}

export async function readActorNodeProjection(ctx: {
  user: { id: string; email?: string | null };
  profile: Row | null;
  service: any;
}) {
  const latest = await ctx.service
    .from('field_mihm_readings')
    .select('id,metrics,formula_version,created_at')
    .eq('owner_id', ctx.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const metrics = record(latest.data?.metrics);
  const ihg = finite(metrics.ihg ?? metrics.IHG);
  const nti = finite(metrics.nti ?? metrics.NTI ?? metrics.nti_obs ?? metrics.NTI_obs);
  const ldi = finite(metrics.ldi ?? metrics.LDI ?? metrics.ldi_hours ?? metrics.LDI_hours);
  const measured = ihg !== null || nti !== null || ldi !== null;
  const profile = record(ctx.profile);
  const createdAt = typeof profile.created_at === 'string' ? profile.created_at : null;
  const updatedAt = typeof profile.updated_at === 'string' ? profile.updated_at : createdAt;
  const observedAt = typeof latest.data?.created_at === 'string' ? latest.data.created_at : null;

  return {
    node: {
      id: ctx.user.id,
      user_id: ctx.user.id,
      source: 'canonical_actor_projection',
      alias: typeof profile.alias === 'string' ? profile.alias : null,
      objective: null,
      current_ihg: ihg,
      current_nti: nti,
      current_ldi: ldi,
      current_severity: null,
      active_pattern: null,
      created_at: createdAt,
      updated_at: observedAt ?? updatedAt,
      last_sync: observedAt,
      source_state: measured ? 'observed' as const : 'missing' as const,
      evidence_level: measured ? 'field_mihm_reading' as const : 'none' as const,
      formula_version: latest.data?.formula_version ?? null,
    },
    diagnostic: latest.error?.message ?? null,
  };
}
