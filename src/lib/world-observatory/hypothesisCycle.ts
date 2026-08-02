import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { clamp01 } from '@/lib/sfi/math';
import { WORLD_METHODOLOGY_VERSION } from './worldCycle';

type ReadingRow = {
  id: string;
  observation_id: string;
  systemic_friction: number;
  interaction_density: number;
  friction_gradient: number;
  systemic_coherence: number;
  tension: Record<string, unknown>;
  pain_map: Record<string, unknown>;
  field_drivers: Record<string, unknown>;
  permissions: Record<string, unknown>;
  trajectory: Record<string, unknown>;
  minimum_viable_perturbation: Record<string, unknown> | null;
  created_at: string;
};

type ObservationRow = {
  id: string;
  source_id: string;
  source_family: string;
  publisher: string;
  title: string;
  summary: string | null;
  observed_at: string | null;
  latitude: number | null;
  longitude: number | null;
  affected_systems: string[];
  actors: string[];
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

export async function runWorldHypothesisCycle() {
  const db = createServiceSupabaseClient();
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: readings, error } = await db
    .from('world_friction_readings')
    .select('*')
    .gte('created_at', since)
    .gte('systemic_friction', 0.48)
    .order('systemic_friction', { ascending: false })
    .limit(80);

  if (error) return { ok: false, created: 0, error: error.message };
  let created = 0;

  for (const reading of (readings ?? []) as ReadingRow[]) {
    const { data: observation } = await db
      .from('world_source_observations')
      .select('id,source_id,source_family,publisher,title,summary,observed_at,latitude,longitude,affected_systems,actors')
      .eq('id', reading.observation_id)
      .maybeSingle();
    if (!observation) continue;

    const source = observation as ObservationRow;
    const phenomenonKey = `${source.source_family}:${source.id}`;
    const { data: existing } = await db
      .from('world_hypotheses')
      .select('id')
      .eq('phenomenon_key', phenomenonKey)
      .in('status', ['OPEN', 'AWAITING_OUTCOME'])
      .maybeSingle();
    if (existing) continue;

    const trajectory = reading.trajectory ?? {};
    const direction = typeof trajectory.direction === 'string' ? trajectory.direction : 'displacement';
    const expectedSignal = typeof trajectory.expectedSignal === 'string'
      ? trajectory.expectedSignal
      : `change in ${source.affected_systems.join(', ') || source.source_family}`;
    const affected = source.affected_systems.length ? source.affected_systems : [source.source_family];
    const horizonHours = Number(trajectory.horizonHours ?? 24);
    const cutoff = new Date();
    const validationStartsAt = new Date(cutoff.getTime() + 60 * 60 * 1000);
    const validationEndsAt = new Date(cutoff.getTime() + Math.max(6, Math.min(168, horizonHours)) * 60 * 60 * 1000);
    const expectedSignals = [...new Set([
      ...affected,
      direction,
      ...strings((reading.field_drivers ?? {}).drivers),
    ])].slice(0, 8);
    const contradictionSignals = direction === 'fragmentation'
      ? ['restored', 'reopened', 'normal operation', 'stabilized']
      : direction === 'displacement'
        ? ['unchanged', 'normal operation', 'no disruption']
        : ['closure', 'escalation', 'disruption'];
    const initialConfidence = clamp01(
      Number(source.publisher ? 0.25 : 0.1)
      + Number(reading.systemic_coherence ?? 0) * 0.35
      + Number(reading.interaction_density ?? 0) * 0.2
      + Number(reading.friction_gradient ?? 0) * 0.2,
    );

    const { error: insertError } = await db.from('world_hypotheses').insert({
      phenomenon_key: phenomenonKey,
      graph_snapshot: {
        observationId: source.id,
        readingId: reading.id,
        sourceId: source.source_id,
        sourceFamily: source.source_family,
        publisher: source.publisher,
        title: source.title,
        observedAt: source.observed_at,
        geography: source.latitude !== null && source.longitude !== null ? { lat: source.latitude, lng: source.longitude } : null,
        affectedSystems: source.affected_systems,
        actors: source.actors,
        tension: reading.tension,
        painMap: reading.pain_map,
        fieldDrivers: reading.field_drivers,
        permissions: reading.permissions,
        minimumViablePerturbation: reading.minimum_viable_perturbation,
      },
      cutoff_at: cutoff.toISOString(),
      statement: `Si la tensión observada en “${source.title}” persiste, el campo tenderá a ${direction} y deberá aparecer ${expectedSignal} dentro de la ventana de retorno.`,
      predicted_trajectory: { direction, expectedSignal, affectedSystems: affected, horizonHours },
      expected_signals: expectedSignals,
      contradiction_signals: contradictionSignals,
      validation_starts_at: validationStartsAt.toISOString(),
      validation_ends_at: validationEndsAt.toISOString(),
      initial_confidence: initialConfidence,
      current_confidence: initialConfidence,
      methodology_version: WORLD_METHODOLOGY_VERSION,
      evidence_ids: [source.id],
      status: 'AWAITING_OUTCOME',
    });

    if (!insertError) created += 1;
  }

  return { ok: true, created, considered: readings?.length ?? 0, generatedAt: new Date().toISOString() };
}
