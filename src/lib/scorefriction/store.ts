import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { computeCulturalVector } from './cultural-vector-scoring';
import type { CulturalVectorResponse, PlatformVector } from './cultural-vector-contract';
import { findCulturalWaveCase } from './cultural-wave-cases';
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

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function sourceKey(value: unknown): keyof PlatformVector | null {
  const source = stringValue(value);
  if (!source) return null;
  if (source.includes('youtube')) return 'youtube';
  if (source.includes('tiktok')) return 'tiktok';
  if (source.includes('soundcloud')) return 'soundcloud';
  if (source.includes('spotify')) return 'spotify';
  if (source.includes('genius') || source.includes('lyrics') || source.includes('manual')) return 'lyrics';
  return null;
}

function fallbackCulturalVector(caseId: string, warning?: string): CulturalVectorResponse | null {
  const found = findCulturalWaveCase(caseId);
  if (!found) return null;
  const scored = computeCulturalVector(found.seedVector);
  return {
    case_id: found.case_id,
    case_name: found.name,
    cultural_vector: {
      ...found.seedVector,
      cvphi: scored.cvphi,
      regime: scored.regime,
    },
    sources: found.sources,
    interpretation: {
      phenomenon: found.phenomenon,
      friction: found.friction,
      proposal: found.hypothesis,
      producerBrief: `${found.prototypeHint.bpm} · ${found.prototypeHint.rhythm}`,
    },
    evidence: {
      observation_count: 0,
      warning,
    },
  };
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
    territory: input.territory ?? 'MX',
    caseStudy: input.caseStudy ?? null,
  };
  const normalized = normalizeObservation({ ...input, raw_payload: rawPayload });
  const evidenceType = isScoreFrictionEvidenceType(input.evidence_type)
    ? input.evidence_type
    : inferEvidenceType({ source_name: input.source_name, raw_payload: rawPayload });
  const reliabilityScore = Math.max(0, Math.min(1, numberValue(input.reliability_score, 0.5)));
  const coverageContribution = sourceCoverageContribution({ evidence_type: evidenceType, reliability_score: reliabilityScore });
  const provenanceNotes = input.provenance_notes ?? null;
  const hash = evidenceHash({ rawPayload, normalized, evidenceType, reliabilityScore, provenanceNotes });

  const observation = await service
    .from('scorefriction_observations')
    .insert({
      case_id: normalized.caseId,
      source_name: normalized.sourceName,
      source_url: normalized.sourceUrl,
      territory: normalized.territory,
      evidence_type: evidenceType,
      reliability_score: reliabilityScore,
      provenance_notes: provenanceNotes,
      source_coverage_contribution: input.source_coverage_contribution ?? coverageContribution,
      raw_payload: rawPayload,
      normalized_payload: normalized,
      evidence_hash: hash,
    })
    .select('*')
    .single();

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
      source_coverage: input.source_coverage_contribution ?? coverageContribution,
      reliability_score: reliabilityScore,
      ...input.vector_overrides?.platform_vector,
    },
    mihm_cultural_vector: { ...baseVectors.mihm_cultural_vector, ...evidenceEffects.mihm_cultural_vector, ...input.vector_overrides?.mihm_cultural_vector },
  };
  const vector = await service
    .from('scorefriction_vectors')
    .insert({
      observation_id: observation.data.id,
      ...vectors,
    })
    .select('*')
    .single();

  await appendEpistemicEvent({
    eventName: evidenceType === 'audio_file_analysis' ? 'scorefriction.audio.observation.recorded' : 'scorefriction.observation.recorded',
    epistemicClass: 'observed',
    confidence: 0.78,
    payload: {
      observationId: observation.data.id,
      caseId: normalized.caseId,
      sourceName: normalized.sourceName,
      evidenceType,
      reliabilityScore,
      provenanceNotes,
      sourceCoverageContribution: input.source_coverage_contribution ?? coverageContribution,
      evidenceHash: hash,
      mihmCulturalVector: vectors.mihm_cultural_vector,
    },
    source: { sourceId: 'SCOREFRICTION', sourceType: 'cultural_wave_observatory' },
    logbookId: 'SCOREFRICTION',
    lineage: [hash],
  });

  if (vector.error) return { ok: false as const, error: 'scorefriction_vector_insert_failed', details: vector.error.message, data: { observation: observation.data } };
  return { ok: true as const, data: { observation: observation.data, vector: vector.data, normalized, evidence_hash: hash } };
}

export async function recordScoreFrictionAudioObservation(input: {
  case_id?: string | null;
  source_name?: string | null;
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
}) {
  return recordScoreFrictionObservation({
    case_id: input.case_id,
    source_name: input.source_name ?? 'manual_upload',
    source_url: `upload://${input.file_name}`,
    territory: input.territory ?? 'MX',
    evidence_type: 'audio_file_analysis',
    reliability_score: 0.62,
    provenance_notes: `audio upload: ${input.file_name}`,
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
      platform_vector: { source_coverage: 0.1, reliability_score: 0.62 },
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

  return {
    ok: true as const,
    data: {
      sources: sources.data ?? [],
      cases: cases.data ?? [],
      observations: observations.data ?? [],
      prototypes: prototypes.data ?? [],
      verifications: verifications.data ?? [],
      warnings: [sources.error, cases.error, observations.error, prototypes.error, verifications.error].filter(Boolean).map((item) => item?.message),
    },
  };
}

function evaluatedObservationInput(input: ScoreFrictionObservationInput & { normalized_payload?: unknown; raw_payload?: unknown }) {
  const rawPayload = record(input.raw_payload);
  const normalizedPayload = record(input.normalized_payload);
  const caseId = input.case_id
    ?? stringValue(rawPayload.case_id)
    ?? stringValue(rawPayload.caseId)
    ?? stringValue(normalizedPayload.caseId)
    ?? stringValue(normalizedPayload.case_id)
    ?? null;
  const sourceName = input.source_name
    ?? stringValue(rawPayload.source_name)
    ?? stringValue(rawPayload.sourceName)
    ?? stringValue(normalizedPayload.sourceName)
    ?? stringValue(normalizedPayload.source_name)
    ?? null;
  const sourceUrl = input.source_url
    ?? stringValue(rawPayload.source_url)
    ?? stringValue(rawPayload.sourceUrl)
    ?? stringValue(normalizedPayload.sourceUrl)
    ?? stringValue(normalizedPayload.source_url)
    ?? null;
  const territory = input.territory
    ?? stringValue(rawPayload.territory)
    ?? stringValue(normalizedPayload.territory)
    ?? 'MX';

  return {
    ...input,
    case_id: caseId,
    source_name: sourceName,
    source_url: sourceUrl,
    territory,
    raw_payload: {
      ...rawPayload,
      ...normalizedPayload,
      case_id: caseId,
      source_name: sourceName,
      source_url: sourceUrl,
      territory,
      analysis_mode: stringValue(rawPayload.analysis_mode) ?? stringValue(rawPayload.analysisMode) ?? stringValue(normalizedPayload.analysisMode) ?? input.analysis_mode ?? null,
      observation_goal: stringValue(rawPayload.observation_goal) ?? stringValue(rawPayload.observationGoal) ?? stringValue(normalizedPayload.observationGoal) ?? input.observation_goal ?? null,
      focus_variables: Array.isArray(rawPayload.focus_variables)
        ? rawPayload.focus_variables
        : Array.isArray(normalizedPayload.focusVariables)
          ? normalizedPayload.focusVariables
          : Array.isArray(input.focus_variables)
            ? input.focus_variables
            : [],
    },
  } satisfies ScoreFrictionObservationInput;
}

export async function evaluateScoreFrictionObservation(input: ScoreFrictionObservationInput & { observation_id?: string; normalized_payload?: unknown; raw_payload?: unknown }) {
  const service = createServiceSupabaseClient();
  let evaluationInput = evaluatedObservationInput(input);

  if (input.observation_id) {
    const found = await service
      .from('scorefriction_observations')
      .select('case_id, source_name, source_url, territory, normalized_payload, raw_payload')
      .eq('id', input.observation_id)
      .maybeSingle();
    if (found.error) return { ok: false as const, error: 'scorefriction_observation_lookup_failed', details: found.error.message };

    const row = record(found.data);
    evaluationInput = evaluatedObservationInput({
      ...input,
      case_id: stringValue(row.case_id) ?? input.case_id,
      source_name: stringValue(row.source_name) ?? input.source_name,
      source_url: stringValue(row.source_url) ?? input.source_url,
      territory: stringValue(row.territory) ?? input.territory,
      normalized_payload: row.normalized_payload,
      raw_payload: row.raw_payload,
    });
  }

  const fullNormalized = normalizeObservation(evaluationInput);
  const vectors = deriveVectors(fullNormalized);
  return { ok: true as const, data: { normalized: fullNormalized, vectors } };
}

export async function evaluateScoreFrictionCase(caseId: string): Promise<CulturalVectorResponse | null> {
  const fallback = fallbackCulturalVector(caseId);
  if (!fallback) return null;

  let service;
  try {
    service = createServiceSupabaseClient();
  } catch (error) {
    return fallbackCulturalVector(caseId, error instanceof Error ? error.message : 'supabase_unavailable');
  }

  const observations = await service
    .from('scorefriction_observations')
    .select('id, source_name, evidence_type, reliability_score, source_coverage_contribution, evidence_hash, normalized_payload, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(25);

  if (observations.error) return fallbackCulturalVector(caseId, observations.error.message);
  const rows = observations.data ?? [];
  if (rows.length === 0) return fallback;

  const latestIds = rows.map((row) => row.id);
  const vectors = await service
    .from('scorefriction_vectors')
    .select('observation_id, mihm_cultural_vector, platform_vector')
    .in('observation_id', latestIds);

  if (vectors.error) return { ...fallback, evidence: { ...fallback.evidence, warning: vectors.error.message } };

  const vectorRows = vectors.data ?? [];
  const merged = { ...fallback.cultural_vector };
  const keys = ['NTI_C', 'IHG_C', 'ICE_C', 'CRM_C', 'FS_C', 'LCP', 'PAC', 'VFE', 'SCR'] as const;
  keys.forEach((key) => {
    const values = vectorRows.map((row) => numberValue(record(row.mihm_cultural_vector)[key], NaN)).filter(Number.isFinite);
    if (values.length) merged[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
  });

  const scored = computeCulturalVector(merged);
  const sources = { ...fallback.sources };
  rows.forEach((row) => {
    const key = sourceKey(row.source_name);
    if (key) sources[key] = Math.min(1, numberValue(sources[key], 0) + numberValue(row.source_coverage_contribution, 0.05));
  });

  return {
    ...fallback,
    cultural_vector: {
      ...merged,
      cvphi: scored.cvphi,
      regime: scored.regime,
    },
    sources,
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
}) {
  const service = createServiceSupabaseClient();
  const count = await service.from('scorefriction_prototypes').select('id', { count: 'exact', head: true }).eq('case_id', input.case_id);
  const next = String((count.count ?? 0) + 1).padStart(2, '0');
  const prototypeName = `${input.case_id}-P${next}`;
  const vector = record(input.mihm_cultural_vector);
  const vfe = Number(vector.VFE ?? 0.5);
  const fs = Number(vector.FS_C ?? 0.5);

  const productionBrief = {
    bpm: vfe > 0.65 ? '92-104' : '78-96',
    rhythm: fs > 0.62 ? 'urbano lento + textura experimental' : 'pulso estable + espacio vocal',
    instruments: ['sub bass', 'percusion seca', 'synth granular', 'voz procesada'],
    structure: 'intro corto / hook temprano / drop reutilizable / outro abierto',
    lyrics_axis: ['identidad local', 'futuro', 'agencia', 'no performance emocional'],
    producer: input.producer ?? null,
    platform_targets: input.platform_targets ?? ['soundcloud', 'tiktok', 'youtube'],
  };

  const prompt = {
    system: 'ScoreFriction propone musica como hipotesis cultural verificable, no como ocurrencia.',
    mihm_cultural_vector: vector,
    production_brief: productionBrief,
  };

  const inserted = await service
    .from('scorefriction_prototypes')
    .insert({
      case_id: input.case_id,
      prototype_name: prototypeName,
      prompt,
      lyrics: input.lyrics ?? null,
      production_brief: productionBrief,
    })
    .select('*')
    .single();

  if (inserted.error) return { ok: false as const, error: 'scorefriction_prototype_insert_failed', details: inserted.error.message };

  await appendEpistemicEvent({
    eventName: 'scorefriction.prototype.proposed',
    epistemicClass: 'derived',
    confidence: 0.72,
    payload: { prototypeId: inserted.data.id, prototypeName, caseId: input.case_id, productionBrief },
    source: { sourceId: 'SCOREFRICTION', sourceType: 'prototype_generator' },
    logbookId: 'SCOREFRICTION',
    lineage: [input.case_id],
  });

  return {
    ok: true as const,
    data: {
      ...inserted.data,
      prototype_name: prototypeName,
      production_brief: productionBrief,
      prompt_for_ai_music: JSON.stringify(prompt),
      brief_for_daw: JSON.stringify(productionBrief),
      verification_plan: {
        soundcloud: ['plays', 'likes', 'reposts', 'timestamped_comments', 'drop_reaction_density'],
        tiktok: ['reuse_count', 'caption_reuse', 'gesture_replication'],
        youtube: ['views', 'comments', 'semantic_echo'],
      },
    },
  };
}

export async function recordScoreFrictionVerification(input: { prototype_id?: string | null; case_id?: string | null; platform: string; metrics?: Record<string, unknown>; interpretation?: Record<string, unknown> }) {
  const service = createServiceSupabaseClient();
  const inserted = await service
    .from('scorefriction_verifications')
    .insert({
      prototype_id: input.prototype_id ?? null,
      platform: input.platform,
      metrics: input.metrics ?? {},
      interpretation: input.interpretation ?? { case_id: input.case_id ?? null, status: 'verification_recorded' },
    })
    .select('*')
    .single();

  if (inserted.error) return { ok: false as const, error: 'scorefriction_verification_insert_failed', details: inserted.error.message };

  await appendEpistemicEvent({
    eventName: 'scorefriction.prototype.verified',
    epistemicClass: 'observed',
    confidence: 0.74,
    payload: inserted.data,
    source: { sourceId: 'SCOREFRICTION', sourceType: 'verification_loop' },
    logbookId: 'SCOREFRICTION',
    lineage: [input.prototype_id ?? input.case_id ?? input.platform],
  });

  return { ok: true as const, verification_id: inserted.data.id, interpretation: inserted.data.interpretation, data: inserted.data };
}

export async function readScoreFrictionEvidence(caseId: string) {
  let service;
  try {
    service = createServiceSupabaseClient();
  } catch (error) {
    return { ok: true as const, case_id: caseId, entries: [], warning: error instanceof Error ? error.message : 'supabase_unavailable' };
  }

  const result = await service
    .from('scorefriction_observations')
    .select('id, source_name, evidence_type, reliability_score, provenance_notes, source_coverage_contribution, evidence_hash, created_at, normalized_payload, raw_payload')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (result.error) return { ok: true as const, case_id: caseId, entries: [], warning: result.error.message };

  return {
    ok: true as const,
    case_id: caseId,
    entries: (result.data ?? []).map((row) => {
      const normalized = record(row.normalized_payload);
      const raw = record(row.raw_payload);
      return {
        id: String(row.id),
        source_name: String(row.source_name ?? 'unknown'),
        evidence_type: String(row.evidence_type ?? 'unknown'),
        reliability_score: numberValue(row.reliability_score, 0.5),
        provenance_notes: stringValue(row.provenance_notes) ?? null,
        source_coverage_contribution: numberValue(row.source_coverage_contribution, 0),
        evidence_hash: String(row.evidence_hash ?? ''),
        created_at: String(row.created_at ?? ''),
        summary: stringValue(normalized.title)
          ?? stringValue(raw.title)
          ?? stringValue(raw.text)
          ?? stringValue(record(raw.raw_payload).text)
          ?? 'observacion scorefriction',
      };
    }),
  };
}
