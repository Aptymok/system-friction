import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';
import { buildOperationalCycle } from '@/lib/scorefriction/operationalCycle';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';
import type { StudioGoldState } from './studioGoldState';
import { buildStudioGoldDegradedState } from './studioGoldDegradedState';
import {
  buildCulturalWavePoints,
  clamp01,
  intensityFromValue,
  roundMetric,
  seriesFromValue,
  trendFromDelta,
} from '@/components/studio/gold/visual/studioWaveMath';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeValue(value: unknown, fallback = 0) {
  const parsed = num(value, fallback);
  return parsed > 1 ? clamp01(parsed / 100) : clamp01(parsed);
}

function daysSince(value: unknown) {
  const date = str(value);
  if (!date) return 0;
  const parsed = Date.parse(date);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
}

function avg(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function domainValue(vectors: Row[], domains: string[]) {
  const values = vectors
    .filter((vector) => domains.includes(str(vector.domain).toUpperCase()))
    .map((vector) => normalizeValue(vector.value));
  return roundMetric(avg(values), 3);
}

function vectorFor(vectors: Row[], domains: string[]) {
  return vectors.find((vector) => domains.includes(str(vector.domain).toUpperCase())) ?? null;
}

function labelForSignal(row: Row) {
  return str(row.vector)
    || str(row.domain)
    || str(row.status)
    || str(row.id)
    || 'senal persistente';
}

function trendForSignal(row: Row) {
  const persistence = normalizeValue(row.persistence);
  const trust = normalizeValue(row.trust);
  return trendFromDelta(persistence, trust);
}

function engineState(value: number, blocked = false): StudioGoldState['engines'][number]['state'] {
  if (blocked) return 'blocked';
  if (value >= 0.62) return 'active';
  if (value > 0) return 'degraded';
  return 'standby';
}

function buildPmvField(reach: number, coverage: number, impact: number) {
  const base = [reach, coverage, impact, avg([reach, coverage, impact])].map(clamp01);
  return Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    const source = base[index % base.length];
    return {
      angle: Number(angle.toFixed(4)),
      radius: roundMetric(0.22 + source * 0.68, 3),
      intensity: roundMetric(source, 3),
    };
  });
}

function statefulDecisionFrom(impact: number) {
  if (impact >= 0.66) return 'Preparar prueba de release y narrativa de posicionamiento.';
  if (impact >= 0.34) return 'Refinar arreglo, evidencia de audiencia y tension narrativa.';
  return 'Mantener objeto en observacion antes de invertir produccion.';
}

function systemStateFrom(params: {
  worldspectOk: boolean;
  scorefrictionOk: boolean;
  warnings: string[];
  hasCase: boolean;
}): StudioGoldState['systemState'] {
  const joined = params.warnings.join(' ').toLowerCase();
  if (/offline|fatal|critical/.test(joined)) return 'critical';
  if (!params.worldspectOk && !params.scorefrictionOk) return 'offline';
  if (!params.hasCase || params.warnings.length || !params.worldspectOk || !params.scorefrictionOk) return 'degraded';
  return 'nominal';
}

async function withSourceTimeout<T>(source: string, promise: Promise<T>, ms = 3200): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${source}_timeout_${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function readStudioGoldState(): Promise<StudioGoldState> {
  const generatedAt = new Date().toISOString();
  const limits: string[] = [];
  const degradedSources: string[] = [];

  try {
    const [scoreState, worldResult] = await Promise.all([
      withSourceTimeout('scorefriction_scope_state', buildScoreFrictionScopeState()).catch((error) => {
        degradedSources.push('scorefriction_scope_state');
        limits.push(error instanceof Error ? error.message : 'scorefriction_scope_state_failed');
        return null;
      }),
      withSourceTimeout('worldspect_vector_snapshot', readWorldSpectVectorSnapshot()).catch((error) => {
        degradedSources.push('worldspect_vector_snapshot');
        limits.push(error instanceof Error ? error.message : 'worldspect_vector_snapshot_failed');
        return null;
      }),
    ]);

    const selectedContext = record(record(scoreState).selectedContext);
    const latestObservation = record(selectedContext.latest_observation);
    const latestVectors = record(selectedContext.latest_vectors);
    const latestReading = record(record(scoreState).latestReading);
    const caseId = str(selectedContext.case_id) || str(latestObservation.case_id);
    const evidenceCount = num(selectedContext.evidence_count);

    const cycle = await withSourceTimeout('scorefriction_operational_cycle', buildOperationalCycle({
      case_id: caseId || 'STUDIO-GOLD',
      scope: 'culture',
      analysis_modes: ['MIHM', 'PSI', 'WORLDSPECT', 'SCOREFRICTION', 'AMV'],
      run_contrast: false,
    })).catch((error) => {
      degradedSources.push('scorefriction_operational_cycle');
      limits.push(error instanceof Error ? error.message : 'scorefriction_operational_cycle_failed');
      return null;
    });

    const snapshot = record(worldResult?.snapshot);
    const vectors = rows(snapshot.vectors);
    const warnings = [
      ...rows([]),
      ...((scoreState?.warnings ?? []) as string[]),
      ...(cycle?.technical_state?.warnings ?? []),
    ].filter((warning): warning is string => typeof warning === 'string' && warning.trim().length > 0);

    if (worldResult?.status !== 'ACTIVE') {
      degradedSources.push('worldspect_vector_snapshot');
      limits.push('worldspect snapshot bootstrapped or inactive');
    }
    if (!caseId) {
      degradedSources.push('scorefriction_active_case');
      limits.push('no active ScoreFriction case found');
    }
    if (warnings.length) degradedSources.push(...warnings);

    const economic = domainValue(vectors, ['ECONOMY']);
    const political = domainValue(vectors, ['GEOPOLITICAL', 'INSTITUTIONAL']);
    const technological = domainValue(vectors, ['TECH', 'GEO_DIGITAL']);
    const cultural = domainValue(vectors, ['CULTURAL', 'MEMETIC', 'AFFECTIVE']);
    const ecological = domainValue(vectors, ['CLIMATE', 'BIO']);
    const global = roundMetric(normalizeValue(snapshot.wsi), 3);
    const analyticCoverage = roundMetric(normalizeValue(snapshot.sourceCoverage), 3);

    const mihmVector = record(latestVectors.mihm_cultural_vector);
    const cycleMihm = cycle?.mihm;
    const hasMihmData = Boolean(
      cycleMihm?.available
      || typeof mihmVector.IHG_C === 'number'
      || typeof mihmVector.FS_C === 'number'
      || typeof mihmVector.LCP === 'number'
      || typeof mihmVector.SCR === 'number',
    );
    const individual = roundMetric(normalizeValue(cycleMihm?.homeostasis ?? mihmVector.IHG_C), 3);
    const group = roundMetric(normalizeValue(cycle?.psi?.persistence ?? mihmVector.LCP), 3);
    const institutional = roundMetric(normalizeValue(mihmVector.SCR ?? political), 3);
    const systemic = hasMihmData ? roundMetric(1 - normalizeValue(cycleMihm?.degradation ?? mihmVector.FS_C), 3) : 0;
    const civilizational = roundMetric(avg([global, cultural, ecological]), 3);

    const culturalVector = vectorFor(vectors, ['CULTURAL', 'MEMETIC', 'AFFECTIVE']);
    const filteredVector = record(cycle?.filtered_vector);
    const hasFilteredVector = Boolean(culturalVector || Object.keys(filteredVector).length > 0);
    const fieldDegradation = filteredVector.degradation ?? culturalVector?.degradation;
    const coherenceGlobal = roundMetric(avg([global, individual, systemic, normalizeValue(cycle?.scorefriction?.opportunity)]), 3);
    const culturalEntropy = roundMetric(avg([normalizeValue(snapshot.nti), normalizeValue(culturalVector?.volatility), normalizeValue(filteredVector.degradation)]), 3);
    const symbolicDensity = roundMetric(avg([cultural, normalizeValue(culturalVector?.persistence), normalizeValue(cycle?.psi?.symbolic_identity)]), 3);
    const plasticity = roundMetric(avg([
      normalizeValue(cycle?.scorefriction?.opportunity),
      normalizeValue(cycle?.scorefriction?.attraction),
      hasFilteredVector ? 1 - normalizeValue(fieldDegradation, 1) : 0,
    ]), 3);
    const waveSpeed = roundMetric(avg([normalizeValue(culturalVector?.velocity), normalizeValue(snapshot.nti), normalizeValue(filteredVector.velocity)]) * 3, 2);
    const progress = caseId ? roundMetric(avg([analyticCoverage, normalizeValue(evidenceCount / 12), normalizeValue(selectedContext.source_coverage)]), 2) : 0;

    const weakSignals = rows(cycle?.weak_signals);
    const persistentSignals = rows(cycle?.persistent_signals);
    const signalRows = persistentSignals.length ? persistentSignals : vectors.filter((vector) => normalizeValue(vector.persistence) > 0);
    const observables = [
      { id: 'O-WSV', label: 'World Systems Vector', value: global, trend: trendFromDelta(global, normalizeValue(snapshot.nti)) },
      { id: 'O-CUL', label: 'Campo cultural', value: cultural, trend: trendFromDelta(cultural, economic) },
      { id: 'O-MIHM', label: 'Coherencia MIHM', value: individual, trend: trendFromDelta(individual, systemic) },
      { id: 'O-PSI', label: 'Persistencia simbolica', value: group, trend: trendFromDelta(group, culturalEntropy) },
      { id: 'O-SF', label: 'Oportunidad ScoreFriction', value: normalizeValue(cycle?.scorefriction?.opportunity), trend: trendFromDelta(normalizeValue(cycle?.scorefriction?.opportunity), normalizeValue(cycle?.scorefriction?.perturbation_need)) },
    ].filter((item) => item.value > 0 || caseId);

    const experiment = cycle?.recommended_experiments?.[0] ?? null;
    const pmvReach = roundMetric(normalizeValue(cycle?.scorefriction?.attraction), 3);
    const pmvCoverage = roundMetric(analyticCoverage, 3);
    const pmvImpact = roundMetric(normalizeValue(experiment?.confidence ?? cycle?.scorefriction?.opportunity), 3);
    const pmvState: StudioGoldState['pmv']['state'] = !caseId || experiment?.status === 'blocked_no_object'
      ? 'blocked'
      : experiment?.status === 'ready_for_test'
        ? 'ready'
        : 'draft';

    const longitudinal = signalRows.slice(0, 5).map((row, index) => {
      const value = roundMetric(normalizeValue(row.persistence ?? row.value ?? row.trust), 3);
      return {
        id: str(row.id) || str(row.vector) || str(row.domain) || `SIGNAL-${index + 1}`,
        label: labelForSignal(row),
        value,
        series: seriesFromValue(value),
      };
    });

    const sourceCoverage = normalizeValue(selectedContext.source_coverage);
    const totalObservables = Math.round(evidenceCount + vectors.reduce((sum, vector) => sum + num(vector.source_count), 0));
    const activePercentage = totalObservables > 0
      ? roundMetric(avg([analyticCoverage, normalizeValue(evidenceCount / Math.max(1, totalObservables))]), 3)
      : 0;
    const objectMeasurementState: StudioGoldState['objectEvaluation']['measurementState'] = !caseId
      ? 'blocked'
      : degradedSources.length
        ? 'degraded'
        : 'ready';
    const objectMeasurements: StudioGoldState['objectEvaluation']['measurements'] = [
      { id: 'OBJ-WSV', label: 'Ajuste WorldSpect', value: global, source: 'readWorldSpectVectorSnapshot' },
      { id: 'OBJ-CUL', label: 'Coherencia cultural', value: coherenceGlobal, source: 'culturalWave.coherenceGlobal' },
      { id: 'OBJ-SYM', label: 'Densidad simbolica', value: symbolicDensity, source: 'culturalWave.symbolicDensity' },
      { id: 'OBJ-MIHM', label: 'Lectura MIHM sistemica', value: systemic, source: hasMihmData ? 'buildOperationalCycle.mihm' : 'MIHM_SOURCE_UNAVAILABLE' },
      { id: 'OBJ-PMV', label: 'Impacto productor / PMV', value: pmvState === 'blocked' ? null : pmvImpact, source: pmvState === 'blocked' ? 'WAITING_FOR_OBJECT' : 'recommended_experiments[0]' },
    ];
    const engines: StudioGoldState['engines'] = [
      { id: 'observation', label: 'Motor de Observacion', description: 'Cobertura y calidad de datos', value: analyticCoverage, state: engineState(analyticCoverage) },
      { id: 'modeling', label: 'Motor de Modelado', description: 'Precision de modelos', value: individual, state: engineState(individual, !cycle?.mihm?.available) },
      { id: 'simulation', label: 'Motor de Simulacion', description: 'Fiabilidad predictiva', value: pmvImpact, state: engineState(pmvImpact, pmvState === 'blocked') },
      { id: 'intervention', label: 'Motor de Intervencion', description: 'Eficacia de perturbaciones', value: pmvReach, state: engineState(pmvReach, pmvState === 'blocked') },
      { id: 'learning', label: 'Motor de Aprendizaje', description: 'Adaptacion y mejora continua', value: sourceCoverage, state: engineState(sourceCoverage) },
      { id: 'synthesis', label: 'Motor de Sintesis', description: 'Coherencia integradora', value: coherenceGlobal, state: engineState(coherenceGlobal) },
    ];

    const state: StudioGoldState = {
      generatedAt,
      systemState: systemStateFrom({
        worldspectOk: Boolean(worldResult?.ok && worldResult.status === 'ACTIVE'),
        scorefrictionOk: Boolean(scoreState?.ok),
        warnings,
        hasCase: Boolean(caseId),
      }),
      activeCase: {
        id: caseId || null,
        title: str(latestReading.label) || (caseId ? `Caso ${caseId}` : 'SIN CASO ACTIVO'),
        phase: str(cycle?.object_presence === 'provided' ? cycle?.object_type : cycle?.regime?.world) || 'sin fase confirmada',
        progress,
        signals: evidenceCount,
        activeDays: daysSince(latestObservation.created_at || latestReading.observedAt),
        hypothesis: str(experiment?.hypothesis)
          || str(cycle?.object_vs_world?.meaning)
          || 'No hay hipotesis operacional activa confirmada.',
      },
      keyObservables: observables,
      persistentSignals: signalRows.slice(0, 5).map((row, index) => {
        const value = normalizeValue(row.persistence ?? row.value ?? row.trust);
        return {
          id: str(row.id) || str(row.vector) || str(row.domain) || `SP-${index + 1}`,
          label: labelForSignal(row),
          intensity: intensityFromValue(value),
          trend: trendForSignal(row),
        };
      }),
      culturalWave: {
        coherenceGlobal,
        culturalEntropy,
        symbolicDensity,
        plasticity,
        waveSpeed,
        analyticCoverage,
        points: buildCulturalWavePoints({
          coherence: coherenceGlobal,
          entropy: culturalEntropy,
          density: symbolicDensity,
          plasticity,
          coverage: analyticCoverage,
        }),
        markers: [
          { x: 0.08, label: 'NARRATIVAS EMERGENTES', kind: 'narrative' },
          { x: 0.32, label: 'PUNTOS DE FRICCION SISTEMICA', kind: 'friction' },
          { x: 0.60, label: 'VENTANAS DE OPORTUNIDAD', kind: 'opportunity' },
          { x: 0.84, label: 'PROTO-SINTESIS CULTURAL', kind: 'synthesis' },
        ],
      },
      wsvLens: { economic, political, technological, cultural, ecological, global },
      mihmModel: { individual, group, institutional, systemic, civilizational },
      observablesMatrix: {
        symbolic: symbolicDensity,
        cognitive: individual,
        affective: domainValue(vectors, ['AFFECTIVE', 'MEMETIC']),
        conductual: roundMetric(normalizeValue(cycle?.scorefriction?.direction_bias), 3),
        institutional,
        technological,
        totalObservables,
        activePercentage,
      },
      objectEvaluation: {
        objectId: caseId || null,
        title: str(latestReading.label) || (caseId ? `Objeto ${caseId}` : 'SIN OBJETO MUSICAL CARGADO'),
        objectType: caseId ? str(cycle?.object_type) || str(cycle?.object_presence) || 'cultural_object' : null,
        measurementState: objectMeasurementState,
        measurements: objectMeasurements,
        agents: [
          { id: 'agent-observation', label: 'Agente de escucha', role: 'Detecta evidencia y senales del objeto musical.', value: analyticCoverage, state: engines[0].state },
          { id: 'agent-modeling', label: 'Agente MIHM', role: 'Modela friccion, coherencia y lectura multinivel.', value: systemic, state: engines[1].state },
          { id: 'agent-scorefriction', label: 'Agente ScoreFriction', role: 'Evalua oportunidad, atraccion y necesidad de perturbacion.', value: pmvImpact, state: engines[2].state },
          { id: 'agent-producer', label: 'Agente productor', role: 'Ordena decision musical, release y siguiente accion.', value: pmvReach, state: engines[3].state },
          { id: 'agent-synthesis', label: 'Agente de sintesis', role: 'Integra lectura cultural en una decision de produccion.', value: coherenceGlobal, state: engines[5].state },
        ],
        producerWorkflow: {
          currentDecision: pmvState === 'blocked' ? 'Cargar objeto musical real antes de decidir.' : str(experiment?.hypothesis) || statefulDecisionFrom(pmvImpact),
          nextAction: str(cycle?.alert?.action_required) || str(experiment?.action) || 'Registrar evidencia concreta antes de ejecutar.',
          risk: pmvState === 'blocked' ? 'Sin audio, texto o caso activo no hay medicion del objeto.' : (warnings[0] ?? null),
        },
      },
      pmv: {
        id: experiment?.id ?? (caseId ? `PMV-${caseId}` : 'PMV-BLOQUEADA'),
        intensity: pmvState === 'blocked' ? 'bloqueada' : pmvImpact >= 0.66 ? 'alta' : pmvImpact >= 0.34 ? 'media' : 'baja',
        hypothesis: str(experiment?.hypothesis) || 'No se disena PMV sin objeto/caso operativo.',
        reach: pmvReach,
        coverage: pmvCoverage,
        expectedImpact: pmvImpact,
        state: pmvState,
        field: buildPmvField(pmvReach, pmvCoverage, pmvImpact),
      },
      longitudinalTracking: longitudinal,
      synthesis: {
        researchNote: str(cycle?.world_context?.summary) || 'Sin resumen WorldSpect activo.',
        implication: str(cycle?.object_vs_world?.meaning) || 'La implicacion queda limitada por falta de objeto evaluado.',
        nextAction: str(cycle?.alert?.action_required) || str(experiment?.action) || 'Registrar evidencia concreta antes de ejecutar.',
        confidence: roundMetric(avg([coherenceGlobal, analyticCoverage, pmvImpact]), 3),
      },
      engines,
      provenance: {
        basedOn: [
          'buildScoreFrictionScopeState',
          'buildOperationalCycle',
          'readWorldSpectVectorSnapshot',
          '/api/studio/pipeline contract',
        ],
        degradedSources: Array.from(new Set(degradedSources)),
        limits: Array.from(new Set(limits)),
      },
    };

    return state;
  } catch (error) {
    return buildStudioGoldDegradedState({
      generatedAt,
      degradedSources: ['studio_gold_adapter'],
      limits: [error instanceof Error ? error.message : 'studio_gold_state_failed'],
    });
  }
}
