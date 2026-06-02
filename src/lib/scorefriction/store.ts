import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { deriveVectors, evidenceHash, normalizeObservation } from './normalize';
import type { ScoreFrictionObservationInput } from './types';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
  const hash = evidenceHash({ rawPayload, normalized });

  const observation = await service
    .from('scorefriction_observations')
    .insert({
      case_id: normalized.caseId,
      source_name: normalized.sourceName,
      source_url: normalized.sourceUrl,
      territory: normalized.territory,
      raw_payload: rawPayload,
      normalized_payload: normalized,
      evidence_hash: hash,
    })
    .select('*')
    .single();

  if (observation.error) return { ok: false as const, error: 'scorefriction_observation_insert_failed', details: observation.error.message };

  const vectors = deriveVectors(normalized);
  const vector = await service
    .from('scorefriction_vectors')
    .insert({
      observation_id: observation.data.id,
      ...vectors,
    })
    .select('*')
    .single();

  await appendEpistemicEvent({
    eventName: 'scorefriction.observation.recorded',
    epistemicClass: 'observed',
    confidence: 0.78,
    payload: {
      observationId: observation.data.id,
      caseId: normalized.caseId,
      sourceName: normalized.sourceName,
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

export async function evaluateScoreFrictionObservation(input: { observation_id?: string; normalized_payload?: unknown; raw_payload?: unknown }) {
  const service = createServiceSupabaseClient();
  let normalized = record(input.normalized_payload);

  if (input.observation_id) {
    const found = await service.from('scorefriction_observations').select('normalized_payload').eq('id', input.observation_id).maybeSingle();
    if (found.error) return { ok: false as const, error: 'scorefriction_observation_lookup_failed', details: found.error.message };
    normalized = record(found.data?.normalized_payload);
  }

  const fullNormalized = normalizeObservation({ raw_payload: record(input.raw_payload), ...normalized });
  const vectors = deriveVectors(fullNormalized);
  return { ok: true as const, data: { normalized: fullNormalized, vectors } };
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

export async function recordScoreFrictionVerification(input: { prototype_id: string; platform: string; metrics?: Record<string, unknown>; interpretation?: Record<string, unknown> }) {
  const service = createServiceSupabaseClient();
  const inserted = await service
    .from('scorefriction_verifications')
    .insert({
      prototype_id: input.prototype_id,
      platform: input.platform,
      metrics: input.metrics ?? {},
      interpretation: input.interpretation ?? {},
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
    lineage: [input.prototype_id],
  });

  return { ok: true as const, data: inserted.data };
}
