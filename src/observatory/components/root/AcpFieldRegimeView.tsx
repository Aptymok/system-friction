'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type FieldMode = 'topology' | 'degradation' | 'energy' | 'governance' | 'memory' | 'attractors';
type EdgeKind = 'verified' | 'inferred' | 'degraded' | 'resonant' | 'blocked' | 'pending';
type NodeShape = 'circle' | 'diamond' | 'roundrect' | 'triangle' | 'hexagon' | 'dot';
type DegradationBand = 'stable' | 'tension' | 'active' | 'critical';

type RuntimeNode = {
  label?: string;
  nodeKey?: string;
  id?: string;
  nodeType?: string;
  ontologyType?: string;
  runtimeState?: string;
  pressure?: number;
  degradation?: number;
  stability?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  patterns?: unknown[];
  variables?: unknown[];
  layers?: unknown[];
  linkedSfNodes?: unknown[];
  linkedDocuments?: unknown[];
  activationConditions?: unknown[];
};

type RuntimeDocument = {
  documentId?: string;
  title?: string;
  linkedNodes?: unknown[];
  linkedPatterns?: unknown[];
  evidenceWeight?: number;
  confidence?: number;
};

type RuntimePattern = {
  patternId?: string;
  label?: string;
  linkedNodes?: unknown[];
  riskLevel?: string;
};

type RuntimeEdge = {
  sourceNodeId?: string;
  targetNodeId?: string;
  source?: string;
  target?: string;
  relation?: string;
  relationType?: string;
  status?: string;
  provenance?: string;
};

type TwinState = {
  data?: {
    graph?: { edges?: unknown[] };
    seed?: {
      nodeCatalog?: unknown[];
      documentCatalog?: unknown[];
      patternCatalog?: unknown[];
      executionCatalog?: unknown[];
      mihmRuntimeMatrix?: { sourceState?: string; ihg?: number | null; nti?: number | null; ldi?: number | null; phi?: number | null; regime?: string };
    };
  };
};

type DegradationContext = {
  documentsByNode: Map<string, RuntimeDocument[]>;
  patternCountByNode: Map<string, number>;
  degradedRuntimeNodes: Set<string>;
};

type FieldNode = {
  id: string;
  label: string;
  type: string;
  cluster: string;
  shape: NodeShape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pressure: number;
  degradation: number;
  band: DegradationBand;
  phase: number;
  patterns: string[];
  variables: string[];
  documents: string[];
  runtimeState: string;
  evidenceCount: number;
};

type FieldEdge = {
  source: number;
  target: number;
  kind: EdgeKind;
  weight: number;
  verified: boolean;
  label: string;
};

const FIELD_MODES: Array<{ id: FieldMode; label: string; context: string }> = [
  { id: 'topology', label: 'Topologia', context: 'Conexiones, estructura y vecindad real/inferida.' },
  { id: 'degradation', label: 'Degradacion', context: 'Perdida de estabilidad, presion y evidencia incompleta.' },
  { id: 'energy', label: 'Energia', context: 'Flujos, consumo y transferencia entre nodos.' },
  { id: 'governance', label: 'Gobernanza', context: 'ACP, propuestas, bloqueos y decision pendiente.' },
  { id: 'memory', label: 'Memoria', context: 'Atlas, Cuadernillo, Sobre Negro, documentos y continuidad.' },
  { id: 'attractors', label: 'Atractores', context: 'Direccion deseada, friccion y siguiente cierre verificable.' },
];

const LENS_TO_MODE: Record<string, FieldMode> = {
  observacion: 'topology',
  contradiccion: 'degradation',
  energia: 'energy',
  validacion: 'governance',
  temporalidad: 'degradation',
  gobernanza: 'governance',
  memoria: 'memory',
  atractores: 'attractors',
};

const CLUSTERS: Record<string, { label: string; color: string; x: number; y: number }> = {
  governance: { label: 'ACP / decision', color: '#C8A951', x: 0.52, y: 0.22 },
  twin: { label: 'Twin / usuario', color: '#C8A951', x: 0.36, y: 0.24 },
  memory: { label: 'Memoria / archivo', color: '#3B8BD4', x: 0.76, y: 0.34 },
  evidence: { label: 'Evidencia / docs', color: '#3B8BD4', x: 0.72, y: 0.68 },
  mihm: { label: 'MIHM / calculo', color: '#7E8FA8', x: 0.54, y: 0.74 },
  operational: { label: 'Operacion / campo', color: '#C8A951', x: 0.23, y: 0.58 },
  perturbation: { label: 'Perturbacion', color: '#C87060', x: 0.22, y: 0.34 },
  latent: { label: 'Latente', color: '#5A5855', x: 0.84, y: 0.52 },
};

const EDGE_STYLES: Record<EdgeKind, { color: string; dash: number[]; alpha: number; width: number }> = {
  verified: { color: '#C8A951', dash: [], alpha: 0.58, width: 1.1 },
  inferred: { color: '#A58A4A', dash: [3, 7], alpha: 0.24, width: 0.75 },
  degraded: { color: '#C87060', dash: [8, 3, 2, 4], alpha: 0.52, width: 1.2 },
  resonant: { color: '#3B8BD4', dash: [], alpha: 0.56, width: 1.25 },
  blocked: { color: '#5A5855', dash: [], alpha: 0.24, width: 0.9 },
  pending: { color: '#B6A16A', dash: [2, 5], alpha: 0.34, width: 0.7 },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asNode(value: unknown): RuntimeNode | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimeNode : null;
}

function asDocument(value: unknown): RuntimeDocument | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimeDocument : null;
}

function asPattern(value: unknown): RuntimePattern | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimePattern : null;
}

function asEdge(value: unknown): RuntimeEdge | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimeEdge : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function hash(input: string) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) value = Math.imul(value ^ input.charCodeAt(i), 16777619);
  return Math.abs(value >>> 0);
}

function ratio(seed: number, salt: number) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function labelOf(node: RuntimeNode) {
  return node.label || node.nodeKey || node.id || 'nodo';
}

function idOf(node: RuntimeNode, index: number) {
  return node.nodeKey || node.id || `${labelOf(node)}-${index}`;
}

function rawOf(node: RuntimeNode) {
  return `${node.nodeType || node.ontologyType || ''} ${node.nodeKey || ''} ${node.label || ''} ${stringArray(node.variables).join(' ')} ${stringArray(node.patterns).join(' ')}`.toLowerCase();
}

function clusterOf(node: RuntimeNode) {
  const raw = rawOf(node);
  if (raw.includes('acp') || raw.includes('govern') || raw.includes('policy') || raw.includes('proposal') || raw.includes('root')) return 'governance';
  if (raw.includes('twin') || raw.includes('usuario') || raw.includes('personal')) return 'twin';
  if (raw.includes('atlas') || raw.includes('cuadernillo') || raw.includes('sobre') || raw.includes('mem') || raw.includes('archive')) return 'memory';
  if (raw.includes('doc') || raw.includes('evidence') || raw.includes('logbook') || raw.includes('case')) return 'evidence';
  if (raw.includes('mihm') || raw.includes('metric') || raw.includes('ihg') || raw.includes('nti') || raw.includes('ldi')) return 'mihm';
  if (raw.includes('risk') || raw.includes('contradic') || raw.includes('rupt') || raw.includes('perturb') || raw.includes('friccion')) return 'perturbation';
  if (raw.includes('missing') || raw.includes('latent') || raw.includes('extern')) return 'latent';
  return 'operational';
}

function shapeOf(node: RuntimeNode, cluster: string): NodeShape {
  const raw = rawOf(node);
  if (cluster === 'governance' || raw.includes('decision') || raw.includes('policy')) return 'diamond';
  if (cluster === 'evidence' || raw.includes('document')) return 'roundrect';
  if (cluster === 'perturbation' || raw.includes('change') || raw.includes('regime')) return 'triangle';
  if (cluster === 'mihm' || raw.includes('metric')) return 'hexagon';
  if (cluster === 'latent' || node.runtimeState === 'missing') return 'dot';
  return 'circle';
}

function pressureOf(node: RuntimeNode) {
  if (typeof node.pressure === 'number' && Number.isFinite(node.pressure)) return clamp01(node.pressure);
  const patterns = stringArray(node.patterns).length;
  const variables = stringArray(node.variables).length;
  const layers = Array.isArray(node.layers) ? node.layers.length : 0;
  return clamp01(0.14 + patterns * 0.08 + variables * 0.045 + layers * 0.04);
}

function bandOf(value: number): DegradationBand {
  if (value <= 0.25) return 'stable';
  if (value <= 0.5) return 'tension';
  if (value <= 0.75) return 'active';
  return 'critical';
}

function timestampAge(value?: string) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 0;
  return clamp01((Date.now() - timestamp) / (1000 * 60 * 60 * 24 * 45));
}

export function deriveNodeDegradation(node: RuntimeNode, context: DegradationContext): number {
  const explicit = typeof node.degradation === 'number' ? node.degradation : undefined;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return clamp01(explicit);

  const id = node.nodeKey || node.id || labelOf(node);
  const pressure = pressureOf(node);
  const runtime = String(node.runtimeState || '').toLowerCase();
  const patterns = stringArray(node.patterns).length + (context.patternCountByNode.get(id) ?? 0);
  const variables = stringArray(node.variables).length;
  const documents = stringArray(node.linkedDocuments).length + (context.documentsByNode.get(id)?.length ?? 0);
  const evidenceGap = documents === 0 ? 0.22 : documents < 2 ? 0.12 : 0;
  const documentGap = documents === 0 ? 0.12 : 0;
  const runtimePenalty = runtime === 'degraded' || runtime === 'missing' ? 0.24 : runtime === 'static' ? 0.08 : 0;
  const variableLoad = clamp01(variables / 12) * 0.12;
  const patternLoad = clamp01(patterns / 8) * 0.12;
  const degradedRelation = stringArray(node.linkedSfNodes).some((linked) => context.degradedRuntimeNodes.has(linked)) ? 0.14 : 0;
  const age = timestampAge(node.updatedAt || node.updated_at || node.createdAt || node.created_at) * 0.08;
  const stabilityOffset = typeof node.stability === 'number' && Number.isFinite(node.stability) ? (1 - clamp01(node.stability)) * 0.18 : 0;

  return clamp01(pressure * 0.34 + runtimePenalty + patternLoad + variableLoad + evidenceGap + documentGap + degradedRelation + age + stabilityOffset);
}

function buildContext(nodes: RuntimeNode[], documents: RuntimeDocument[], patterns: RuntimePattern[]): DegradationContext {
  const documentsByNode = new Map<string, RuntimeDocument[]>();
  documents.forEach((document) => {
    stringArray(document.linkedNodes).forEach((nodeId) => {
      documentsByNode.set(nodeId, [...(documentsByNode.get(nodeId) ?? []), document]);
    });
  });
  const patternCountByNode = new Map<string, number>();
  patterns.forEach((pattern) => {
    stringArray(pattern.linkedNodes).forEach((nodeId) => {
      patternCountByNode.set(nodeId, (patternCountByNode.get(nodeId) ?? 0) + 1);
    });
  });
  const degradedRuntimeNodes = new Set(nodes.filter((node) => node.runtimeState === 'degraded' || node.runtimeState === 'missing').map((node, index) => idOf(node, index)));
  return { documentsByNode, patternCountByNode, degradedRuntimeNodes };
}

function edgeKindFrom(edge: RuntimeEdge, source: FieldNode, target: FieldNode): EdgeKind {
  const raw = `${edge.status || ''} ${edge.relation || ''} ${edge.relationType || ''} ${edge.provenance || ''}`.toLowerCase();
  if (raw.includes('block')) return 'blocked';
  if (raw.includes('pending') || raw.includes('queued') || raw.includes('proposed')) return 'pending';
  if (source.band === 'critical' || target.band === 'critical' || raw.includes('degrad')) return 'degraded';
  if (raw.includes('resonan') || source.cluster === target.cluster && source.pressure + target.pressure > 1.05) return 'resonant';
  return 'verified';
}

function makeNodes(twin: TwinState | null, width: number, height: number) {
  const rawNodes = (twin?.data?.seed?.nodeCatalog ?? []).map(asNode).filter(Boolean) as RuntimeNode[];
  const documents = (twin?.data?.seed?.documentCatalog ?? []).map(asDocument).filter(Boolean) as RuntimeDocument[];
  const patterns = (twin?.data?.seed?.patternCatalog ?? []).map(asPattern).filter(Boolean) as RuntimePattern[];
  const context = buildContext(rawNodes, documents, patterns);

  return rawNodes.slice(0, 150).map((node, index): FieldNode => {
    const id = idOf(node, index);
    const seed = hash(`${id}:${labelOf(node)}`);
    const cluster = clusterOf(node);
    const center = CLUSTERS[cluster];
    const angle = ratio(seed, 1) * Math.PI * 2;
    const spread = 26 + ratio(seed, 2) * 120;
    const pressure = pressureOf(node);
    const degradation = deriveNodeDegradation(node, context);
    const evidenceCount = stringArray(node.linkedDocuments).length + (context.documentsByNode.get(id)?.length ?? 0);
    return {
      id,
      label: labelOf(node),
      type: node.nodeType || node.ontologyType || 'sf',
      cluster,
      shape: shapeOf(node, cluster),
      x: Math.max(24, Math.min(width - 24, center.x * width + Math.cos(angle) * spread)),
      y: Math.max(24, Math.min(height - 24, center.y * height + Math.sin(angle) * spread)),
      vx: (ratio(seed, 3) - 0.5) * 0.18,
      vy: (ratio(seed, 4) - 0.5) * 0.18,
      radius: 2.6 + pressure * 4.8 + degradation * 3.4,
      pressure,
      degradation,
      band: bandOf(degradation),
      phase: ratio(seed, 5) * Math.PI * 2,
      patterns: stringArray(node.patterns),
      variables: stringArray(node.variables),
      documents: stringArray(node.linkedDocuments),
      runtimeState: node.runtimeState || 'unknown',
      evidenceCount,
    };
  });
}

function makeEdges(twin: TwinState | null, nodes: FieldNode[]) {
  const byId = new Map(nodes.map((node, index) => [node.id, index]));
  const graphEdges = (twin?.data?.graph?.edges ?? []).map(asEdge).filter(Boolean) as RuntimeEdge[];
  const edges: FieldEdge[] = [];
  const seen = new Set<string>();

  function addEdge(source: number, target: number, kind: EdgeKind, label: string, verified: boolean, weight: number) {
    if (source === target) return;
    const key = source < target ? `${source}:${target}` : `${target}:${source}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source, target, kind, label, verified, weight });
  }

  graphEdges.forEach((edge) => {
    const sourceId = edge.sourceNodeId || edge.source;
    const targetId = edge.targetNodeId || edge.target;
    if (!sourceId || !targetId) return;
    const source = byId.get(sourceId);
    const target = byId.get(targetId);
    if (source === undefined || target === undefined) return;
    addEdge(source, target, edgeKindFrom(edge, nodes[source], nodes[target]), edge.relation || edge.relationType || 'verified', true, 0.82);
  });

  nodes.forEach((node, source) => {
    const candidates = nodes
      .map((target, targetIndex) => {
        const sharedVariables = target.variables.filter((variable) => node.variables.includes(variable)).length;
        const sharedPatterns = target.patterns.filter((pattern) => node.patterns.includes(pattern)).length;
        const clusterBias = target.cluster === node.cluster ? 0.18 : 0;
        const distance = Math.hypot(target.x - node.x, target.y - node.y);
        const score = sharedVariables * 0.16 + sharedPatterns * 0.22 + clusterBias + (1 - Math.min(1, distance / 340)) * 0.24;
        return { targetIndex, score, distance };
      })
      .filter((item) => item.targetIndex !== source && item.score > 0.18)
      .sort((a, b) => b.score - a.score || a.distance - b.distance)
      .slice(0, 2);

    candidates.forEach((candidate) => {
      const target = nodes[candidate.targetIndex];
      const kind: EdgeKind = node.band === 'critical' || target.band === 'critical'
        ? 'degraded'
        : node.pressure + target.pressure > 1.18
          ? 'resonant'
          : node.runtimeState === 'missing' || target.runtimeState === 'missing'
            ? 'blocked'
            : 'inferred';
      addEdge(source, candidate.targetIndex, kind, 'inferred', false, candidate.score);
    });
  });

  return edges.slice(0, 340);
}

function nodeColor(node: FieldNode, mode: FieldMode) {
  if (mode === 'degradation') {
    if (node.band === 'critical') return '#D65A4A';
    if (node.band === 'active') return '#C87060';
    if (node.band === 'tension') return '#B6A16A';
  }
  if (node.cluster === 'governance' || node.cluster === 'twin') return '#C8A951';
  if (node.cluster === 'memory' || node.cluster === 'evidence') return '#3B8BD4';
  if (node.cluster === 'perturbation') return '#C87060';
  if (node.cluster === 'latent') return '#5A5855';
  if (node.cluster === 'mihm') return '#8D9AAE';
  return '#B6A16A';
}

function shouldEmphasize(node: FieldNode, mode: FieldMode) {
  if (mode === 'degradation') return node.degradation > 0.5 || node.evidenceCount === 0;
  if (mode === 'energy') return node.pressure > 0.55 || node.cluster === 'operational' || node.cluster === 'mihm';
  if (mode === 'governance') return node.cluster === 'governance' || node.cluster === 'twin' || node.type === 'execution';
  if (mode === 'memory') return node.cluster === 'memory' || node.cluster === 'evidence' || node.evidenceCount > 0;
  if (mode === 'attractors') return node.cluster === 'governance' || node.cluster === 'operational' || node.degradation > 0.45;
  return true;
}

function drawShape(ctx: CanvasRenderingContext2D, node: FieldNode, radius: number) {
  const x = node.x;
  const y = node.y;
  ctx.beginPath();
  if (node.shape === 'diamond') {
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y);
    ctx.lineTo(x, y + radius);
    ctx.lineTo(x - radius, y);
    ctx.closePath();
  } else if (node.shape === 'roundrect') {
    const w = radius * 2.4;
    const h = radius * 1.55;
    ctx.roundRect(x - w / 2, y - h / 2, w, h, Math.min(4, radius * 0.45));
  } else if (node.shape === 'triangle') {
    ctx.moveTo(x, y - radius * 1.15);
    ctx.lineTo(x + radius, y + radius * 0.9);
    ctx.lineTo(x - radius, y + radius * 0.9);
    ctx.closePath();
  } else if (node.shape === 'hexagon') {
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.PI / 6 + (Math.PI * 2 * i) / 6;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    ctx.arc(x, y, node.shape === 'dot' ? Math.max(1.4, radius * 0.45) : radius, 0, Math.PI * 2);
  }
}

function draw(ctx: CanvasRenderingContext2D, nodes: FieldNode[], edges: FieldEdge[], width: number, height: number, tick: number, mode: FieldMode, selectedId?: string) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#070706';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(width * 0.46, height * 0.45, 0, width * 0.46, height * 0.45, Math.max(width, height) * 0.72);
  gradient.addColorStop(0, mode === 'memory' ? 'rgba(59,139,212,0.10)' : 'rgba(200,169,81,0.09)');
  gradient.addColorStop(0.62, 'rgba(200,169,81,0.018)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  Object.entries(CLUSTERS).forEach(([key, cluster], index) => {
    const active = nodes.some((node) => node.cluster === key && shouldEmphasize(node, mode));
    const cx = cluster.x * width;
    const cy = cluster.y * height;
    ctx.beginPath();
    ctx.arc(cx, cy, active ? 76 + Math.sin(tick * 0.012 + index) * 7 : 52, 0, Math.PI * 2);
    ctx.fillStyle = `${cluster.color}${active ? '13' : '08'}`;
    ctx.fill();
    ctx.strokeStyle = `${cluster.color}${active ? '2A' : '12'}`;
    ctx.setLineDash([3, 9]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  ctx.globalAlpha = mode === 'degradation' ? 0.12 : 0.06;
  for (let i = 0; i < 420; i += 1) {
    ctx.fillStyle = mode === 'degradation' && i % 5 === 0 ? '#C87060' : '#8A8880';
    ctx.fillRect(hash(`noise-${i}-${Math.floor(tick / 8)}`) % width, hash(`y-${i}-${Math.floor(tick / 11)}`) % height, 1, 1);
  }
  ctx.globalAlpha = 1;

  edges.forEach((edge) => {
    const source = nodes[edge.source];
    const target = nodes[edge.target];
    if (!source || !target) return;
    const active = shouldEmphasize(source, mode) || shouldEmphasize(target, mode);
    if (!active && mode !== 'topology') return;
    if (mode === 'memory' && !['verified', 'resonant', 'inferred'].includes(edge.kind)) return;
    if (mode === 'governance' && ![source.cluster, target.cluster].some((cluster) => cluster === 'governance' || cluster === 'twin') && edge.kind !== 'pending' && edge.kind !== 'blocked') return;
    if (mode === 'energy' && !['resonant', 'degraded', 'inferred'].includes(edge.kind)) return;

    const style = EDGE_STYLES[edge.kind];
    const pressure = (source.pressure + target.pressure) / 2;
    const alpha = style.alpha * (active ? 1 : 0.32) + pressure * 0.08;
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    const midX = (source.x + target.x) / 2 + Math.sin(tick * 0.012 + edge.source) * (edge.kind === 'degraded' ? 10 : 4);
    const midY = (source.y + target.y) / 2 + Math.cos(tick * 0.01 + edge.target) * (edge.kind === 'degraded' ? 8 : 3);
    ctx.quadraticCurveTo(midX, midY, target.x, target.y);
    ctx.strokeStyle = style.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = style.width + edge.weight * (mode === 'energy' ? 1.4 : 0.65);
    ctx.setLineDash(edge.kind === 'pending' && Math.floor(tick / 16) % 2 === 0 ? [1, 9] : style.dash);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    if (mode === 'energy' || edge.kind === 'resonant') {
      const t = (Math.sin(tick * 0.035 + edge.source) + 1) / 2;
      ctx.beginPath();
      ctx.arc(source.x + (target.x - source.x) * t, source.y + (target.y - source.y) * t, 1.4 + pressure * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = edge.kind === 'resonant' ? '#3B8BD4' : '#C8A951';
      ctx.globalAlpha = 0.52;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });

  nodes.forEach((node) => {
    const cluster = CLUSTERS[node.cluster];
    const cx = cluster.x * width;
    const cy = cluster.y * height;
    const dx = cx - node.x;
    const dy = cy - node.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const emphasis = shouldEmphasize(node, mode);
    node.vx += (dx / d) * (0.00038 + node.pressure * 0.00018);
    node.vy += (dy / d) * (0.00038 + node.pressure * 0.00018);
    if (node.band === 'critical') {
      node.vx += Math.sin(tick * 0.08 + node.phase) * 0.006;
      node.vy += Math.cos(tick * 0.09 + node.phase) * 0.006;
    }
    node.vx *= 0.992;
    node.vy *= 0.992;
    node.x = Math.max(16, Math.min(width - 16, node.x + node.vx));
    node.y = Math.max(16, Math.min(height - 16, node.y + node.vy));

    const selected = selectedId === node.id;
    const pulse = Math.sin(tick * (node.band === 'critical' ? 0.075 : 0.035) + node.phase);
    const radius = node.radius + (emphasis ? 1.4 : -0.6) + node.degradation * 1.8 + pulse * (node.degradation > 0.5 ? 1.6 : 0.55);
    const color = nodeColor(node, mode);
    if (node.degradation > 0.5 || selected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 5 + node.degradation * 6, 0, Math.PI * 2);
      ctx.strokeStyle = node.band === 'critical' ? '#C87060' : selected ? '#C8A951' : '#B6A16A';
      ctx.globalAlpha = selected ? 0.46 : 0.22 + node.degradation * 0.18;
      ctx.lineWidth = selected ? 1.7 : 0.8;
      ctx.setLineDash(node.band === 'critical' ? [4, 3] : []);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    drawShape(ctx, node, Math.max(1.6, radius));
    ctx.fillStyle = color;
    ctx.globalAlpha = (emphasis ? 0.82 : 0.23) - (node.cluster === 'latent' ? 0.15 : 0);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = node.band === 'critical' ? '#F18B78' : node.band === 'active' ? '#C87060' : node.evidenceCount > 0 ? '#C8A951' : '#5A5855';
    ctx.lineWidth = node.band === 'critical' ? 1.7 : node.band === 'active' ? 1.2 : 0.75;
    drawShape(ctx, node, Math.max(1.6, radius));
    ctx.stroke();

    if (node.degradation > 0.65) {
      ctx.fillStyle = '#060605';
      ctx.globalAlpha = 0.34;
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(node.x - radius + ratio(hash(node.id), i) * radius * 2, node.y - radius + ratio(hash(node.label), i) * radius * 2, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }

    if (selected || (emphasis && (node.pressure > 0.68 || node.degradation > 0.62 || mode === 'governance' && node.cluster === 'governance'))) {
      ctx.fillStyle = selected ? '#F2E6B8' : '#CCC8BC';
      ctx.font = selected ? '10px monospace' : '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(node.label.slice(0, selected ? 28 : 18), node.x, node.y + radius + 12);
    }
  });
}

function hitTest(nodes: FieldNode[], x: number, y: number): FieldNode | null {
  let closest: FieldNode | null = null;
  let distance = Infinity;
  for (const node of nodes) {
    const hit = Math.hypot(node.x - x, node.y - y);
    if (hit < Math.max(12, node.radius + 8) && hit < distance) {
      closest = node;
      distance = hit;
    }
  }
  return closest;
}

function modeNarrative(mode: FieldMode, nodes: FieldNode[]) {
  const worst = [...nodes].sort((a, b) => b.degradation - a.degradation)[0];
  if (mode === 'degradation') return worst ? `Peor nodo: ${worst.label}. Cierre recomendado: evidencia antes de reconectar.` : 'Sin nodos cargados.';
  if (mode === 'energy') return 'Mirando intercambio: grosor y flujo muestran donde se acumula presion.';
  if (mode === 'governance') return 'Mirando decision: ACP, propuestas, bloqueos y ejecucion pendiente.';
  if (mode === 'memory') return 'Mirando continuidad: Atlas, Cuadernillo, Sobre Negro y evidencia ligada.';
  if (mode === 'attractors') return 'Mirando direccion: sosten, cierre, no repeticion y avance verificable.';
  return 'Mirando estructura: conexiones verificadas e inferidas sin mezclar su estado.';
}

export function AcpFieldRegimeView({
  twin,
  focusMode,
  onOpenTwin,
}: {
  twin: TwinState | null;
  focusMode?: string;
  onOpenTwin?: (node?: FieldNode) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<FieldNode[]>([]);
  const edgesRef = useRef<FieldEdge[]>([]);
  const frameRef = useRef<number | null>(null);
  const tickRef = useRef(0);
  const modeRef = useRef<FieldMode>('topology');
  const selectedRef = useRef<string | undefined>(undefined);
  const [size, setSize] = useState({ width: 900, height: 640 });
  const [mode, setMode] = useState<FieldMode>('topology');
  const [selected, setSelected] = useState<FieldNode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingObservation, setSavingObservation] = useState(false);

  const nodes = useMemo(() => makeNodes(twin, size.width, size.height), [twin, size.width, size.height]);
  const edges = useMemo(() => makeEdges(twin, nodes), [twin, nodes]);
  const critical = nodes.filter((node) => node.band === 'critical').length;
  const active = nodes.filter((node) => node.band === 'active').length;
  const verified = edges.filter((edge) => edge.verified).length;
  const inferred = edges.filter((edge) => !edge.verified).length;

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedRef.current = selected?.id; }, [selected]);

  useEffect(() => {
    const nextMode = LENS_TO_MODE[focusMode ?? ''];
    if (nextMode) setMode(nextMode);
  }, [focusMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const width = Math.max(520, Math.floor(rect.width));
      const height = Math.max(520, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      setSize({ width, height });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tickRef.current += 1;
      draw(ctx, nodesRef.current, edgesRef.current, size.width, size.height, tickRef.current, modeRef.current, selectedRef.current);
      frameRef.current = window.requestAnimationFrame(render);
    };
    frameRef.current = window.requestAnimationFrame(render);
    return () => { if (frameRef.current) window.cancelAnimationFrame(frameRef.current); };
  }, [size.width, size.height]);

  function selectFromCanvas(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const node = hitTest(nodesRef.current, event.clientX - rect.left, event.clientY - rect.top);
    setSelected(node);
    if (node && (node.cluster === 'governance' || node.cluster === 'twin')) onOpenTwin?.(node);
  }

  async function createObservation() {
    if (!selected) return;
    setSavingObservation(true);
    setNotice(null);
    try {
      const response = await fetch('/api/twin/propose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          proposal: {
            objective: `Registrar observacion ACP sobre nodo ${selected.label}.`,
            focus: [selected.id, selected.cluster, selected.band, 'field_observation'],
            requested_output: 'field_observation',
            proposalType: 'field_observation',
            node_id: selected.id,
            degradation: selected.degradation,
            acp_instruction: 'Crear registro gobernado. No ejecutar accion externa. Preparar cierre verificable.',
          },
        }),
      }).then((res) => res.json());
      setNotice(response.ok ? 'Observacion preparada en propuestas ACP. No ejecuta nada externo.' : response.error ?? 'No se pudo registrar observacion.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'FIELD_OBSERVATION_FAILED');
    } finally {
      setSavingObservation(false);
    }
  }

  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-[#070706]">
      <canvas ref={canvasRef} onClick={selectFromCanvas} className="block h-full w-full cursor-crosshair" />

      <div className="absolute left-16 top-3 z-20 flex max-w-[calc(100%-140px)] flex-wrap gap-1">
        {FIELD_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.context}
            onClick={() => setMode(item.id)}
            className={`border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] transition ${
              mode === item.id ? 'border-[#c8a951] bg-[#2e2410] text-[#c8a951]' : 'border-[#1e1c17] bg-[#060605]/80 text-[#7a7568] hover:border-[#8a7035] hover:text-[#c8a951]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-16 z-20 max-w-xl border border-[#1e1c17] bg-[#060605]/78 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">
        {modeNarrative(mode, nodes)}
      </div>

      <div className="pointer-events-none absolute bottom-3 right-4 z-20 border border-[#1e1c17] bg-[#060605]/78 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#7a7568]">
        {nodes.length} nodos reales · {verified} verified · {inferred} inferred · {active} activos · {critical} criticos
      </div>

      {selected ? (
        <div className="absolute right-4 top-4 z-30 w-72 border border-[#2e2c24] bg-[#0e0d0b]/95 p-3 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8a7035]">{CLUSTERS[selected.cluster]?.label ?? selected.cluster}</div>
              <h3 className="mt-1 text-sm leading-5 text-[#ccc8bc]">{selected.label}</h3>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="font-mono text-[10px] text-[#5a5855] hover:text-[#c8a951]">x</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1 font-mono text-[8px] uppercase tracking-[0.08em]">
            <div className="bg-[#181614] p-2 text-[#7a7568]">degradacion<br /><span className="text-[#c8a951]">{selected.degradation.toFixed(2)} · {selected.band}</span></div>
            <div className="bg-[#181614] p-2 text-[#7a7568]">presion<br /><span className="text-[#c8a951]">{selected.pressure.toFixed(2)}</span></div>
            <div className="bg-[#181614] p-2 text-[#7a7568]">evidencia<br /><span className="text-[#c8a951]">{selected.evidenceCount}</span></div>
            <div className="bg-[#181614] p-2 text-[#7a7568]">runtime<br /><span className="text-[#c8a951]">{selected.runtimeState}</span></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8a7568]">
            {selected.band === 'critical'
              ? 'Esto esta atorado aqui. Primero registra evidencia o mandalo al Sobre Negro 24h. No lo cierres todavia.'
              : selected.evidenceCount === 0
                ? 'Te falta evidencia. Guardalo en Cuadernillo antes de estabilizarlo.'
                : 'Tiene base para lectura. Si lo mueves, deja propuesta preparada y cerrable.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onOpenTwin?.(selected)} className="border border-[#8a7035] bg-[#2e2410] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#c8a951]">Abrir Twin</button>
            <button type="button" disabled={savingObservation} onClick={() => void createObservation()} className="border border-[#2e2c24] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#7a7568] disabled:opacity-40">
              {savingObservation ? 'Guardando' : 'Observar'}
            </button>
          </div>
          {notice ? <div className="mt-3 border border-[#2e2c24] bg-[#131210] p-2 font-mono text-[8px] leading-4 text-[#c8a951]">{notice}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
