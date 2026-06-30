import 'server-only';

import { runNeuralGraphAgent } from '@/lib/agents/neuralGraphAgent';
import { readAmvOperationalMemory } from '@/lib/agents/amvAgent';
import { readRootNeuralGraphRuntime } from '@/lib/root/neuralGraphRuntime';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getPredictionRegistryHealth } from '@/lib/sfi/predictions/service';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';

export type SfiWorldInterfaceNodeState = 'stable' | 'active' | 'elevated' | 'critical' | 'degraded' | 'unknown';

export type SfiWorldInterfaceState = {
  generatedAt: string;
  signalState: {
    status: string;
    value: string;
    detail: string;
  };
  frictionLevel: {
    status: string;
    value: string;
    trend: string;
  };
  amvMemory: {
    status: string;
    value: string;
    detail: string;
  };
  predictions: {
    status: string;
    value: string;
    detail: string;
  };
  activeInteractions: {
    status: string;
    value: string;
    detail: string;
  };
  fieldCoherence: {
    status: string;
    value: string;
    trend: string;
  };
  systemStrain: {
    status: string;
    value: string;
    trend: string;
  };
  approvalState: {
    status: string;
    value: string;
    detail: string;
  };
  sfiIndex: {
    value: string;
    detail: string;
  };
  nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    state: SfiWorldInterfaceNodeState;
    intensity: number;
    interpretation: string;
    invitation: string;
  }>;
  connections: Array<{
    from: string;
    to: string;
    strength: number;
  }>;
  warnings: string[];
};

const EXPECTED_MEASUREMENTS_TODAY = 4;
const SLOT_HOURS = [0, 6, 12, 18];

type ScheduleHealth = {
  status: 'healthy' | 'degraded' | 'failed';
  measurementsToday: number;
  expectedMeasurementsToday: number;
  expectedMeasurementsSoFar: number;
  nextSlotUtc: string;
  sourceCoverage: number | null;
  activeSources: number;
  sampleCount: number;
  latestObservedAt: string | null;
  minutesSinceLastMeasurement: number | null;
  warnings: string[];
};

type ScheduleSnapshotRow = {
  observed_at: string;
  sources: unknown[];
  degraded_sources: string[];
  adapter_error: string | null;
};

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'pending_source';
  return `${Number((clamp01(value) * 100).toFixed(1))}%`;
}

function numberLabel(value: number | null | undefined, suffix = '') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'pending_source';
  return `${value}${suffix}`;
}

function minutesSince(value: string | null) {
  if (!value) return null;
  const observed = new Date(value).getTime();
  if (!Number.isFinite(observed)) return null;
  return Math.max(0, Math.round((Date.now() - observed) / 60000));
}

function currentUtcDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function expectedMeasurementsSoFar(value = new Date()) {
  const hour = value.getUTCHours();
  return SLOT_HOURS.filter((slot) => slot <= hour).length || 1;
}

function nextSlotUtc(value = new Date()) {
  const hour = value.getUTCHours();
  const next = SLOT_HOURS.find((slot) => slot > hour) ?? 0;
  return `${String(next).padStart(2, '0')}:00 UTC`;
}

function activeSourceCount(sources: unknown[]) {
  return sources.filter((source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
    const record = source as Record<string, unknown>;
    const status = String(record.status ?? record.sourceState ?? record.state ?? '').toLowerCase();
    return status === '' || status === 'active' || status === 'observed' || status === 'healthy';
  }).length;
}

async function readScheduleHealth(): Promise<ScheduleHealth> {
  try {
    const service = createServiceSupabaseClient();
    const observedSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await service
      .from('worldspect_snapshots')
      .select('observed_at,sources,degraded_sources,adapter_error')
      .gte('observed_at', observedSince)
      .order('observed_at', { ascending: true })
      .limit(120);

    if (error) throw error;

    const recent90d: ScheduleSnapshotRow[] = Array.isArray(data)
      ? data
        .map((row) => {
          const record = row as Record<string, unknown>;
          return {
            observed_at: typeof record.observed_at === 'string' ? record.observed_at : '',
            sources: Array.isArray(record.sources) ? record.sources : [],
            degraded_sources: Array.isArray(record.degraded_sources)
              ? record.degraded_sources.filter((source): source is string => typeof source === 'string')
              : [],
            adapter_error: typeof record.adapter_error === 'string' ? record.adapter_error : null,
          };
        })
        .filter((row) => row.observed_at)
      : [];
    const latest = recent90d[recent90d.length - 1] ?? null;

    if (!latest || recent90d.length === 0) {
      return {
        status: 'failed',
        measurementsToday: 0,
        expectedMeasurementsToday: EXPECTED_MEASUREMENTS_TODAY,
        expectedMeasurementsSoFar: expectedMeasurementsSoFar(),
        nextSlotUtc: nextSlotUtc(),
        sourceCoverage: 0,
        activeSources: 0,
        sampleCount: 0,
        latestObservedAt: null,
        minutesSinceLastMeasurement: null,
        warnings: ['worldspect_snapshot_missing'],
      };
    }

    const today = currentUtcDate();
    const measurementsToday = recent90d.filter((snapshot) => snapshot.observed_at.slice(0, 10) === today).length;
    const activeSources = activeSourceCount(latest.sources);
    const sourceCoverage = latest.sources.length > 0
      ? Number((activeSources / latest.sources.length).toFixed(4))
      : 0;
    const minutes = minutesSince(latest.observed_at);
    const warnings: string[] = [];
    let status: ScheduleHealth['status'] = 'healthy';

    if (minutes === null || activeSources === 0) {
      status = 'failed';
      warnings.push(minutes === null ? 'latest_snapshot_unreadable' : 'no_active_sources');
    }

    if (minutes !== null && minutes > 1440) {
      status = 'failed';
      warnings.push('world_vector_silent_over_24h');
    } else if (minutes !== null && minutes > 390 && status !== 'failed') {
      status = 'degraded';
      warnings.push('latest_measurement_stale');
    }

    const expectedSoFar = expectedMeasurementsSoFar();
    if (measurementsToday < expectedSoFar && status !== 'failed') {
      status = 'degraded';
      warnings.push('measurements_today_below_current_utc_slot_expectation');
    }

    if (recent90d.length < 3 && status !== 'failed') {
      status = 'degraded';
      warnings.push('world_vector_history_thin');
    }

    if (sourceCoverage < 0.5 && status !== 'failed') {
      status = 'degraded';
      warnings.push('low_active_source_coverage');
    }

    if (latest.degraded_sources.length > 0 && status !== 'failed') {
      status = 'degraded';
      warnings.push('degraded_sources_present');
    }

    return {
      status,
      measurementsToday,
      expectedMeasurementsToday: EXPECTED_MEASUREMENTS_TODAY,
      expectedMeasurementsSoFar: expectedSoFar,
      nextSlotUtc: nextSlotUtc(),
      sourceCoverage,
      activeSources,
      sampleCount: recent90d.length,
      latestObservedAt: latest.observed_at,
      minutesSinceLastMeasurement: minutes,
      warnings: unique([...warnings, latest.adapter_error]),
    };
  } catch (error) {
    return {
      status: 'failed',
      measurementsToday: 0,
      expectedMeasurementsToday: EXPECTED_MEASUREMENTS_TODAY,
      expectedMeasurementsSoFar: expectedMeasurementsSoFar(),
      nextSlotUtc: nextSlotUtc(),
      sourceCoverage: null,
      activeSources: 0,
      sampleCount: 0,
      latestObservedAt: null,
      minutesSinceLastMeasurement: null,
      warnings: [error instanceof Error ? `worldspect_schedule_read_failed:${error.message}` : 'worldspect_schedule_read_failed'],
    };
  }
}

function stateFromOperationalStatus(status: string | null | undefined, warnings: string[] = []): SfiWorldInterfaceNodeState {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized.includes('failed') || normalized.includes('critical')) return 'critical';
  if (normalized.includes('degraded') || normalized.includes('thin') || warnings.length > 0) return 'elevated';
  if (normalized.includes('observed') || normalized.includes('healthy') || normalized.includes('alive') || normalized.includes('operational')) return 'active';
  if (normalized.includes('empty') || normalized.includes('missing') || normalized.includes('manual')) return 'degraded';
  return 'unknown';
}

function publicInterpretation(input: string | null | undefined) {
  const text = typeof input === 'string' ? input.trim() : '';
  return text || 'Lectura sistémica en modo degradado. El sistema conserva operación manual y requiere autenticación para acceso completo.';
}

function trendFromSchedule(health: ScheduleHealth) {
  if (health.status === 'failed') return 'critical_or_no_reading';
  if (health.measurementsToday < health.expectedMeasurementsSoFar) return `below_schedule · ${health.measurementsToday}/${health.expectedMeasurementsSoFar} UTC slots`;
  if (health.measurementsToday >= health.expectedMeasurementsToday) return '4/4 scheduled world checks complete';
  return `${health.measurementsToday}/${health.expectedMeasurementsToday} scheduled world checks today`;
}

function average(values: Array<number | null | undefined>) {
  const real = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!real.length) return null;
  return real.reduce((sum, value) => sum + clamp01(value), 0) / real.length;
}

function resultValue<T>(result: PromiseSettledResult<T>) {
  return result.status === 'fulfilled' ? result.value : null;
}

function resultWarning<T>(label: string, result: PromiseSettledResult<T>) {
  return result.status === 'rejected'
    ? `${label}:${result.reason instanceof Error ? result.reason.message : 'failed'}`
    : null;
}

export async function buildSfiWorldInterfaceState(): Promise<SfiWorldInterfaceState> {
  const generatedAt = new Date().toISOString();
  const [worldVectorResult, scheduleResult, amvResult, graphRuntimeResult, graphAgentResult, predictionResult] = await Promise.allSettled([
    buildWorldVectorOperationalState(),
    readScheduleHealth(),
    readAmvOperationalMemory({ query: 'SFI world interface live operating state', limit: 18, useEmbeddings: true }),
    readRootNeuralGraphRuntime(),
    runNeuralGraphAgent({
      query: 'SFI public world interface aggregate',
      filters: ['evidence', 'signal', 'prediction', 'world_vector', 'amv'],
      generateInterpretation: false,
    }),
    getPredictionRegistryHealth(),
  ]);

  const worldVector = resultValue(worldVectorResult);
  const schedule = resultValue(scheduleResult) ?? {
    status: 'failed',
    measurementsToday: 0,
    expectedMeasurementsToday: EXPECTED_MEASUREMENTS_TODAY,
    expectedMeasurementsSoFar: expectedMeasurementsSoFar(),
    nextSlotUtc: nextSlotUtc(),
    sourceCoverage: null,
    activeSources: 0,
    sampleCount: 0,
    latestObservedAt: null,
    minutesSinceLastMeasurement: null,
    warnings: ['worldspect_schedule_unavailable'],
  } satisfies ScheduleHealth;
  const amv = resultValue(amvResult);
  const graphRuntime = resultValue(graphRuntimeResult);
  const graphAgent = resultValue(graphAgentResult);
  const predictions = resultValue(predictionResult);

  const worldObservation = worldVector?.today.observation ?? null;
  const rawWorldWarnings = unique([
    ...(worldVector?.agent_audit.warnings ?? []),
    ...(worldObservation?.warnings ?? []),
    ...schedule.warnings,
  ]);
  const worldWarnings = rawWorldWarnings.filter((warning) => {
    if (warning === 'world_vector_history_thin' && schedule.sampleCount >= 3) return false;
    if (warning === 'worldspect_snapshot_missing' && (worldObservation?.observed_at || schedule.latestObservedAt)) return false;
    return true;
  });
  const effectiveWorldStatus = worldObservation?.observed_at && schedule.status === 'healthy'
    ? 'observed'
    : worldObservation?.status ?? schedule.status;
  const effectiveWorldInterpretation = effectiveWorldStatus === 'observed' && worldObservation?.status !== 'observed'
    ? `Lectura observada para ${worldVector?.today.cycle_day.sectorLabel ?? 'el campo mundial'}; puede orientar interpretación operativa sin reclamar continuidad persistente.${worldObservation?.dominant_signal ? ` Dominante actual: ${worldObservation.dominant_signal}.` : ''}`
    : worldObservation?.interpretation ?? null;
  const graphWarnings = unique([
    ...(graphAgent?.warnings ?? []),
    ...(graphAgent?.missing_context ?? []),
  ]);
  const amvWarnings = amv?.warnings ?? [];
  const predictionWarnings = predictions?.warnings ?? [];
  const sourceGap = schedule.sourceCoverage === null ? null : 1 - schedule.sourceCoverage;
  const graphConfidence = graphAgent?.confidence ?? (graphRuntime ? graphRuntime.graphDensity : null);
  const amvSignal = amv ? Math.min(1, amv.total_items / 18) : null;
  const predictionSignal = predictions?.entries_count === null || typeof predictions?.entries_count === 'undefined'
    ? null
    : Math.min(1, predictions.entries_count / 24);
  const sfiIndexValue = average([
    worldObservation?.confidence ?? null,
    schedule.sourceCoverage,
    graphConfidence,
    amvSignal,
    predictions?.ok ? 0.72 : predictions?.table_available ? 0.48 : null,
  ]);

  const signalStatus = stateFromOperationalStatus(effectiveWorldStatus, worldWarnings);
  const amvState = stateFromOperationalStatus(amv?.status, amvWarnings);
  const graphState = stateFromOperationalStatus(graphRuntime?.status ?? (graphAgent?.ok ? 'operational' : 'degraded'), graphWarnings);
  const predictionState = predictions?.ok
    ? 'active'
    : predictions?.table_available
      ? 'elevated'
      : 'degraded';
  const strainValue = average([graphRuntime?.ejectorPressure ?? null, sourceGap]);
  const strainState = strainValue !== null && strainValue > 0.72
    ? 'critical'
    : strainValue !== null && strainValue > 0.42
      ? 'elevated'
      : schedule.status === 'failed'
        ? 'critical'
        : 'stable';

  const selectedInterpretation = publicInterpretation(effectiveWorldInterpretation);
  const invite = 'Accede al nodo para explorar evidencia, memoria AMV, Neural Graph, predicciones y vectores de acción recomendados por SFI.';

  const nodes: SfiWorldInterfaceState['nodes'] = [
    {
      id: 'sfi-hq',
      label: 'SFI-HQ-01',
      x: 51,
      y: 48,
      state: signalStatus,
      intensity: worldObservation?.confidence ?? 0.42,
      interpretation: selectedInterpretation,
      invitation: invite,
    },
    {
      id: 'world-vector',
      label: 'WORLD VECTOR',
      x: 48,
      y: 34,
      state: signalStatus,
      intensity: worldObservation?.confidence ?? 0.36,
      interpretation: publicInterpretation(worldObservation?.dominant_signal
        ? `${worldObservation.dominant_signal}. ${worldObservation.interpretation}`
        : effectiveWorldInterpretation),
      invitation: `Próxima sincronización: ${schedule.nextSlotUtc}. Lecturas hoy: ${schedule.measurementsToday}/${schedule.expectedMeasurementsToday}.`,
    },
    {
      id: 'field',
      label: 'FIELD',
      x: 32,
      y: 51,
      state: schedule.status === 'healthy' ? 'active' : stateFromOperationalStatus(schedule.status, schedule.warnings),
      intensity: schedule.sourceCoverage ?? 0.22,
      interpretation: `Campo observado con cobertura ${percent(schedule.sourceCoverage)} y ${schedule.activeSources} fuentes activas. ${trendFromSchedule(schedule)}.`,
      invitation: 'Ir al Field para declarar un sistema atorado y convertirlo en lectura MOP-H mínima.',
    },
    {
      id: 'amv-memory',
      label: 'AMV MEMORY',
      x: 41,
      y: 69,
      state: amvState,
      intensity: amvSignal ?? 0.2,
      interpretation: amv
        ? `AMV en estado ${amv.status}. ${amv.total_items} trazas leídas; modo ${amv.mode}; recurrencias ${amv.recurrent_patterns.length}.`
        : 'AMV no disponible para Home. Se mantiene modo manual y búsqueda textual cuando exista fuente.',
      invitation: 'Accede para explorar memoria, recurrencias y asociaciones antes de proponer acción.',
    },
    {
      id: 'neural-graph',
      label: 'NEURAL GRAPH',
      x: 58,
      y: 59,
      state: graphState,
      intensity: graphConfidence ?? 0.24,
      interpretation: graphRuntime
        ? `${graphRuntime.summary} Nodos ${graphRuntime.nodeCount}; conexiones ${graphRuntime.edgeCount}; densidad ${percent(graphRuntime.graphDensity)}.`
        : 'Neural Graph no disponible en lectura pública. El sistema conserva navegación manual.',
      invitation: 'Explora trazabilidad entre evidencia, señales, hipótesis, predicciones, outcomes y reportes.',
    },
    {
      id: 'prediction-registry',
      label: 'PREDICTION REGISTRY',
      x: 67,
      y: 39,
      state: predictionState,
      intensity: predictionSignal ?? 0.22,
      interpretation: predictions
        ? `Registro con ${numberLabel(predictions.entries_count)} entradas y ${numberLabel(predictions.pending_returns_count)} retornos pendientes.`
        : 'Prediction Registry no disponible; las hipótesis deben registrarse manualmente antes de perturbar.',
      invitation: 'Conecta hipótesis, evidencia, probabilidad, acción, outcome y calibración.',
    },
    {
      id: 'client-finder',
      label: 'CLIENT FINDER',
      x: 74,
      y: 54,
      state: graphAgent?.evidence.length ? 'active' : 'degraded',
      intensity: Math.min(1, (graphAgent?.evidence.length ?? 0) / 18),
      interpretation: graphAgent
        ? `Agente de oportunidades con ${graphAgent.evidence.length} evidencias agregadas y ${graphAgent.suggested_actions.length} acciones draft. Nada se contacta automáticamente.`
        : 'Client Finder espera señales públicas/manuales y evidencia antes de generar IFNORM.',
      invitation: 'Genera IFNORM sólo con compañía/persona/evidencia y aprobación humana.',
    },
    {
      id: 'approval-queue',
      label: 'APPROVAL QUEUE',
      x: 78,
      y: 70,
      state: 'active',
      intensity: 0.74,
      interpretation: 'Todas las publicaciones, propuestas, drafts de contacto y mutaciones externas requieren aprobación humana explícita.',
      invitation: 'Revisa cola de aprobación antes de convertir una lectura en acción.',
    },
    {
      id: 'scorefriction',
      label: 'SCOREFRICTION',
      x: 36,
      y: 35,
      state: schedule.status === 'failed' ? 'degraded' : 'active',
      intensity: worldObservation?.confidence ?? 0.38,
      interpretation: 'ScoreFriction se alimenta de lectura de campo, World Vector, AMV y evidencia interna disponible.',
      invitation: 'Usa ScoreFriction para convertir fricción declarada en riesgo trazable y perturbación mínima.',
    },
    {
      id: 'repository',
      label: 'REPOSITORY',
      x: 25,
      y: 41,
      state: 'stable',
      intensity: 0.44,
      interpretation: 'Repositorio mantiene evidencia institucional y material público sin publicar cambios automáticos.',
      invitation: 'Consulta contratos, manifiestos y reportes aprobables.',
    },
    {
      id: 'moph',
      label: 'MOP-H',
      x: 29,
      y: 64,
      state: 'active',
      intensity: amvSignal ? Math.max(0.28, amvSignal * 0.76) : 0.3,
      interpretation: 'Mini MOP-H toma un sistema atorado, produce lectura agentica y propone una perturbación mínima.',
      invitation: 'Ir al Field para iniciar una lectura sin contacto externo automático.',
    },
    {
      id: 'market-opportunities',
      label: 'MARKET OPPORTUNITIES',
      x: 83,
      y: 43,
      state: graphAgent?.evidence.length ? 'elevated' : 'unknown',
      intensity: Math.min(1, (graphAgent?.nodes.length ?? 0) / 24),
      interpretation: graphAgent
        ? `Oportunidades interpretadas como señales internas agregadas: ${graphAgent.nodes.length} nodos y ${graphAgent.edges.length} conexiones.`
        : 'Market Opportunities requiere señales públicas/manuales para no inventar prospectos.',
      invitation: 'Vincula oportunidad con evidencia, memoria AMV y cola IFNORM.',
    },
    {
      id: 'cognitive-twin',
      label: 'COGNITIVE TWIN',
      x: 61,
      y: 75,
      state: amv?.items.length ? 'active' : 'degraded',
      intensity: amvSignal ?? 0.2,
      interpretation: 'Twin cognitivo puede apoyarse en AMV cuando hay cuenta y memoria disponible; sin cuenta opera en modo degradado.',
      invitation: 'Iniciar sesión para asociar lectura de Field con memoria del usuario.',
    },
    {
      id: 'system-health',
      label: 'SYSTEM HEALTH',
      x: 53,
      y: 22,
      state: strainState,
      intensity: strainValue ?? 0.32,
      interpretation: `Salud compuesta: World Vector ${schedule.status}, AMV ${amv?.status ?? 'not_available'}, Graph ${graphRuntime?.status ?? 'not_available'}, Prediction Registry ${predictions?.ok ? 'ok' : 'degraded'}.`,
      invitation: 'Revisar Root para diagnóstico completo, sin mutaciones automáticas.',
    },
  ];

  const connections: SfiWorldInterfaceState['connections'] = [
    { from: 'world-vector', to: 'sfi-hq', strength: worldObservation?.confidence ?? 0.36 },
    { from: 'field', to: 'moph', strength: 0.72 },
    { from: 'moph', to: 'amv-memory', strength: amvSignal ?? 0.28 },
    { from: 'amv-memory', to: 'neural-graph', strength: amvSignal ?? 0.28 },
    { from: 'neural-graph', to: 'prediction-registry', strength: graphConfidence ?? 0.24 },
    { from: 'world-vector', to: 'neural-graph', strength: worldObservation?.confidence ?? 0.32 },
    { from: 'scorefriction', to: 'field', strength: 0.62 },
    { from: 'scorefriction', to: 'world-vector', strength: worldObservation?.confidence ?? 0.32 },
    { from: 'prediction-registry', to: 'approval-queue', strength: predictionSignal ?? 0.26 },
    { from: 'client-finder', to: 'approval-queue', strength: graphAgent?.evidence.length ? 0.76 : 0.25 },
    { from: 'market-opportunities', to: 'client-finder', strength: graphAgent?.nodes.length ? 0.68 : 0.2 },
    { from: 'repository', to: 'neural-graph', strength: 0.42 },
    { from: 'amv-memory', to: 'cognitive-twin', strength: amvSignal ?? 0.24 },
    { from: 'system-health', to: 'sfi-hq', strength: strainValue === null ? 0.24 : 1 - strainValue },
  ];

  return {
    generatedAt,
    signalState: {
      status: effectiveWorldStatus,
      value: percent(worldObservation?.confidence ?? schedule.sourceCoverage),
      detail: worldObservation?.dominant_signal
        ? `${worldObservation.dominant_signal} · ${schedule.measurementsToday}/${schedule.expectedMeasurementsToday} scheduled checks`
        : `World Vector · ${schedule.measurementsToday}/${schedule.expectedMeasurementsToday} scheduled checks · ${schedule.nextSlotUtc}`,
    },
    frictionLevel: {
      status: strainState,
      value: percent(sourceGap),
      trend: sourceGap === null ? 'pending_source' : `derived_from_worldspect_source_gap · ${trendFromSchedule(schedule)}`,
    },
    amvMemory: {
      status: amv?.status ?? 'degraded',
      value: amv ? `${amv.total_items} traces` : 'pending_source',
      detail: amv
        ? `${amv.mode} · ${amv.sources.length} sources · embeddings ${amv.embedding?.ok ? `${amv.embedding.provider}/${amv.embedding.model}` : 'textual_fallback'}`
        : 'manual_mode · AMV read unavailable',
    },
    predictions: {
      status: predictions?.ok ? 'active' : predictions?.table_available ? 'degraded' : 'not_available',
      value: predictions?.entries_count === null || typeof predictions?.entries_count === 'undefined'
        ? 'pending_source'
        : `${predictions.entries_count} entries`,
      detail: predictions
        ? `pending_returns ${numberLabel(predictions.pending_returns_count)} · root approval required`
        : 'manual_mode · Prediction Registry read unavailable',
    },
    activeInteractions: {
      status: graphAgent?.ok ? 'active' : graphRuntime?.status ?? 'degraded',
      value: graphAgent ? `${graphAgent.nodes.length + graphAgent.evidence.length} linked` : 'pending_source',
      detail: graphAgent
        ? `${graphAgent.nodes.length} nodes · ${graphAgent.edges.length} edges · ${graphAgent.evidence.length} evidence refs`
        : 'Neural Graph aggregate unavailable',
    },
    fieldCoherence: {
      status: effectiveWorldStatus,
      value: percent(worldObservation?.confidence ?? schedule.sourceCoverage),
      trend: trendFromSchedule(schedule),
    },
    systemStrain: {
      status: strainState,
      value: percent(strainValue),
      trend: strainValue === null ? 'pending_source' : 'derived_from_graph_ejector_pressure_and_source_gap',
    },
    approvalState: {
      status: 'human_approval_required',
      value: 'manual approval',
      detail: 'No external actions automatically sent',
    },
    sfiIndex: {
      value: sfiIndexValue === null ? 'manual_mode' : `${Number((sfiIndexValue * 100).toFixed(1))}`,
      detail: sfiIndexValue === null
        ? 'degraded/manual mode; insufficient public read model inputs'
        : 'derived_from_public_read_model; not an external claim',
    },
    nodes,
    connections,
    warnings: unique([
      resultWarning('world_vector', worldVectorResult),
      resultWarning('schedule', scheduleResult),
      resultWarning('amv', amvResult),
      resultWarning('root_graph', graphRuntimeResult),
      resultWarning('neural_graph_agent', graphAgentResult),
      resultWarning('prediction_registry', predictionResult),
      ...worldWarnings,
      ...amvWarnings,
      ...graphWarnings,
      ...predictionWarnings,
      'visual_topology_represents_systemic_zones_not_geopolitical_claims',
      'all_external_actions_require_human_approval',
    ]),
  };
}
