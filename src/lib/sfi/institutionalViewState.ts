import { calculateCField, calculateFS, calculatePhiSfi, calculatePsiMoph, resolveRegime } from '@/core/formulas/canonicalFormulas';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { buildAttractorScorecard } from './attractorManagement';
import { buildEntityContext } from './entityContext';
import { buildInstitutionalEntityGraph } from './entityGraph';
import { buildFrictionField } from './frictionFieldEngine';
import { buildInstitutionalTomography } from './tomography';
import { readOperationalConsoleState, type SfiRecord } from './operationalConsole';

export type InstitutionalViewState = {
  metrics: {
    phiSfi: number;
    fS: number;
    regime: 'HOMEOSTATIC' | 'TRANSITION' | 'CRITICAL';
    cField: number;
    psiMoph: number;
    graphNodeCount: number;
    graphEdgeCount: number;
    evidenceCount: number;
    predictionCount: number;
    memoryCount: number;
  };
  friction: {
    topFriction: number;
    summary: string;
    nodes: Array<{ id: string; label: string; value: number }>;
  };
  attractor: {
    knowledgeVelocity: number;
    authorityScore: number;
    memoryGrowth: number;
    predictionAccuracy: number;
    attractorDistance: number;
    summary: string;
  };
  tomography: {
    system: string;
    field: string;
    frictions: string[];
    sections: string[];
  };
  graph: {
    nodes: Array<{ id: string; label: string; ontologyType: string }>;
    edges: Array<{ id: string; source: string; target: string; relation: string }>;
  };
  entityContext: {
    entityId: string;
    entitySummary: string[];
    timeline: Array<{ step: string; value: string }>;
  };
  ledger: Array<{
    kind: 'evidence' | 'prediction' | 'memory';
    title: string;
    summary: string;
    identity: string;
    createdAt: string;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function numberValue(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function stableText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function formatTimestamp(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  return 'sin fecha disponible';
}

export async function readInstitutionalViewState(input?: { entityId?: string; entityType?: string; label?: string }): Promise<InstitutionalViewState> {
  const entityId = input?.entityId?.trim() || 'institutional_observatory';
  const entityLabel = input?.label?.trim() || entityId;

  const [operationalState, friction, attractor, tomography, graph, entityContext] = await Promise.all([
    readOperationalConsoleState(),
    buildFrictionField(),
    buildAttractorScorecard(),
    buildInstitutionalTomography(),
    buildInstitutionalEntityGraph({
      entityId,
      entityType: input?.entityType || 'PHENOMENON',
      label: entityLabel,
    }),
    buildEntityContext(
      await buildInstitutionalEntityGraph({ entityId, entityType: input?.entityType || 'PHENOMENON', label: entityLabel }),
      entityId,
    ),
  ]);

  const cycle = asRecord((operationalState.operationalCycle?.data ?? null) as SfiRecord | null);
  const stability = asRecord((operationalState.stability?.data ?? null) as SfiRecord | null);
  const ihg = numberValue(cycle.ihg ?? cycle.institutional_health ?? cycle.health_score ?? stability.ihg, 0.72);
  const nti = numberValue(cycle.nti ?? cycle.tension ?? stability.nti, 0.68);
  const ldi = numberValue(cycle.ldi ?? cycle.latency ?? stability.ldi, 0.18);
  const xi = numberValue(cycle.xi ?? cycle.inertia ?? stability.xi, 0.05);

  const phiSfi = calculatePhiSfi(ihg, nti, ldi, xi);
  const fS = calculateFS(phiSfi);
  const regime = resolveRegime(phiSfi);
  const cField = calculateCField(ihg, ldi, nti);
  const psiMoph = calculatePsiMoph(ihg, nti, ldi, 0.02, 0.1);

  const service = createServiceSupabaseClient();
  const [{ data: evidenceRows }, { data: predictionRows }, { data: memoryRows }] = await Promise.all([
    service.from('sfi_evidence_ledger').select('id, case_id, evidence_kind, public_summary, trust_score, observed_at').order('observed_at', { ascending: false }).limit(8),
    service.from('sfi_prediction_entries').select('id, case_id, hypothesis_id, fenotipo_estimado, probabilidad_estimativa, created_at').order('created_at', { ascending: false }).limit(8),
    service.from('sfi_amv_memory').select('id, session_id, input_summary, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const ledger = [
    ...(Array.isArray(evidenceRows) ? evidenceRows.map((row) => {
      const summary = asRecord(row.public_summary);
      return {
        kind: 'evidence' as const,
        title: stableText(summary.phenomenon ?? row.evidence_kind, 'Evidencia institucional'),
        summary: `Evidencia ${stableText(row.evidence_kind, 'sin tipo')} · confianza ${numberValue(row.trust_score, 0).toFixed(2)}`,
        identity: stableText(row.id, 'evidence'),
        createdAt: formatTimestamp(row.observed_at),
      };
    }) : []),
    ...(Array.isArray(predictionRows) ? predictionRows.map((row) => ({
      kind: 'prediction' as const,
      title: stableText(row.fenotipo_estimado ?? row.hypothesis_id, 'Predicción institucional'),
      summary: `Probabilidad ${numberValue(row.probabilidad_estimativa, 0).toFixed(2)} · ${stableText(row.hypothesis_id, 'sin hipótesis')}`,
      identity: stableText(row.id, 'prediction'),
      createdAt: formatTimestamp(row.created_at),
    })) : []),
    ...(Array.isArray(memoryRows) ? memoryRows.map((row) => ({
      kind: 'memory' as const,
      title: stableText(row.input_summary ?? row.session_id, 'Memoria institucional'),
      summary: `Memoria persistida · ${stableText(row.session_id, 'sin sesión')}`,
      identity: stableText(row.id, 'memory'),
      createdAt: formatTimestamp(row.created_at),
    })) : []),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 10);

  return {
    metrics: {
      phiSfi,
      fS,
      regime,
      cField,
      psiMoph,
      graphNodeCount: graph.nodes.length,
      graphEdgeCount: graph.edges.length,
      evidenceCount: Array.isArray(evidenceRows) ? evidenceRows.length : 0,
      predictionCount: Array.isArray(predictionRows) ? predictionRows.length : 0,
      memoryCount: Array.isArray(memoryRows) ? memoryRows.length : 0,
    },
    friction: {
      topFriction: friction.topFriction,
      summary: friction.summary,
      nodes: friction.nodes,
    },
    attractor,
    tomography,
    graph: {
      nodes: graph.nodes.map((node) => ({ id: node.id, label: node.label, ontologyType: node.ontologyType })),
      edges: graph.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, relation: edge.relation })),
    },
    entityContext: {
      entityId,
      entitySummary: entityContext.entitySummary,
      timeline: entityContext.timeline,
    },
    ledger,
  };
}
