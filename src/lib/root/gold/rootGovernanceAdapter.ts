import 'server-only';

import { ROOT_FUNCTIONS_CATALOG } from '@/components/root/rootFunctionsCatalog';
import { domainAnchors, deterministicParticles, clamp01 } from '@/components/root/gold/visual/rootGovernanceMath';
import { buildAgenticRootState } from '@/lib/agents/sfiAgents';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { readRootNeuralGraphRuntime } from '@/lib/root/neuralGraphRuntime';
import { readTableHealth } from '@/lib/root/server';
import { readOperationalConsoleState, type SfiRecord } from '@/lib/sfi/operationalConsole';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { buildRootGovernanceDegradedState } from './rootGovernanceDegradedState';
import type { RootGovernanceState } from './rootGovernanceState';

type SourceResult<T> = { ok: true; data: T } | { ok: false; error: string };

const BASED_ON = [
  'buildAgenticRootState',
  'buildWorldVectorOperationalState',
  'readGovernanceRuntime',
  'readRootNeuralGraphRuntime',
  'readOperationalConsoleState',
  'action_proposals',
  'epistemic_events',
  'root_audit_events',
  'sfi_prediction_verifications',
  'rootFunctionsCatalog',
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function number01(value: unknown): number | null {
  const n = num(value);
  return n === null ? null : clamp01(n > 1 ? n / 100 : n);
}

function firstNumber(row: SfiRecord | null | undefined, keys: string[]) {
  const source = asRecord(row);
  for (const key of keys) {
    const value = number01(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function proposalState(value: unknown): RootGovernanceState['activeProposals'][number]['state'] {
  const normalized = text(value, 'draft').toLowerCase();
  if (normalized.includes('execut')) return 'executed';
  if (normalized.includes('accept') || normalized.includes('approv')) return 'accepted';
  if (normalized.includes('prepar')) return 'prepared';
  if (normalized.includes('block') || normalized.includes('reject')) return 'blocked';
  if (normalized.includes('propos') || normalized.includes('queue')) return 'proposed';
  return 'draft';
}

function agentState(value: unknown): RootGovernanceState['agents'][number]['state'] {
  const normalized = text(value, '').toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('failed')) return 'blocked';
  if (normalized.includes('degraded') || normalized.includes('thin')) return 'degraded';
  if (normalized.includes('offline') || normalized.includes('missing')) return 'offline';
  if (normalized.includes('standby') || normalized.includes('manual')) return 'standby';
  return 'active';
}

function severityFor(value: unknown): RootGovernanceState['recentRecords'][number]['severity'] {
  const normalized = text(value, '').toLowerCase();
  if (/(critical|failed|blocked|blind|deny|reject)/.test(normalized)) return 'critical';
  if (/(warning|degraded|missing|stale|queued)/.test(normalized)) return 'warning';
  return 'info';
}

async function withSource<T>(label: string, task: () => Promise<T>, timeoutMs = 6500): Promise<SourceResult<T>> {
  try {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const result = await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs);
      }),
    ]);
    if (timeout) clearTimeout(timeout);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: `${label}:${error instanceof Error ? error.message : 'failed'}` };
  }
}

async function readRows(table: string, select = '*', limit = 8, orderColumn = 'created_at') {
  return withSource(table, async () => {
    const service = createServiceSupabaseClient();
    const { data, error } = await service.from(table).select(select).order(orderColumn, { ascending: false }).limit(limit);
    if (error) throw error;
    return (Array.isArray(data) ? data : []) as unknown as Record<string, unknown>[];
  }, 4200);
}

function buildAgents(agentic: unknown, graph: Awaited<ReturnType<typeof readRootNeuralGraphRuntime>> | null): RootGovernanceState['agents'] {
  const state = asRecord(agentic);
  const providers = Array.isArray(state.providers) ? state.providers.map(asRecord) : [];
  const systemHealth = asRecord(state.systemHealth);
  const agents: RootGovernanceState['agents'] = [
    { id: 'WORLD-VECTOR', role: 'World Vector Agent', health: null, state: agentState(asRecord(state.worldVectorAgent).current_signal_state) },
    { id: 'NEURAL-GRAPH', role: 'Neural Graph Agent', health: null, state: agentState(systemHealth.graphStatus ?? graph?.status) },
    { id: 'AMV', role: 'AMV Memory Agent', health: null, state: agentState(asRecord(state.amv).status) },
    { id: 'PREDICTION', role: 'Prediction Registry Agent', health: null, state: agentState(systemHealth.predictionStatus) },
  ];

  providers.slice(0, 4).forEach((provider) => {
    const id = text(provider.id ?? provider.provider ?? provider.name, 'provider').toUpperCase();
    agents.push({
      id,
      role: `LLM provider: ${text(provider.model ?? provider.label, 'model unavailable')}`,
      health: null,
      state: provider.available === true ? 'active' : 'degraded',
    });
  });
  return agents;
}

function buildProposals(rows: Record<string, unknown>[]): RootGovernanceState['activeProposals'] {
  return rows.map((row, index) => ({
    id: text(row.id ?? row.proposal_id, `proposal-${index + 1}`),
    title: text(row.title ?? row.objective ?? row.description, 'proposal_title_unavailable'),
    confidence: number01(row.confidence ?? row.alignment_score ?? row.score),
    state: proposalState(row.status ?? row.state ?? row.recommended_status),
  }));
}

function buildRecords(epistemicRows: Record<string, unknown>[], auditRows: Record<string, unknown>[]): RootGovernanceState['recentRecords'] {
  return [...epistemicRows, ...auditRows]
    .sort((a, b) => text(b.occurred_at ?? b.created_at).localeCompare(text(a.occurred_at ?? a.created_at)))
    .slice(0, 8)
    .map((row) => {
      const label = text(row.event_name ?? row.action ?? row.label, 'record_label_unavailable');
      return {
        time: text(row.occurred_at ?? row.created_at, ''),
        actor: text(row.actor_id ?? row.source ?? row.logbook_id, 'ROOT'),
        label,
        severity: severityFor(label),
      };
    });
}

function buildField(summary: RootGovernanceState['governanceSummary']): RootGovernanceState['governanceField'] {
  const domains = domainAnchors(summary);
  const availableMetrics = Object.values(summary).filter((value) => typeof value === 'number').length;
  const base = clamp01(summary.coherence ?? summary.coverage ?? summary.alignment ?? 0);
  const allLinks: RootGovernanceState['governanceField']['links'] = [
    { from: 'information', to: 'technology', strength: clamp01(summary.alignment), kind: 'information' },
    { from: 'technology', to: 'resources', strength: clamp01(summary.systemicFriction), kind: 'technology' },
    { from: 'resources', to: 'environment', strength: clamp01(summary.resilience), kind: 'resources' },
    { from: 'environment', to: 'society', strength: clamp01(summary.coverage), kind: 'environment' },
    { from: 'society', to: 'institutional', strength: clamp01(summary.coherence), kind: 'society' },
    { from: 'institutional', to: 'information', strength: clamp01(summary.coverage), kind: 'institutional' },
  ];
  const links = allLinks.filter((link) => link.strength > 0);
  return {
    center: { label: 'ROOT / GOVERNANCE', intensity: base },
    domains,
    links,
    particles: availableMetrics ? deterministicParticles(Math.round(base * 100), 180) : [],
  };
}

function buildHypotheses(agentic: unknown): RootGovernanceState['projections']['activeHypotheses'] {
  const registry = asRecord(asRecord(agentic).predictionRegistry);
  const entries = Array.isArray(registry.entries) ? registry.entries.map(asRecord) : [];
  return entries.slice(0, 6).map((entry, index) => ({
    id: text(entry.hypothesis_id ?? entry.id, `hypothesis-${index + 1}`),
    label: text(entry.case_label ?? entry.prediccion_explicita ?? entry.fenotipo_estimado, 'hypothesis_label_unavailable'),
    probability: number01(entry.probabilidad_estimativa ?? entry.probability),
  }));
}

function buildCalibrations(rows: Record<string, unknown>[]): RootGovernanceState['projections']['recentCalibrations'] {
  return rows.slice(0, 6).map((row, index) => ({
    id: text(row.id, `calibration-${index + 1}`),
    label: text(row.hypothesis_id ?? row.return_window ?? row.evaluation_result, 'calibration_label_unavailable'),
    completed: text(row.verification_state).toUpperCase() === 'CLOSED',
    time: text(row.source_checked_at ?? row.updated_at ?? row.created_at, ''),
  }));
}

function buildAtlasMap(worldVector: unknown) {
  const observation = asRecord(asRecord(asRecord(worldVector).today).observation);
  const domains = Array.isArray(observation.domain_values) ? observation.domain_values.map(asRecord) : [];
  const anchors = [
    { lat: 40, lon: -100 },
    { lat: -15, lon: -60 },
    { lat: 52, lon: 14 },
    { lat: 8, lon: 20 },
    { lat: 24, lon: 44 },
    { lat: 35, lon: 105 },
    { lat: -25, lon: 134 },
  ];
  return domains
    .filter((item) => num(item.value) !== null || num(item.confidence) !== null)
    .slice(0, anchors.length)
    .map((item, index) => ({ ...anchors[index], value: clamp01(num(item.value) ?? num(item.confidence) ?? 0) }));
}

function executionTools(): RootGovernanceState['executionTools'] {
  const byFamily = new Map(ROOT_FUNCTIONS_CATALOG.map((item) => [item.id, item]));
  const defs = [
    ['policy-designer', 'Diseñador de Políticas', 'Diseñar restricciones, criterios y ventanas de acción.', 'dynamic-system-modeler'],
    ['impact-simulator', 'Simulador de Impacto', 'Simular rutas de impacto institucional antes de ejecutar.', 'impact-evaluation'],
    ['risk-evaluator', 'Evaluador de Riesgo', 'Inspeccionar riesgo operativo y evidencia mínima.', 'causal-evaluation'],
    ['resource-optimizer', 'Optimizador de Recursos', 'Priorizar recursos contra fricción y cobertura.', 'scenario-calculator'],
    ['implementation-monitor', 'Monitor de Implementación', 'Monitorear cola y recuperación de ejecución.', 'evidence-tools'],
  ] as const;
  return defs.map(([id, label, description, sourceId]) => {
    const source = byFamily.get(sourceId);
    const available = source?.status === 'available' || source?.status === 'partial';
    return {
      id,
      label,
      description: `${description} Fuente: ${source?.source ?? 'rootFunctionsCatalog'}.`,
      available,
      state: source?.status === 'available' ? 'available' : source?.status === 'partial' ? 'degraded' : 'blocked',
    };
  });
}

function buildEngines(summary: RootGovernanceState['governanceSummary'], governanceStatus: string | null, warnings: number): RootGovernanceState['engines'] {
  return [
    { id: 'coherence', label: 'Motor de Coherencia', description: 'Consistencia entre señal, evidencia y acción.', value: summary.coherence, state: summary.coherence === null ? 'degraded' : 'active' },
    { id: 'alignment', label: 'Motor de Alineación', description: 'Alineación entre propuestas, atractores y ejecución.', value: summary.alignment, state: summary.alignment === null ? 'degraded' : 'active' },
    { id: 'resilience', label: 'Motor de Resiliencia', description: 'Capacidad de continuidad ante fricción.', value: summary.resilience, state: summary.resilience === null ? 'degraded' : 'active' },
    { id: 'equity', label: 'Motor de Equidad', description: 'Sin métrica de equidad persistida en las fuentes ROOT actuales.', value: null, state: 'standby' },
    { id: 'transparency', label: 'Motor de Transparencia', description: 'Estado del runtime de gobernanza y auditoría.', value: governanceStatus === 'active' ? 1 : governanceStatus === 'blind' ? 0 : null, state: governanceStatus === 'active' ? 'active' : 'degraded' },
    { id: 'learning', label: 'Motor de Aprendizaje', description: 'Presión de aprendizaje derivada de warnings del sistema.', value: warnings ? clamp01(1 - warnings / 12) : null, state: warnings ? 'degraded' : 'standby' },
  ];
}

export async function readRootGovernanceState(): Promise<RootGovernanceState> {
  const generatedAt = new Date().toISOString();
  const degradedSources: string[] = [];
  const limits = [
    'Agent health is null unless a persisted health score exists; provider availability is not shown as health.',
    'Governance field topology coordinates are structural UI anchors; intensities are derived from available ROOT metrics.',
  ];

  const [agenticResult, worldResult, governanceResult, graphResult, operationalResult, proposalRows, recordRows, auditRows, verificationRows, atlasHealth] =
    await Promise.all([
      withSource('buildAgenticRootState', buildAgenticRootState, 8000),
      withSource('buildWorldVectorOperationalState', buildWorldVectorOperationalState, 6500),
      withSource('readGovernanceRuntime', readGovernanceRuntime, 5000),
      withSource('readRootNeuralGraphRuntime', readRootNeuralGraphRuntime, 5000),
      withSource('readOperationalConsoleState', readOperationalConsoleState, 6500),
      readRows('action_proposals', '*', 8),
      readRows('epistemic_events', 'id,event_name,logbook_id,actor_id,payload,occurred_at,created_at', 8, 'occurred_at'),
      readRows('root_audit_events', '*', 8),
      readRows('sfi_prediction_verifications', '*', 8, 'updated_at'),
      Promise.all([
        readTableHealth('worldspect_snapshots', 1).catch((error) => ({ table: 'worldspect_snapshots', ok: false, count: null, latest: [], warning: error instanceof Error ? error.message : 'read_failed' })),
        readTableHealth('scorefriction_observations', 1).catch((error) => ({ table: 'scorefriction_observations', ok: false, count: null, latest: [], warning: error instanceof Error ? error.message : 'read_failed' })),
        readTableHealth('sfi_amv_memory', 1).catch((error) => ({ table: 'sfi_amv_memory', ok: false, count: null, latest: [], warning: error instanceof Error ? error.message : 'read_failed' })),
        readTableHealth('sfi_evidence_ledger', 1).catch((error) => ({ table: 'sfi_evidence_ledger', ok: false, count: null, latest: [], warning: error instanceof Error ? error.message : 'read_failed' })),
        readTableHealth('sfi_prediction_entries', 1).catch((error) => ({ table: 'sfi_prediction_entries', ok: false, count: null, latest: [], warning: error instanceof Error ? error.message : 'read_failed' })),
      ]),
    ]);

  [agenticResult, worldResult, governanceResult, graphResult, operationalResult, proposalRows, recordRows, auditRows, verificationRows].forEach((result) => {
    if (!result.ok) degradedSources.push(result.error);
  });
  atlasHealth.forEach((item) => {
    if (!item.ok || item.warning) degradedSources.push(`${item.table}:${item.warning ?? 'degraded'}`);
  });

  if (!agenticResult.ok && !worldResult.ok && !graphResult.ok && !operationalResult.ok) {
    return buildRootGovernanceDegradedState(degradedSources.join('; ') || 'root_governance_sources_unavailable');
  }

  const agentic = agenticResult.ok ? agenticResult.data : null;
  const world = worldResult.ok ? worldResult.data : null;
  const graph = graphResult.ok ? graphResult.data : null;
  const operational = operationalResult.ok ? operationalResult.data : null;
  const governance = governanceResult.ok ? governanceResult.data : null;
  const stabilityRow = operational?.stability?.data ?? null;
  const pipelineLossRow = operational?.pipelineLoss?.data ?? null;
  const cycleRow = operational?.operationalCycle?.data ?? null;
  const worldObservation = asRecord(asRecord(asRecord(world).today).observation);
  const systemWarnings = asRecord(asRecord(agentic).systemHealth).warnings;
  const warnings = [
    ...(Array.isArray(systemWarnings) ? systemWarnings : []),
    ...(Array.isArray(worldObservation.warnings) ? worldObservation.warnings : []),
  ].length;

  const governanceSummary: RootGovernanceState['governanceSummary'] = {
    systemicFriction: firstNumber(pipelineLossRow, ['systemic_friction', 'friction', 'pipeline_loss', 'loss_ratio', 'value']),
    coherence: firstNumber(stabilityRow, ['coherence', 'coherencia', 'stability_score', 'score']) ?? number01(worldObservation.confidence),
    resilience: firstNumber(stabilityRow, ['resilience', 'resiliencia', 'recovery_score']),
    alignment: firstNumber(cycleRow, ['alignment', 'alignment_score', 'attractor_alignment']),
    activeNodes: graph?.nodeCount ?? null,
    coverage: graph ? graph.attractorCoverage : null,
  };

  const atlasRows = atlasHealth.map((item) => ({
    source: item.table === 'worldspect_snapshots' ? 'sensores' : item.table === 'scorefriction_observations' ? 'instituciones' : item.table === 'sfi_prediction_entries' ? 'publicaciones' : item.table === 'sfi_evidence_ledger' ? 'politicas' : 'datos abiertos',
    count: typeof item.count === 'number' ? item.count : null,
    status: (!item.ok || item.warning) ? 'degraded' as const : (item.count ?? 0) > 0 ? 'updated' as const : 'missing' as const,
  }));
  const activeSources = atlasRows.filter((item) => (item.count ?? 0) > 0).length;

  const state: RootGovernanceState = {
    generatedAt,
    systemState: governance?.blindMode ? 'critical' : degradedSources.length ? 'degraded' : 'nominal',
    governanceSummary,
    agents: buildAgents(agentic, graph),
    activeProposals: buildProposals(proposalRows.ok ? proposalRows.data : []),
    recentRecords: buildRecords(recordRows.ok ? recordRows.data : [], auditRows.ok ? auditRows.data : []),
    governanceField: buildField(governanceSummary),
    projections: {
      activeHypotheses: buildHypotheses(agentic),
      recentCalibrations: buildCalibrations(verificationRows.ok ? verificationRows.data : []),
    },
    proposedInvestigations: {
      title: text(asRecord(asRecord(agentic).worldVectorAgent).dominant_pattern, 'investigation_source_unavailable'),
      scenarioId: text(asRecord(world).today ? worldObservation.source_snapshot_id : null, '') || null,
      state: world ? 'running' : 'blocked',
      progress: number01(worldObservation.confidence),
      wsvPreview: { nodes: buildAtlasMap(world).slice(0, 6) },
    },
    socialSimulationLab: {
      scenarioId: graph?.status ? `graph-${graph.status}` : null,
      dimensions: graph?.nodeCount ?? null,
      resolution: graph?.nodeCount ? graph.nodeCount > 75 ? 'alta' : graph.nodeCount > 20 ? 'media' : 'baja' : null,
      state: graph?.status === 'operational' ? 'running' : graph ? 'blocked' : 'blocked',
      progress: graph ? clamp01(graph.graphDensity) : null,
      vectorPreview: (graph?.topAttractors ?? []).map((item, index) => ({ x: 18 + index * 16, y: 50 - item.persistence * 28, value: item.confidence })),
    },
    atlas: {
      ingestion: atlasRows,
      globalCoverage: atlasRows.length ? activeSources / atlasRows.length : null,
      activeSources,
      mapNodes: buildAtlasMap(world),
    },
    executionTools: executionTools(),
    engines: buildEngines(governanceSummary, governance?.status ?? null, warnings),
    provenance: {
      basedOn: BASED_ON,
      degradedSources: [...new Set(degradedSources)],
      limits,
    },
  };

  if (governanceSummary.systemicFriction === null) state.provenance.limits.push('Systemic friction view did not expose a recognized numeric field.');
  if (!state.activeProposals.length) state.provenance.limits.push('No active action_proposals rows were returned.');
  if (!state.projections.activeHypotheses.length) state.provenance.limits.push('No prediction registry entries were returned for active hypotheses.');
  if (!state.recentRecords.length) state.provenance.limits.push('No epistemic_events/root_audit_events rows were returned.');
  return state;
}
