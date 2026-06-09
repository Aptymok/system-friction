import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { createScoreFrictionAttractorSnapshot } from './longitudinal';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function statusFor(confidence: number, density: number, persistence: number) {
  if (confidence < 0.18 || density < 0.12) return 'latent';
  if (confidence > 0.76 && density > 0.62 && persistence > 0.55) return 'consolidated';
  if (confidence > 0.62 && density > 0.45) return 'crystallizing';
  if (confidence > 0.32) return 'emerging';
  return 'degraded';
}

async function latestWorldspectSnapshot() {
  const service = createServiceSupabaseClient();
  const { data } = await service
    .from('worldspect_snapshots')
    .select('*')
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function readEvidence(caseId: string) {
  const service = createServiceSupabaseClient();
  const observations = await service
    .from('scorefriction_observations')
    .select('id, case_id, source_name, evidence_type, reliability_score, source_coverage_contribution, evidence_hash, normalized_payload, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (observations.error) return { ok: false as const, error: 'scorefriction_observations_read_failed', details: observations.error.message };

  const observationRows = rows(observations.data);
  if (!observationRows.length) return { ok: true as const, observations: [], vectors: [] };

  const ids = observationRows.map((row) => str(row.id)).filter(Boolean);
  const vectors = await service
    .from('scorefriction_vectors')
    .select('id, observation_id, acoustic_vector, semantic_vector, memetic_vector, platform_vector, mihm_cultural_vector, created_at')
    .in('observation_id', ids);

  if (vectors.error) return { ok: false as const, error: 'scorefriction_vectors_read_failed', details: vectors.error.message };
  return { ok: true as const, observations: observationRows, vectors: rows(vectors.data) };
}

function buildProtoAttractor(caseId: string, observations: Row[], vectorRows: Row[], worldspect: Row | null) {
  const vectorByObservation = new Map(vectorRows.map((row) => [str(row.observation_id), row]));
  const supporting = observations.map((observation) => {
    const vector = vectorByObservation.get(str(observation.id));
    return {
      observation_id: observation.id,
      evidence_hash: observation.evidence_hash,
      source_name: observation.source_name,
      reliability_score: observation.reliability_score,
      source_coverage_contribution: observation.source_coverage_contribution,
      mihm_cultural_vector: record(vector?.mihm_cultural_vector),
      platform_vector: record(vector?.platform_vector),
    };
  });

  const mihmVectors = supporting.map((item) => record(item.mihm_cultural_vector));
  const avg = (key: string, fallback = 0.35) => {
    const values = mihmVectors.map((item) => num(item[key], NaN)).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  };

  const coverage = observations.reduce((sum, row) => sum + num(row.source_coverage_contribution, 0), 0);
  const reliability = observations.reduce((sum, row) => sum + num(row.reliability_score, 0.5), 0) / Math.max(1, observations.length);
  const uniqueSources = new Set(observations.map((row) => str(row.source_name)).filter(Boolean)).size;
  const density = clamp01((coverage / Math.max(1, observations.length)) + uniqueSources * 0.08);
  const persistence = clamp01(Math.min(observations.length, 12) / 12 + avg('LCP', 0.2) * 0.35);
  const confidence = clamp01(reliability * 0.45 + density * 0.35 + persistence * 0.2);
  const status = statusFor(confidence, density, persistence);
  const dominant = avg('FS_C', 0.4) > avg('PAC', 0.35) ? 'friccion' : 'plataforma';

  return {
    case_id: caseId,
    name: `${caseId}-${dominant}-protoatractor`,
    description: `Convergencia ${dominant} derivada de ${observations.length} observaciones ScoreFriction.`,
    scope: 'scorefriction',
    confidence,
    density,
    persistence,
    status,
    evidence_count: observations.length,
    observation_count: observations.length,
    supporting_vectors: supporting,
    worldspect_snapshot: worldspect,
    mihm_snapshot: {
      IHG_C: avg('IHG_C'),
      NTI_C: avg('NTI_C'),
      FS_C: avg('FS_C'),
      LCP: avg('LCP'),
      PAC: avg('PAC'),
      SCR: avg('SCR'),
    },
    generated_by: 'scorefriction_proto_attractor_detector_v1',
    last_seen: new Date().toISOString(),
  };
}

export async function detectScoreFrictionProtoAttractors(caseId: string) {
  const cleanCaseId = str(caseId);
  if (!cleanCaseId) return { ok: false as const, error: 'case_id_required' };

  const evidence = await readEvidence(cleanCaseId);
  if (!evidence.ok) return evidence;
  if (!evidence.observations.length) {
    return { ok: true as const, case_id: cleanCaseId, data: [], message: 'sin protoatractores detectados' };
  }

  const service = createServiceSupabaseClient();
  const worldspect = await latestWorldspectSnapshot();
  const proto = buildProtoAttractor(cleanCaseId, evidence.observations, evidence.vectors, record(worldspect));
  const { data, error } = await service
    .from('scorefriction_proto_attractors')
    .upsert(proto, { onConflict: 'case_id,name' })
    .select('*')
    .single();

  if (error) return { ok: false as const, error: 'scorefriction_proto_attractor_upsert_failed', details: error.message };

  await appendEpistemicEvent({
    eventName: 'scorefriction.proto_attractor.detected',
    epistemicClass: 'derived',
    confidence: proto.confidence,
    payload: { protoAttractorId: data.id, caseId: cleanCaseId, status: proto.status, density: proto.density, persistence: proto.persistence },
    source: { sourceId: 'SCOREFRICTION', sourceType: 'proto_attractor_detector' },
    logbookId: 'SCOREFRICTION',
    lineage: evidence.observations.map((row) => str(row.evidence_hash) || str(row.id)).filter(Boolean),
  });

  await createScoreFrictionAttractorSnapshot({ proto_attractor_id: str(data.id) });

  return { ok: true as const, case_id: cleanCaseId, data: [data] };
}

export async function listScoreFrictionProtoAttractors(caseId: string) {
  const cleanCaseId = str(caseId);
  if (!cleanCaseId) return { ok: false as const, error: 'case_id_required' };

  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('scorefriction_proto_attractors')
    .select('*')
    .eq('case_id', cleanCaseId)
    .order('updated_at', { ascending: false });

  if (error) return { ok: false as const, error: 'scorefriction_proto_attractors_read_failed', details: error.message };
  return { ok: true as const, case_id: cleanCaseId, data: data ?? [], message: (data ?? []).length ? undefined : 'sin protoatractores detectados' };
}
