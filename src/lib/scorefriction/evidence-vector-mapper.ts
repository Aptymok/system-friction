import type { ScoreFrictionEvidenceType } from './evidence-contract';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function inferEvidenceType(input: { source_name?: string | null; raw_payload?: Record<string, unknown> | null; fileName?: string | null }): ScoreFrictionEvidenceType {
  const source = (input.source_name ?? '').toLowerCase();
  const raw = input.raw_payload ?? {};
  const file = (input.fileName ?? '').toLowerCase();
  if (raw.type === 'lyrics_or_comment') return 'comment_sample';
  if (raw.lyrics || source.includes('genius') || file.endsWith('.txt') || file.endsWith('.md')) return 'lyrics';
  if (source.includes('trend')) return 'trend_snapshot';
  if (source.includes('kworb') || source.includes('shazam') || source.includes('chart')) return 'chart_snapshot';
  if (source.includes('producer')) return 'producer_log';
  if (source.includes('panel')) return 'listening_panel';
  if (source.includes('distribution')) return 'distribution_report';
  if (source.includes('dataset') || file.endsWith('.json')) return 'dataset_sample';
  return 'community_observation';
}

export function sourceCoverageContribution(input: { evidence_type?: ScoreFrictionEvidenceType | null; reliability_score?: number | null }) {
  const reliability = clamp01(Number(input.reliability_score ?? 0.5));
  const base: Record<ScoreFrictionEvidenceType, number> = {
    lyrics: 0.05,
    hook: 0.04,
    comment_sample: 0.06,
    trend_snapshot: 0.07,
    chart_snapshot: 0.07,
    platform_export: 0.08,
    dataset_sample: 0.07,
    producer_log: 0.06,
    listening_panel: 0.08,
    community_observation: 0.05,
    distribution_report: 0.09,
    audio_metadata: 0.06,
    audio_file_analysis: 0.1,
  };
  return clamp01((base[input.evidence_type ?? 'community_observation'] ?? 0.05) * (0.5 + reliability));
}

export function evidenceTypeVectorEffects(evidenceType: ScoreFrictionEvidenceType, rawPayload: Record<string, unknown>) {
  const textBlock = [
    text(rawPayload.text),
    text(rawPayload.lyrics),
    text(rawPayload.caption),
    text(rawPayload.notes),
    text(rawPayload.provenance_notes),
  ].join(' ');
  const words = textBlock.toLowerCase().split(/[^a-z0-9áéíóúñ]+/i).filter((word) => word.length > 2);
  const unique = new Set(words);
  const diversity = words.length ? unique.size / words.length : 0;
  const count = (pattern: RegExp) => words.filter((word) => pattern.test(word)).length;
  const rows = Array.isArray(rawPayload.rows) ? rawPayload.rows.length : 0;
  const plays = numberValue(rawPayload.plays ?? rawPayload.views ?? rawPayload.playback_count);
  const likes = numberValue(rawPayload.likes ?? rawPayload.likes_count ?? rawPayload.likeCount);
  const comments = Array.isArray(rawPayload.comments) ? rawPayload.comments.length : numberValue(rawPayload.comments ?? rawPayload.comment_count);
  const replayIntent = numberValue(rawPayload.replay_intent ?? rawPayload.replayIntent);

  const semantic_vector: Record<string, number> = {};
  const acoustic_vector: Record<string, number> = {};
  const memetic_vector: Record<string, number> = {};
  const platform_vector: Record<string, number> = {};
  const mihm_cultural_vector: Record<string, number> = {};

  if (evidenceType === 'lyrics' || evidenceType === 'hook') {
    semantic_vector.semantic_density = clamp01(words.length / 260);
    semantic_vector.lexical_diversity = clamp01(diversity);
    semantic_vector.repetition_load = clamp01(1 - diversity);
    mihm_cultural_vector.SCR = clamp01(1 - diversity + count(/hook|coro|frase|drop/) / 20);
    mihm_cultural_vector.PAC = clamp01(count(/futuro|hacer|crear|constru|avanz|nosotros/) / 12 + 0.35);
  }
  if (evidenceType === 'comment_sample' || evidenceType === 'community_observation') {
    platform_vector.semantic_echo_score = clamp01(count(/hook|coro|letra|beat|drop/) / 20);
    platform_vector.identity_resonance_score = clamp01(count(/yo|nosotros|barrio|mx|familia/) / 15);
    platform_vector.comment_conflict_score = clamp01(count(/no|odio|mal|copia|fake/) / 15);
    mihm_cultural_vector.FS_C = platform_vector.comment_conflict_score;
  }
  if (evidenceType === 'trend_snapshot' || evidenceType === 'chart_snapshot') {
    platform_vector.discovery_pressure = clamp01(rows / 100 + plays / 1000000);
    mihm_cultural_vector.LCP = clamp01(platform_vector.discovery_pressure + 0.35);
  }
  if (evidenceType === 'platform_export' || evidenceType === 'distribution_report') {
    platform_vector.public_reception_vector = clamp01((likes + comments) / Math.max(1, plays) * 8);
    memetic_vector.sound_memetic_velocity = clamp01(numberValue(rawPayload.reposts ?? rawPayload.shares) / Math.max(1, plays) * 10);
    mihm_cultural_vector.CRM_C = clamp01(platform_vector.public_reception_vector * 0.6 + 0.25);
    mihm_cultural_vector.VFE = clamp01(memetic_vector.sound_memetic_velocity + 0.2);
  }
  if (evidenceType === 'producer_log') {
    platform_vector.producer_alignment = clamp01(count(/claro|forma|cerrar|produc|avance/) / 12 + 0.25);
    mihm_cultural_vector.PAC = platform_vector.producer_alignment;
  }
  if (evidenceType === 'listening_panel') {
    platform_vector.replay_intent = clamp01(replayIntent || count(/repetir|otra|again|hook/) / 12);
    platform_vector.hook_recall = clamp01(numberValue(rawPayload.hook_recall) || count(/hook|coro|drop/) / 12);
    platform_vector.cognitive_load = clamp01(numberValue(rawPayload.cognitive_load));
    mihm_cultural_vector.PAC = clamp01((platform_vector.replay_intent + platform_vector.hook_recall) / 2);
    mihm_cultural_vector.FS_C = platform_vector.cognitive_load;
  }

  return { acoustic_vector, semantic_vector, memetic_vector, platform_vector, mihm_cultural_vector };
}
