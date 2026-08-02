'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileUp,
  Gauge,
  Loader2,
  LockKeyhole,
  Orbit,
  Route,
  Sparkles,
  Target,
} from 'lucide-react';

type PersistedNodeType = 'attractor' | 'mark' | 'event' | 'evidence' | 'intervention' | 'return' | 'learning';

type GraphNode = {
  id: string;
  node_type: PersistedNodeType;
  label: string;
  summary: string | null;
  weight: number;
  is_central: boolean;
  metadata: Record<string, unknown>;
  observed_at: string;
};

type GraphEdge = {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relation: string;
  strength: number;
  direction: string;
  curvature: number;
};

type Props = {
  userEmail: string | null;
  entitlement: { active: boolean; tier: string; status: string };
  caseData: { id: string; title: string; status: string; createdAt: string };
  attractor: {
    id: string;
    code: string;
    label: string;
    summary: string;
    objective: string;
    direction: string;
    confidence: number;
    perturbation: {
      title?: string;
      instruction?: string;
      verificationWindow?: string;
      reversible?: boolean;
      interventionId?: string | null;
    };
  };
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  evidence: Array<{
    id: string;
    status: string;
    reason: string;
    next_action: string;
    confidence: number;
    created_at: string;
  }>;
  world: {
    regime: string;
    friction: number | null;
    tension: number | null;
    confidence: number | null;
  };
  nextReturnAt: string | null;
};

type VisualNodeType = PersistedNodeType | 'objective' | 'direction' | 'world' | 'origin';

type VisualNode = {
  id: string;
  type: VisualNodeType;
  label: string;
  summary: string;
  weight: number;
  central?: boolean;
  persisted?: boolean;
};

type VisualEdge = {
  id: string;
  source: string;
  target: string;
  strength: number;
  curvature: number;
  direction: string;
  persisted?: boolean;
};

type Point = { x: number; y: number; radius: number };

type UploadState = {
  note: string;
  source: string;
  reliability: number;
  file: File | null;
};

const FIELD_WIDTH = 1200;
const FIELD_HEIGHT = 760;
const CENTER_X = FIELD_WIDTH / 2;
const CENTER_Y = FIELD_HEIGHT / 2;

function clamp01(value: number | null | undefined, fallback: number) {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(1, parsed));
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function formatDate(value: string | null) {
  if (!value) return 'Sin retorno programado';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function colorFor(type: VisualNodeType) {
  const colors: Record<VisualNodeType, string> = {
    attractor: '#e1bd58',
    mark: '#b8ad98',
    event: '#c77d59',
    evidence: '#79b9c7',
    intervention: '#e29255',
    return: '#8dbb78',
    learning: '#b18bc7',
    objective: '#e7d6a0',
    direction: '#bd9d57',
    world: '#6e95a0',
    origin: '#716b60',
  };
  return colors[type];
}

function radiusFor(node: VisualNode) {
  if (node.central) return 56;
  const base: Record<VisualNodeType, number> = {
    attractor: 56,
    mark: 8,
    event: 11,
    evidence: 14,
    intervention: 16,
    return: 14,
    learning: 12,
    objective: 14,
    direction: 12,
    world: 13,
    origin: 10,
  };
  return base[node.type] + Math.round(clamp01(node.weight, 0.5) * 7);
}

function structuralNodes(props: Props): VisualNode[] {
  const now = props.caseData.createdAt;
  return [
    {
      id: `attractor:${props.attractor.id}`,
      type: 'attractor',
      label: props.attractor.label,
      summary: props.attractor.summary,
      weight: props.attractor.confidence,
      central: true,
      persisted: true,
    },
    {
      id: 'structure:objective',
      type: 'objective',
      label: 'Objetivo',
      summary: props.attractor.objective,
      weight: 0.82,
    },
    {
      id: 'structure:direction',
      type: 'direction',
      label: 'Dirección',
      summary: props.attractor.direction,
      weight: 0.76,
    },
    {
      id: 'structure:perturbation',
      type: 'intervention',
      label: props.attractor.perturbation.title || 'Perturbación mínima',
      summary: props.attractor.perturbation.instruction || 'Aún no existe una perturbación declarada.',
      weight: props.attractor.perturbation.instruction ? 0.72 : 0.28,
    },
    {
      id: 'structure:return',
      type: 'return',
      label: 'Retorno',
      summary: formatDate(props.nextReturnAt),
      weight: props.nextReturnAt ? 0.64 : 0.25,
    },
    {
      id: 'structure:world',
      type: 'world',
      label: props.world.regime || 'Campo mundial',
      summary: `Tensión ${Math.round(clamp01(props.world.tension, 0.35) * 100)} · fricción ${Math.round(clamp01(props.world.friction, 0.45) * 100)}`,
      weight: clamp01(props.world.confidence, 0.4),
    },
    {
      id: 'structure:origin',
      type: 'origin',
      label: 'Origen observado',
      summary: `${props.caseData.title} · ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(now))}`,
      weight: 0.46,
    },
  ];
}

function buildVisualModel(props: Props) {
  const base = structuralNodes(props);
  const centralId = base[0].id;
  const persistedPeripheral = props.graph.nodes
    .filter((node) => !node.is_central && node.node_type !== 'attractor')
    .slice(-42)
    .map<VisualNode>((node) => ({
      id: `persisted:${node.id}`,
      type: node.node_type,
      label: node.label,
      summary: node.summary || 'Evento registrado en la trayectoria.',
      weight: node.weight,
      persisted: true,
    }));

  const evidenceNodes = props.evidence.slice(0, 8).map<VisualNode>((item) => ({
    id: `assessment:${item.id}`,
    type: item.status === 'ACCEPTED' ? 'learning' : 'evidence',
    label: item.status,
    summary: item.reason,
    weight: item.confidence,
    persisted: true,
  }));

  const nodes = [...base, ...persistedPeripheral, ...evidenceNodes];
  const persistedIdMap = new Map(props.graph.nodes.map((node) => [node.id, node.is_central || node.node_type === 'attractor' ? centralId : `persisted:${node.id}`]));

  const edges: VisualEdge[] = [
    { id: 'struct:objective', source: 'structure:origin', target: 'structure:objective', strength: 0.54, curvature: -0.12, direction: 'toward_objective' },
    { id: 'struct:objective-center', source: 'structure:objective', target: centralId, strength: 0.92, curvature: 0.08, direction: 'toward_attractor' },
    { id: 'struct:direction', source: 'structure:direction', target: centralId, strength: 0.86, curvature: -0.08, direction: 'toward_attractor' },
    { id: 'struct:perturbation', source: 'structure:perturbation', target: centralId, strength: 0.74, curvature: 0.14, direction: 'tests_attractor' },
    { id: 'struct:return', source: 'structure:return', target: centralId, strength: props.nextReturnAt ? 0.68 : 0.28, curvature: -0.16, direction: 'validates_attractor' },
    { id: 'struct:world', source: 'structure:world', target: centralId, strength: clamp01(props.world.confidence, 0.4), curvature: 0.22, direction: 'modulates_field' },
    { id: 'struct:origin-center', source: 'structure:origin', target: centralId, strength: 0.48, curvature: 0.26, direction: 'originates_trajectory' },
  ];

  props.graph.edges.slice(-80).forEach((edge) => {
    const source = persistedIdMap.get(edge.source_node_id);
    const target = persistedIdMap.get(edge.target_node_id);
    if (!source || !target || source === target) return;
    edges.push({
      id: `persisted-edge:${edge.id}`,
      source,
      target,
      strength: edge.strength,
      curvature: edge.curvature,
      direction: edge.direction,
      persisted: true,
    });
  });

  persistedPeripheral.forEach((node, index) => {
    if (edges.some((edge) => edge.source === node.id || edge.target === node.id)) return;
    edges.push({
      id: `fallback:${node.id}`,
      source: node.id,
      target: centralId,
      strength: 0.42 + clamp01(node.weight, 0.5) * 0.42,
      curvature: ((index % 5) - 2) * 0.08,
      direction: 'toward_attractor',
      persisted: true,
    });
  });

  evidenceNodes.forEach((node, index) => {
    edges.push({
      id: `assessment-edge:${node.id}`,
      source: node.id,
      target: centralId,
      strength: 0.45 + node.weight * 0.45,
      curvature: ((index % 4) - 1.5) * 0.1,
      direction: node.type === 'learning' ? 'updates_attractor' : 'observes_attractor',
      persisted: true,
    });
  });

  return { nodes, edges, centralId };
}

function buildPositions(nodes: VisualNode[], centralId: string) {
  const points = new Map<string, Point>();
  points.set(centralId, { x: CENTER_X, y: CENTER_Y, radius: 56 });

  const fixed: Record<string, [number, number]> = {
    'structure:objective': [930, 170],
    'structure:direction': [965, 470],
    'structure:perturbation': [840, 650],
    'structure:return': [360, 650],
    'structure:world': [245, 205],
    'structure:origin': [210, 480],
  };

  nodes.forEach((node) => {
    if (node.id === centralId) return;
    const fixedPoint = fixed[node.id];
    if (fixedPoint) {
      points.set(node.id, { x: fixedPoint[0], y: fixedPoint[1], radius: radiusFor(node) });
      return;
    }
    const seed = hash(node.id);
    const ringIndex = seed % 3;
    const ringRadiusX = [235, 330, 435][ringIndex];
    const ringRadiusY = [150, 225, 305][ringIndex];
    const angle = ((seed % 360) * Math.PI) / 180;
    const jitterX = ((seed >> 8) % 45) - 22;
    const jitterY = ((seed >> 16) % 35) - 17;
    points.set(node.id, {
      x: Math.max(70, Math.min(FIELD_WIDTH - 70, CENTER_X + Math.cos(angle) * ringRadiusX + jitterX)),
      y: Math.max(65, Math.min(FIELD_HEIGHT - 65, CENTER_Y + Math.sin(angle) * ringRadiusY + jitterY)),
      radius: radiusFor(node),
    });
  });
  return points;
}

function edgePath(source: Point, target: Point, curvature: number) {
  const midpointX = (source.x + target.x) / 2;
  const midpointY = (source.y + target.y) / 2;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;
  const bend = curvature * 180;
  return `M ${source.x} ${source.y} Q ${midpointX + normalX * bend} ${midpointY + normalY * bend} ${target.x} ${target.y}`;
}

export default function UserAttractorFieldExperience(props: Props) {
  const { entitlement, caseData, attractor, world, evidence, nextReturnAt, userEmail } = props;
  const model = useMemo(() => buildVisualModel(props), [props]);
  const positions = useMemo(() => buildPositions(model.nodes, model.centralId), [model]);
  const [selectedNodeId, setSelectedNodeId] = useState(model.centralId);
  const [upload, setUpload] = useState<UploadState>({ note: '', source: 'observación directa', reliability: 0.7, file: null });
  const [status, setStatus] = useState<'idle' | 'uploading' | 'checkout' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<null | { status: string; reason: string; nextAction: string; confidence: number }>(null);

  const selectedNode = model.nodes.find((node) => node.id === selectedNodeId) || model.nodes[0];
  const tension = clamp01(world.tension, 0.35);
  const friction = clamp01(world.friction, 0.45);
  const confidence = clamp01(attractor.confidence, 0.5);
  const fieldHue = 36 + Math.round(tension * 15);
  const activeNodeCount = model.nodes.filter((node) => node.persisted).length;

  async function submitEvidence() {
    if (!entitlement.active || (!upload.note.trim() && !upload.file)) return;
    setStatus('uploading');
    setError(null);
    setAssessment(null);
    try {
      const form = new FormData();
      form.set('caseId', caseData.id);
      form.set('note', upload.note);
      form.set('source', upload.source);
      form.set('reliability', String(upload.reliability));
      if (upload.file) form.set('file', upload.file);
      const response = await fetch('/api/interface/observatory/evidence', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || 'evidence_upload_failed');
      setAssessment(body.assessment);
      setUpload({ note: '', source: 'observación directa', reliability: 0.7, file: null });
      setStatus('idle');
      window.setTimeout(() => window.location.reload(), 900);
    } catch (nextError) {
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'evidence_upload_failed');
    }
  }

  async function startCheckout() {
    setStatus('checkout');
    setError(null);
    try {
      const response = await fetch('/api/interface/checkout', { method: 'POST' });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error(body.error || 'checkout_failed');
      window.location.assign(body.url);
    } catch (nextError) {
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'checkout_failed');
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030302] text-[#d8d0be]">
      <style jsx global>{`
        @keyframes sfi-attractor-breathe {
          0%, 100% { transform: scale(0.96); opacity: 0.72; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes sfi-field-drift {
          0% { transform: translate3d(-1.5%, -1%, 0) rotate(-0.4deg); }
          50% { transform: translate3d(1.4%, 1.1%, 0) rotate(0.5deg); }
          100% { transform: translate3d(-1.5%, -1%, 0) rotate(-0.4deg); }
        }
        @keyframes sfi-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sfi-attractor-ring { transform-box: fill-box; transform-origin: center; animation: sfi-attractor-breathe 4.8s ease-in-out infinite; }
        .sfi-field-drift { animation: sfi-field-drift 18s ease-in-out infinite; }
        .sfi-orbit-ring { transform-box: fill-box; transform-origin: center; animation: sfi-orbit 36s linear infinite; }
      `}</style>

      <header className="border-b border-[#2d281d] bg-[#040403e8] px-5 py-5 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#d5b45b]">SFI / Personal Attractor Field</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#f5eedb] md:text-5xl">El campo ya está ocurriendo.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#8f8778]">El nodo dorado es el atractor declarado. Todo evento, evidencia, perturbación y retorno modifica su relación con esa dirección central.</p>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.14em]">
            <span className="border border-[#302b20] bg-[#070706] px-3 py-2 text-[#7f786b]">{userEmail}</span>
            <span className="border border-[#65542a] bg-[#0c0a05] px-3 py-2 text-[#d5b45b]">{entitlement.active ? entitlement.tier : 'observación limitada'}</span>
            <span className="border border-[#2d3435] bg-[#06090a] px-3 py-2 text-[#7799a1]">{world.regime}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1800px] gap-5 px-4 py-5 md:px-8 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <section className="relative min-h-[720px] overflow-hidden border border-[#3a321f] bg-[#050504] shadow-[0_40px_120px_rgba(0,0,0,0.55)] md:min-h-[790px]">
            <div
              className="sfi-field-drift absolute -inset-[8%] opacity-90"
              style={{
                backgroundImage: `
                  linear-gradient(hsla(${fieldHue}, 46%, 58%, ${0.055 + tension * 0.085}) 1px, transparent 1px),
                  linear-gradient(90deg, hsla(${fieldHue}, 46%, 58%, ${0.055 + tension * 0.085}) 1px, transparent 1px),
                  radial-gradient(circle at 50% 50%, rgba(222,184,78,${0.13 + confidence * 0.11}), transparent 20%),
                  radial-gradient(ellipse at 18% 24%, rgba(62,104,118,${0.10 + tension * 0.15}), transparent 34%),
                  radial-gradient(ellipse at 82% 76%, rgba(117,58,43,${0.09 + friction * 0.16}), transparent 36%),
                  radial-gradient(ellipse at 74% 18%, rgba(88,69,113,${0.04 + tension * 0.08}), transparent 26%)
                `,
                backgroundSize: '42px 42px, 42px 42px, auto, auto, auto, auto',
                filter: `blur(${Math.round(friction * 1.8)}px)`,
              }}
            />

            <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.14em]">
              <span className="border border-[#3b3425] bg-[#070706d9] px-3 py-2 text-[#a69b83] backdrop-blur">nodos activos {activeNodeCount}</span>
              <span className="border border-[#3b3425] bg-[#070706d9] px-3 py-2 text-[#a69b83] backdrop-blur">tensión {Math.round(tension * 100)}</span>
              <span className="border border-[#3b3425] bg-[#070706d9] px-3 py-2 text-[#a69b83] backdrop-blur">viscosidad {Math.round(friction * 100)}</span>
            </div>

            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Grafo vivo de trayectoria hacia el atractor"
            >
              <defs>
                <filter id="fieldNoise" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.008 0.016" numOctaves="2" seed="17" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale={8 + friction * 22} xChannelSelector="R" yChannelSelector="B" />
                </filter>
                <filter id="goldGlow" x="-250%" y="-250%" width="600%" height="600%">
                  <feGaussianBlur stdDeviation="10" result="blur10" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur3" />
                  <feMerge><feMergeNode in="blur10" /><feMergeNode in="blur3" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="nodeGlow" x="-150%" y="-150%" width="400%" height="400%">
                  <feGaussianBlur stdDeviation="2.4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="goldCore" cx="38%" cy="32%" r="68%">
                  <stop offset="0%" stopColor="#fff1b0" />
                  <stop offset="28%" stopColor="#e4bd54" />
                  <stop offset="72%" stopColor="#9d7227" />
                  <stop offset="100%" stopColor="#4c3010" />
                </radialGradient>
                <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4d4128" stopOpacity="0.15" />
                  <stop offset="45%" stopColor="#d6b35a" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#7d6d48" stopOpacity="0.18" />
                </linearGradient>
              </defs>

              <g opacity={0.17 + tension * 0.18} filter="url(#fieldNoise)">
                {[150, 245, 350, 470].map((radius, index) => (
                  <ellipse key={radius} cx={CENTER_X} cy={CENTER_Y} rx={radius} ry={radius * 0.63} fill="none" stroke={index % 2 ? '#705b32' : '#4c5b5f'} strokeWidth="1" strokeDasharray={`${8 + index * 3} ${13 + index * 5}`} />
                ))}
              </g>

              <g>
                {model.edges.map((edge, index) => {
                  const source = positions.get(edge.source);
                  const target = positions.get(edge.target);
                  if (!source || !target) return null;
                  const d = edgePath(source, target, edge.curvature);
                  const toward = edge.target === model.centralId || edge.direction.includes('attractor');
                  return (
                    <g key={edge.id}>
                      <path d={d} fill="none" stroke={toward ? 'url(#goldLine)' : '#665f50'} strokeWidth={0.8 + edge.strength * 2.2} strokeOpacity={0.2 + edge.strength * 0.58} strokeLinecap="round" />
                      <path d={d} fill="none" stroke={toward ? '#e4bf5d' : '#8d8779'} strokeWidth="0.55" strokeOpacity={0.16 + edge.strength * 0.32} strokeDasharray={edge.persisted ? '2 10' : '1 14'}>
                        <animate attributeName="stroke-dashoffset" from="24" to="0" dur={`${4.6 + (index % 5)}s`} repeatCount="indefinite" />
                      </path>
                      {toward && edge.strength > 0.38 ? (
                        <circle r={1.7 + edge.strength * 1.6} fill="#f0cc69" opacity="0.85" filter="url(#nodeGlow)">
                          <animateMotion dur={`${5.2 + (index % 4) * 1.1}s`} repeatCount="indefinite" path={d} />
                        </circle>
                      ) : null}
                    </g>
                  );
                })}
              </g>

              <g>
                {model.nodes.filter((node) => !node.central).map((node) => {
                  const point = positions.get(node.id);
                  if (!point) return null;
                  const selected = selectedNode?.id === node.id;
                  return (
                    <g key={node.id} onClick={() => setSelectedNodeId(node.id)} className="cursor-pointer" role="button" aria-label={node.label}>
                      <circle cx={point.x} cy={point.y} r={point.radius * 2.15} fill={colorFor(node.type)} opacity={selected ? 0.12 : 0.045} filter="url(#nodeGlow)" />
                      <circle cx={point.x} cy={point.y} r={point.radius} fill={colorFor(node.type)} fillOpacity={node.persisted ? 0.9 : 0.5} stroke={selected ? '#fff0b0' : '#17140f'} strokeWidth={selected ? 3 : 1.5} filter={selected ? 'url(#nodeGlow)' : undefined} />
                      <circle cx={point.x} cy={point.y} r={Math.max(2.2, point.radius * 0.22)} fill="#fff6d7" fillOpacity={0.45 + node.weight * 0.42} />
                      {(selected || node.type === 'objective' || node.type === 'intervention') ? (
                        <g pointerEvents="none">
                          <rect x={point.x - 76} y={point.y + point.radius + 11} width="152" height="25" rx="2" fill="#050504" fillOpacity="0.88" stroke="#3b3425" />
                          <text x={point.x} y={point.y + point.radius + 28} textAnchor="middle" fill="#d7cfbc" fontSize="10" fontFamily="monospace" letterSpacing="1.2">{node.label.slice(0, 24).toUpperCase()}</text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </g>

              <g onClick={() => setSelectedNodeId(model.centralId)} className="cursor-pointer" role="button" aria-label={attractor.label}>
                <ellipse className="sfi-orbit-ring" cx={CENTER_X} cy={CENTER_Y} rx={118} ry={86} fill="none" stroke="#d8b657" strokeWidth="1.1" strokeOpacity="0.24" strokeDasharray="3 13" />
                <ellipse cx={CENTER_X} cy={CENTER_Y} rx={92} ry={66} fill="none" stroke="#d8b657" strokeWidth="1.4" strokeOpacity="0.37" strokeDasharray="2 8">
                  <animate attributeName="stroke-dashoffset" from="20" to="0" dur="8s" repeatCount="indefinite" />
                </ellipse>
                <circle className="sfi-attractor-ring" cx={CENTER_X} cy={CENTER_Y} r={78} fill="#d9b551" fillOpacity="0.055" stroke="#d9b551" strokeWidth="1.3" strokeOpacity="0.52" filter="url(#goldGlow)" />
                <circle cx={CENTER_X} cy={CENTER_Y} r={58} fill="url(#goldCore)" stroke="#f2d47e" strokeWidth="2.4" filter="url(#goldGlow)" />
                <circle cx={CENTER_X - 15} cy={CENTER_Y - 17} r={11} fill="#fff4bc" fillOpacity="0.86" />
                <circle cx={CENTER_X} cy={CENTER_Y} r={16} fill="#201506" fillOpacity="0.34" stroke="#f7dfa0" strokeWidth="1.2" />
                <circle cx={CENTER_X} cy={CENTER_Y} r={5.2} fill="#fff3b5" />
                <text x={CENTER_X} y={CENTER_Y + 112} textAnchor="middle" fill="#d9bd71" fontSize="11" fontFamily="monospace" letterSpacing="2.8">ATRACTOR CENTRAL</text>
                <text x={CENTER_X} y={CENTER_Y + 134} textAnchor="middle" fill="#82765f" fontSize="9" fontFamily="monospace" letterSpacing="1.3">DIRECCIÓN · TRAYECTORIA · OBJETIVO</text>
              </g>
            </svg>

            <div className="absolute bottom-4 left-4 z-20 max-w-md border border-[#3a3221] bg-[#060604e8] p-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d5b45b]"><Route className="h-4 w-4" /> Trayectoria activa</div>
              <p className="mt-2 text-sm leading-6 text-[#b8ae9a]">{attractor.direction}</p>
            </div>

            <div className="absolute bottom-4 right-4 z-20 hidden border border-[#3a3221] bg-[#060604e8] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#938974] backdrop-blur-xl md:block">
              persisted {props.graph.nodes.length} · edges {props.graph.edges.length} · field {model.nodes.length}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="border border-[#302a1e] bg-[#080706] p-4"><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#756d60]">Atractor</div><div className="mt-2 text-lg text-[#f0e5ca]">{attractor.label}</div></div>
            <div className="border border-[#302a1e] bg-[#080706] p-4"><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#756d60]">Confianza</div><div className="mt-2 text-lg text-[#f0e5ca]">{Math.round(confidence * 100)}%</div></div>
            <div className="border border-[#302a1e] bg-[#080706] p-4"><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#756d60]">Tensión</div><div className="mt-2 text-lg text-[#f0e5ca]">{Math.round(tension * 100)}%</div></div>
            <div className="border border-[#302a1e] bg-[#080706] p-4"><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#756d60]">Retorno</div><div className="mt-2 text-sm text-[#f0e5ca]">{formatDate(nextReturnAt)}</div></div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="border border-[#40351e] bg-[#0a0804] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.17em] text-[#d5b45b]"><Target className="h-4 w-4" /> Nodo seleccionado</div>
            <div className="mt-5 flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-full border border-[#e1bd58]" style={{ background: `radial-gradient(circle at 35% 30%, #fff0ae, ${colorFor(selectedNode.type)} 48%, #1d1407)` }} />
              <div>
                <h2 className="text-xl text-[#f2e8d0]">{selectedNode.label}</h2>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#776e5e]">{selectedNode.type} · {selectedNode.persisted ? 'persistido' : 'estructura del campo'}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#a59b88]">{selectedNode.summary}</p>
          </section>

          <section className="border border-[#40351e] bg-[#090805] p-5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d5b45b]"><Sparkles className="h-4 w-4" /> Perturbación mínima</div>
            <p className="mt-4 text-sm leading-7 text-[#a59b88]">{attractor.perturbation.instruction || 'El campo aún no tiene una perturbación declarada.'}</p>
            {entitlement.active ? (
              <Link href={`/field?case=${encodeURIComponent(caseData.id)}`} className="mt-5 inline-flex items-center gap-2 border border-[#6d592b] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d5b45b]">Abrir ciclo de campo <ArrowRight className="h-4 w-4" /></Link>
            ) : (
              <button type="button" onClick={() => void startCheckout()} disabled={status === 'checkout'} className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-[#d5b45b] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#050403] disabled:opacity-50">
                {status === 'checkout' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />} Desbloquear campo
              </button>
            )}
          </section>

          <section className="border border-[#3b3424] bg-[#080706] p-5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d5b45b]"><FileUp className="h-4 w-4" /> Cargar evidencia</div>
            <p className="mt-3 text-xs leading-6 text-[#887f70]">La evidencia entra como nodo periférico. MIHM decide si observa, integra o modifica la trayectoria.</p>
            {!entitlement.active ? (
              <div className="mt-4 border border-[#393226] p-3 text-xs leading-5 text-[#7f776a]">La carga se habilita con acceso de campo.</div>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777063]">Qué ocurrió</span><textarea value={upload.note} onChange={(event) => setUpload((current) => ({ ...current, note: event.target.value }))} rows={4} className="border border-[#302b20] bg-[#040403] p-3 text-sm text-[#eee6d4] outline-none focus:border-[#c8a951]" /></label>
                <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777063]">Fuente</span><input value={upload.source} onChange={(event) => setUpload((current) => ({ ...current, source: event.target.value }))} className="border border-[#302b20] bg-[#040403] p-3 text-sm text-[#eee6d4] outline-none focus:border-[#c8a951]" /></label>
                <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777063]">Archivo opcional · 8 MB</span><input type="file" onChange={(event) => setUpload((current) => ({ ...current, file: event.target.files?.[0] || null }))} className="text-xs text-[#8e8576]" /></label>
                <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777063]">Confiabilidad · {Math.round(upload.reliability * 100)}%</span><input type="range" min={0.1} max={1} step={0.1} value={upload.reliability} onChange={(event) => setUpload((current) => ({ ...current, reliability: Number(event.target.value) }))} /></label>
                <button type="button" onClick={() => void submitEvidence()} disabled={status === 'uploading' || (!upload.note.trim() && !upload.file)} className="inline-flex w-full items-center justify-center gap-2 bg-[#d5b45b] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#050403] disabled:opacity-40">
                  {status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />} Aplicar MIHM
                </button>
              </div>
            )}
            {error ? <div className="mt-4 border border-[#6b352a] bg-[#160d0a] p-3 text-xs text-[#d89685]">{error}</div> : null}
            {assessment ? (
              <div className="mt-4 border border-[#4f5d3e] bg-[#0b1208] p-4">
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#a8c58c]"><CheckCircle2 className="h-4 w-4" /> {assessment.status}</div>
                <p className="mt-2 text-xs leading-6 text-[#a6ad98]">{assessment.reason}</p>
                <p className="mt-2 text-xs leading-6 text-[#c7d1b6]">{assessment.nextAction}</p>
              </div>
            ) : null}
          </section>

          <section className="border border-[#302a1e] bg-[#080706] p-5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d5b45b]"><Gauge className="h-4 w-4" /> Aprendizaje reciente</div>
            <div className="mt-4 space-y-3">
              {evidence.length ? evidence.slice(0, 5).map((item) => (
                <article key={item.id} className="border border-[#2d291f] p-3">
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em]"><span className="text-[#9fbd83]">{item.status}</span><span className="text-[#6f685d]">{Math.round(item.confidence * 100)}%</span></div>
                  <p className="mt-2 text-xs leading-5 text-[#918979]">{item.reason}</p>
                </article>
              )) : <p className="text-xs leading-5 text-[#81796c]">El campo ya contiene estructura; los nodos de aprendizaje aparecerán con evidencia validada.</p>}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
