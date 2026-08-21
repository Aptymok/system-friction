import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { computeCulturalVector } from './cultural-vector-scoring';
import type { CulturalVectorResponse, PlatformVector } from './cultural-vector-contract';
import { evidenceTypeVectorEffects, inferEvidenceType, sourceCoverageContribution } from './evidence-vector-mapper';
import { isScoreFrictionEvidenceType } from './evidence-contract';
import { deriveVectors, evidenceHash, normalizeObservation } from './normalize';
import type { ScoreFrictionObservationInput } from './types';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function sourceKey(value: unknown): keyof PlatformVector | null {
  const source = stringValue(value)?.toLowerCase();
  if (!source) return null;
  if (source.includes('youtube')) return 'youtube';
  if (source.includes('tiktok')) return 'tiktok';
  if (source.includes('soundcloud')) return 'soundcloud';
  if (source.includes('spotify')) return 'spotify';
  if (source.includes('genius') || source.includes('lyrics')) return 'lyrics';
  return null;
}

export async function recordScoreFrictionObservation(input: ScoreFrictionObservationInput) {
  const service = createServiceSupabaseClient();
  const rawPayload = input.raw_payload ?? {
    youtubeUrl: input.youtubeUrl ?? null,
    spotifyUrl: input.spotifyUrl ?? null,
    soundcloudUrl: input.soundcloudUrl ?? null,
    tiktokUrl: input.tiktokUrl ?? null,
    lyrics: input.lyrics ?? null,
    comments: input.comments ?? [],
    audioMetadata: input.audioMetadata ?? {},
    territory: input.territory ?? null,
    caseStudy: input.caseStudy ?? null,
  };
  const normalized = normalizeObservation({ ...input, raw_payload: rawPayload });
  const evidenceType = isScoreFrictionEvidenceType(input.evidence_type)
    ? input.evidence_type
    : inferEvidenceType({ source_name: input.source_name, raw_payload: rawPayload });
  const reliabilityScore = finiteNumber(input.reliability_score);
  if (reliabilityScore === null || reliabilityScore < 0 || reliabilityScore > 1) {
    return { ok: false as const, error: 'reliability_score_required_0_to_1' };
  }
  const coverageContribution = finiteNumber(input.source_coverage_contribution);
  if (coverageContribution === null || coverageContribution < 0 || coverageContribution > 1) {
    return { ok: false as const, error: 'source_coverage_contribution_required_0_to_1' };
  }
  const provenanceNotes = stringValue(input.provenance_notes);
  if (!provenanceNotes) return { ok: false as const, error: 'provenance_notes_required' };
  if (!stringValue(normalized.caseId) || !stringValue(normalized.sourceName)) {
    return { ok: false as const, error: 'case_id_and_source_name_required' };
  }
  const hash = evidenceHash({ rawPayload, normalized, evidenceType, reliabilityScore, provenanceNotes });

  const observation = await service.from('scorefriction_observations').insert({
    case_id: normalized.caseId,
    source_name: normalized.sourceName,
    source_url: normalized.sourceUrl,
    territory: normalized.territory,
    evidence_type: evidenceType,
    reliability_score: reliabilityScore,
    provenance_notes: provenanceNotes,
    source_coverage_contribution: coverageContribution,
    raw_payload: rawPayload,
    normalized_payload: normalized,
    evidence_hash: hash,
  }).select('*').single();
  if (observation.error) return { ok: false as const, error: 'scorefriction_observation_insert_failed', details: observation.error.message };

  const baseVectors = deriveVectors(normalized);
  const evidenceEffects = evidenceTypeVectorEffects(evidenceType, rawPayload);
  const vectors = {
    acoustic_vector: { ...baseVectors.acoustic_vector, ...evidenceEffects.acoustic_vector, ...input.vector_overrides?.acoustic_vector },
    semantic_vector: { ...baseVectors.semantic_vector, ...evidenceEffects.semantic_vector, ...input.vector_overrides?.semantic_vector },
    memetic_vector: { ...baseVectors.memetic_vector, ...evidenceEffects.memetic_vector, ...input.vector_overrides?.memetic_vector },
    platform_vector: {
      ...baseVectors.platform_vector,
      ...evidenceEffects.platform_vector,
      source_coverage: coverageContribution,
      reliability_score: reliabilityScore,
      ...input.vector_overrides?.platform_vector,
    },
    mihm_cultural_vector: { ...baseVectors.mihm_cultural_vector, ...evidenceEffects.mihm_cultural_vector, ...input.vector_overrides?.mihm_cultural_vector },
  };
  const vector = await service.from('scorefriction_vectors').insert({ observation_id: observation.data.id, ...vectors }).select('*').single();
  if (vector.error) return { ok: false as const, error: 'scorefriction_vector_insert_failed', details: vector.error.message, data: { observation: observation.data } };

  const event = await appendEpistemicEvent({
    eventName: evidenceType === 'audio_file_analysis' ? 'scorefriction.audio.observation.recorded' : 'scorefriction.observation.recorded',
    epistemicClass: 'observed',
    confidence: reliabilityScore,
    payload: {
      observationId: observation.data.id,
      caseId: normalized.caseId,
      sourceName: normalized.sourceName,
      evidenceType,
      reliabilityScore,
      provenanceNotes,
      sourceCoverageContribution: coverageContribution,
      evidenceHash: hash,
      mihmCulturalVector: vectors.mihm_cultural_vector,
    },
    source: { sourceId: 'SCOREFRICTION', sourceType: 'cultural_wave_observatory' },
    logbookId: 'SCOREFRICTION',
    lineage: [hash],
  });
  if (!event.ok) return { ok: false as const, error: 'scorefriction_epistemic_event_append_failed', details: event.error, data: { observation: observation.data, vector: vector.data } };

  return { ok: true as const, data: { observation: observation.data, vector: vector.data, normalized, evidence_hash: hash } };
}

export async function recordScoreFrictionAudioObservation(input: {
  case_id: string;
  source_name: string;
  territory?: string | null;
  title?: string | null;
  artist?: string | null;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  acoustic_vector: Record<string, unknown>;
  semantic_vector?: Record<string, unknown>;
  mihm_cultural_vector?: Record<string, unknown>;
  raw_payload?: Record<string, unknown>;
  warnings?: string[];
  reliability_score: number;
  source_coverage_contribution: number;
  provenance_notes: string;
}) {
  return recordScoreFrictionObservation({
    case_id: input.case_id,
    source_name: input.source_name,
    source_url: `upload://${input.file_name}`,
    territory: input.territory ?? undefined,
    evidence_type: 'audio_file_analysis',
    reliability_score: input.reliability_score,
    provenance_notes: input.provenance_notes,
    source_coverage_contribution: input.source_coverage_contribution,
    raw_payload: input.raw_payload ?? {
      type: 'audio_file_analysis',
      title: input.title ?? input.file_name,
      artist: input.artist ?? null,
      file_name: input.file_name,
      file_size_bytes: input.file_size_bytes,
      mime_type: input.mime_type,
      warnings: input.warnings ?? [],
      audioMetadata: input.acoustic_vector,
    },
    vector_overrides: {
      acoustic_vector: input.acoustic_vector,
      semantic_vector: input.semantic_vector,
      mihm_cultural_vector: input.mihm_cultural_vector,
      platform_vector: { source_coverage: input.source_coverage_contribution, reliability_score: input.reliability_score },
    },
  });
}

export async function readScoreFrictionState() {
  const service = createServiceSupabaseClient();
  const [sources, cases, observations, prototypes, verifications] = await Promise.all([
    service.from('scorefriction_sources').select('*').order('source_name', { ascending: true }),
    service.from('scorefriction_case_studies').select('*').order('case_id', { ascending: true }),
    service.from('scorefriction_observations').select('*').order('created_at', { ascending: false }).limit(25),
    service.from('scorefriction_prototypes').select('*').order('created_at', { ascending: false }).limit(25),
    service.from('scorefriction_verifications').select('*').order('verified_at', { ascending: false }).limit(25),
  ]);
  const warnings = [sources.error, cases.error, observations.error, prototypes.error, verifications.error].filter(Boolean).map((item) => item?.message ?? 'unknown_error');
  return {
    ok: warnings.length === 0,
    data: {
      sources: sources.data ?? [], cases: cases.data ?? [], observations: observations.data ?? [],
      prototypes: prototypes.data ?? [], verifications: verifications.data ?? [], warnings,
    },
  };
}

function evaluatedObservationInput(input: ScoreFrictionObservationInput & { normalized_payload?: unknown; raw_payload?: unknown }) {
  const rawPayload = record(input.raw_payload);
  const normalizedPayload = record(input.normalized_payload);
  const caseId = input.case_id ?? stringValue(rawPayload.case_id) ?? stringValue(rawPayload.caseId) ?? stringValue(normalizedPayload.caseId) ?? stringValue(normalizedPayload.case_id) ?? null;
  const sourceName = input.source_name ?? stringValue(rawPayload.source_name) ?? stringValue(rawPayload.sourceName) ?? stringValue(normalizedPayload.sourceName) ?? stringValue(normalizedPayload.source_name) ?? null;
  const sourceUrl = input.source_url ?? stringValue(rawPayload.source_url) ?? stringValue(rawPayload.sourceUrl) ?? stringValue(normalizedPayload.sourceUrl) ?? stringValue(normalizedPayload.source_url) ?? null;
  const territory = input.territory ?? stringValue(rawPayload.territory) ?? stringValue(normalizedPayload.territory) ?? null;
  return {
    ...input,
    case_id: caseId,
    source_name: sourceName,
    source_url: sourceUrl,
    territory: territory ?? undefined,
    raw_payload: {
      ...rawPayload,
      ...normalizedPayload,
      case_id: caseId,
      source_name: sourceName,
      source_url: sourceUrl,
      territory,
      analysis_mode: stringValue(rawPayload.analysis_mode) ?? stringValue(rawPayload.analysisMode) ?? stringValue(normalizedPayload.analysisMode) ?? input.analysis_mode ?? null,
      observation_goal: stringValue(rawPayload.observation_goal) ?? stringValue(rawPayload.observationGoal) ?? stringValue(normalizedPayload.observationGoal) ?? input.observation_goal ?? null,
      focus_variables: Array.isArray(rawPayload.focus_variables) ? rawPayload.focus_variables : Array.isArray(normalizedPayload.focusVariables) ? normalizedPayload.focusVariables : Array.isArray(input.focus_variables) ? input.focus_variables : [],
    },
  } satisfies ScoreFrictionObservationInput;
}

export async function evaluateScoreFrictionObservation(input: ScoreFrictionObservationInput & { observation_id?: string; normalized_payload?: unknown; raw_payload?: unknown }) {
  let evaluationInput = evaluatedObservationInput(input);
  if (input.observation_id) {
    const service = createServiceSupabaseClient();
    const found = await service.from('scorefriction_observations').select('case_id, source_name, source_url, territory, normalized_payload, raw_payload').eq('id', input.observation_id).maybeSingle();
    if (found.error) return { ok: false as const, error: 'scorefriction_observation_lookup_failed', details: found.error.message };
    if (!found.data) return { ok: false as const, error: 'scorefriction_observation_not_found' };
    const row = record(found.data);
    evaluationInput = evaluatedObservationInput({
      ...input,
      case_id: stringValue(row.case_id) ?? input.case_id,
      source_name: stringValue(row.source_name) ?? input.source_name,
      source_url: stringValue(row.source_url) ?? input.source_url,
      territory: stringValue(row.territory) ?? input.territory,
      normalized_payload: record(row.normalized_payload),
      raw_payload: record(row.raw_payload),
    });
  }
  if (!stringValue(evaluationInput.case_id) || !stringValue(evaluationInput.source_name)) {
    return { ok: false as const, error: 'case_id_and_source_name_required' };
  }
  const fullNormalized = normalizeObservation(evaluationInput);
  const vectors = deriveVectors(fullNormalized);
  return { ok: true as const, data: { normalized: fullNormalized, vectors } };
}

export async function evaluateScoreFrictionCase(caseId: string): Promise<CulturalVectorResponse | null> {
  const service = createServiceSupabaseClient();
  const [caseResult, observations] = await Promise.all([
    service.from('scorefriction_case_studies').select('case_id,name,phenomenon,friction,hypothesis').eq('case_id', caseId).maybeSingle(),
    service.from('scorefriction_observations').select('id, source_name, source_coverage_contribution, evidence_hash, created_at').eq('case_id', caseId).order('created_at', { ascending: false }).limit(50),
  ]);
  if (caseResult.error || observations.error || !caseResult.data) return null;
  const rows = observations.data ?? [];
  if (rows.length === 0) return null;

  const vectors = await service.from('scorefriction_vectors').select('observation_id, mihm_cultural_vector').in('observation_id', rows.map((row) => row.id));
  if (vectors.error || !vectors.data?.length) return null;
  const keys = ['NTI_C', 'IHG_C', 'ICE_C', 'CRM_C', 'FS_C', 'LCP', 'PAC', 'VFE', 'SCR'] as const;
  const merged: Record<string, number> = {};
  for (const key of keys) {
    const values = vectors.data.map((row) => finiteNumber(record(row.mihm_cultural_vector)[key])).filter((value): value is number => value !== null);
    if (!values.length) return null;
    merged[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  const scored = computeCulturalVector(merged as any);
  const sources: PlatformVector = { youtube: 0, tiktok: 0, soundcloud: 0, spotify: 0, lyrics: 0 };
  for (const row of rows) {
    const key = sourceKey(row.source_name);
    if (key) sources[key] = Math.min(1, numberValue(sources[key], 0) + numberValue(row.source_coverage_contribution, 0));
  }
  return {
    case_id: String(caseResult.data.case_id),
    case_name: String(caseResult.data.name),
    cultural_vector: { ...(merged as any), cvphi: scored.cvphi, regime: scored.regime },
    sources,
    interpretation: {
      phenomenon: String(caseResult.data.phenomenon ?? ''),
      friction: String(caseResult.data.friction ?? ''),
      proposal: String(caseResult.data.hypothesis ?? ''),
    },
    evidence: {
      latest_hash: stringValue(rows[0]?.evidence_hash) ?? undefined,
      observation_count: rows.length,
      last_observed_at: stringValue(rows[0]?.created_at) ?? undefined,
      source_coverage: rows.reduce((sum, row) => sum + numberValue(row.source_coverage_contribution, 0), 0),
    },
  };
}

export async function createScoreFrictionPrototype(input: {
  case_id: string;
  mihm_cultural_vector?: Record<string, unknown>;
  platform_targets?: string[];
  producer?: string;
  lyrics?: string;
  production_brief?: Record<string, unknown>;
}) {
  const service = createServiceSupabaseClient();
  const caseResult = await service.from('scorefriction_case_studies').select('case_id').eq('case_id', input.case_id).maybeSingle();
  if (caseResult.error || !caseResult.data) return { ok: false as const, error: 'scorefriction_case_not_found' };
  if (!input.production_brief || Object.keys(input.production_brief).length === 0) {
    return { ok: false as const, error: 'production_brief_required_no_synthetic_prototype_generation' };
  }
  const count = await service.from('scorefriction_prototypes').select('id', { count: 'exact', head: true }).eq('case_id', input.case_id);
  if (count.error) return { ok: false as const, error: 'scorefriction_prototype_count_failed', details: count.error.message };
  const prototypeName = `${input.case_id}-P${String((count.count ?? 0) + 1).padStart(2, '0')}`;
  const prompt = {
    system: 'ScoreFriction treats a proposed artifact as a hypothesis requiring later external verification.',
    mihm_cultural_vector: record(input.mihm_cultural_vector),
    production_brief: input.production_brief,
    platform_targets: input.platform_targets ?? [],
  };
  const inserted = await service.from('scorefriction_prototypes').insert({
    case_id: input.case_id,
    prototype_name: prototypeName,
    prompt,
    lyrics: input.lyrics ?? null,
    production_brief: input.production_brief,
  }).select('*').single();
  if (inserted.error) return { ok: false as const, error: 'scorefriction_prototype_insert_failed', details: inserted.error.message };
  const event = await appendEpistemicEvent({
    eventName: 'scorefriction.prototype.proposed',
    epistemicClass: 'derived',
    confidence: 0.5,
    payload: { prototypeId: inserted.data.id, prototypeName, caseId: input.case_id, productionBrief: input.production_brief },
    source: { sourceId: 'SCOREFRICTION', sourceType: 'prototype_proposal' },
    logbookId: 'SCOREFRICTION',
    lineage: [input.case_id],
    uncertainty: 'Artifact proposal is not evidence of cultural effect. External return is required.',
  });
  if (!event.ok) return { ok: false as const, error: 'scorefriction_prototype_event_failed', details: event.error };
  return { ok: true as const, data: inserted.data };
}

export async function recordScoreFrictionVerification(input: { prototype_id?: string | null; case_id?: string | null; platform: string; metrics?: Record<string, unknown>; interpretation?: Record<string, unknown> }) {
  const service = createServiceSupabaseClient();
  if (!input.prototype_id || !input.platform || !input.metrics || Object.keys(input.metrics).length === 0) {
    return { ok: false as const, error: 'prototype_id_platform_and_observed_metrics_required' };
  }
  const inserted = await service.from('scorefriction_verifications').insert({
    prototype_id: input.prototype_id,
    platform: input.platform,
    metrics: input.metrics,
    interpretation: input.interpretation ?? {},
  }).select('*').single();
  if (inserted.error) return { ok: false as const, error: 'scorefriction_verification_insert_failed', details: inserted.error.message };
  const event = await appendEpistemicEvent({
    eventName: 'scorefriction.prototype.return.recorded',
    epistemicClass: 'observed',
    confidence: 0.5,
    payload: inserted.data,
    source: { sourceId: 'SCOREFRICTION', sourceType: 'external_return' },
    logbookId: 'SCOREFRICTION',
    lineage: [input.prototype_id],
    uncertainty: 'Recorded metrics are observations; causal attribution to the prototype remains an inference until contrasted.',
  });
  if (!event.ok) return { ok: false as const, error: 'scorefriction_verification_event_failed', details: event.error };
  return { ok: true as const, verification_id: inserted.data.id, interpretation: inserted.data.interpretation, data: inserted.data };
}

export async function readScoreFrictionEvidence(caseId: string) {
  const service = createServiceSupabaseClient();
  const result = await service.from('scorefriction_observations')
    .select('id, source_name, evidence_type, reliability_score, provenance_notes, source_coverage_contribution, evidence_hash, created_at, normalized_payload, raw_payload')
    .eq('case_id', caseId).order('created_at', { ascending: false }).limit(50);
  if (result.error) return { ok: false as const, case_id: caseId, entries: [], error: result.error.message };
  return {
    ok: true as const,
    case_id: caseId,
    entries: (result.data ?? []).map((row) => {
      const normalized = record(row.normalized_payload);
      const raw = record(row.raw_payload);
      return {
        id: String(row.id), source_name: String(row.source_name ?? ''), evidence_type: String(row.evidence_type ?? ''),
        reliability_score: finiteNumber(row.reliability_score), provenance_notes: stringValue(row.provenance_notes),
        source_coverage_contribution: finiteNumber(row.source_coverage_contribution), evidence_hash: String(row.evidence_hash ?? ''),
        created_at: String(row.created_at ?? ''),
        summary: stringValue(normalized.title) ?? stringValue(raw.title) ?? stringValue(raw.text) ?? stringValue(record(raw.raw_payload).text) ?? null,
      };
    }),
  };
}
