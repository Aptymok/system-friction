'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react';
import type { RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from './sovereignTypes';
import './root-topology-workspace.css';

type TopologyId = 'I' | 'II' | 'III';
type CardVisual = 'gauge' | 'bars' | 'spark' | 'matrix' | 'orbit' | 'timeline' | 'graph' | 'routes' | 'status' | 'report';
type TopologyCard = {
  id: string;
  topology: TopologyId;
  eyebrow: string;
  title: string;
  value: string;
  status: string;
  description: string;
  source: string;
  observedAt: string | null;
  confidence: number | null;
  visual: CardVisual;
  values: number[];
  rows: RootRow[];
  action?: RootActionRequest;
  href?: string;
  span?: 'wide' | 'tall';
};

type GraphPoint = {
  id: string;
  label: string;
  kind: 'current' | 'attractor' | 'evidence' | 'hypothesis' | 'agent';
  source: string;
  confidence: number | null;
  observedAt: string | null;
  evidenceIds: string[];
  payload: RootRow;
};

const TOPOLOGY_COPY: Record<TopologyId, { title: string; subtitle: string }> = {
  I: {
    title: 'INFORMACIÓN NETA DEL SISTEMA',
    subtitle: 'Sitio, gobernanza, APIs, visores, agentes, identidad, persistencia y estado operativo verificable.',
  },
  II: {
    title: 'COGNICIÓN, PROYECCIÓN Y PERTURBACIÓN',
    subtitle: 'Ejecuciones de IA, hipótesis, simulación, grafo, evidencia, atractores y distancia operativa respecto del estado buscado.',
  },
  III: {
    title: 'MEMORIA LONGITUDINAL, ATLAS Y REPORTES',
    subtitle: 'Cronología, bitácora, conexiones activas o descontinuadas, aprendizaje, casos y entregables descargables.',
  },
};

const PUBLIC_ROUTES = ['/observatory', '/world-vector', '/methodology', '/reports'];
const PRIVATE_ROUTES = ['/root', '/studio', '/field', '/field/map', '/library', '/member'];

function row(value: unknown): RootRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {};
}

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value: number | null) {
  if (value === null) return 0;
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, normalized));
}

function displayTime(value: string | null | undefined) {
  if (!value) return 'SIN FECHA';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function rowTitle(value: RootRow, fallback: string) {
  return text(value.title ?? value.label ?? value.name ?? value.action ?? value.event_name ?? value.event_type ?? value.status, fallback);
}

function rowDate(value: RootRow) {
  return text(value.observed_at ?? value.updated_at ?? value.created_at ?? value.executed_at ?? value.occurred_at ?? value.timestamp, '') || null;
}

function rowConfidence(value: RootRow) {
  return number(value.confidence ?? value.trust ?? value.trust_score ?? value.probability ?? value.score ?? value.weight);
}

function matrixNumber(state: RootSovereignState, ids: string[]) {
  for (const id of ids) {
    const item = state.system.data.matrix.find((entry) => entry.id === id);
    const parsed = number(item?.state.value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function latestRows(rows: RootRow[], limit = 8) {
  return [...rows]
    .sort((a, b) => String(rowDate(b) ?? '').localeCompare(String(rowDate(a) ?? '')))
    .slice(0, limit);
}

function statusFrom(count: number, error: string | null, missingLabel = 'MISSING') {
  if (error) return 'DEGRADED';
  return count > 0 ? 'OBSERVED' : missingLabel;
}

function percent(value: number | null) {
  return value === null ? '—' : `${(clamp01(value) * 100).toFixed(1)}%`;
}

function deterministicUnit(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function buildTimeline(state: RootSovereignState) {
  return latestRows([
    ...state.governance.data.events,
    ...state.governance.data.audits,
    ...state.governance.data.mutations,
    ...state.execution.data.recentActions,
    ...state.predictions.data.runs,
    ...state.predictions.data.outcomes,
    ...state.predictions.data.learningEvents,
    ...state.evidence.data.entries,
    ...state.evidence.data.ledger,
    ...state.amv.data.memories,
  ], 80);
}

function makeCards(state: RootSovereignState): Record<TopologyId, TopologyCard[]> {
  const phi = matrixNumber(state, ['phi_sf', 'phi']);
  const ihg = matrixNumber(state, ['ihg']);
  const nti = matrixNumber(state, ['nti', 'nti_obs']);
  const ldi = matrixNumber(state, ['ldi']);
  const matrix = state.system.data.matrix;
  const operationalAgents = state.agents.data.agents.filter((agent) => agent.state.status === 'observed' || agent.state.status === 'derived');
  const gatedAgents = state.agents.data.agents.filter((agent) => ['gated', 'missing', 'degraded'].includes(agent.state.status));
  const availableCapabilities = state.execution.data.capabilities.filter((capability) => capability.state === 'available');
  const timeline = buildTimeline(state);
  const activePredictions = state.predictions.data.runs.filter((entry) => ['OPEN', 'WAITING_EVIDENCE', 'DUE', 'RUNNING'].includes(text(entry.status).toUpperCase()));
  const allHypotheses = [...state.predictions.data.runs, ...state.predictions.data.legacyEntries];
  const reportActions = state.execution.data.recentActions.filter((entry) => text(entry.action).includes('report'));
  const graphLifecycle = [
    ...state.governance.data.mutations.filter((entry) => ['closed', 'rejected', 'blocked', 'superseded'].includes(text(entry.status).toLowerCase())),
    ...state.predictions.data.learningEvents,
  ];
  const healthRows: RootRow[] = [
    { title: 'ROOT STATE', status: state.system.error ? 'DEGRADED' : 'OK', source: state.system.source, observed_at: state.system.observedAt },
    { title: 'GOVERNANCE', status: state.governance.error ? 'DEGRADED' : 'OK', source: state.governance.source, observed_at: state.governance.observedAt },
    { title: 'AGENTS', status: state.agents.error ? 'DEGRADED' : 'OK', source: state.agents.source, observed_at: state.agents.observedAt },
    { title: 'PREDICTIONS', status: state.predictions.error ? 'DEGRADED' : 'OK', source: state.predictions.source, observed_at: state.predictions.observedAt },
    { title: 'AMV', status: state.amv.error ? 'DEGRADED' : 'OK', source: state.amv.source, observed_at: state.amv.observedAt },
    { title: 'EVIDENCE', status: state.evidence.error ? 'DEGRADED' : 'OK', source: state.evidence.source, observed_at: state.evidence.observedAt },
    { title: 'EXECUTION', status: state.execution.error ? 'DEGRADED' : 'OK', source: state.execution.source, observed_at: state.execution.observedAt },
    { title: 'TELEMETRY', status: state.telemetry.error ? 'DEGRADED' : 'OK', source: state.telemetry.source, observed_at: state.telemetry.observedAt },
    { title: 'COGNITIVE RUNTIME', status: state.cognitiveRuntime.error ? 'DEGRADED' : state.cognitiveRuntime.data.status, source: state.cognitiveRuntime.source, observed_at: state.cognitiveRuntime.observedAt },
  ];
  const routeRows = [...PUBLIC_ROUTES.map((href) => ({ title: href, status: 'PUBLIC', href })), ...PRIVATE_ROUTES.map((href) => ({ title: href, status: 'PRIVATE', href }))];

  return {
    I: [
      { id: 'system-state', topology: 'I', eyebrow: 'SFI / MATH CORE', title: 'ESTADO INSTITUCIONAL', value: phi === null ? 'NO DETERMINADO' : phi.toFixed(3), status: phi === null ? 'MISSING' : 'DERIVED', description: 'Lectura institucional persistida. No sustituye IHG, NTI, LDI ni ξ; los reúne como vista de régimen.', source: 'sfi_indicator_snapshots + Math Core', observedAt: state.system.observedAt, confidence: null, visual: 'gauge', values: [phi ?? 0, ihg ?? 0, nti ?? 0, ldi ?? 0], rows: matrix.map((item) => ({ id: item.id, title: item.label, status: item.state.status, value: item.state.value, source: item.state.source, observed_at: item.state.observedAt, confidence: item.state.confidence, explanation: item.state.explanation })) },
      { id: 'health', topology: 'I', eyebrow: 'HEALTH / VISORS', title: 'SALUD DE LECTORES Y APIs', value: `${healthRows.filter((entry) => entry.status === 'OK' || entry.status === 'operational').length}/${healthRows.length}`, status: state.warnings.length ? 'DEGRADED' : 'OBSERVED', description: 'Estado de los lectores server-side que alimentan ROOT. Un lector degradado no se maquilla como cero.', source: 'rootSovereignAdapter', observedAt: state.generatedAt, confidence: null, visual: 'status', values: healthRows.map((entry) => entry.status === 'OK' || entry.status === 'operational' ? 1 : 0), rows: healthRows },
      { id: 'governance', topology: 'I', eyebrow: 'ACP / AUTHORITY', title: 'GOBERNANZA', value: `${state.governance.data.proposals.length + state.governance.data.mutations.length}`, status: statusFrom(state.governance.data.proposals.length + state.governance.data.mutations.length, state.governance.error), description: 'Propuestas, mutaciones, auditorías y eventos de autoridad persistidos.', source: state.governance.source, observedAt: state.governance.observedAt, confidence: null, visual: 'matrix', values: [state.governance.data.proposals.length, state.governance.data.mutations.length, state.governance.data.audits.length, state.governance.data.events.length], rows: latestRows([...state.governance.data.proposals, ...state.governance.data.mutations, ...state.governance.data.audits]) },
      { id: 'agents', topology: 'I', eyebrow: 'REGISTRY / PROVIDERS', title: 'AGENTES REGISTRADOS', value: String(state.agents.data.agents.length), status: statusFrom(state.agents.data.agents.length, state.agents.error), description: 'Inventario real de agentes, proveedor, modelo, última ejecución y disponibilidad.', source: state.agents.source, observedAt: state.agents.observedAt, confidence: operationalAgents.length / Math.max(1, state.agents.data.agents.length), visual: 'bars', values: [operationalAgents.length, gatedAgents.length], rows: state.agents.data.agents.map((agent) => ({ id: agent.id, title: agent.id, description: agent.role, status: agent.state.status, provider: agent.provider, model: agent.model, observed_at: agent.lastRun, result: agent.lastResult, error: agent.error })) },
      { id: 'cognitive-runtime', topology: 'I', eyebrow: 'RUNTIME / CONTRACT', title: 'RUNTIME COGNITIVO', value: String(state.cognitiveRuntime.data.contract.registeredAgents), status: state.cognitiveRuntime.data.status.toUpperCase(), description: state.cognitiveRuntime.data.summary, source: state.cognitiveRuntime.source, observedAt: state.cognitiveRuntime.observedAt, confidence: null, visual: 'matrix', values: [state.cognitiveRuntime.data.contract.registeredAgents, state.cognitiveRuntime.data.contract.operationalModes, state.cognitiveRuntime.data.contract.executorAgents, state.cognitiveRuntime.data.contract.humanApprovalAgents], rows: state.cognitiveRuntime.data.layers.map((layer) => ({ id: layer.id, title: layer.id, description: layer.question, status: layer.status, agents: layer.agents, warnings: layer.warnings })) },
      { id: 'telemetry', topology: 'I', eyebrow: 'MIHM / WORLDSPECT', title: 'INSTRUMENTOS DE TELEMETRÍA', value: state.telemetry.data.instruments.map((item) => `${item.symbol} ${item.value ?? '—'}`).join(' · ') || 'MISSING', status: statusFrom(state.telemetry.data.instruments.length, state.telemetry.error), description: 'Instrumentos MIHM sistémico y mundo, más fenómenos PPOI observados.', source: state.telemetry.source, observedAt: state.telemetry.observedAt, confidence: null, visual: 'spark', values: state.telemetry.data.instruments.map((item) => item.value ?? 0), rows: [...state.telemetry.data.instruments.map((item) => ({ id: item.id, title: item.label, value: item.value, status: item.status, warning: item.warning })), ...state.telemetry.data.phenomena.map((item) => ({ id: item.id, title: item.name, fp_code: item.fpCode, value: item.composite, attractor_pull: item.attractorPull, ejector_pull: item.ejectorPull, direction: item.direction }))] },
      { id: 'evidence-ledger', topology: 'I', eyebrow: 'EVIDENCE / LINEAGE', title: 'LEDGER DE EVIDENCIAS', value: String(state.evidence.data.entries.length + state.evidence.data.ledger.length), status: statusFrom(state.evidence.data.entries.length + state.evidence.data.ledger.length, state.evidence.error), description: 'Entradas ROOT y evidencia SFI con hash, fuente, confianza y linaje.', source: state.evidence.source, observedAt: state.evidence.observedAt, confidence: null, visual: 'bars', values: [state.evidence.data.entries.length, state.evidence.data.ledger.length, state.evidence.data.nodes.length, state.evidence.data.edges.length], rows: latestRows([...state.evidence.data.entries, ...state.evidence.data.ledger]) },
      { id: 'execution-contracts', topology: 'I', eyebrow: 'ROUTES / AUTHORITY', title: 'CONTRATOS EJECUTABLES', value: `${availableCapabilities.length}/${state.execution.data.capabilities.length}`, status: statusFrom(availableCapabilities.length, state.execution.error), description: 'Capacidades con endpoint real, método y restricción de autoridad.', source: state.execution.source, observedAt: state.execution.observedAt, confidence: availableCapabilities.length / Math.max(1, state.execution.data.capabilities.length), visual: 'status', values: state.execution.data.capabilities.map((item) => item.state === 'available' ? 1 : item.state === 'partial' ? 0.5 : 0), rows: state.execution.data.capabilities.map((item) => ({ id: item.id, title: item.label, status: item.state, endpoint: item.endpoint, method: item.method, description: item.description })) },
      { id: 'surfaces', topology: 'I', eyebrow: 'SYSTEMFRICTION.ORG', title: 'SUPERFICIES Y RUTAS', value: String(routeRows.length), status: 'DECLARED', description: 'Mapa de superficies públicas y privadas; la visibilidad no implica acceso.', source: 'Next.js route contracts', observedAt: state.generatedAt, confidence: null, visual: 'routes', values: [PUBLIC_ROUTES.length, PRIVATE_ROUTES.length], rows: routeRows },
      { id: 'persistence', topology: 'I', eyebrow: 'AUDIT / PERSISTENCE', title: 'PERSISTENCIA Y AUDITORÍA', value: String(state.execution.data.recentActions.length), status: statusFrom(state.execution.data.recentActions.length, state.execution.error), description: 'Últimas acciones auditadas y advertencias de persistencia.', source: 'root_audit_events + system state', observedAt: state.execution.observedAt, confidence: null, visual: 'timeline', values: state.execution.data.recentActions.map((_, index, all) => all.length <= 1 ? 0 : index / (all.length - 1)), rows: latestRows([...state.execution.data.recentActions, ...state.governance.data.audits]) },
    ],
    II: [
      { id: 'ai-executions', topology: 'II', eyebrow: 'AGENTIC / EVENTS', title: 'EJECUCIONES DE IA', value: String(state.cognitiveRuntime.data.eventGraph.recentEvents.length), status: state.cognitiveRuntime.data.eventGraph.status.toUpperCase(), description: 'Eventos cognitivos recientes, agente, clase epistémica y confianza.', source: state.cognitiveRuntime.data.eventGraph.source, observedAt: state.cognitiveRuntime.observedAt, confidence: null, visual: 'timeline', values: state.cognitiveRuntime.data.eventGraph.recentEvents.map((item) => item.confidence ?? 0), rows: state.cognitiveRuntime.data.eventGraph.recentEvents.map((item) => ({ id: item.eventId, title: item.eventName, epistemic_class: item.epistemicClass, confidence: item.confidence, observed_at: item.occurredAt, source: item.sourceId })) },
      { id: 'projections', topology: 'II', eyebrow: 'PREDICTIVE / RUNS', title: 'PROYECCIONES ACTIVAS', value: String(activePredictions.length), status: statusFrom(activePredictions.length, state.predictions.error), description: 'Predicciones persistidas con intervalo, confianza, evidencia faltante y regla de verificación.', source: state.predictions.source, observedAt: state.predictions.observedAt, confidence: null, visual: 'spark', values: activePredictions.map((entry) => rowConfidence(entry) ?? 0), rows: activePredictions },
      { id: 'simulations', topology: 'II', eyebrow: 'SIMULATION / GATE', title: 'SIMULACIONES', value: state.execution.data.capabilities.find((item) => item.id === 'simulation')?.state.toUpperCase() ?? 'MISSING', status: state.execution.data.capabilities.find((item) => item.id === 'simulation')?.state.toUpperCase() ?? 'MISSING', description: 'La simulación sólo se presenta como ejecutable cuando existe contrato persistido; actualmente puede permanecer gated.', source: 'execution capabilities + cognitive runtime', observedAt: state.generatedAt, confidence: null, visual: 'orbit', values: [state.cognitiveRuntime.data.agents.filter((item) => item.simulationAllowed).length, state.cognitiveRuntime.data.agents.filter((item) => item.humanApprovalRequired).length], rows: state.cognitiveRuntime.data.agents.filter((item) => item.simulationAllowed).map((item) => ({ id: item.id, title: item.name, status: item.status, authority: item.authorityLevel, human_approval_required: item.humanApprovalRequired, route: item.route, evidence: item.evidence })) },
      { id: 'perturbations', topology: 'II', eyebrow: 'PROPOSALS / MINIMUM CHANGE', title: 'PERTURBACIONES SUGERIDAS', value: String(state.governance.data.proposals.length), status: statusFrom(state.governance.data.proposals.length, state.governance.error), description: 'Propuestas y acciones pendientes de autoridad; no equivalen a ejecución.', source: state.governance.source, observedAt: state.governance.observedAt, confidence: null, visual: 'matrix', values: [state.governance.data.proposals.length, state.governance.data.mutations.length], rows: latestRows([...state.governance.data.proposals, ...state.governance.data.mutations]) },
      { id: 'graph-nodes', topology: 'II', eyebrow: 'NEURAL GRAPH / EVIDENCE', title: 'NODOS Y RELACIONES', value: `${state.evidence.data.nodes.length}/${state.evidence.data.edges.length}`, status: statusFrom(state.evidence.data.nodes.length, state.evidence.error), description: 'Grafo persistido, seleccionable y enlazable con nueva evidencia.', source: state.evidence.source, observedAt: state.evidence.observedAt, confidence: null, visual: 'graph', values: state.evidence.data.nodes.map((item) => item.confidence ?? 0), rows: state.evidence.data.nodes.map((item) => ({ id: item.id, title: item.label, type: item.type, epistemic_class: item.epistemicClass, confidence: item.confidence, source: item.source, observed_at: item.observedAt, evidence_ids: item.evidenceIds, lineage: item.lineage, payload: item.payload })) },
      { id: 'hypotheses', topology: 'II', eyebrow: 'HYPOTHESES / CURRENT', title: 'HIPÓTESIS ACTUALES', value: String(allHypotheses.length), status: statusFrom(allHypotheses.length, state.predictions.error), description: 'Hipótesis predictivas nuevas y registros legacy diferenciados.', source: state.predictions.source, observedAt: state.predictions.observedAt, confidence: null, visual: 'spark', values: allHypotheses.map((entry) => rowConfidence(entry) ?? 0), rows: latestRows(allHypotheses) },
      { id: 'attractors', topology: 'II', eyebrow: 'AMV / CONVERGENCE', title: 'ATRACTORES DECLARADOS', value: String(state.amv.data.attractors.length), status: statusFrom(state.amv.data.attractors.length, state.amv.error), description: 'Atractores persistidos con confianza, persistencia, peso, evidencia y vector.', source: state.amv.source, observedAt: state.amv.observedAt, confidence: null, visual: 'orbit', values: state.amv.data.attractors.map((entry) => number(entry.weight ?? entry.confidence ?? entry.persistence) ?? 0), rows: state.amv.data.attractors },
      { id: 'ejectors', topology: 'II', eyebrow: 'AMV / CONTRADICTION', title: 'EYECTORES Y DEUDA', value: String(state.amv.data.ejectors.length), status: statusFrom(state.amv.data.ejectors.length, state.amv.error), description: 'Contradicción, deuda no resuelta, decaimiento y presión externa observadas.', source: state.amv.source, observedAt: state.amv.observedAt, confidence: null, visual: 'bars', values: state.amv.data.ejectors.map((entry) => number(entry.weight ?? entry.decay ?? entry.external_pressure) ?? 0), rows: state.amv.data.ejectors },
      { id: 'evidence-requests', topology: 'II', eyebrow: 'PREDICTION / MISSING EVIDENCE', title: 'EVIDENCIA REQUERIDA', value: String(state.predictions.data.evidenceRequests.length), status: statusFrom(state.predictions.data.evidenceRequests.length, state.predictions.error), description: 'Solicitudes de evidencia pendientes, prioridad y fuentes candidatas.', source: state.predictions.source, observedAt: state.predictions.observedAt, confidence: null, visual: 'status', values: state.predictions.data.evidenceRequests.map((entry) => text(entry.status).toUpperCase() === 'FULFILLED' ? 1 : 0), rows: state.predictions.data.evidenceRequests },
      { id: 'attractor-field', topology: 'II', eyebrow: 'CURRENT SFI → DECLARED ATTRACTOR', title: 'CAMPO DE CONVERGENCIA', value: phi === null ? 'POSITION MISSING' : `Φ_SF ${phi.toFixed(3)}`, status: state.amv.data.attractors.length && phi !== null ? 'DERIVED VIEW' : 'MISSING', description: 'Visual no euclídeo conectado a métricas reales: radio de posición actual = 1 − Φ_SF; nodos y atractores provienen de tablas persistidas.', source: 'sfi_indicator_snapshots + evidence graph + sfi_attractors', observedAt: state.generatedAt, confidence: null, visual: 'graph', values: [phi ?? 0, ihg ?? 0, nti ?? 0, ldi ?? 0], rows: [], span: 'wide' },
    ],
    III: [
      { id: 'timeline', topology: 'III', eyebrow: 'LONGITUDINAL / ALL EVENTS', title: 'TIMELINE INSTITUCIONAL', value: String(timeline.length), status: statusFrom(timeline.length, null), description: 'Secuencia unificada de gobernanza, ejecución, predicción, evidencia, AMV y aprendizaje.', source: 'ROOT longitudinal merge', observedAt: rowDate(timeline[0] ?? {}) ?? state.generatedAt, confidence: null, visual: 'timeline', values: timeline.map((_, index, all) => all.length <= 1 ? 0 : 1 - index / (all.length - 1)), rows: timeline },
      { id: 'logbook', topology: 'III', eyebrow: 'AUDIT / MUTATIONS', title: 'BITÁCORA OPERACIONAL', value: String(state.governance.data.audits.length + state.execution.data.recentActions.length), status: statusFrom(state.governance.data.audits.length + state.execution.data.recentActions.length, state.governance.error ?? state.execution.error), description: 'Acciones auditadas, mutaciones y decisiones con actor y fecha.', source: 'root_audit_events + governance audits', observedAt: state.execution.observedAt ?? state.governance.observedAt, confidence: null, visual: 'matrix', values: [state.execution.data.recentActions.length, state.governance.data.audits.length, state.governance.data.mutations.length], rows: latestRows([...state.execution.data.recentActions, ...state.governance.data.audits, ...state.governance.data.mutations]) },
      { id: 'atlas-current', topology: 'III', eyebrow: 'ATLAS / CURRENT NODES', title: 'ATLAS ACTUAL', value: String(state.evidence.data.nodes.length), status: statusFrom(state.evidence.data.nodes.length, state.evidence.error), description: 'Nodos actuales, relaciones y linaje con selección detallada.', source: state.evidence.source, observedAt: state.evidence.observedAt, confidence: null, visual: 'graph', values: state.evidence.data.nodes.map((item) => item.confidence ?? 0), rows: state.evidence.data.nodes.map((item) => ({ id: item.id, title: item.label, type: item.type, status: item.epistemicClass, confidence: item.confidence, source: item.source, observed_at: item.observedAt, evidence_ids: item.evidenceIds, lineage: item.lineage })) },
      { id: 'atlas-lifecycle', topology: 'III', eyebrow: 'ATLAS / DISAPPEARED OR REJECTED', title: 'CICLO DE VIDA DE CONEXIONES', value: String(graphLifecycle.length), status: statusFrom(graphLifecycle.length, null), description: 'Decisiones cerradas, rechazadas, bloqueadas, sustituidas y eventos de aprendizaje conservados en memoria.', source: 'governance mutations + predictive learning', observedAt: rowDate(graphLifecycle[0] ?? {}), confidence: null, visual: 'timeline', values: graphLifecycle.map((entry) => ['rejected', 'blocked'].includes(text(entry.status ?? entry.learning_state).toLowerCase()) ? 1 : 0.5), rows: latestRows(graphLifecycle) },
      { id: 'atlas-latent', topology: 'III', eyebrow: 'ATLAS / LATENT RETURN', title: 'NODOS LATENTES O REAPARECIBLES', value: String(state.amv.data.memories.length + state.amv.data.attractors.length), status: statusFrom(state.amv.data.memories.length + state.amv.data.attractors.length, state.amv.error), description: 'Memoria AMV y atractores conservados aunque no estén activos en el grafo visual actual.', source: state.amv.source, observedAt: state.amv.observedAt, confidence: null, visual: 'orbit', values: state.amv.data.attractors.map((entry) => number(entry.persistence ?? entry.trust) ?? 0), rows: latestRows([...state.amv.data.memories, ...state.amv.data.attractors]) },
      { id: 'reports', topology: 'III', eyebrow: 'REPORT AGENT / DOWNLOAD', title: 'REPORTES ACTUALES', value: String(reportActions.length), status: statusFrom(reportActions.length, state.execution.error), description: 'Generación gobernada de reportes internos, Atlas, calibración, AMV y grafo; descarga local en Markdown.', source: '/api/root/agentic/report', observedAt: rowDate(reportActions[0] ?? {}), confidence: null, visual: 'report', values: reportActions.map(() => 1), rows: latestRows(reportActions), span: 'wide' },
      { id: 'cases-evidence', topology: 'III', eyebrow: 'CASES / COMPANY EVIDENCE', title: 'CASOS Y EVIDENCIA DE EMPRESAS', value: String(state.evidence.data.ledger.filter((entry) => Boolean(entry.case_id)).length), status: statusFrom(state.evidence.data.ledger.filter((entry) => Boolean(entry.case_id)).length, state.evidence.error), description: 'Evidencia ligada a casos; admite nuevos adjuntos desde el inspector.', source: 'sfi_evidence_ledger + root_evidence_entries', observedAt: state.evidence.observedAt, confidence: null, visual: 'matrix', values: state.evidence.data.ledger.map((entry) => number(entry.trust_score) ?? 0), rows: state.evidence.data.ledger.filter((entry) => Boolean(entry.case_id)) },
      { id: 'verification', topology: 'III', eyebrow: 'PREDICTIONS / RETURNS', title: 'VERIFICACIÓN LONGITUDINAL', value: String(state.predictions.data.outcomes.length + state.predictions.data.legacyVerifications.length), status: statusFrom(state.predictions.data.outcomes.length + state.predictions.data.legacyVerifications.length, state.predictions.error), description: 'Resultados, retornos y verificaciones contra la predicción original.', source: state.predictions.source, observedAt: state.predictions.observedAt, confidence: null, visual: 'spark', values: [...state.predictions.data.outcomes, ...state.predictions.data.legacyVerifications].map((entry) => rowConfidence(entry) ?? 0), rows: latestRows([...state.predictions.data.outcomes, ...state.predictions.data.legacyVerifications]) },
      { id: 'learning', topology: 'III', eyebrow: 'MODEL / MEMORY DELTA', title: 'APRENDIZAJE REGISTRADO', value: String(state.predictions.data.learningEvents.length), status: statusFrom(state.predictions.data.learningEvents.length, state.predictions.error), description: 'Eventos de aprendizaje, error, parámetros antes/después y reflexión AMV.', source: state.predictions.source, observedAt: state.predictions.observedAt, confidence: null, visual: 'bars', values: state.predictions.data.learningEvents.map((entry) => number(entry.quality_weight) ?? 0), rows: state.predictions.data.learningEvents },
      { id: 'deliverables', topology: 'III', eyebrow: 'EXPORT / CURRENT STATE', title: 'ENTREGABLES Y DESCARGAS', value: String(reportActions.length + state.predictions.data.outcomes.length), status: 'AVAILABLE', description: 'Centro de exportación local para reportes generados y lectura de resultados persistidos.', source: 'report agent + browser download', observedAt: state.generatedAt, confidence: null, visual: 'report', values: [reportActions.length, state.predictions.data.outcomes.length], rows: latestRows([...reportActions, ...state.predictions.data.outcomes]) },
    ],
  };
}

function MiniVisual({ card }: { card: TopologyCard }) {
  const values = card.values.length ? card.values.slice(0, 18) : [0];
  const normalized = values.map((value) => clamp01(value));
  if (card.visual === 'gauge') {
    const value = normalized[0] ?? 0;
    return <div className="rtw-gauge" style={{ '--rtw-value': `${value * 360}deg` } as CSSProperties}><i/><strong>{card.value}</strong></div>;
  }
  if (card.visual === 'routes') return <div className="rtw-route-visual"><b>{PUBLIC_ROUTES.length}</b><span>PÚBLICAS</span><b>{PRIVATE_ROUTES.length}</b><span>PRIVADAS</span></div>;
  if (card.visual === 'timeline') return <svg className="rtw-mini-svg" viewBox="0 0 180 56" preserveAspectRatio="none"><path d="M4 42 H176"/><g>{normalized.map((value, index) => { const x = 8 + index * (164 / Math.max(1, normalized.length - 1)); const y = 40 - value * 30; return <g key={`${card.id}-${index}`}><line x1={x} y1="42" x2={x} y2={y}/><circle cx={x} cy={y} r="1.8"/></g>; })}</g></svg>;
  if (card.visual === 'spark') {
    const points = normalized.map((value, index) => `${6 + index * (168 / Math.max(1, normalized.length - 1))},${48 - value * 38}`).join(' ');
    return <svg className="rtw-mini-svg" viewBox="0 0 180 56" preserveAspectRatio="none"><polyline points={points || '6,48 174,48'}/></svg>;
  }
  if (card.visual === 'orbit' || card.visual === 'graph') return <div className="rtw-orbit-visual"><i/><i/><i/><b>{card.value}</b></div>;
  if (card.visual === 'matrix' || card.visual === 'status') return <div className="rtw-matrix-visual">{normalized.slice(0, 12).map((value, index) => <i key={`${card.id}-${index}`} style={{ opacity: 0.15 + value * 0.85 }}/>)}</div>;
  if (card.visual === 'report') return <div className="rtw-report-visual"><span>MD</span><span>JSON</span><span>TRACE</span></div>;
  return <div className="rtw-bars">{normalized.slice(0, 12).map((value, index) => <i key={`${card.id}-${index}`} style={{ height: `${12 + value * 44}px` }}/>)}</div>;
}

function cardToSelection(card: TopologyCard): RootSelection {
  return {
    kind: card.id,
    id: card.id,
    title: card.title,
    source: card.source,
    observedAt: card.observedAt,
    confidence: card.confidence,
    evidenceIds: [],
    warning: card.status === 'DEGRADED' ? card.description : null,
    data: { value: card.value, status: card.status, description: card.description, rows: card.rows },
  };
}

function TopologyCardView({ card, onSelect, onAction }: { card: TopologyCard; onSelect: (selection: RootSelection) => void; onAction: (action: RootActionRequest) => void }) {
  return (
    <article className={`rtw-card ${card.span ? `is-${card.span}` : ''}`} data-status={card.status.toLowerCase()}>
      <header><div><span>{card.eyebrow}</span><h3>{card.title}</h3></div><b>{card.status}</b></header>
      <MiniVisual card={card}/>
      <div className="rtw-card-value">{card.value}</div>
      <p>{card.description}</p>
      <footer><span>{card.source}</span><time>{displayTime(card.observedAt)}</time></footer>
      <div className="rtw-card-actions">
        <button type="button" onClick={() => onSelect(cardToSelection(card))}>DESGLOSAR</button>
        {card.action ? <button type="button" onClick={() => onAction(card.action!)}>EJECUTAR</button> : null}
        {card.href ? <Link href={card.href}>ABRIR</Link> : null}
      </div>
    </article>
  );
}

function graphPoints(state: RootSovereignState): GraphPoint[] {
  const evidence: GraphPoint[] = state.evidence.data.nodes.slice(0, 28).map((node) => ({ id: node.id, label: node.label, kind: 'evidence', source: node.source, confidence: node.confidence, observedAt: node.observedAt, evidenceIds: node.evidenceIds, payload: node.payload }));
  const attractors: GraphPoint[] = state.amv.data.attractors.slice(0, 10).map((entry, index) => ({ id: text(entry.id ?? entry.attractor_key, `attractor-${index}`), label: rowTitle(entry, `Atractor ${index + 1}`), kind: 'attractor', source: state.amv.source, confidence: number(entry.confidence ?? entry.trust ?? entry.weight), observedAt: rowDate(entry), evidenceIds: [], payload: entry }));
  const hypotheses: GraphPoint[] = [...state.predictions.data.runs, ...state.predictions.data.legacyEntries].slice(0, 12).map((entry, index) => ({ id: text(entry.id ?? entry.hypothesis_id, `hypothesis-${index}`), label: rowTitle(entry, `Hipótesis ${index + 1}`), kind: 'hypothesis', source: state.predictions.source, confidence: rowConfidence(entry), observedAt: rowDate(entry), evidenceIds: Array.isArray(entry.evidence_refs) ? entry.evidence_refs.map(String) : [], payload: entry }));
  const agents: GraphPoint[] = state.agents.data.agents.slice(0, 12).map((agent) => ({ id: agent.id, label: agent.id, kind: 'agent', source: state.agents.source, confidence: agent.state.confidence, observedAt: agent.lastRun, evidenceIds: agent.state.evidenceIds, payload: { role: agent.role, status: agent.state.status, provider: agent.provider, model: agent.model, last_result: agent.lastResult, error: agent.error } }));
  return [...attractors, ...evidence, ...hypotheses, ...agents];
}

function RootAttractorField({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useMemo(() => graphPoints(state), [state]);
  const phi = matrixNumber(state, ['phi_sf', 'phi']);
  const current: GraphPoint = useMemo(() => ({ id: 'SFI_CURRENT_STATE', label: 'SFI · POSICIÓN ACTUAL', kind: 'current', source: 'sfi_indicator_snapshots', confidence: phi, observedAt: state.system.observedAt, evidenceIds: [], payload: { phi_sf: phi, ihg: matrixNumber(state, ['ihg']), nti: matrixNumber(state, ['nti', 'nti_obs']), ldi: matrixNumber(state, ['ldi']) } }), [phi, state]);
  const hitMap = useRef<Array<{ point: GraphPoint; x: number; y: number; radius: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let frame = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) { canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr); }
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#050504'; context.fillRect(0, 0, width, height);
      const cx = width / 2; const cy = height / 2; const base = Math.min(width, height) * 0.42; frame += 1;
      context.strokeStyle = 'rgba(200,169,81,.055)'; context.lineWidth = 0.5;
      for (let ring = 1; ring <= 5; ring += 1) { context.beginPath(); context.arc(cx, cy, base * ring / 5, 0, Math.PI * 2); context.stroke(); }
      context.beginPath(); context.moveTo(cx, 0); context.lineTo(cx, height); context.stroke();
      context.beginPath(); context.moveTo(0, cy); context.lineTo(width, cy); context.stroke();
      const attractor = points.find((point) => point.kind === 'attractor') ?? null;
      const graphItems = points.filter((point) => point !== attractor);
      const hits: Array<{ point: GraphPoint; x: number; y: number; radius: number }> = [];
      graphItems.forEach((point, index) => {
        const unit = deterministicUnit(point.id);
        const angle = unit * Math.PI * 2 + frame * (point.kind === 'agent' ? 0.00004 : 0.000015) * (index % 2 ? 1 : -1);
        const band = point.kind === 'evidence' ? 0.78 : point.kind === 'hypothesis' ? 0.61 : 0.46;
        const confidence = clamp01(point.confidence);
        const radius = base * (band + (1 - confidence) * 0.15);
        const x = cx + Math.cos(angle) * radius; const y = cy + Math.sin(angle) * radius;
        const size = point.kind === 'evidence' ? 4.2 : point.kind === 'hypothesis' ? 5 : 3.2;
        const color = point.kind === 'evidence' ? '184,80,80' : point.kind === 'hypothesis' ? '208,100,167' : '84,199,210';
        context.strokeStyle = `rgba(${color},${0.25 + confidence * 0.55})`; context.fillStyle = `rgba(${color},${0.08 + confidence * 0.22})`; context.beginPath();
        if (point.kind === 'hypothesis') { context.moveTo(x, y - size); context.lineTo(x + size, y + size); context.lineTo(x - size, y + size); context.closePath(); }
        else if (point.kind === 'agent') context.rect(x - size, y - size, size * 2, size * 2);
        else context.arc(x, y, size, 0, Math.PI * 2);
        context.fill(); context.stroke();
        if (index < 18) { context.fillStyle = 'rgba(200,169,81,.38)'; context.font = '7px ui-monospace'; context.fillText(point.label.slice(0, 22), x + size + 4, y + 2); }
        hits.push({ point, x, y, radius: size + 8 });
      });
      const currentRadius = base * (0.18 + (1 - clamp01(phi)) * 0.58); const currentAngle = -Math.PI * 0.72;
      const currentX = cx + Math.cos(currentAngle) * currentRadius; const currentY = cy + Math.sin(currentAngle) * currentRadius;
      context.strokeStyle = 'rgba(255,255,255,.8)'; context.fillStyle = 'rgba(255,255,255,.16)'; context.beginPath(); context.arc(currentX, currentY, 6, 0, Math.PI * 2); context.fill(); context.stroke();
      context.fillStyle = 'rgba(255,255,255,.62)'; context.font = '8px ui-monospace'; context.fillText('SFI ACTUAL', currentX + 10, currentY + 3); hits.push({ point: current, x: currentX, y: currentY, radius: 14 });
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, 42); glow.addColorStop(0, 'rgba(255,245,220,.95)'); glow.addColorStop(0.22, 'rgba(200,169,81,.28)'); glow.addColorStop(1, 'rgba(200,169,81,0)');
      context.fillStyle = glow; context.beginPath(); context.arc(cx, cy, 42, 0, Math.PI * 2); context.fill(); context.fillStyle = '#f7e7bd'; context.beginPath(); context.arc(cx, cy, 4, 0, Math.PI * 2); context.fill();
      context.fillStyle = 'rgba(200,169,81,.7)'; context.font = '8px ui-monospace'; context.textAlign = 'center'; context.fillText(attractor ? attractor.label.slice(0, 38) : 'ATRACTOR NO DECLARADO', cx, cy + 58); context.textAlign = 'start';
      if (attractor) hits.push({ point: attractor, x: cx, y: cy, radius: 28 });
      hitMap.current = hits; raf = window.requestAnimationFrame(draw);
    };
    draw(); return () => window.cancelAnimationFrame(raf);
  }, [current, phi, points]);

  function click(event: MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top;
    const hit = hitMap.current.find((item) => Math.hypot(x - item.x, y - item.y) <= item.radius); if (!hit) return;
    onSelect({ kind: hit.point.kind, id: hit.point.id, title: hit.point.label, source: hit.point.source, observedAt: hit.point.observedAt, confidence: hit.point.confidence, evidenceIds: hit.point.evidenceIds, warning: null, data: hit.point.payload });
  }

  return <section className="rtw-field"><canvas ref={canvasRef} onClick={click} aria-label="Campo real de SFI, atractores, evidencia, hipótesis y agentes"/><div className="rtw-axis top">OBSERVATORIO LONGITUDINAL</div><div className="rtw-axis bottom">W SPECT · ESPECTRO DE POSIBILIDADES</div><div className="rtw-axis left">ATLAS · CARTOGRAFÍA DEL CAMPO</div><div className="rtw-axis right">MIHM · MEMORIA INMATERIAL</div><div className="rtw-field-legend"><span>● SFI ACTUAL</span><span>◎ ATRACTOR</span><span>○ EVIDENCIA</span><span>△ HIPÓTESIS</span><span>□ AGENTE</span></div></section>;
}

function Inspector({ selection, onClose, onAttach }: { selection: RootSelection | null; onClose: () => void; onAttach: () => void }) {
  if (!selection) return <aside className="rtw-inspector is-empty"><span>SELECCIONA UNA TARJETA O NODO</span><p>ROOT mostrará fuente, fecha, confianza, evidencia y payload sin inventar valores faltantes.</p></aside>;
  return <aside className="rtw-inspector"><header><div><span>{selection.kind}</span><h2>{selection.title}</h2></div><button type="button" onClick={onClose}>CERRAR</button></header><dl><div><dt>ID</dt><dd>{selection.id}</dd></div><div><dt>FUENTE</dt><dd>{selection.source}</dd></div><div><dt>OBSERVADO</dt><dd>{displayTime(selection.observedAt)}</dd></div><div><dt>CONFIANZA</dt><dd>{selection.confidence === null ? 'NO DECLARADA' : percent(selection.confidence)}</dd></div><div><dt>EVIDENCIAS</dt><dd>{selection.evidenceIds.length || '0'}</dd></div></dl>{selection.warning ? <p className="rtw-inspector-warning">{selection.warning}</p> : null}<pre>{JSON.stringify(selection.data, null, 2)}</pre><button type="button" className="rtw-primary" onClick={onAttach}>ADJUNTAR EVIDENCIA A ESTE PUNTO</button></aside>;
}

const REPORT_TYPES = ['world_vector_internal', 'world_vector_public', 'neural_graph_evidence', 'amv_recurrence', 'calibration', 'atlas_entry', 'sfi_dr01'] as const;

function ReportCenter({ onGenerated }: { onGenerated: (selection: RootSelection) => void }) {
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]>('atlas_entry');
  const [subject, setSubject] = useState('Estado actual de SFI y trayectoria hacia el atractor declarado');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ title: string; body: string; evidence: string[]; provider?: string } | null>(null);
  async function generate() {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/root/agentic/report', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, subject }) });
      const body = await response.json().catch(() => null); if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      const next = { title: text(body.title, `${type} report`), body: text(body.body, ''), evidence: Array.isArray(body.evidence) ? body.evidence.map(String) : [], provider: text(body.provider, '') };
      setReport(next); onGenerated({ kind: 'report', id: `${type}-${Date.now()}`, title: next.title, source: next.provider || '/api/root/agentic/report', observedAt: new Date().toISOString(), confidence: null, evidenceIds: next.evidence, warning: null, data: body });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'report_generation_failed'); } finally { setBusy(false); }
  }
  function download() {
    if (!report) return;
    const markdown = `# ${report.title}\n\n${report.body}\n\n## Evidence\n${report.evidence.map((item) => `- ${item}`).join('\n')}`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${type}-${new Date().toISOString().slice(0, 10)}.md`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <section className="rtw-report-center"><header><span>REPORT AGENT</span><h2>GENERAR Y DESCARGAR REPORTE ACTUAL</h2></header><div className="rtw-report-form"><label>TIPO<select value={type} onChange={(event) => setType(event.target.value as typeof type)}>{REPORT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>SUJETO<input value={subject} onChange={(event) => setSubject(event.target.value)}/></label><button type="button" onClick={() => void generate()} disabled={busy}>{busy ? 'GENERANDO' : 'GENERAR'}</button><button type="button" onClick={download} disabled={!report}>DESCARGAR .MD</button></div>{error ? <p className="rtw-error">{error}</p> : null}{report ? <pre>{report.body}</pre> : <p>El reporte se genera con el agente existente. No se publica automáticamente.</p>}</section>;
}

function EvidenceDialog({ selection, onClose, onStored }: { selection: RootSelection | null; onClose: () => void; onStored: (selection: RootSelection) => void }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    if (selection?.id) data.set('targetNodeId', selection.id);
    data.set('proposalType', 'root_topology_evidence_analysis');
    data.set('objective', `Analizar evidencia contra ${selection?.title ?? 'estado institucional'} y actualizar el grafo metodológico.`);
    setBusy(true); setMessage(null);
    try {
      const response = await fetch('/api/root/evidence', { method: 'POST', credentials: 'include', body: data }); const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? body?.details ?? `HTTP ${response.status}`);
      const query = `${data.get('title') ?? ''}\n${data.get('content') ?? ''}`.trim();
      const analysisResponse = await fetch('/api/root/agentic/neural-graph', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, filters: ['evidence', 'hypothesis', 'prediction', 'amv', 'atlas'], generateInterpretation: true }) });
      const analysis = await analysisResponse.json().catch(() => null); const evidence = row(body.data?.evidence);
      setMessage(analysisResponse.ok ? 'EVIDENCIA PERSISTIDA Y ANALIZADA POR NEURAL GRAPH.' : 'EVIDENCIA PERSISTIDA; ANÁLISIS GRAPH DEGRADADO.');
      onStored({ kind: 'evidence', id: text(evidence.id, `evidence-${Date.now()}`), title: text(evidence.title, 'Evidencia ROOT'), source: 'root_evidence_entries + neural graph', observedAt: text(evidence.created_at, new Date().toISOString()), confidence: 0.9, evidenceIds: [text(evidence.evidence_hash, '')].filter(Boolean), warning: analysisResponse.ok ? null : text(analysis?.error, 'neural_graph_analysis_failed'), data: { persistence: body.data, analysis } }); form.reset();
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'evidence_upload_failed'); } finally { setBusy(false); }
  }
  return <div className="rtw-dialog-backdrop"><section className="rtw-dialog" role="dialog" aria-modal="true"><header><div><span>EVIDENCE PIPELINE</span><h2>ADJUNTAR Y ANALIZAR EVIDENCIA</h2></div><button type="button" onClick={onClose}>CERRAR</button></header><p>Punto destino: <strong>{selection?.title ?? 'SIN NODO SELECCIONADO'}</strong></p><form onSubmit={(event) => void submit(event)}><label>TÍTULO<input name="title" required defaultValue={selection ? `Evidencia para ${selection.title}` : ''}/></label><label>TIPO<select name="evidenceType" defaultValue="root_topology_evidence"><option value="root_topology_evidence">Evidencia topológica</option><option value="company_case">Caso de empresa</option><option value="measurement">Medición</option><option value="return">Retorno</option><option value="document">Documento</option></select></label><label>CONTENIDO<textarea name="content" placeholder="Qué demuestra, contradice o actualiza esta evidencia."/></label><label>ARCHIVO<input name="file" type="file" accept=".pdf,.doc,.docx,.txt,.csv,.json,image/*,audio/*,video/*"/></label><label>FUENTE<input name="source" placeholder="Origen verificable"/></label><label>CASO / EMPRESA<input name="caseId" placeholder="Identificador opcional"/></label><button type="submit" className="rtw-primary" disabled={busy}>{busy ? 'PERSISTIENDO Y ANALIZANDO' : 'GUARDAR + ANALIZAR'}</button></form>{message ? <p className="rtw-dialog-message">{message}</p> : null}</section></div>;
}

export function RootTopologyWorkspace({ state, refreshing, warning, onRefresh, onSelect, onAction, onLegacy }: { state: RootSovereignState; refreshing: boolean; warning: string | null; onRefresh: () => void; onSelect: (selection: RootSelection) => void; onAction: (action: RootActionRequest) => void; onLegacy: () => void }) {
  const [topology, setTopology] = useState<TopologyId>('I'); const [selection, setSelection] = useState<RootSelection | null>(null); const [evidenceOpen, setEvidenceOpen] = useState(false); const cards = useMemo(() => makeCards(state), [state]);
  function select(next: RootSelection) { setSelection(next); onSelect(next); }
  const observationAction: RootActionRequest = { id: `root-topology-observation-${Date.now()}`, label: 'Ejecutar ciclo institucional completo', effect: 'Ejecuta observación, snapshot institucional, reportes y auditoría; después ROOT vuelve a leer estados persistidos.', target: 'ROOT / WorldSpect / MIHM / evidence / reports', endpoint: '/api/root/operational/trigger-observation?job=all', method: 'POST' };
  return <main className="rtw-root"><header className="rtw-header"><div className="rtw-brand"><strong>SFI</strong><span>ROOT · OBSERVATORIO TOPOLOGÍAS I–III</span></div><nav>{(['I', 'II', 'III'] as TopologyId[]).map((item) => <button key={item} type="button" className={topology === item ? 'active' : ''} onClick={() => setTopology(item)}>TOPOLOGÍA {item}</button>)}</nav><div className="rtw-header-actions"><button type="button" onClick={onRefresh}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR'}</button><button type="button" onClick={() => onAction(observationAction)}>EJECUTAR CICLO</button><button type="button" onClick={onLegacy}>VISTA ANTERIOR</button></div></header><section className="rtw-intro"><span>TOPOLOGÍA {topology}</span><h1>{TOPOLOGY_COPY[topology].title}</h1><p>{TOPOLOGY_COPY[topology].subtitle}</p><div><b>{cards[topology].length}</b> MÓDULOS · <b>{state.warnings.length}</b> ADVERTENCIAS · CORTE {displayTime(state.generatedAt)}</div></section>{warning || state.warnings.length ? <div className="rtw-warning">{warning ?? state.warnings.slice(0, 3).join(' · ')}</div> : null}<div className="rtw-layout"><section className="rtw-main">{topology === 'II' ? <RootAttractorField state={state} onSelect={select}/> : null}<div className="rtw-card-grid">{cards[topology].map((card) => <TopologyCardView key={card.id} card={card} onSelect={select} onAction={onAction}/>)}</div>{topology === 'III' ? <ReportCenter onGenerated={select}/> : null}</section><Inspector selection={selection} onClose={() => setSelection(null)} onAttach={() => setEvidenceOpen(true)}/></div><footer className="rtw-footer"><span>NO MOCKS · NO ZERO-FILL · SOURCE-BACKED</span><span>WORLD CONTEXT SHARED / PRIVATE OBJECTS ISOLATED</span><span>{state.cognitiveRuntime.data.schemaVersion}</span></footer>{evidenceOpen ? <EvidenceDialog selection={selection} onClose={() => setEvidenceOpen(false)} onStored={(next) => { select(next); onRefresh(); }}/>: null}</main>;
}
