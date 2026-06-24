import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type AnyRecord = Record<string, any>;

export type ScoreFrictionDetectionFilter = {
  case_id?: string | null;
  evidence_type?: string | null;
  source_name?: string | null;
  territory?: string | null;
  q?: string | null;
  limit?: number | null;
};

function record(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampLimit(value: unknown) {
  const parsed = Number(value ?? 25);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function textBlob(...values: unknown[]) {
  return values.map((value) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') return JSON.stringify(value);
    return '';
  }).join(' ').toLowerCase();
}

function maybeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function objectKind(row: AnyRecord) {
  const raw = record(row.raw_payload);
  const normalized = record(row.normalized_payload);

  return textValue(raw.object_kind)
    || textValue(raw.objectKind)
    || textValue(normalized.objectKind)
    || textValue(normalized.object_kind)
    || textValue(raw.type)
    || textValue(row.evidence_type, 'observation');
}

function objectLabel(row: AnyRecord) {
  const raw = record(row.raw_payload);
  const normalized = record(row.normalized_payload);

  return textValue(raw.object_label)
    || textValue(raw.objectLabel)
    || textValue(normalized.objectLabel)
    || textValue(normalized.object_label)
    || textValue(raw.title)
    || textValue(raw.name)
    || textValue(row.source_name)
    || textValue(row.evidence_type, 'detected object');
}

function signalTerms(row: AnyRecord) {
  const raw = record(row.raw_payload);
  const normalized = record(row.normalized_payload);

  const candidates = [
    ...maybeArray(raw.terms),
    ...maybeArray(raw.signals),
    ...maybeArray(raw.focus),
    ...maybeArray(raw.focus_variables),
    ...maybeArray(normalized.terms),
    ...maybeArray(normalized.signals),
    ...maybeArray(normalized.focusVariables),
    row.evidence_type,
    row.source_name,
    row.territory,
  ];

  return [...new Set(candidates.map((item) => String(item).trim()).filter((item) => item.length > 1))].slice(0, 25);
}

function compactVector(row: AnyRecord) {
  return {
    observation_id: textValue(row.observation_id),
    acoustic_vector: row.acoustic_vector ?? null,
    semantic_vector: row.semantic_vector ?? null,
    memetic_vector: row.memetic_vector ?? null,
    platform_vector: row.platform_vector ?? null,
    mihm_cultural_vector: row.mihm_cultural_vector ?? null,
  };
}

function aggregateSignals(objects: AnyRecord[]) {
  const byEvidenceType = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byTerritory = new Map<string, number>();
  const byTerm = new Map<string, number>();

  for (const item of objects) {
    const evidenceType = textValue(item.evidence_type, 'unknown');
    const sourceName = textValue(item.source_name, 'unknown');
    const territory = textValue(item.territory, 'unknown');

    byEvidenceType.set(evidenceType, (byEvidenceType.get(evidenceType) ?? 0) + 1);
    bySource.set(sourceName, (bySource.get(sourceName) ?? 0) + 1);
    byTerritory.set(territory, (byTerritory.get(territory) ?? 0) + 1);

    for (const term of item.signal_terms ?? []) {
      const key = String(term).toLowerCase();
      byTerm.set(key, (byTerm.get(key) ?? 0) + 1);
    }
  }

  const sortMap = (map: Map<string, number>) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([key, count]) => ({ key, count }));

  return {
    by_evidence_type: sortMap(byEvidenceType),
    by_source: sortMap(bySource),
    by_territory: sortMap(byTerritory),
    recurrent_terms: sortMap(byTerm),
  };
}

export async function buildScoreFrictionDetectionState(filter: ScoreFrictionDetectionFilter = {}) {
  const service = createServiceSupabaseClient();
  const limit = clampLimit(filter.limit);
  const q = textValue(filter.q).toLowerCase();

  let query = service
    .from('scorefriction_observations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (textValue(filter.case_id)) query = query.eq('case_id', textValue(filter.case_id));
  if (textValue(filter.evidence_type)) query = query.eq('evidence_type', textValue(filter.evidence_type));
  if (textValue(filter.source_name)) query = query.eq('source_name', textValue(filter.source_name));
  if (textValue(filter.territory)) query = query.eq('territory', textValue(filter.territory));

  const observations = await query;

  if (observations.error) {
    return {
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'scorefriction_detection_state' as const,
      error: observations.error.message,
      selected_filter: filter,
      detected_objects: [],
      signals: {
        by_evidence_type: [],
        by_source: [],
        by_territory: [],
        recurrent_terms: [],
      },
      interpretation: 'ScoreFriction no pudo leer observaciones.',
    };
  }

  const rows = (observations.data ?? []).map(record);
  const ids = rows.map((row) => textValue(row.id)).filter(Boolean);

  const vectors = ids.length
    ? await service
      .from('scorefriction_vectors')
      .select('*')
      .in('observation_id', ids)
    : { data: [], error: null };

  const vectorByObservation = new Map<string, AnyRecord>();
  for (const vector of vectors.data ?? []) {
    const row = record(vector);
    vectorByObservation.set(textValue(row.observation_id), row);
  }

  let detectedObjects = rows.map((row) => {
    const vector = vectorByObservation.get(textValue(row.id));
    const raw = record(row.raw_payload);
    const normalized = record(row.normalized_payload);

    return {
      id: textValue(row.id),
      case_id: textValue(row.case_id),
      object_kind: objectKind(row),
      object_label: objectLabel(row),
      evidence_type: textValue(row.evidence_type),
      source_name: textValue(row.source_name),
      source_url: textValue(row.source_url) || null,
      territory: textValue(row.territory),
      reliability_score: numberValue(row.reliability_score, 0),
      source_coverage_contribution: numberValue(row.source_coverage_contribution, 0),
      evidence_hash: textValue(row.evidence_hash) || null,
      observed_at: textValue(row.created_at),
      signal_terms: signalTerms(row),
      raw_summary: {
        analysis_mode: raw.analysis_mode ?? raw.analysisMode ?? null,
        observation_goal: raw.observation_goal ?? raw.observationGoal ?? null,
        focus_variables: raw.focus_variables ?? raw.focusVariables ?? normalized.focusVariables ?? [],
      },
      vector: vector ? compactVector(vector) : null,
    };
  });

  if (q) {
    detectedObjects = detectedObjects.filter((item) => textBlob(item).includes(q));
  }

  const signals = aggregateSignals(detectedObjects);

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    source: 'scorefriction_detection_state' as const,
    selected_filter: {
      case_id: textValue(filter.case_id) || null,
      evidence_type: textValue(filter.evidence_type) || null,
      source_name: textValue(filter.source_name) || null,
      territory: textValue(filter.territory) || null,
      q: textValue(filter.q) || null,
      limit,
    },
    role_boundary: {
      worldspect: 'observa mundo externo',
      scorefriction: 'detecta objetos y señales según filtro seleccionado',
      sfi_response: 'decide respuesta interna con atractores y evidencia',
    },
    detected_count: detectedObjects.length,
    detected_objects: detectedObjects,
    signals,
    interpretation: detectedObjects.length
      ? 'ScoreFriction detectó objetos/señales bajo el filtro seleccionado.'
      : 'ScoreFriction no encontró objetos/señales para el filtro seleccionado.',
    warnings: [
      vectors.error ? `scorefriction_vectors_read_failed: ${vectors.error.message}` : null,
    ].filter(Boolean),
  };
}
