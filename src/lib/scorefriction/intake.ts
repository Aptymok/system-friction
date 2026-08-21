import { createHash } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendEpistemicEvent } from '@/lib/events/eventStore';

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

function requireText(value: unknown, code: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

function require01(value: unknown, code: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error(code);
  return value;
}

function normalizeInput(input: ScoreFrictionIntakeInput) {
  const now = new Date().toISOString();
  const object = requireText(input.object, 'SCOREFRICTION_OBJECT_REQUIRED');
  const signal = requireText(input.signal, 'SCOREFRICTION_SIGNAL_REQUIRED');
  const domain = requireText(input.domain, 'SCOREFRICTION_DOMAIN_REQUIRED');
  const caseId = requireText(input.case_id, 'SCOREFRICTION_CASE_ID_REQUIRED');
  const sourceName = requireText(input.source_name, 'SCOREFRICTION_SOURCE_NAME_REQUIRED');
  const evidenceType = requireText(input.evidence_type, 'SCOREFRICTION_EVIDENCE_TYPE_REQUIRED');
  const provenanceNotes = requireText(input.provenance_notes, 'SCOREFRICTION_PROVENANCE_REQUIRED');
  const reliabilityScore = require01(input.reliability_score, 'SCOREFRICTION_RELIABILITY_REQUIRED');
  const coverageContribution = require01(input.source_coverage_contribution, 'SCOREFRICTION_COVERAGE_CONTRIBUTION_REQUIRED');

  const rawPayload = {
    received_at: now,
    object,
    signal,
    domain,
    narrative: input.narrative?.trim() || null,
    wsv: input.wsv ?? null,
    raw_payload: input.raw_payload ?? null,
  };

  const normalizedPayload = {
    object,
    domain,
    signal,
    narrative: input.narrative?.trim() || null,
    wsv: input.wsv ?? null,
    operational_contract: 'scorefriction.intake.v1',
  };

  return {
    now,
    caseId,
    sourceName,
    evidenceType,
    provenanceNotes,
    reliabilityScore,
    coverageContribution,
    object,
    signal,
    domain,
    rawPayload,
    normalizedPayload,
    evidenceHash: sha256(JSON.stringify({ rawPayload, normalizedPayload })),
  };
}

export async function createScoreFrictionIntake(input: ScoreFrictionIntakeInput) {
  const service = createServiceSupabaseClient();
  const normalized = normalizeInput(input);

  const { data: observation, error: observationError } = await service
    .from('scorefriction_observations')
    .insert({
      case_id: normalized.caseId,
      source_name: normalized.sourceName,
      source_url: input.source_url?.trim() || null,
      territory: input.territory?.trim() || null,
      raw_payload: normalized.rawPayload,
      normalized_payload: normalized.normalizedPayload,
      evidence_hash: normalized.evidenceHash,
      evidence_type: normalized.evidenceType,
      reliability_score: normalized.reliabilityScore,
      provenance_notes: normalized.provenanceNotes,
      source_coverage_contribution: normalized.coverageContribution,
    })
    .select('*')
    .single();

  if (observationError) throw new Error(`scorefriction_observations insert failed: ${observationError.message}`);

  const { data: vector, error: vectorError } = await service
    .from('scorefriction_vectors')
    .insert({
      observation_id: observation.id,
      acoustic_vector: input.vectors?.acoustic_vector ?? null,
      semantic_vector: input.vectors?.semantic_vector ?? null,
      memetic_vector: input.vectors?.memetic_vector ?? null,
      platform_vector: input.vectors?.platform_vector ?? null,
      mihm_cultural_vector: input.vectors?.mihm_cultural_vector ?? null,
    })
    .select('*')
    .single();

  if (vectorError) throw new Error(`scorefriction_vectors insert failed: ${vectorError.message}`);

  const event = await appendEpistemicEvent({
    eventName: 'scorefriction.intake.observed',
    epistemicClass: 'imported',
    confidence: normalized.reliabilityScore,
    payload: {
      case_id: normalized.caseId,
      observation_id: observation.id,
      vector_id: vector.id,
      object: normalized.object,
      domain: normalized.domain,
      signal: normalized.signal,
      evidence_hash: normalized.evidenceHash,
      source_coverage_contribution: normalized.coverageContribution,
    },
    occurredAt: normalized.now,
    source: { sourceId: normalized.sourceName, sourceType: normalized.evidenceType },
    logbookId: 'SFI',
    lineage: [`scorefriction_observations:${observation.id}`, `scorefriction_vectors:${vector.id}`],
  });
  if (!event.ok) throw new Error(`scorefriction_epistemic_event_failed:${event.error}`);

  return {
    ok: true,
    status: 'scorefriction_intake_persisted',
    observation,
    vector,
    epistemicEvent: event.data,
  };
}
