import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { buildStudioCulturalLens } from './studioCulturalLens';

export const STUDIO_OBJECT_SYNTHESIS_SOURCE = 'studio_object_context_synthesis_v1';
export const STUDIO_OBJECT_SYNTHESIS_VERSION = '2026-07-11.1';

type Row = Record<string, unknown>;

type MihmVariableKey = 'F_s' | 'D_i' | 'G_f' | 'C_s' | 'D_cog' | 'E_r' | 'V_i' | 'I_mc' | 'Phi' | 'R_sem' | 'C_sem';

type MihmVariable = {
  key: MihmVariableKey;
  label: string;
  value: number | null;
  status: 'DERIVED' | 'MISSING';
  explanation: string;
  evidenceIds: string[];
  warnings: string[];
};

export type StudioObjectContextSynthesis = {
  version: string;
  objectId: string;
  objectTitle: string;
  modality: string;
  generatedAt: string;
  status: 'COMPLETE' | 'PARTIAL' | 'BLOCKED';
  context: {
    declaredAttractor: string | null;
    desiredShift: string | null;
    targetAudience: string | null;
    prohibitedEffects: string[];
  };
  objectReading: {
    summary: string;
    evidenceCoverage: number;
    interpretability: 'FORMAL_ONLY' | 'FORMAL_AND_SEMANTIC' | 'INSUFFICIENT';
    salientSignals: Array<{ label: string; value: number | string | null; meaning: string; evidenceIds: string[] }>;
    limitations: string[];
  };
  worldContext: {
    observedAt: string | null;
    status: string;
    confidence: number | null;
    dominantSignal: string | null;
    domains: Array<{ domain: string; value: number; confidence: number | null; sourceCount: number }>;
    trends: Array<{ domain: string; direction: 'rising' | 'falling' | 'stable'; slope: number; sampleCount: number }>;
    relation: 'ALIGNED' | 'COUNTER_SIGNAL' | 'ORTHOGONAL' | 'INDETERMINATE';
    explanation: string;
    warnings: string[];
  };
  mihm: {
    status: 'VALID' | 'PARTIAL' | 'BLOCKED';
    coverage: number;
    coreCoverage: number;
    variables: MihmVariable[];
    weightedSum: number | null;
    penaltySum: number | null;
    ihg: number | null;
    summary: string;
    limitations: string[];
  };
  leverage: {
    status: 'CANDIDATE' | 'NO_CHANGE_REQUIRED' | 'BLOCKED';
    scope: 'production' | 'arrangement' | 'structure' | 'narrative' | 'distribution' | null;
    targetVariable: MihmVariableKey | string | null;
    minimumPerturbation: string | null;
    preserves: string[];
    expectedSignal: string | null;
    verificationWindow: '72h' | '7d' | '30d' | null;
    falsificationCriterion: string | null;
    rationale: string;
    evidenceIds: string[];
  };
  hypothesis: {
    statement: string;
    expectedSignal: string;
    verificationWindow: '72h' | '7d' | '30d';
    falsificationCriterion: string;
    evidenceIds: string[];
  } | null;
  persistence: {
    evidenceTraceId: string | null;
    hypothesisId: string | null;
    interventionId: string | null;
  };
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function rounded(value: number | null, digits = 4) {
  return value === null ? null : Number(value.toFixed(digits));
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function standardDeviation(values: number[]) {
  const average = mean(values);
  if (average === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / values.length);
}

function meanAbsoluteDifference(values: number[]) {
  if (values.length < 2) return null;
  let total = 0;
  for (let index = 1; index < values.length; index += 1) total += Math.abs(values[index] - values[index - 1]);
  return total / (values.length - 1);
}

function meanDifference(values: number[]) {
  if (values.length < 2) return null;
  let total = 0;
  for (let index = 1; index < values.length; index += 1) total += values[index] - values[index - 1];
  return total / (values.length - 1);
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : [];
}

function contextFromMetadata(metadata: Row) {
  const context = record(metadata.context);
  return {
    declaredAttractor: text(context.declaredAttractor),
    desiredShift: text(context.desiredShift),
    targetAudience: text(context.targetAudience),
    prohibitedEffects: arrayOfStrings(context.prohibitedEffects),
  };
}

function featureMap(featureRows: Row[]) {
  return new Map(featureRows.map((row) => [String(row.feature_key ?? row.id), row]));
}

function featureNumber(features: Map<string, Row>, key: string) {
  return number(features.get(key)?.numeric_value);
}

function featureText(features: Map<string, Row>, key: string) {
  return text(features.get(key)?.text_value);
}

function featureEvidence(features: Map<string, Row>, key: string) {
  const row = features.get(key);
  return row?.id ? [String(row.id)] : [];
}

function energySeries(audioRow: Row | null) {
  return rows(audioRow?.energy_segments).map((item) => ({
    rms: number(item.rms),
    centroidHz: number(item.centroidHz),
  }));
}

function variable(
  key: MihmVariableKey,
  label: string,
  value: number | null,
  explanation: string,
  evidenceIds: string[],
  warnings: string[] = [],
): MihmVariable {
  return {
    key,
    label,
    value: rounded(value),
    status: value === null ? 'MISSING' : 'DERIVED',
    explanation,
    evidenceIds,
    warnings,
  };
}

function buildAudioMihm(features: Map<string, Row>, audioRow: Row | null, timeRows: Row[]) {
  const duration = featureNumber(features, 'duration_seconds');
  const dynamicRange = featureNumber(features, 'dynamic_range_db');
  const clippingRisk = featureNumber(features, 'clipping_risk');
  const crestFactor = featureNumber(features, 'crest_factor_db');
  const stereoWidth = featureNumber(features, 'stereo_width');
  const channelCount = featureNumber(features, 'channel_count');
  const semanticDensity = featureNumber(features, 'semantic_density');
  const semanticRecurrence = featureNumber(features, 'symbolic_recurrence');
  const energy = energySeries(audioRow);
  const rmsValues = energy.map((item) => item.rms).filter((item): item is number => item !== null);
  const centroidValues = energy.map((item) => item.centroidHz).filter((item): item is number => item !== null && item > 0);
  const averageEnergy = mean(rmsValues);
  const absoluteGradient = meanAbsoluteDifference(rmsValues);
  const normalizedGradient = averageEnergy !== null && averageEnergy > 0 && absoluteGradient !== null
    ? clamp01(absoluteGradient / averageEnergy)
    : null;
  const activeDensity = rmsValues.length ? rmsValues.filter((value) => value > 0.01).length / rmsValues.length : null;
  const onsetCount = timeRows.filter((row) => String(row.place_label ?? '').toLowerCase() === 'onset').length;
  const onsetRate = duration !== null && duration > 0 ? onsetCount / duration : null;
  const centroidAverage = mean(centroidValues);
  const centroidDeviation = standardDeviation(centroidValues);
  const centroidVariation = centroidAverage !== null && centroidAverage > 0 && centroidDeviation !== null
    ? clamp01(centroidDeviation / centroidAverage)
    : null;
  const compressionPressure = dynamicRange === null ? null : clamp01(1 - dynamicRange / 18);
  const clippingPressure = clippingRisk === null ? null : clamp01(clippingRisk / 0.01);
  const crestPressure = crestFactor === null ? null : clamp01(1 - crestFactor / 14);
  const frictionInputs = [compressionPressure, clippingPressure, normalizedGradient, crestPressure].filter((item): item is number => item !== null);
  const systemicFriction = frictionInputs.length >= 3
    ? clamp01((compressionPressure ?? 0) * 0.35 + (clippingPressure ?? 0) * 0.20 + (normalizedGradient ?? 0) * 0.30 + (crestPressure ?? 0) * 0.15)
    : null;
  const interactionDensity = activeDensity !== null && onsetRate !== null
    ? clamp01(activeDensity * 0.6 + clamp01(onsetRate / 4) * 0.4)
    : null;
  const systemicCoherence = centroidVariation === null ? null : clamp01(1 - centroidVariation);
  const decayRate = meanDifference(rmsValues.filter((value) => value > 0.01));
  const jumpPotential = decayRate === null ? null : clamp01(0.5 - decayRate * 10);
  const multichannelInteraction = channelCount !== null && channelCount > 1 && stereoWidth !== null ? clamp01(stereoWidth) : null;

  const variables: MihmVariable[] = [
    variable('F_s', 'Fricción sistémica', systemicFriction, 'Presión formal derivada de compresión dinámica, clipping, gradiente de energía y crest factor. No describe conflicto social ni significado narrativo.', [
      ...featureEvidence(features, 'dynamic_range_db'),
      ...featureEvidence(features, 'clipping_risk'),
      ...featureEvidence(features, 'crest_factor_db'),
      ...(audioRow?.id ? [String(audioRow.id)] : []),
    ], ['FORMAL_AUDIO_PROXY']),
    variable('D_i', 'Densidad de interacción', interactionDensity, 'Densidad de actividad y onsets por segundo sobre la señal decodificada.', [
      ...featureEvidence(features, 'duration_seconds'),
      ...(audioRow?.id ? [String(audioRow.id)] : []),
      ...timeRows.filter((row) => String(row.place_label ?? '').toLowerCase() === 'onset').slice(0, 20).map((row) => String(row.id)),
    ]),
    variable('G_f', 'Gradiente de fricción', normalizedGradient, 'Cambio medio absoluto entre segmentos RMS, normalizado por la energía media.', audioRow?.id ? [String(audioRow.id)] : []),
    variable('C_s', 'Coherencia sistémica', systemicCoherence, 'Estabilidad relativa del centroide espectral entre segmentos. Alta coherencia significa continuidad formal, no aprobación estética.', audioRow?.id ? [String(audioRow.id)] : [], ['SPECTRAL_COHERENCE_ONLY']),
    variable('D_cog', 'Desfase cognitivo', null, 'No existe todavía un modelo rítmico/expectacional calibrado para inferir desfase cognitivo desde este objeto.', [], ['RHYTHMIC_EXPECTATION_MODEL_REQUIRED']),
    variable('E_r', 'Energía relacional', null, 'El audio aislado no demuestra recepción, vínculo con audiencia ni respuesta relacional.', [], ['FIELD_RESPONSE_EVIDENCE_REQUIRED']),
    variable('V_i', 'Vector intencional', null, 'La intención no se infiere del archivo. Requiere atractor declarado y evidencia de ejecución dirigida.', [], ['DECLARED_INTENT_AND_EXECUTION_EVIDENCE_REQUIRED']),
    variable('I_mc', 'Interacción multicanal', multichannelInteraction, 'Proxy limitado basado en ancho estéreo cuando existen más de un canal.', [
      ...featureEvidence(features, 'channel_count'),
      ...featureEvidence(features, 'stereo_width'),
    ], multichannelInteraction === null ? ['MULTICHANNEL_EVIDENCE_REQUIRED'] : ['STEREO_WIDTH_PROXY']),
    variable('Phi', 'Potencial de salto', jumpPotential, 'Cambio direccional medio de la energía activa. Indica apertura formal para intervenir, no probabilidad de éxito cultural.', audioRow?.id ? [String(audioRow.id)] : [], ['FORMAL_TRANSITION_PROXY']),
    variable('R_sem', 'Recurrencia semántica', semanticRecurrence === null ? null : clamp01(semanticRecurrence), 'Solo disponible cuando existe evidencia textual o semántica persistida.', featureEvidence(features, 'symbolic_recurrence')),
    variable('C_sem', 'Coherencia semántica', semanticDensity === null ? null : clamp01(semanticDensity), 'Solo disponible cuando existe evidencia textual o semántica persistida.', featureEvidence(features, 'semantic_density')),
  ];

  const weights: Record<MihmVariableKey, number> = {
    F_s: 0.100, G_f: 0.100, C_s: 0.100, R_sem: 0.100, C_sem: 0.100, Phi: 0.100,
    I_mc: 0.083, E_r: 0.083, V_i: 0.083, D_i: 0.075, D_cog: 0.075,
  };
  const measured = variables.filter((item) => item.value !== null);
  const weightedSum = measured.length
    ? measured.reduce((sum, item) => sum + (item.value ?? 0) * weights[item.key], 0)
    : null;
  const byKey = new Map(variables.map((item) => [item.key, item.value]));
  const penalties: number[] = [];
  const f = byKey.get('F_s');
  const c = byKey.get('C_s');
  const d = byKey.get('D_i');
  const e = byKey.get('E_r');
  const dc = byKey.get('D_cog');
  const rs = byKey.get('R_sem');
  const gf = byKey.get('G_f');
  const vi = byKey.get('V_i');
  if (f !== null && f !== undefined && c !== null && c !== undefined && f > 0.6 && c < 0.4) penalties.push(0.10 * f * (1 - c));
  if (d !== null && d !== undefined && e !== null && e !== undefined && d > 0.6 && e < 0.4) penalties.push(0.10 * d * (1 - e));
  if (dc !== null && dc !== undefined && rs !== null && rs !== undefined && dc > 0.6 && rs < 0.4) penalties.push(0.10 * dc * (1 - rs));
  if (gf !== null && gf !== undefined && vi !== null && vi !== undefined && gf > 0.6 && vi < 0.4) penalties.push(0.10 * gf * (1 - vi));
  const penaltySum = penalties.length ? Math.min(0.5, penalties.reduce((sum, item) => sum + item, 0)) : 0;
  const coreKeys: MihmVariableKey[] = ['F_s', 'D_i', 'E_r', 'C_s', 'D_cog', 'G_f'];
  const coreMeasured = coreKeys.filter((key) => byKey.get(key) !== null && typeof byKey.get(key) !== 'undefined').length;
  const valid = coreMeasured === coreKeys.length;
  const ihg = valid && weightedSum !== null ? weightedSum - penaltySum : null;
  const coverage = measured.length / variables.length;
  const coreCoverage = coreMeasured / coreKeys.length;

  let summary = 'MIHM permanece parcial: el objeto aporta estructura formal, pero no demuestra relación, intención o recepción.';
  if (systemicFriction !== null && systemicCoherence !== null) {
    if (systemicFriction > 0.6 && systemicCoherence < 0.4) summary = 'La señal concentra fricción formal alta con coherencia baja: el sistema puede estar gastando energía en desorganización, no en dirección.';
    else if (systemicFriction > 0.6 && systemicCoherence >= 0.6) summary = 'La señal es densa y tensa, pero mantiene coherencia formal: la fricción parece organizada y puede funcionar como recurso expresivo.';
    else if (systemicFriction < 0.35 && systemicCoherence >= 0.6) summary = 'La señal mantiene baja fricción y alta continuidad formal: el punto de palanca no parece ser una reestructuración global.';
    else summary = 'La señal presenta una combinación intermedia de fricción y coherencia; cualquier intervención debe concentrarse en una zona puntual y verificable.';
  }

  return {
    status: valid ? 'VALID' as const : measured.length >= 4 ? 'PARTIAL' as const : 'BLOCKED' as const,
    coverage: rounded(coverage) ?? 0,
    coreCoverage: rounded(coreCoverage) ?? 0,
    variables,
    weightedSum: rounded(weightedSum),
    penaltySum: rounded(penaltySum),
    ihg: rounded(ihg),
    summary,
    limitations: [
      ...(valid ? [] : ['IHG_FINAL_BLOCKED_UNTIL_SIX_CORE_VARIABLES_ARE_MEASURED']),
      'AUDIO_FORM_DOES_NOT_ESTABLISH_CULTURAL_MEANING',
      'NO_RECEPTION_OR_OUTCOME_EVIDENCE',
    ],
  };
}

function buildNonAudioMihm(modality: string, features: Map<string, Row>) {
  const semanticDensity = featureNumber(features, 'semantic_density');
  const recurrence = featureNumber(features, 'symbolic_recurrence') ?? featureNumber(features, 'recurrence');
  const coherence = featureNumber(features, 'coherence');
  const friction = featureNumber(features, 'friction');
  const variables: MihmVariable[] = [
    variable('F_s', 'Fricción sistémica', friction === null ? null : clamp01(friction), 'Disponible únicamente cuando el extractor de la modalidad registra fricción.', featureEvidence(features, 'friction')),
    variable('D_i', 'Densidad de interacción', null, 'No existe densidad de interacción calibrada para esta modalidad.', []),
    variable('G_f', 'Gradiente de fricción', null, 'Requiere una serie longitudinal o temporal compatible.', []),
    variable('C_s', 'Coherencia sistémica', coherence === null ? null : clamp01(coherence), 'Coherencia observada por el extractor específico de la modalidad.', featureEvidence(features, 'coherence')),
    variable('D_cog', 'Desfase cognitivo', null, 'No existe modelo calibrado para esta modalidad.', []),
    variable('E_r', 'Energía relacional', null, 'Requiere evidencia de recepción o interacción.', []),
    variable('V_i', 'Vector intencional', null, 'Requiere intención declarada y resultado observado.', []),
    variable('I_mc', 'Interacción multicanal', null, 'No aplica o no fue medida.', []),
    variable('Phi', 'Potencial de salto', null, 'Requiere serie temporal compatible.', []),
    variable('R_sem', 'Recurrencia semántica', recurrence === null ? null : clamp01(recurrence), 'Recurrencia semántica o simbólica persistida.', [
      ...featureEvidence(features, 'symbolic_recurrence'),
      ...featureEvidence(features, 'recurrence'),
    ]),
    variable('C_sem', 'Coherencia semántica', semanticDensity === null ? null : clamp01(semanticDensity), 'Densidad/coherencia semántica persistida; no equivale por sí sola a verdad o claridad.', featureEvidence(features, 'semantic_density')),
  ];
  const measured = variables.filter((item) => item.value !== null);
  return {
    status: measured.length >= 4 ? 'PARTIAL' as const : 'BLOCKED' as const,
    coverage: rounded(measured.length / variables.length) ?? 0,
    coreCoverage: rounded(['F_s', 'D_i', 'E_r', 'C_s', 'D_cog', 'G_f'].filter((key) => variables.find((item) => item.key === key)?.value !== null).length / 6) ?? 0,
    variables,
    weightedSum: null,
    penaltySum: null,
    ihg: null,
    summary: `MIHM no puede emitir un IHG final para ${modality}: solo existen variables parciales de la modalidad y no hay cobertura de los seis componentes núcleo.`,
    limitations: ['IHG_FINAL_BLOCKED', 'MODALITY_SPECIFIC_CALIBRATION_REQUIRED', 'NO_RECEPTION_OR_OUTCOME_EVIDENCE'],
  };
}

function buildObjectReading(modality: string, features: Map<string, Row>, featureRows: Row[]) {
  const available = featureRows.filter((row) => number(row.numeric_value) !== null || text(row.text_value) !== null);
  const coverage = featureRows.length ? available.length / featureRows.length : 0;
  const limitations: string[] = [];
  const salientSignals: StudioObjectContextSynthesis['objectReading']['salientSignals'] = [];
  const add = (key: string, meaning: string) => {
    const row = features.get(key);
    if (!row) return;
    const value = number(row.numeric_value) ?? text(row.text_value);
    if (value === null) return;
    salientSignals.push({
      label: text(row.label) ?? key,
      value,
      meaning,
      evidenceIds: row.id ? [String(row.id)] : [],
    });
  };

  if (modality === 'music') {
    add('dynamic_range_db', 'Contraste de energía entre zonas silenciosas y fuertes.');
    add('clipping_risk', 'Riesgo técnico de saturación de muestras.');
    add('spectral_centroid_hz', 'Centro de gravedad espectral; describe brillo formal, no emoción.');
    add('spectral_flux', 'Cambio espectral entre ventanas; describe movilidad tímbrica.');
    add('crest_factor_db', 'Separación entre pico y energía media; aproxima presión dinámica.');
    limitations.push('NO_LYRICS_OR_SEMANTIC_CONTENT_ANALYZED', 'NO_AUDIENCE_RESPONSE_MEASURED');
  } else if (modality === 'text') {
    add('semantic_density', 'Diversidad léxica observada; no es juicio de profundidad.');
    add('symbolic_recurrence', 'Proporción de recurrencia de términos o símbolos.');
    add('dominant_terms', 'Términos dominantes observados.');
    add('recurrent_phrases', 'Frases recurrentes observadas.');
  } else if (modality === 'community') {
    add('friction', 'Fricción observada en la estructura comunitaria.');
    add('coherence', 'Coherencia observada entre mensajes o participantes.');
    add('recurrence', 'Persistencia temática o simbólica.');
    add('affective_tone', 'Tono afectivo registrado por el extractor conectado.');
  } else if (modality === 'image') {
    add('visual_entropy', 'Distribución de información visual.');
    add('texture_density', 'Densidad de textura observada.');
    add('spatial_balance', 'Balance espacial derivado de la imagen.');
    limitations.push('NO_SYMBOLIC_MEANING_WITHOUT_SEMANTIC_ANNOTATION');
  } else if (modality === 'video') {
    add('motion_intensity', 'Intensidad de movimiento observada.');
    add('transition_rhythm', 'Ritmo de transiciones observado.');
    add('shot_count', 'Cantidad de cortes o tomas detectadas.');
    limitations.push('NO_NARRATIVE_MEANING_WITHOUT_TRANSCRIPT_OR_ANNOTATION');
  }

  const semanticEvidence = ['semantic_density', 'symbolic_recurrence', 'dominant_terms', 'recurrent_phrases', 'affective_tone', 'coherence', 'friction']
    .some((key) => features.has(key));
  const interpretability = available.length === 0 ? 'INSUFFICIENT' as const : semanticEvidence ? 'FORMAL_AND_SEMANTIC' as const : 'FORMAL_ONLY' as const;
  const summary = available.length === 0
    ? 'El objeto está almacenado, pero no existen features suficientes para interpretarlo.'
    : `El objeto aporta ${available.length} observaciones utilizables. La lectura ${interpretability === 'FORMAL_ONLY' ? 'se limita a su forma medible' : 'incluye forma y evidencia semántica persistida'}.`;

  return {
    summary,
    evidenceCoverage: rounded(coverage) ?? 0,
    interpretability,
    salientSignals: salientSignals.slice(0, 8),
    limitations,
  };
}

function buildWorldRelation(
  modality: string,
  features: Map<string, Row>,
  lens: Awaited<ReturnType<typeof buildStudioCulturalLens>>,
): StudioObjectContextSynthesis['worldContext'] {
  const memeticTrend = lens.trends.find((item) => item.domain === 'MEMETIC');
  const recurrence = featureNumber(features, 'symbolic_recurrence') ?? featureNumber(features, 'recurrence');
  let relation: StudioObjectContextSynthesis['worldContext']['relation'] = 'INDETERMINATE';
  let explanation = 'El campo longitudinal se muestra como contexto, pero no existe una dimensión compartida suficiente para afirmar alineación causal.';

  if ((modality === 'text' || modality === 'community') && recurrence !== null && memeticTrend && memeticTrend.sampleCount >= 3 && memeticTrend.direction !== 'stable') {
    if (memeticTrend.direction === 'rising' && recurrence >= 0.55) {
      relation = 'ALIGNED';
      explanation = `La recurrencia observada del objeto (${rounded(recurrence)}) coincide formalmente con un vector MEMETIC ascendente de ${memeticTrend.sampleCount} snapshots. Esto indica alineación de persistencia, no éxito ni aceptación.`;
    } else if (memeticTrend.direction === 'rising' && recurrence < 0.30) {
      relation = 'COUNTER_SIGNAL';
      explanation = `El campo MEMETIC asciende, mientras el objeto presenta baja recurrencia (${rounded(recurrence)}). Puede operar como contra-señal formal, pero la recepción aún no está observada.`;
    }
  } else if (modality === 'music') {
    explanation = 'El audio permite comparar presión, continuidad y transición, pero no significado cultural. Se requiere letra, intención, audiencia o evidencia de recepción para declarar alineación con el campo.';
  }

  return {
    observedAt: lens.observedAt,
    status: lens.status,
    confidence: Number.isFinite(lens.confidence) ? rounded(lens.confidence) : null,
    dominantSignal: lens.dominantSignal,
    domains: lens.domainValues,
    trends: lens.trends,
    relation,
    explanation,
    warnings: lens.warnings,
  };
}

function evidenceIdsForVariables(variables: MihmVariable[], keys: MihmVariableKey[]) {
  return variables.filter((item) => keys.includes(item.key)).flatMap((item) => item.evidenceIds).filter((id, index, all) => all.indexOf(id) === index);
}

function buildLeverage(
  modality: string,
  context: StudioObjectContextSynthesis['context'],
  features: Map<string, Row>,
  mihm: StudioObjectContextSynthesis['mihm'],
): StudioObjectContextSynthesis['leverage'] {
  const preserves = [context.declaredAttractor, ...context.prohibitedEffects.map((item) => `Evitar: ${item}`)].filter((item): item is string => Boolean(item));
  if (!context.declaredAttractor) {
    return {
      status: 'BLOCKED',
      scope: null,
      targetVariable: null,
      minimumPerturbation: null,
      preserves,
      expectedSignal: null,
      verificationWindow: null,
      falsificationCriterion: null,
      rationale: 'No puede diseñarse una perturbación mínima sin declarar el atractor que debe preservarse o alcanzarse.',
      evidenceIds: [],
    };
  }

  if (modality !== 'music') {
    return {
      status: 'BLOCKED',
      scope: null,
      targetVariable: null,
      minimumPerturbation: null,
      preserves,
      expectedSignal: null,
      verificationWindow: null,
      falsificationCriterion: null,
      rationale: `Todavía no existe una regla de perturbación calibrada para la modalidad ${modality}. La lectura permanece diagnóstica, no prescriptiva.`,
      evidenceIds: [],
    };
  }

  const clippingRisk = featureNumber(features, 'clipping_risk');
  if (clippingRisk !== null && clippingRisk > 0.0015) {
    const evidenceIds = featureEvidence(features, 'clipping_risk');
    return {
      status: 'CANDIDATE',
      scope: 'production',
      targetVariable: 'F_s',
      minimumPerturbation: 'Reducir la ganancia de entrada o del limitador entre 1 y 2 dB en una nueva versión; no modificar composición, arreglo ni duración.',
      preserves,
      expectedSignal: 'clipping_risk <= 0.0015 y peak_dbfs < 0 sin reducción material del dynamic_range_db.',
      verificationWindow: '72h',
      falsificationCriterion: 'La perturbación se rechaza si clipping_risk no disminuye o si dynamic_range_db cae más de 1 dB.',
      rationale: `El riesgo de clipping observado (${rounded(clippingRisk, 6)}) cruza el umbral técnico. Es el punto de palanca más pequeño y reversible.`,
      evidenceIds,
    };
  }

  const dynamicRange = featureNumber(features, 'dynamic_range_db');
  if (dynamicRange !== null && dynamicRange < 5) {
    const evidenceIds = featureEvidence(features, 'dynamic_range_db');
    return {
      status: 'CANDIDATE',
      scope: 'arrangement',
      targetVariable: 'F_s',
      minimumPerturbation: 'Crear una sola ventana de contraste de 8–16 compases o 10–20 segundos, reduciendo 2–4 dB la densidad o energía de una sección; conservar motivo central, tonalidad y estructura global.',
      preserves,
      expectedSignal: 'dynamic_range_db aumenta al menos 2 dB sin elevar clipping_risk.',
      verificationWindow: '7d',
      falsificationCriterion: 'La perturbación se rechaza si el contraste no aumenta 2 dB o si debilita el atractor declarado en revisión comparativa.',
      rationale: `El rango dinámico observado (${rounded(dynamicRange)} dB) indica contraste seccional reducido. La intervención debe ser local, no una reescritura total.`,
      evidenceIds,
    };
  }

  const f = mihm.variables.find((item) => item.key === 'F_s')?.value ?? null;
  const c = mihm.variables.find((item) => item.key === 'C_s')?.value ?? null;
  const gf = mihm.variables.find((item) => item.key === 'G_f')?.value ?? null;
  const phi = mihm.variables.find((item) => item.key === 'Phi')?.value ?? null;
  if (f !== null && c !== null && f > 0.6 && c < 0.4) {
    const evidenceIds = evidenceIdsForVariables(mihm.variables, ['F_s', 'C_s', 'G_f']);
    return {
      status: 'CANDIDATE',
      scope: 'structure',
      targetVariable: 'C_s',
      minimumPerturbation: 'Modificar únicamente la transición con mayor gradiente: retirar o espaciar 10–15% de los eventos simultáneos durante esa zona, preservando el motivo central y el resto del arreglo.',
      preserves,
      expectedSignal: 'C_s aumenta al menos 0.08 o F_s disminuye al menos 0.08 sin reducir Phi.',
      verificationWindow: '7d',
      falsificationCriterion: 'La perturbación se rechaza si C_s/F_s no cambian en la dirección esperada o si Phi disminuye más de 0.05.',
      rationale: 'La combinación de fricción alta y coherencia baja indica que la palanca está en una transición específica, no en el objeto completo.',
      evidenceIds,
    };
  }

  if (gf !== null && phi !== null && gf > 0.55 && phi > 0.55) {
    const evidenceIds = evidenceIdsForVariables(mihm.variables, ['G_f', 'Phi']);
    return {
      status: 'CANDIDATE',
      scope: 'structure',
      targetVariable: 'Phi',
      minimumPerturbation: 'Ajustar solo el punto de transición de mayor gradiente —entrada, corte o automatización— y conservar todas las demás secciones sin cambios.',
      preserves,
      expectedSignal: 'La transición mantiene G_f observable y eleva la legibilidad del salto sin aumentar F_s.',
      verificationWindow: '7d',
      falsificationCriterion: 'La perturbación se rechaza si F_s aumenta más de 0.05 o si una revisión A/B no identifica la transición con mayor claridad.',
      rationale: 'Existe gradiente suficiente y potencial de salto; la zona de transición es el punto de palanca más pequeño disponible.',
      evidenceIds,
    };
  }

  return {
    status: 'NO_CHANGE_REQUIRED',
    scope: null,
    targetVariable: null,
    minimumPerturbation: null,
    preserves,
    expectedSignal: 'Mantener las variables observadas dentro de sus rangos actuales y registrar recepción/outcome antes de alterar la estructura.',
    verificationWindow: '7d',
    falsificationCriterion: 'Reabrir intervención solo si aparece nueva evidencia, una variable cruza umbral o el outcome contradice el atractor.',
    rationale: 'Ninguna variable medida cruza una regla de perturbación calibrada. La acción correcta es conservar y observar.',
    evidenceIds: mihm.variables.flatMap((item) => item.evidenceIds).slice(0, 20),
  };
}

async function persistSynthesis(object: Row, synthesis: StudioObjectContextSynthesis) {
  const service = createServiceSupabaseClient();
  await service.from('studio_interventions').delete().eq('object_id', synthesis.objectId).contains('payload', { synthesisSource: STUDIO_OBJECT_SYNTHESIS_SOURCE });
  await service.from('studio_hypotheses').delete().eq('object_id', synthesis.objectId).eq('origin', STUDIO_OBJECT_SYNTHESIS_SOURCE);
  await service.from('studio_evidence_traces').delete().eq('object_id', synthesis.objectId).eq('source', STUDIO_OBJECT_SYNTHESIS_SOURCE);

  let hypothesisId: string | null = null;
  let interventionId: string | null = null;
  if (synthesis.hypothesis) {
    const hypothesisInsert = await service.from('studio_hypotheses').insert({
      object_id: synthesis.objectId,
      origin: STUDIO_OBJECT_SYNTHESIS_SOURCE,
      severity: synthesis.leverage.status === 'CANDIDATE' ? 'watch' : 'info',
      statement: synthesis.hypothesis.statement,
      recommended_change: synthesis.leverage.minimumPerturbation,
      route: synthesis.leverage.status === 'CANDIDATE' ? 'inspect' : 'hold',
      sources: synthesis.hypothesis.evidenceIds,
      payload: {
        synthesisSource: STUDIO_OBJECT_SYNTHESIS_SOURCE,
        synthesisVersion: STUDIO_OBJECT_SYNTHESIS_VERSION,
        expectedSignal: synthesis.hypothesis.expectedSignal,
        verificationWindow: synthesis.hypothesis.verificationWindow,
        falsificationCriterion: synthesis.hypothesis.falsificationCriterion,
        worldRelation: synthesis.worldContext.relation,
        mihm: synthesis.mihm,
      },
    }).select('id').single();
    if (hypothesisInsert.error) throw new Error(`studio_hypotheses_insert_failed: ${hypothesisInsert.error.message}`);
    hypothesisId = String(hypothesisInsert.data.id);

    if (synthesis.leverage.status === 'CANDIDATE') {
      const interventionInsert = await service.from('studio_interventions').insert({
        object_id: synthesis.objectId,
        hypothesis_id: hypothesisId,
        title: synthesis.leverage.minimumPerturbation ?? 'Minimum perturbation candidate',
        state: 'queued',
        scope: synthesis.leverage.scope ?? 'overview',
        expected_impact: null,
        risk: null,
        payload: {
          synthesisSource: STUDIO_OBJECT_SYNTHESIS_SOURCE,
          synthesisVersion: STUDIO_OBJECT_SYNTHESIS_VERSION,
          preserves: synthesis.leverage.preserves,
          targetVariable: synthesis.leverage.targetVariable,
          expectedSignal: synthesis.leverage.expectedSignal,
          verificationWindow: synthesis.leverage.verificationWindow,
          falsificationCriterion: synthesis.leverage.falsificationCriterion,
          evidenceIds: synthesis.leverage.evidenceIds,
          status: 'CANDIDATE_NOT_EXECUTED',
        },
      }).select('id').single();
      if (interventionInsert.error) throw new Error(`studio_interventions_insert_failed: ${interventionInsert.error.message}`);
      interventionId = String(interventionInsert.data.id);
    }
  }

  const evidenceInsert = await service.from('studio_evidence_traces').insert({
    object_id: synthesis.objectId,
    source: STUDIO_OBJECT_SYNTHESIS_SOURCE,
    label: 'Studio object-context synthesis',
    payload: synthesis,
  }).select('id').single();
  if (evidenceInsert.error) throw new Error(`studio_evidence_traces_insert_failed: ${evidenceInsert.error.message}`);
  const evidenceTraceId = String(evidenceInsert.data.id);

  const metadata = {
    ...record(object.metadata),
    objectContextSynthesis: {
      version: synthesis.version,
      status: synthesis.status,
      generatedAt: synthesis.generatedAt,
      evidenceTraceId,
      hypothesisId,
      interventionId,
      leverageStatus: synthesis.leverage.status,
    },
  };
  const objectUpdate = await service.from('studio_objects').update({ metadata, updated_at: new Date().toISOString() }).eq('id', synthesis.objectId);
  if (objectUpdate.error) throw new Error(`studio_object_synthesis_metadata_update_failed: ${objectUpdate.error.message}`);
  return { evidenceTraceId, hypothesisId, interventionId };
}

export async function getPersistedStudioObjectSynthesis(objectId: string): Promise<StudioObjectContextSynthesis | null> {
  const service = createServiceSupabaseClient();
  const result = await service
    .from('studio_evidence_traces')
    .select('payload')
    .eq('object_id', objectId)
    .eq('source', STUDIO_OBJECT_SYNTHESIS_SOURCE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(`studio_synthesis_read_failed: ${result.error.message}`);
  return result.data?.payload ? result.data.payload as StudioObjectContextSynthesis : null;
}

export async function synthesizeStudioObject(objectId: string, options: { persist?: boolean } = {}): Promise<StudioObjectContextSynthesis> {
  const service = createServiceSupabaseClient();
  const [objectResult, featureResult, audioResult, timeResult] = await Promise.all([
    service.from('studio_objects').select('*').eq('id', objectId).maybeSingle(),
    service.from('studio_object_features').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
    service.from('studio_audio_features').select('*').eq('object_id', objectId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    service.from('studio_time_coordinates').select('*').eq('object_id', objectId).order('created_at', { ascending: false }).limit(512),
  ]);
  if (objectResult.error || !objectResult.data) throw new Error(objectResult.error?.message ?? 'STUDIO_OBJECT_NOT_FOUND');
  if (featureResult.error) throw new Error(featureResult.error.message);
  if (audioResult.error) throw new Error(audioResult.error.message);
  if (timeResult.error) throw new Error(timeResult.error.message);

  const object = objectResult.data as Row;
  const featureRows = rows(featureResult.data);
  const features = featureMap(featureRows);
  const modality = String(object.object_type ?? 'unknown');
  const context = contextFromMetadata(record(object.metadata));
  const [lens] = await Promise.all([buildStudioCulturalLens()]);
  const objectReading = buildObjectReading(modality, features, featureRows);
  const worldContext = buildWorldRelation(modality, features, lens);
  const mihm = modality === 'music'
    ? buildAudioMihm(features, audioResult.data ? record(audioResult.data) : null, rows(timeResult.data))
    : buildNonAudioMihm(modality, features);
  const leverage = buildLeverage(modality, context, features, mihm);
  const hypothesis = leverage.status === 'CANDIDATE' && leverage.expectedSignal && leverage.verificationWindow && leverage.falsificationCriterion
    ? {
      statement: `Si se aplica "${leverage.minimumPerturbation}" mientras se preserva "${context.declaredAttractor}", entonces ${leverage.expectedSignal}`,
      expectedSignal: leverage.expectedSignal,
      verificationWindow: leverage.verificationWindow,
      falsificationCriterion: leverage.falsificationCriterion,
      evidenceIds: leverage.evidenceIds,
    }
    : null;
  const status: StudioObjectContextSynthesis['status'] = objectReading.interpretability === 'INSUFFICIENT'
    ? 'BLOCKED'
    : mihm.status === 'VALID' && worldContext.relation !== 'INDETERMINATE' && leverage.status !== 'BLOCKED'
      ? 'COMPLETE'
      : 'PARTIAL';

  const synthesis: StudioObjectContextSynthesis = {
    version: STUDIO_OBJECT_SYNTHESIS_VERSION,
    objectId,
    objectTitle: String(object.title ?? 'Studio object'),
    modality,
    generatedAt: new Date().toISOString(),
    status,
    context,
    objectReading,
    worldContext,
    mihm,
    leverage,
    hypothesis,
    persistence: { evidenceTraceId: null, hypothesisId: null, interventionId: null },
  };

  if (options.persist !== false) {
    synthesis.persistence = await persistSynthesis(object, synthesis);
  }
  return synthesis;
}
