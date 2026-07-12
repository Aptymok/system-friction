import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { buildStudioCulturalLens } from './studioCulturalLens';
import { synthesizeStudioObject, type StudioObjectContextSynthesis } from './objectContextSynthesis';

export const STUDIO_FIELD_PROJECTION_SOURCE = 'studio_field_projection_v2';
export const STUDIO_FIELD_PROJECTION_VERSION = '2026-07-11.2';

type Row = Record<string, unknown>;
type DomainName = 'CULTURAL' | 'MEMETIC' | 'AFFECTIVE';
type MihmKey = 'F_s' | 'D_i' | 'G_f' | 'C_s' | 'D_cog' | 'E_r' | 'V_i' | 'I_mc' | 'Phi' | 'R_sem' | 'C_sem';

type SharedDimension = {
  id: string;
  label: string;
  objectValue: number;
  fieldValue: number;
  compatibility: number;
  weight: number;
  dataClass: 'SEMANTIC_SHARED' | 'FORMAL_PROXY';
  explanation: string;
  evidenceIds: string[];
};

type StrategyRoute = {
  id: 'INTEGRATE_FIELD' | 'PRESERVE_COUNTER_SIGNAL' | 'TECHNICAL_OPTIMIZE';
  title: string;
  suitability: number;
  goal: string;
  rationale: string;
  microAdjustments: string[];
  expectedShift: string;
  verification: string[];
  guardrails: string[];
  evidenceIds: string[];
  confidence: number;
};

export type StudioFieldProjection = {
  version: string;
  objectId: string;
  generatedAt: string;
  status: 'PROJECTED' | 'PARTIAL' | 'INSUFFICIENT';
  world: {
    observedAt: string | null;
    regime: 'HIGH_PRESSURE' | 'VECTORIAL_TENSION' | 'TRANSITION' | 'LOW_SIGNAL' | 'INDETERMINATE';
    summary: string;
    dominantDomain: DomainName | null;
    dominantSignal: string | null;
    confidence: number;
    domains: Array<{ domain: string; value: number; confidence: number | null; sourceCount: number }>;
    trends: Array<{ domain: string; direction: 'rising' | 'falling' | 'stable'; slope: number; sampleCount: number }>;
    crossVectorTensions: Array<{
      between: [DomainName, DomainName];
      magnitude: number;
      description: string;
      evidence: string[];
    }>;
    inferredAttractors: Array<{
      id: string;
      label: string;
      description: string;
      confidence: number;
      basis: string[];
    }>;
  };
  object: {
    summary: string;
    interpretability: StudioObjectContextSynthesis['objectReading']['interpretability'];
    mihmStatus: StudioObjectContextSynthesis['mihm']['status'];
    mihmCoverage: number;
    mihmCoreCoverage: number;
    partialVector: Array<{
      key: string;
      value: number | null;
      status: string;
      meaning: string;
      evidenceIds: string[];
    }>;
    dominantProperties: string[];
  };
  fit: {
    metric: 'FIELD_COMPATIBILITY_NOT_ACCEPTANCE';
    score: number | null;
    percentage: number | null;
    band: 'HIGH_ALIGNMENT' | 'COMPATIBLE' | 'MIXED' | 'COUNTER_SIGNAL' | 'INDETERMINATE';
    confidence: number;
    coverage: number;
    explanation: string;
    sharedDimensions: SharedDimension[];
    missingDimensions: string[];
    acceptanceProbability: null;
    acceptanceReason: 'OUTCOME_CALIBRATION_REQUIRED';
  };
  opportunityWindow: {
    status: 'OPEN_NOW' | 'EMERGING' | 'TEST_WINDOW' | 'NARROW' | 'COUNTER_SIGNAL_WINDOW' | 'INDETERMINATE';
    starts: 'NOW' | 'AFTER_VALIDATION' | 'UNKNOWN';
    minimumDays: number | null;
    maximumDays: number | null;
    basis: string;
    exitConditions: string[];
    formulaVersion: string;
  };
  strategy: {
    selectedAttractor: string | null;
    attractorSource: 'USER' | 'SYSTEM' | 'NONE';
    selectedRouteId: StrategyRoute['id'] | null;
    selectionReason: string;
    automaticGuardrails: string[];
    userGuardrails: string[];
    routes: StrategyRoute[];
    userInputRequired: false;
    userInputPurpose: string;
  };
  calibration: {
    status: 'UNCALIBRATED_FOR_ACCEPTANCE';
    currentOutput: string;
    minimumComparableCases: number;
    recommendedComparableCases: number;
    requiredOutcomeFields: string[];
    upgradeCondition: string;
  };
  evidenceIds: string[];
  persistence: {
    evidenceTraceId: string | null;
    hypothesisId: string | null;
    interventionIds: string[];
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

function numeric(value: unknown): number | null {
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
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function featureMap(featureRows: Row[]) {
  return new Map(featureRows.map((row) => [String(row.feature_key ?? row.id), row]));
}

function featureNumber(features: Map<string, Row>, key: string) {
  return numeric(features.get(key)?.numeric_value);
}

function featureEvidence(features: Map<string, Row>, key: string) {
  const row = features.get(key);
  return row?.id ? [String(row.id)] : [];
}

function mihmValue(synthesis: StudioObjectContextSynthesis, key: MihmKey) {
  return synthesis.mihm.variables.find((item) => item.key === key)?.value ?? null;
}

function mihmEvidence(synthesis: StudioObjectContextSynthesis, key: MihmKey) {
  return synthesis.mihm.variables.find((item) => item.key === key)?.evidenceIds ?? [];
}

function unique(values: string[]) {
  return values.filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
}

function domainName(value: string): DomainName | null {
  return value === 'CULTURAL' || value === 'MEMETIC' || value === 'AFFECTIVE' ? value : null;
}

function buildWorldState(lens: Awaited<ReturnType<typeof buildStudioCulturalLens>>) {
  const domains = lens.domainValues.filter((item) => domainName(item.domain));
  const sorted = [...domains].sort((a, b) => b.value - a.value);
  const dominant = sorted[0] ?? null;
  const domainByName = new Map(domains.map((item) => [item.domain, item]));
  const trendByName = new Map(lens.trends.map((item) => [item.domain, item]));
  const values = domains.map((item) => item.value);
  const spread = values.length ? Math.max(...values) - Math.min(...values) : 0;
  const rising = lens.trends.filter((item) => item.sampleCount >= 3 && item.direction === 'rising').length;
  const falling = lens.trends.filter((item) => item.sampleCount >= 3 && item.direction === 'falling').length;

  const tensions: StudioFieldProjection['world']['crossVectorTensions'] = [];
  const pairs: Array<[DomainName, DomainName]> = [
    ['CULTURAL', 'MEMETIC'],
    ['CULTURAL', 'AFFECTIVE'],
    ['MEMETIC', 'AFFECTIVE'],
  ];
  for (const pair of pairs) {
    const a = domainByName.get(pair[0]);
    const b = domainByName.get(pair[1]);
    if (!a || !b) continue;
    const magnitude = Math.abs(a.value - b.value);
    const trendA = trendByName.get(pair[0]);
    const trendB = trendByName.get(pair[1]);
    const directionalConflict = trendA && trendB && trendA.sampleCount >= 3 && trendB.sampleCount >= 3
      && ((trendA.direction === 'rising' && trendB.direction === 'falling') || (trendA.direction === 'falling' && trendB.direction === 'rising'));
    if (magnitude < 0.18 && !directionalConflict) continue;
    const higher = a.value >= b.value ? pair[0] : pair[1];
    const lower = higher === pair[0] ? pair[1] : pair[0];
    tensions.push({
      between: pair,
      magnitude: rounded(magnitude) ?? 0,
      description: directionalConflict
        ? `${pair[0]} y ${pair[1]} se desplazan en direcciones opuestas; el campo no tiene una única dirección estable.`
        : `${higher} concentra más presión que ${lower}; la diferencia actual es ${rounded(magnitude)}.`,
      evidence: [`world.domain.${pair[0]}`, `world.domain.${pair[1]}`, `world.trend.${pair[0]}`, `world.trend.${pair[1]}`],
    });
  }

  let regime: StudioFieldProjection['world']['regime'] = 'INDETERMINATE';
  const average = mean(values);
  if (values.length) {
    if (spread >= 0.28 || (rising > 0 && falling > 0)) regime = 'VECTORIAL_TENSION';
    else if (average >= 0.65) regime = 'HIGH_PRESSURE';
    else if (average >= 0.38 || rising > 0) regime = 'TRANSITION';
    else regime = 'LOW_SIGNAL';
  }

  const dominantName = dominant ? domainName(dominant.domain) : null;
  const dominantTrend = dominantName ? trendByName.get(dominantName) : null;
  const summary = dominantName
    ? `El campo actual está en régimen ${regime}. ${dominantName} es el vector dominante (${rounded(dominant?.value ?? null)}), con trayectoria ${dominantTrend?.direction ?? 'sin tendencia suficiente'}. ${tensions.length ? `Se observan ${tensions.length} tensión(es) cruzadas entre vectores.` : 'Los tres vectores relevantes no presentan una divergencia fuerte con la evidencia disponible.'}`
    : 'WorldSpect no aporta cobertura suficiente para identificar régimen, dirección dominante o tensión cruzada.';

  const attractors: StudioFieldProjection['world']['inferredAttractors'] = [];
  if (dominantName && dominant) {
    const descriptor: Record<DomainName, { label: string; description: string }> = {
      CULTURAL: {
        label: 'COHERENCIA CULTURAL RECONOCIBLE',
        description: 'Formas legibles y consistentes que pueden sostener identidad sin depender de novedad extrema.',
      },
      MEMETIC: {
        label: 'PERSISTENCIA Y RECONOCIMIENTO',
        description: 'Elementos capaces de reaparecer, recordarse o circular bajo atención fragmentada.',
      },
      AFFECTIVE: {
        label: 'ACTIVACIÓN AFECTIVA ORGANIZADA',
        description: 'Intensidad perceptible que mantiene estructura suficiente para no convertirse en ruido indiferenciado.',
      },
    };
    const item = descriptor[dominantName];
    attractors.push({
      id: `ATTRACTOR_${dominantName}`,
      label: item.label,
      description: item.description,
      confidence: rounded(clamp01((dominant.confidence ?? lens.confidence) * (dominantTrend?.sampleCount && dominantTrend.sampleCount >= 3 ? 1 : 0.72))) ?? 0,
      basis: [`world.domain.${dominantName}`, `world.trend.${dominantName}`],
    });
  }
  const cultural = domainByName.get('CULTURAL');
  const memetic = domainByName.get('MEMETIC');
  const culturalTrend = trendByName.get('CULTURAL');
  const memeticTrend = trendByName.get('MEMETIC');
  if (cultural && memetic && (memetic.value - cultural.value >= 0.18 || (memeticTrend?.direction === 'rising' && culturalTrend?.direction === 'falling'))) {
    attractors.unshift({
      id: 'ATTRACTOR_RECOGNITION_UNDER_FRAGMENTED_ATTENTION',
      label: 'RECONOCIMIENTO BAJO ATENCIÓN FRAGMENTADA',
      description: 'El campo favorece señales comprimidas o recurrentes, mientras la integración cultural es menor o pierde dirección.',
      confidence: rounded(clamp01(lens.confidence * 0.84)) ?? 0,
      basis: ['world.domain.CULTURAL', 'world.domain.MEMETIC', 'world.trend.CULTURAL', 'world.trend.MEMETIC'],
    });
  }

  return {
    observedAt: lens.observedAt,
    regime,
    summary,
    dominantDomain: dominantName,
    dominantSignal: lens.dominantSignal,
    confidence: rounded(lens.confidence) ?? 0,
    domains: lens.domainValues,
    trends: lens.trends,
    crossVectorTensions: tensions,
    inferredAttractors: attractors,
  };
}

function buildSharedDimensions(synthesis: StudioObjectContextSynthesis, lens: Awaited<ReturnType<typeof buildStudioCulturalLens>>) {
  const domains = new Map(lens.domainValues.map((item) => [item.domain, item]));
  const dimensions: SharedDimension[] = [];
  const add = (input: {
    id: string;
    label: string;
    objectValue: number | null;
    domain: DomainName;
    weight: number;
    dataClass: SharedDimension['dataClass'];
    explanation: string;
    evidenceIds: string[];
  }) => {
    const field = domains.get(input.domain);
    if (input.objectValue === null || !field) return;
    dimensions.push({
      id: input.id,
      label: input.label,
      objectValue: rounded(input.objectValue) ?? 0,
      fieldValue: rounded(field.value) ?? 0,
      compatibility: rounded(clamp01(1 - Math.abs(input.objectValue - field.value))) ?? 0,
      weight: input.weight,
      dataClass: input.dataClass,
      explanation: input.explanation,
      evidenceIds: unique([...input.evidenceIds, `world.domain.${input.domain}`]),
    });
  };

  add({
    id: 'affective_pressure',
    label: 'Presión afectiva / fricción formal',
    objectValue: mihmValue(synthesis, 'F_s'),
    domain: 'AFFECTIVE',
    weight: 0.65,
    dataClass: 'FORMAL_PROXY',
    explanation: 'Compara presión formal del objeto con presión afectiva del campo. Es un proxy estructural, no una equivalencia emocional.',
    evidenceIds: mihmEvidence(synthesis, 'F_s'),
  });
  add({
    id: 'cultural_coherence',
    label: 'Continuidad formal / campo cultural',
    objectValue: mihmValue(synthesis, 'C_s'),
    domain: 'CULTURAL',
    weight: 0.65,
    dataClass: 'FORMAL_PROXY',
    explanation: 'Compara coherencia formal del objeto con densidad del vector cultural. No demuestra gusto ni aprobación.',
    evidenceIds: mihmEvidence(synthesis, 'C_s'),
  });
  add({
    id: 'memetic_recurrence',
    label: 'Recurrencia semántica / campo memético',
    objectValue: mihmValue(synthesis, 'R_sem'),
    domain: 'MEMETIC',
    weight: 1,
    dataClass: 'SEMANTIC_SHARED',
    explanation: 'Dimensión compartida cuando el objeto contiene recurrencia textual o simbólica medible.',
    evidenceIds: mihmEvidence(synthesis, 'R_sem'),
  });

  const totalWeight = dimensions.reduce((sum, item) => sum + item.weight, 0);
  const score = totalWeight > 0
    ? dimensions.reduce((sum, item) => sum + item.compatibility * item.weight, 0) / totalWeight
    : null;
  const coverage = dimensions.length / 3;
  const confidencePenalty = synthesis.objectReading.interpretability === 'FORMAL_ONLY' ? 0.74 : 1;
  const confidence = score === null
    ? 0
    : clamp01(lens.confidence * (0.35 + coverage * 0.65) * (0.4 + synthesis.mihm.coverage * 0.6) * confidencePenalty);

  let band: StudioFieldProjection['fit']['band'] = 'INDETERMINATE';
  if (score !== null) {
    if (score >= 0.75) band = 'HIGH_ALIGNMENT';
    else if (score >= 0.58) band = 'COMPATIBLE';
    else if (score >= 0.42) band = 'MIXED';
    else band = 'COUNTER_SIGNAL';
  }
  const missing = [
    dimensions.some((item) => item.id === 'affective_pressure') ? null : 'AFFECTIVE_PRESSURE',
    dimensions.some((item) => item.id === 'cultural_coherence') ? null : 'CULTURAL_COHERENCE',
    dimensions.some((item) => item.id === 'memetic_recurrence') ? null : 'MEMETIC_RECURRENCE',
  ].filter((item): item is string => Boolean(item));

  return {
    metric: 'FIELD_COMPATIBILITY_NOT_ACCEPTANCE' as const,
    score: rounded(score),
    percentage: score === null ? null : Math.round(score * 100),
    band,
    confidence: rounded(confidence) ?? 0,
    coverage: rounded(coverage) ?? 0,
    explanation: score === null
      ? 'No existen dimensiones compartidas suficientes para comparar el objeto con el campo.'
      : `La compatibilidad de campo estimada es ${Math.round(score * 100)}% con confianza ${Math.round(confidence * 100)}%. Mide semejanza en dimensiones disponibles; no es una probabilidad de aceptación ni de éxito.`,
    sharedDimensions: dimensions,
    missingDimensions: missing,
    acceptanceProbability: null,
    acceptanceReason: 'OUTCOME_CALIBRATION_REQUIRED' as const,
  };
}

function buildOpportunityWindow(world: ReturnType<typeof buildWorldState>, fit: StudioFieldProjection['fit']): StudioFieldProjection['opportunityWindow'] {
  if (!world.dominantDomain || world.confidence < 0.25) {
    return {
      status: 'INDETERMINATE',
      starts: 'UNKNOWN',
      minimumDays: null,
      maximumDays: null,
      basis: 'La cobertura o confianza del campo es insuficiente para proyectar una ventana temporal.',
      exitConditions: ['Restaurar cobertura WorldSpect', 'Acumular al menos tres snapshots comparables'],
      formulaVersion: 'studio.field_window.heuristic.v1',
    };
  }
  const trend = world.trends.find((item) => item.domain === world.dominantDomain);
  if (!trend || trend.sampleCount < 3) {
    return {
      status: 'TEST_WINDOW',
      starts: 'AFTER_VALIDATION',
      minimumDays: 3,
      maximumDays: 7,
      basis: 'Existe estado actual, pero no una trayectoria longitudinal suficiente; solo se justifica una prueba breve.',
      exitConditions: ['La prueba A/B no produce señal observable', 'La confianza del campo cae por debajo de 0.25'],
      formulaVersion: 'studio.field_window.heuristic.v1',
    };
  }
  const strong = Math.abs(trend.slope) >= 0.03;
  if (trend.direction === 'rising') {
    return {
      status: fit.band === 'COUNTER_SIGNAL' ? 'EMERGING' : 'OPEN_NOW',
      starts: 'NOW',
      minimumDays: strong ? 3 : 7,
      maximumDays: strong ? 14 : 30,
      basis: `${world.dominantDomain} asciende con pendiente ${trend.slope} durante ${trend.sampleCount} observaciones. La duración es una proyección heurística condicionada a que la dirección persista.`,
      exitConditions: [`${world.dominantDomain} cambia a estable o descendente`, 'La compatibilidad cambia más de 0.15', 'La confianza WorldSpect cae por debajo de 0.25'],
      formulaVersion: 'studio.field_window.heuristic.v1',
    };
  }
  if (trend.direction === 'falling') {
    return {
      status: fit.band === 'COUNTER_SIGNAL' ? 'COUNTER_SIGNAL_WINDOW' : 'NARROW',
      starts: 'NOW',
      minimumDays: 1,
      maximumDays: strong ? 7 : 14,
      basis: `${world.dominantDomain} desciende; la ventana es corta y debe tratarse como uso táctico o contra-señal, no como tendencia estable.`,
      exitConditions: [`${world.dominantDomain} continúa descendiendo`, 'La prueba inicial no registra retención o recurrencia'],
      formulaVersion: 'studio.field_window.heuristic.v1',
    };
  }
  return {
    status: 'TEST_WINDOW',
    starts: 'NOW',
    minimumDays: 3,
    maximumDays: 14,
    basis: `${world.dominantDomain} permanece estable; no hay aceleración suficiente para afirmar una ventana expansiva.`,
    exitConditions: ['El vector cambia de dirección', 'La respuesta observada contradice la hipótesis de compatibilidad'],
    formulaVersion: 'studio.field_window.heuristic.v1',
  };
}

function buildAutomaticGuardrails(features: Map<string, Row>, synthesis: StudioObjectContextSynthesis) {
  const guardrails: string[] = [];
  const duration = featureNumber(features, 'duration_seconds');
  const dynamicRange = featureNumber(features, 'dynamic_range_db');
  const centroid = featureNumber(features, 'spectral_centroid_hz');
  const clipping = featureNumber(features, 'clipping_risk');
  const phi = mihmValue(synthesis, 'Phi');
  const coherence = mihmValue(synthesis, 'C_s');
  if (duration !== null) guardrails.push(`Mantener la duración dentro de ±2% de ${rounded(duration, 2)} s salvo que se elija explícitamente una reestructuración.`);
  if (dynamicRange !== null) guardrails.push(`No reducir el rango dinámico más de 1 dB respecto a ${rounded(dynamicRange, 2)} dB.`);
  if (centroid !== null) guardrails.push(`No desplazar el centroide espectral más de 12% respecto a ${Math.round(centroid)} Hz sin una razón estratégica.`);
  if (clipping !== null) guardrails.push(`No aumentar clipping_risk por encima de ${rounded(clipping, 6)}.`);
  if (phi !== null) guardrails.push(`No reducir Phi más de 0.05 respecto a ${rounded(phi)}.`);
  if (coherence !== null) guardrails.push(`No reducir C_s más de 0.08 respecto a ${rounded(coherence)}.`);
  return guardrails;
}

function routeConfidence(base: number, fit: StudioFieldProjection['fit']) {
  return rounded(clamp01(base * (0.45 + fit.confidence * 0.55))) ?? 0;
}

function buildRoutes(input: {
  synthesis: StudioObjectContextSynthesis;
  features: Map<string, Row>;
  world: ReturnType<typeof buildWorldState>;
  fit: StudioFieldProjection['fit'];
  automaticGuardrails: string[];
  userGuardrails: string[];
}) {
  const { synthesis, features, world, fit, automaticGuardrails, userGuardrails } = input;
  const allGuardrails = unique([...automaticGuardrails, ...userGuardrails.map((item) => `Preferencia del usuario: ${item}`)]);
  const f = mihmValue(synthesis, 'F_s');
  const c = mihmValue(synthesis, 'C_s');
  const gf = mihmValue(synthesis, 'G_f');
  const phi = mihmValue(synthesis, 'Phi');
  const recurrence = mihmValue(synthesis, 'R_sem');
  const dynamicRange = featureNumber(features, 'dynamic_range_db');
  const clipping = featureNumber(features, 'clipping_risk');
  const evidenceIds = unique([
    ...synthesis.mihm.variables.flatMap((item) => item.evidenceIds),
    ...fit.sharedDimensions.flatMap((item) => item.evidenceIds),
  ]).slice(0, 30);

  const technical: string[] = [];
  if (clipping !== null && clipping > 0.0015) technical.push('Reducir 1–2 dB la ganancia de entrada o limitador; volver a medir clipping y rango dinámico.');
  if (dynamicRange !== null && dynamicRange < 5) technical.push('Crear una única ventana de contraste de 10–20 s reduciendo 2–4 dB la densidad local; conservar motivo y duración global.');
  if (f !== null && c !== null && f > 0.6 && c < 0.4) technical.push('Simplificar solo la transición de mayor gradiente, retirando o espaciando 10–15% de eventos simultáneos.');
  if (gf !== null && phi !== null && gf > 0.55 && phi > 0.55) technical.push('Acentuar una sola entrada, corte o automatización en el punto de mayor gradiente; no modificar las demás secciones.');
  if (!technical.length) technical.push('No realizar cambios estructurales todavía; conservar versión y producir una comparación A/B únicamente si aparece una hipótesis concreta.');

  const integration: string[] = [];
  const affective = fit.sharedDimensions.find((item) => item.id === 'affective_pressure');
  const cultural = fit.sharedDimensions.find((item) => item.id === 'cultural_coherence');
  const memetic = fit.sharedDimensions.find((item) => item.id === 'memetic_recurrence');
  if (affective) {
    const gap = affective.fieldValue - affective.objectValue;
    if (gap > 0.12) integration.push('Incrementar intensidad únicamente en un punto focal —hook, entrada o clímax— entre 1 y 2 dB o mediante 5–10% más densidad; evitar elevar toda la pieza.');
    if (gap < -0.12) integration.push('Introducir una liberación local de 8–16 compases o 10–20 s para reducir presión continua sin perder la tensión central.');
  }
  if (cultural) {
    const gap = cultural.fieldValue - cultural.objectValue;
    if (gap > 0.12) integration.push('Aumentar legibilidad en la transición más inestable: reducir una capa, anticipar un retorno o limpiar un conflicto espectral puntual.');
    if (gap < -0.12) integration.push('Conservar coherencia, pero permitir una anomalía controlada en una sola sección para evitar integración excesivamente neutra.');
  }
  const memeticTrend = world.trends.find((item) => item.domain === 'MEMETIC');
  if (!memetic && memeticTrend?.direction === 'rising') integration.push('Añadir un único punto de retorno reconocible —motivo, frase, textura o gesto— sin repetirlo de forma continua; después medir recuerdo o recurrencia real.');
  if (memetic && memetic.fieldValue - memetic.objectValue > 0.12) integration.push('Reintroducir una vez el ancla semántica o simbólica dominante en la segunda mitad de la pieza.');
  if (!integration.length) integration.push('La forma ya se encuentra cerca de las dimensiones compartidas disponibles; priorizar distribución, timing y prueba de recepción antes que reescritura.');

  const counter: string[] = [
    'Preservar las desviaciones que producen contraste con el vector dominante; corregir solo fallas técnicas demostrables.',
    'Probar un fragmento de 15–30 s frente a una versión más integrada y medir retención, repetición, guardados o comentarios específicos.',
  ];
  if (world.regime === 'VECTORIAL_TENSION') counter.push('Usar la tensión entre vectores como ventaja: no intentar satisfacer simultáneamente CULTURAL, MEMETIC y AFFECTIVE; elegir una contradicción legible.');
  if (recurrence === null) counter.push('No añadir repetición por defecto: primero comprobar si la singularidad ya funciona como contra-señal reconocible.');

  const integrationSuitability = fit.score === null ? 0.42 : clamp01(0.35 + fit.score * 0.65);
  const counterSuitability = fit.score === null ? 0.45 : clamp01(0.35 + (1 - fit.score) * 0.65 + (world.regime === 'VECTORIAL_TENSION' ? 0.08 : 0));
  const technicalSuitability = clamp01(technical.some((item) => !item.startsWith('No realizar')) ? 0.82 : 0.48);

  const routes: StrategyRoute[] = [
    {
      id: 'INTEGRATE_FIELD',
      title: 'INTEGRAR CON EL CAMPO',
      suitability: rounded(integrationSuitability) ?? 0,
      goal: 'Aumentar compatibilidad con la dirección cultural/memética/afectiva disponible sin rehacer la identidad completa del objeto.',
      rationale: fit.score === null ? 'La integración se plantea como escenario exploratorio porque faltan dimensiones compartidas.' : `La compatibilidad actual es ${fit.percentage}%; esta ruta intenta cerrar las diferencias observadas, no garantizar aceptación.`,
      microAdjustments: integration,
      expectedShift: 'Aumentar compatibilidad en las dimensiones compartidas y mejorar legibilidad del punto focal sin deteriorar los guardrails.',
      verification: ['Recalcular features y MIHM sobre la nueva versión', 'Comparar compatibilidad de campo antes/después', 'Realizar prueba A/B con exposición comparable'],
      guardrails: allGuardrails,
      evidenceIds,
      confidence: routeConfidence(0.72, fit),
    },
    {
      id: 'PRESERVE_COUNTER_SIGNAL',
      title: 'PRESERVAR LA CONTRA-SEÑAL',
      suitability: rounded(counterSuitability) ?? 0,
      goal: 'Mantener la diferencia que puede volver al objeto reconocible cuando el campo está saturado o vectorialmente dividido.',
      rationale: world.regime === 'VECTORIAL_TENSION' ? 'El campo presenta tensiones cruzadas; una integración total puede eliminar la diferencia útil.' : 'Esta ruta conserva singularidad y exige evidencia de recepción antes de adaptar la estructura.',
      microAdjustments: counter,
      expectedShift: 'Conservar distancia frente al vector dominante mientras se elimina únicamente fricción técnica no intencional.',
      verification: ['Comparar recuerdo/recurrencia entre versión original e integrada', 'No aceptar la ruta si la diferencia no produce señal observable', 'Registrar audiencia, exposición y ventana'],
      guardrails: allGuardrails,
      evidenceIds,
      confidence: routeConfidence(0.64, fit),
    },
    {
      id: 'TECHNICAL_OPTIMIZE',
      title: 'OPTIMIZAR SIN CAMBIAR DIRECCIÓN',
      suitability: rounded(technicalSuitability) ?? 0,
      goal: 'Corregir puntos técnicos o estructurales locales sin afirmar una estrategia cultural que la evidencia todavía no sostiene.',
      rationale: technical.length ? 'Los ajustes se derivan de umbrales y combinaciones MIHM observadas.' : 'No hay un cambio técnico obligatorio; la ruta sirve como control.',
      microAdjustments: technical,
      expectedShift: 'Mejorar legibilidad o estabilidad técnica sin reducir la identidad formal observada.',
      verification: ['Reanalizar métricas técnicas', 'Confirmar que C_s y Phi no se deterioran', 'Conservar una versión original para reversión'],
      guardrails: allGuardrails,
      evidenceIds,
      confidence: routeConfidence(0.84, fit),
    },
  ];
  return routes.sort((a, b) => b.suitability - a.suitability);
}

function selectRoute(context: StudioObjectContextSynthesis['context'], routes: StrategyRoute[]) {
  const desired = (context.desiredShift ?? '').toLowerCase();
  if (/integr|acept|alcance|legib|circul/.test(desired)) {
    return { id: 'INTEGRATE_FIELD' as const, reason: 'La preferencia opcional del usuario apunta a integración, alcance o legibilidad.' };
  }
  if (/singular|difer|contraste|rareza|contra.?señal/.test(desired)) {
    return { id: 'PRESERVE_COUNTER_SIGNAL' as const, reason: 'La preferencia opcional del usuario apunta a preservar diferencia o contra-señal.' };
  }
  const first = routes[0];
  return first ? { id: first.id, reason: `Studio seleccionó la ruta con mayor pertinencia derivada (${rounded(first.suitability)}). El usuario puede elegir otra sin recalibrar el objeto.` } : { id: null, reason: 'No existe una ruta evaluable.' };
}

async function persistProjection(objectId: string, projection: StudioFieldProjection) {
  const service = createServiceSupabaseClient();
  await service.from('studio_interventions').delete().eq('object_id', objectId).contains('payload', { projectionSource: STUDIO_FIELD_PROJECTION_SOURCE });
  await service.from('studio_hypotheses').delete().eq('object_id', objectId).eq('origin', STUDIO_FIELD_PROJECTION_SOURCE);
  await service.from('studio_evidence_traces').delete().eq('object_id', objectId).eq('source', STUDIO_FIELD_PROJECTION_SOURCE);

  const selected = projection.strategy.routes.find((item) => item.id === projection.strategy.selectedRouteId) ?? projection.strategy.routes[0] ?? null;
  let hypothesisId: string | null = null;
  const interventionIds: string[] = [];
  if (selected) {
    const hypothesis = await service.from('studio_hypotheses').insert({
      object_id: objectId,
      origin: STUDIO_FIELD_PROJECTION_SOURCE,
      severity: projection.fit.band === 'COUNTER_SIGNAL' || projection.world.regime === 'VECTORIAL_TENSION' ? 'watch' : 'info',
      statement: `${projection.world.summary} ${projection.fit.explanation} Ruta principal: ${selected.title}.`,
      recommended_change: selected.microAdjustments.join(' '),
      route: 'inspect',
      sources: projection.evidenceIds,
      payload: {
        projectionSource: STUDIO_FIELD_PROJECTION_SOURCE,
        projectionVersion: STUDIO_FIELD_PROJECTION_VERSION,
        fit: projection.fit,
        opportunityWindow: projection.opportunityWindow,
        selectedAttractor: projection.strategy.selectedAttractor,
        selectedRouteId: selected.id,
        calibration: projection.calibration,
      },
    }).select('id').single();
    if (hypothesis.error) throw new Error(`studio_projection_hypothesis_failed: ${hypothesis.error.message}`);
    hypothesisId = String(hypothesis.data.id);

    for (const route of projection.strategy.routes) {
      const inserted = await service.from('studio_interventions').insert({
        object_id: objectId,
        hypothesis_id: hypothesisId,
        title: `${route.title}: ${route.microAdjustments[0] ?? route.goal}`,
        state: 'queued',
        scope: route.id === 'TECHNICAL_OPTIMIZE' ? 'overview' : route.id === 'INTEGRATE_FIELD' ? 'arrangement' : 'distribution',
        expected_impact: null,
        risk: null,
        payload: {
          projectionSource: STUDIO_FIELD_PROJECTION_SOURCE,
          projectionVersion: STUDIO_FIELD_PROJECTION_VERSION,
          route,
          status: 'SCENARIO_NOT_EXECUTED',
          acceptanceProbability: null,
        },
      }).select('id').single();
      if (inserted.error) throw new Error(`studio_projection_intervention_failed: ${inserted.error.message}`);
      interventionIds.push(String(inserted.data.id));
    }
  }

  const evidence = await service.from('studio_evidence_traces').insert({
    object_id: objectId,
    source: STUDIO_FIELD_PROJECTION_SOURCE,
    label: 'Studio field compatibility and opportunity projection',
    payload: projection,
  }).select('id').single();
  if (evidence.error) throw new Error(`studio_projection_evidence_failed: ${evidence.error.message}`);
  return { evidenceTraceId: String(evidence.data.id), hypothesisId, interventionIds };
}

export async function getPersistedStudioFieldProjection(objectId: string): Promise<StudioFieldProjection | null> {
  const service = createServiceSupabaseClient();
  const result = await service
    .from('studio_evidence_traces')
    .select('payload')
    .eq('object_id', objectId)
    .eq('source', STUDIO_FIELD_PROJECTION_SOURCE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(`studio_projection_read_failed: ${result.error.message}`);
  return result.data?.payload ? result.data.payload as StudioFieldProjection : null;
}

export async function projectStudioObjectField(objectId: string, options: { persist?: boolean } = {}): Promise<StudioFieldProjection> {
  const service = createServiceSupabaseClient();
  const [objectResult, featureResult, lens, synthesis] = await Promise.all([
    service.from('studio_objects').select('id, title, object_type, metadata').eq('id', objectId).maybeSingle(),
    service.from('studio_object_features').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
    buildStudioCulturalLens(),
    synthesizeStudioObject(objectId, { persist: false }),
  ]);
  if (objectResult.error || !objectResult.data) throw new Error(objectResult.error?.message ?? 'STUDIO_OBJECT_NOT_FOUND');
  if (featureResult.error) throw new Error(featureResult.error.message);

  const object = record(objectResult.data);
  const features = featureMap(rows(featureResult.data));
  const world = buildWorldState(lens);
  const fit = buildSharedDimensions(synthesis, lens);
  const opportunityWindow = buildOpportunityWindow(world, fit);
  const automaticGuardrails = buildAutomaticGuardrails(features, synthesis);
  const userGuardrails = synthesis.context.prohibitedEffects;
  const routes = buildRoutes({ synthesis, features, world, fit, automaticGuardrails, userGuardrails });
  const selectedRoute = selectRoute(synthesis.context, routes);
  const selectedAttractor = synthesis.context.declaredAttractor ?? world.inferredAttractors[0]?.label ?? null;
  const attractorSource = synthesis.context.declaredAttractor ? 'USER' as const : selectedAttractor ? 'SYSTEM' as const : 'NONE' as const;
  const dominantProperties = synthesis.mihm.variables
    .filter((item) => item.value !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 4)
    .map((item) => `${item.key} ${item.label}: ${rounded(item.value)}`);
  const evidenceIds = unique([
    ...synthesis.mihm.variables.flatMap((item) => item.evidenceIds),
    ...fit.sharedDimensions.flatMap((item) => item.evidenceIds),
  ]).slice(0, 40);

  const projection: StudioFieldProjection = {
    version: STUDIO_FIELD_PROJECTION_VERSION,
    objectId,
    generatedAt: new Date().toISOString(),
    status: fit.score === null && synthesis.mihm.coverage < 0.25 ? 'INSUFFICIENT' : fit.coverage < 0.67 ? 'PARTIAL' : 'PROJECTED',
    world,
    object: {
      summary: synthesis.objectReading.summary,
      interpretability: synthesis.objectReading.interpretability,
      mihmStatus: synthesis.mihm.status,
      mihmCoverage: synthesis.mihm.coverage,
      mihmCoreCoverage: synthesis.mihm.coreCoverage,
      partialVector: synthesis.mihm.variables.map((item) => ({
        key: item.key,
        value: item.value,
        status: item.status,
        meaning: item.explanation,
        evidenceIds: item.evidenceIds,
      })),
      dominantProperties,
    },
    fit,
    opportunityWindow,
    strategy: {
      selectedAttractor,
      attractorSource,
      selectedRouteId: selectedRoute.id,
      selectionReason: selectedRoute.reason,
      automaticGuardrails,
      userGuardrails,
      routes,
      userInputRequired: false,
      userInputPurpose: 'Los datos del usuario son opcionales. Sirven para escoger una ruta o añadir límites personales; no son necesarios para que Studio produzca diagnóstico y escenarios.',
    },
    calibration: {
      status: 'UNCALIBRATED_FOR_ACCEPTANCE',
      currentOutput: 'Studio emite compatibilidad de campo, confianza y ventana de oportunidad. No emite probabilidad de aceptación.',
      minimumComparableCases: 30,
      recommendedComparableCases: 100,
      requiredOutcomeFields: [
        'object/version and MIHM vector at release',
        'WorldSpect snapshot and cultural vector at release',
        'release time, channel and audience definition',
        'normalized exposure or impressions',
        'plays/views and completion rate',
        'saves, shares and repeat consumption',
        'qualitative response labels',
        '7-day and 30-day outcomes',
      ],
      upgradeCondition: 'Solo convertir compatibilidad en probabilidad de aceptación después de calibrar y validar fuera de muestra con casos comparables y exposición normalizada.',
    },
    evidenceIds,
    persistence: { evidenceTraceId: null, hypothesisId: null, interventionIds: [] },
  };

  if (options.persist !== false) {
    projection.persistence = await persistProjection(String(object.id ?? objectId), projection);
  }
  return projection;
}
