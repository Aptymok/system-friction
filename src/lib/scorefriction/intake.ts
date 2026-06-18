import { createHash } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendSfiOperationalEventAsync } from '@/lib/sfi/operational/events';

export type ScoreFrictionIntakeInput = {
  case_id?: string;
  object?: string;
  source_name?: string;
  source_url?: string;
  territory?: string;
  evidence_type?: string;
  reliability_score?: number;
  provenance_notes?: string;
  source_coverage_contribution?: number;
  domain?: string;
  signal?: string;
  narrative?: string;
  wsv?: Record<string, number>;
  raw_payload?: Record<string, unknown>;
  vectors?: {
    acoustic_vector?: Record<string, unknown>;
    semantic_vector?: Record<string, unknown>;
    memetic_vector?: Record<string, unknown>;
    platform_vector?: Record<string, unknown>;
    mihm_cultural_vector?: Record<string, unknown>;
  };
};

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function clamp01(value: unknown, fallback = 0.5) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(1, n));
}

function normalizeInput(input: ScoreFrictionIntakeInput) {
  const now = new Date().toISOString();
  const object = input.object || 'SFI operational signal';
  const signal = input.signal || 'operational signal';
  const domain = input.domain || 'cultural';

  const rawPayload = {
    received_at: now,
    object,
    signal,
    domain,
    narrative: input.narrative || null,
    wsv: input.wsv || null,
    raw_payload: input.raw_payload || null
  };

  const normalizedPayload = {
    object,
    domain,
    signal,
    narrative: input.narrative || 'Señal registrada sin narrativa extendida.',
    wsv: input.wsv || {},
    operational_contract: 'scorefriction.intake.v1'
  };

  const evidenceHash = sha256(JSON.stringify({ rawPayload, normalizedPayload }));

  return {
    now,
    object,
    signal,
    domain,
    rawPayload,
    normalizedPayload,
    evidenceHash
  };
}

export async function createScoreFrictionIntake(input: ScoreFrictionIntakeInput) {
  const service = createServiceSupabaseClient();
  const normalized = normalizeInput(input);

  const caseId = input.case_id || 'SFI-OP-001';
  const sourceName = input.source_name || 'manual_upload';

  const { data: observation, error: observationError } = await service
    .from('scorefriction_observations')
    .insert({
      case_id: caseId,
      source_name: sourceName,
      source_url: input.source_url || null,
      territory: input.territory || 'MX',
      raw_payload: normalized.rawPayload,
      normalized_payload: normalized.normalizedPayload,
      evidence_hash: normalized.evidenceHash,
      evidence_type: input.evidence_type || 'operational_signal',
      reliability_score: clamp01(input.reliability_score, 0.62),
      provenance_notes: input.provenance_notes || 'Inserted through /api/scorefriction/intake P07.',
      source_coverage_contribution: clamp01(input.source_coverage_contribution, 0.08)
    })
    .select('*')
    .single();

  if (observationError) {
    throw new Error(`scorefriction_observations insert failed: ${observationError.message}`);
  }

  const wsv = input.wsv || {};

  const { data: vector, error: vectorError } = await service
    .from('scorefriction_vectors')
    .insert({
      observation_id: observation.id,
      acoustic_vector: input.vectors?.acoustic_vector || {
        source: 'not_applicable',
        reason: 'P07 intake did not receive audio analysis.'
      },
      semantic_vector: input.vectors?.semantic_vector || {
        object: normalized.object,
        signal: normalized.signal,
        narrative: normalized.normalizedPayload.narrative,
        domain: normalized.domain
      },
      memetic_vector: input.vectors?.memetic_vector || {
        persistence: wsv.cultural ?? null,
        affective_charge: wsv.affective ?? null,
        institutional_bridge: wsv.institutional ?? null
      },
      platform_vector: input.vectors?.platform_vector || {
        source_name: sourceName,
        source_url: input.source_url || null,
        territory: input.territory || 'MX'
      },
      mihm_cultural_vector: input.vectors?.mihm_cultural_vector || {
        ihg: null,
        nti: null,
        lti: null,
        fs: null,
        phi: null,
        note: 'Pending MIHM evaluator pass.'
      }
    })
    .select('*')
    .single();

  if (vectorError) {
    throw new Error(`scorefriction_vectors insert failed: ${vectorError.message}`);
  }

  const operationalEvent = await appendSfiOperationalEventAsync({
    organ: 'scorefriction',
    kind: 'scorefriction_intake',
    title: `ScoreFriction intake: ${normalized.object}`,
    summary: normalized.normalizedPayload.narrative,
    source: '/api/scorefriction/intake',
    risk: 'low',
    status: 'observed',
    payload: {
      case_id: caseId,
      observation_id: observation.id,
      vector_id: vector.id,
      object: normalized.object,
      domain: normalized.domain,
      signal: normalized.signal,
      evidence_hash: normalized.evidenceHash
    },
    next_action: 'Enviar observación a MIHM/Evaluator y generar borrador Publisher desde evidencia real.'
  });

  return {
    ok: true,
    patch: 'P07',
    status: 'scorefriction_intake_persisted',
    observation,
    vector,
    operationalEvent,
    next_action: 'Consultar /api/scorefriction/state y /api/scorefriction/operational-cycle.'
  };
}

