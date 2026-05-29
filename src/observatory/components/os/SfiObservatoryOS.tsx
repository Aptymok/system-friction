'use client';

import {
  Archive,
  Check,
  Layers3,
  Lock,
  PauseCircle,
  Play,
  Shield,
  Terminal,
  X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';
import { useAuthState } from '@/components/auth/AuthProvider';

type SourceState = 'observed' | 'degraded' | 'missing' | 'blocked' | 'active' | 'blind' | 'failed' | string;
type JsonRecord = Record<string, unknown>;

type GraphNode = {
  nodeId: string;
  label: string;
  ontologyType?: string | null;
  lineage?: string[];
  provenance?: string | null;
  attributes?: JsonRecord;
};

type GraphEdge = {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation?: string | null;
  weight?: number | null;
  confidence?: number | null;
  provenance?: string | null;
  lineage?: string[];
  attributes?: JsonRecord;
};

type GraphState = {
  sourceState?: SourceState;
  degradedReason?: string | null;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  loadedAt?: string;
};

type GovernanceState = {
  status?: string;
  blindMode?: boolean;
  acpLastSeenAt?: string | null;
  acpTimeoutHours?: number | null;
  warning?: string | null;
};

type ObservatoryState = {
  worldspect?: JsonRecord | null;
  graph?: GraphState | null;
  kernel?: JsonRecord | null;
  governance?: GovernanceState | null;
  governanceRuntime?: {
    recentThoughtClosures?: JsonRecord[];
    recentThoughtInhibitions?: JsonRecord[];
  };
  cognitiveRuntime?: {
    recentThoughtClosures?: JsonRecord[];
    recentThoughtInhibitions?: JsonRecord[];
  };
  projections?: JsonRecord[];
  sandbox?: JsonRecord[];
  mutations?: JsonRecord[];
  twin?: JsonRecord | null;
  mihm?: JsonRecord[];
  multimedia?: JsonRecord[];
  latestProposals?: JsonRecord[];
  loadedAt?: string;
  warnings?: string[];
};

type BootstrapState = {
  user?: { id?: string; email?: string | null } | null;
  profile?: string | null;
  node?: JsonRecord | null;
  field?: JsonRecord | null;
  governance?: GovernanceState | null;
  entitlements?: JsonRecord | null;
  governanceRuntime?: {
    recentThoughtClosures?: JsonRecord[];
    recentThoughtInhibitions?: JsonRecord[];
  };
};

type MemoryItem = {
  id: string;
  kind: 'event' | 'mutation' | 'proposal' | 'inhibition';
  timestamp: string;
  title: string;
  confidence: number | null;
  policy: string;
  evidence: string;
  lineage: string[];
  payload: JsonRecord;
  action?: 'review';
};

type CommandState = {
  status: 'idle' | 'running' | 'done' | 'error';
  message: string;
};

type DrawerState = {
  title: string;
  payload: JsonRecord;
  lineage: string[];
  proposalId?: string | null;
};

const NODE_TYPES: Record<string, { label: string; ring: string; color: string; desc: string }> = {
  ACP: { label: 'ACP', ring: 'ACP CORE', color: '#5eead4', desc: 'autoridad constitucional' },
  AGT: { label: 'AGT', ring: 'COGNITIVE RING', color: '#a7f3d0', desc: 'agente / runtime cognitivo' },
  INF: { label: 'INF', ring: 'COGNITIVE RING', color: '#93c5fd', desc: 'informacion / senales' },
  PERC: { label: 'PERC', ring: 'COGNITIVE RING', color: '#bfdbfe', desc: 'percepcion / interfaz cognitiva' },
  CULT: { label: 'CULT', ring: 'COGNITIVE RING', color: '#c4b5fd', desc: 'cultura / patrones simbolicos' },
  ECON: { label: 'ECON', ring: 'INSTITUTIONAL RING', color: '#facc15', desc: 'economia / presion material' },
  ECO: { label: 'ECO', ring: 'MATERIAL RING', color: '#86efac', desc: 'ecologia / entorno' },
  BIO: { label: 'BIO', ring: 'MATERIAL RING', color: '#f0abfc', desc: 'biologia / cuerpo' },
  DIG: { label: 'DIG', ring: 'TECHNICAL RING', color: '#67e8f9', desc: 'digital / infraestructura' },
  ALG: { label: 'ALG', ring: 'TECHNICAL RING', color: '#38bdf8', desc: 'algoritmo / automatizacion' },
  CYB: { label: 'CYB', ring: 'TECHNICAL RING', color: '#22d3ee', desc: 'cibernetico / retroalimentacion' },
  ENE: { label: 'ENE', ring: 'MATERIAL RING', color: '#fdba74', desc: 'energia / capacidad' },
  INST: { label: 'INST', ring: 'INSTITUTIONAL RING', color: '#fde68a', desc: 'institucion / regla' },
};

const COMMANDS = ['/observe', '/propose', '/project', '/simulate', '/mutate', '/inhibit', '/visualize', '/calendar', '/explain'];
const REGIME_CHIPS = ['ObservaciÃ³n', 'ContradicciÃ³n', 'EnergÃ­a', 'ValidaciÃ³n', 'Temporalidad', 'Gobernanza'];

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringValue(value: unknown, fallback = 'missing') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function percent(value: unknown) {
  const n = numberValue(value);
  if (n === null) return 'missing';
  return `${Math.round(Math.max(0, Math.min(1, n)) * 100)}%`;
}

function shortHash(value: unknown) {
  const text = stringValue(value, '');
  return text.length > 12 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text || 'missing';
}

function dateLabel(value: unknown) {
  const text = stringValue(value, '');
  if (!text) return 'missing';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stateTone(state: unknown) {
  const value = stringValue(state, 'missing').toLowerCase();
  if (value === 'observed' || value === 'active' || value === 'ok' || value === 'success') return 'text-teal-200 border-teal-300/30 bg-teal-300/10';
  if (value === 'degraded' || value === 'queued' || value === 'pending') return 'text-amber-200 border-amber-300/30 bg-amber-300/10';
  if (value === 'blocked' || value === 'blind' || value === 'failed' || value === 'error') return 'text-red-200 border-red-300/30 bg-red-300/10';
  return 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10';
}

function edgeStyle(edge: GraphEdge) {
  const relation = stringValue(edge.relation, stringValue(edge.attributes?.canvasKind, 'inferred'));
  if (relation.includes('causal_verified')) return { stroke: '#ef4444', width: 0.9, dash: '' };
  if (relation.includes('correlational_observed') || relation.includes('resonance')) return { stroke: '#f59e0b', width: 0.55, dash: '4 4' };
  if (relation.includes('structural') || relation.includes('structural_inferred')) return { stroke: '#2dd4bf', width: 0.45, dash: '' };
  return { stroke: '#71717a', width: 0.35, dash: '2 6' };
}

function nodeType(node: GraphNode) {
  const explicit = stringValue(node.attributes?.node_type, '');
  if (explicit && NODE_TYPES[explicit]) return explicit;
  const raw = `${node.nodeId} ${node.label} ${node.ontologyType ?? ''}`.toLowerCase();
  if (raw.includes('acp') || raw.includes('core')) return 'ACP';
  if (raw.includes('agt') || raw.includes('agent')) return 'AGT';
  if (raw.includes('perc') || raw.includes('nti') || raw.includes('obs')) return 'PERC';
  if (raw.includes('cult') || raw.includes('sem') || raw.includes('pat')) return 'CULT';
  if (raw.includes('econ') || raw.includes('inegi')) return 'ECON';
  if (raw.includes('eco')) return 'ECO';
  if (raw.includes('bio')) return 'BIO';
  if (raw.includes('dig')) return 'DIG';
  if (raw.includes('alg')) return 'ALG';
  if (raw.includes('cyb')) return 'CYB';
  if (raw.includes('ene')) return 'ENE';
  if (raw.includes('inst') || raw.includes('atlas') || raw.includes('cimps')) return 'INST';
  return 'INF';
}

function graphPoint(node: GraphNode, index: number, total: number, proposals: number) {
  const type = nodeType(node);
  const attr = node.attributes ?? {};
  const rx = numberValue(attr.rx);
  const ry = numberValue(attr.ry);
  if (rx !== null && ry !== null) {
    return { x: 8 + rx * 84, y: 9 + ry * 78, type };
  }

  if (type === 'ACP') return { x: 50, y: 50, type };
  const rings: Record<string, { cx: number; cy: number; radius: number }> = {
    AGT: { cx: 50, cy: 50, radius: 16 },
    INF: { cx: 42, cy: 42, radius: 27 },
    PERC: { cx: 42, cy: 42, radius: 27 },
    CULT: { cx: 42, cy: 42, radius: 27 },
    DIG: { cx: 63, cy: 42, radius: 26 },
    ALG: { cx: 63, cy: 42, radius: 26 },
    CYB: { cx: 63, cy: 42, radius: 26 },
    BIO: { cx: 40, cy: 63, radius: 27 },
    ECO: { cx: 40, cy: 63, radius: 27 },
    ENE: { cx: 40, cy: 63, radius: 27 },
    ECON: { cx: 62, cy: 63, radius: 27 },
    INST: { cx: 62, cy: 63, radius: 27 },
  };
  const ring = rings[type] ?? { cx: 50, cy: 50, radius: 34 };
  const theta = ((index + proposals * 0.13) / Math.max(total, 1)) * Math.PI * 2;
  return {
    x: Math.max(6, Math.min(94, ring.cx + Math.cos(theta) * ring.radius)),
    y: Math.max(8, Math.min(90, ring.cy + Math.sin(theta) * ring.radius)),
    type,
  };
}

function eventName(row: JsonRecord) {
  return stringValue(row.event_name ?? row.eventName ?? row.proposal_type ?? row.mutation_key ?? row.reason ?? row.status, 'event');
}

function rowTimestamp(row: JsonRecord) {
  return stringValue(row.created_at ?? row.occurred_at ?? row.updated_at ?? row.loadedAt, new Date().toISOString());
}

function rowConfidence(row: JsonRecord) {
  const direct = numberValue(row.confidence);
  if (direct !== null) return direct;
  const payload = isRecord(row.payload) ? row.payload : {};
  return numberValue(payload.confidence);
}

function rowLineage(row: JsonRecord) {
  return Array.isArray(row.lineage) ? row.lineage.filter((item): item is string => typeof item === 'string') : [];
}

function buildMemory(data: ObservatoryState | null): MemoryItem[] {
  if (!data) return [];
  const proposals = records(data.latestProposals).map((row, index): MemoryItem => ({
    id: stringValue(row.id, `proposal:${index}`),
    kind: 'proposal',
    timestamp: rowTimestamp(row),
    title: eventName(row),
    confidence: rowConfidence(row),
    policy: stringValue(row.status, 'queued'),
    evidence: 'derived',
    lineage: rowLineage(row),
    payload: row,
    action: stringValue(row.requires_approval, '') === 'true' || row.requires_approval === true ? 'review' : undefined,
  }));
  const mutations = records(data.mutations).map((row, index): MemoryItem => ({
    id: stringValue(row.id, `mutation:${index}`),
    kind: 'mutation',
    timestamp: rowTimestamp(row),
    title: eventName(row),
    confidence: rowConfidence(row),
    policy: stringValue(row.status, 'proposed'),
    evidence: 'derived',
    lineage: rowLineage(row),
    payload: row,
    action: stringValue(row.status, '') === 'proposed' && typeof row.proposal_id === 'string' ? 'review' : undefined,
  }));
  const inhibitions = records(data.cognitiveRuntime?.recentThoughtInhibitions ?? data.governanceRuntime?.recentThoughtInhibitions).map((row, index): MemoryItem => ({
    id: stringValue(row.id, `inhibition:${index}`),
    kind: 'inhibition',
    timestamp: rowTimestamp(row),
    title: eventName(row),
    confidence: rowConfidence(row),
    policy: 'blocked',
    evidence: 'direct',
    lineage: rowLineage(row),
    payload: row,
  }));
  const closures = records(data.cognitiveRuntime?.recentThoughtClosures ?? data.governanceRuntime?.recentThoughtClosures).map((row, index): MemoryItem => ({
    id: stringValue(row.id, `event:${index}`),
    kind: 'event',
    timestamp: rowTimestamp(row),
    title: eventName(row),
    confidence: rowConfidence(row),
    policy: stringValue(row.status, 'closed'),
    evidence: 'derived',
    lineage: rowLineage(row),
    payload: row,
  }));

  return [...proposals, ...mutations, ...inhibitions, ...closures]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 40);
}

function computeIntegrity(data: ObservatoryState | null) {
  if (!data) return { value: null, label: 'missing' };
  const graphObserved = data.graph?.sourceState === 'observed' ? 1 : 0;
  const governanceActive = data.governance?.blindMode ? 0 : data.governance?.status === 'active' ? 1 : 0.35;
  const kernelAvailable = data.kernel ? 1 : 0;
  const confidence = numberValue(data.kernel?.confidence ?? data.worldspect?.confidence) ?? 0;
  const degradedPenalty = Math.min((data.warnings?.length ?? 0) * 0.08, 0.32);
  const value = Math.max(0, Math.min(1, confidence * 0.34 + graphObserved * 0.24 + governanceActive * 0.24 + kernelAvailable * 0.18 - degradedPenalty));
  return { value, label: 'derived' };
}

function publicFieldReading(data: ObservatoryState | null): string[] {
  if (!data) return ['El campo está listo para observación.'];

  const nodeCount = data.graph?.nodes?.length ?? 0;
  const edgeCount = data.graph?.edges?.length ?? 0;
  const warnings = data.warnings ?? [];
  const mihmLatest = records(data.mihm)[0] ?? {};
  const vector = isRecord(mihmLatest.homeostatic_vector) ? mihmLatest.homeostatic_vector : {};

  return [
    `El campo está listo para observación con ${nodeCount} nodos y ${edgeCount} enlaces visibles.`,
    warnings.length > 0 ? `Hay ${warnings.length} advertencia(s) activas; trátalas como señales de atención, no como fallo total.` : 'No hay advertencias críticas activas en esta lectura.',
    `MIHM se encuentra ${records(data.mihm).length > 0 ? 'observado' : 'latente'}; la lectura puede continuar sin declarar ausencia.`,
    Object.keys(vector).length > 0 ? `Vector homeostático disponible: ${Object.keys(vector).join(', ')}.` : 'El vector homeostático permanece en espera de nueva medición.',
    'La observación debe iniciar con una pregunta concreta sobre contradicción, energía, validación, temporalidad o gobernanza.',
  ].slice(0, 5);
}

export function SfiObservatoryOS() {
  const auth = useAuthState();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [observatory, setObservatory] = useState<ObservatoryState | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'degraded'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeMemory, setActiveMemory] = useState<'ALL' | 'EVENTS' | 'MUTATIONS' | 'PROPOSALS' | 'INHIBITIONS'>('ALL');
  const [highlight, setHighlight] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [command, setCommand] = useState('/observe ');
  const [commandState, setCommandState] = useState<CommandState>({ status: 'idle', message: 'El campo estÃ¡ listo para observaciÃ³n' });
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [readOnlyField, setReadOnlyField] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    const bootstrapResult = await fetch('/api/runtime/bootstrap?profile=sfi', { cache: 'no-store' })
      .then(async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) }))
      .catch((error: Error) => ({ status: 0, body: { ok: false, error: error.message } }));

    if (bootstrapResult.status === 200 && isRecord(bootstrapResult.body) && isRecord(bootstrapResult.body.data)) {
      setBootstrap(bootstrapResult.body.data as BootstrapState);
    } else if (bootstrapResult.status !== 401) {
      setLoadError(stringValue(isRecord(bootstrapResult.body) ? bootstrapResult.body.error : null, 'runtime_bootstrap_degraded'));
    }

    const observatoryResult = await fetch('/api/observatory/state', { cache: 'no-store' })
      .then(async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) }))
      .catch((error: Error) => ({ status: 0, body: { ok: false, error: error.message } }));

    if (observatoryResult.status === 200 && isRecord(observatoryResult.body) && isRecord(observatoryResult.body.data)) {
      setObservatory(observatoryResult.body.data as ObservatoryState);
      setLoadState('ready');
      setCommandState((prev) => prev.status === 'running' ? { status: 'done', message: 'El campo estÃ¡ listo para observaciÃ³n' } : prev);
    } else {
      setLoadState('degraded');
      setLoadError(stringValue(isRecord(observatoryResult.body) ? observatoryResult.body.error : null, 'observatory_state_unavailable'));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 45000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('read') === '1') {
      setReadOnlyField(true);
    }
  }, []);

  const memory = useMemo(() => buildMemory(observatory), [observatory]);
  const filteredMemory = memory.filter((item) => activeMemory === 'ALL' || item.kind.toUpperCase() === activeMemory.slice(0, -1));
  const graph = observatory?.graph;
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const blindMode = Boolean(observatory?.governance?.blindMode ?? bootstrap?.governance?.blindMode);
  const confidence = numberValue(observatory?.kernel?.confidence ?? observatory?.worldspect?.confidence);
  const worldspect = observatory?.worldspect ?? {};
  const sourceState = stringValue(worldspect.sourceState ?? graph?.sourceState, 'missing');
  const kernelStatus = stringValue(observatory?.kernel?.status, 'missing');
  const integrity = computeIntegrity(observatory);
  const pendingProposals = records(observatory?.latestProposals).filter((row) => ['queued', 'proposed'].includes(stringValue(row.status, '').toLowerCase())).length;
  const approvedMutations = records(observatory?.mutations).filter((row) => stringValue(row.status, '').toLowerCase() === 'design_approved').length;

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage(null);
    if (!supabase) {
      setAuthMessage('SUPABASE CLIENT MISSING');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword(authForm);
    if (error) setAuthMessage(error.message);
    else {
      setAuthMessage('CONSTITUTIONAL ACCESS GRANTED');
      await refresh();
    }
  }

  async function handleMagicLink() {
    setAuthMessage(null);
    if (!supabase || !authForm.email) {
      setAuthMessage('EMAIL REQUIRED');
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email: authForm.email });
    setAuthMessage(error ? error.message : 'MAGIC LINK REQUESTED');
  }

  async function postJson(path: string, payload: JsonRecord) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(stringValue(isRecord(body) ? body.error ?? body.details : null, `POST ${path} failed`));
    return isRecord(body) ? body : {};
  }

  async function handleCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [verb, ...rest] = command.trim().split(/\s+/);
    const text = rest.join(' ').trim() || 'constitutional observation';
    if (blindMode && verb !== '/observe' && verb !== '/explain') {
      setCommandState({ status: 'error', message: 'Gobernanza bloquea esta acciÃ³n' });
      return;
    }
    if (auth.status !== 'authenticated' && verb !== '/observe' && verb !== '/explain') {
      setCommandState({ status: 'error', message: 'AutenticaciÃ³n requerida para modificar el campo' });
      return;
    }

    setCommandState({ status: 'running', message: 'Procesando observaciÃ³n bajo polÃ­tica' });
    try {
      if (verb === '/observe') {
        await refresh();
      } else if (verb === '/project') {
        await postJson('/api/projections/create', { objective: text, seed: `ui:${Date.now()}` });
      } else if (verb === '/simulate') {
        await postJson('/api/sandbox/snapshot', { objective: text, source: 'observatory_os' });
      } else if (verb === '/mutate' || verb === '/propose') {
        await postJson('/api/mutations/propose', { mutationType: verb === '/mutate' ? 'design_mutation' : 'general_proposal', mutation: { text, source: 'observatory_os' } });
      } else if (verb === '/inhibit') {
        await postJson('/api/thoughts/evaluate', { thoughtType: 'inhibition_request', claim: text, evidence: [], payload: { source: 'observatory_os' } });
      } else if (verb === '/visualize') {
        await postJson('/api/multimedia/propose', { type: 'text', prompt: text, provenance: { source: 'observatory_os' } });
      } else if (verb === '/calendar') {
        await postJson('/api/calendar/propose-jsonb', { calendar_payload: { title: text, source: 'observatory_os' } });
      } else if (verb === '/explain') {
        setDrawer({ title: 'STATE EXPLANATION Â· DERIVED', payload: { source: 'observatory_state', observatory, systemIntegrity: integrity }, lineage: [] });
      } else {
        throw new Error('Comando no reconocido por el observatorio');
      }
      await refresh();
      setCommandState({ status: 'done', message: 'ObservaciÃ³n registrada en el campo' });
    } catch (error) {
      setCommandState({ status: 'error', message: error instanceof Error ? error.message : 'COMMAND FAILED' });
    }
  }

  async function reviewMutation(proposalId: string, action: 'accept' | 'reject') {
    if (blindMode) {
      setCommandState({ status: 'error', message: 'Gobernanza bloquea esta acciÃ³n' });
      return;
    }
    setCommandState({ status: 'running', message: `${action.toUpperCase()} UNDER POLICY` });
    try {
      await postJson(`/api/mutations/${action}`, { proposalId, reason: action === 'reject' ? 'observatory_review_rejected' : undefined });
      await refresh();
      setCommandState({ status: 'done', message: action === 'accept' ? 'DESIGN APPROVED Â· GRAPH UNCHANGED' : 'PROPOSAL REJECTED' });
    } catch (error) {
      setCommandState({ status: 'error', message: error instanceof Error ? error.message : 'REVIEW FAILED' });
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#0b0b0a] text-[#f4f0e7]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(244,240,231,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(244,240,231,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(45,212,191,0.10),transparent_34%),linear-gradient(180deg,rgba(244,240,231,0.05),transparent_18%,rgba(0,0,0,0.45))]" />

      <section className="relative z-10 flex h-screen flex-col">
        <TopBar
          graphState={graph?.sourceState}
          kernelStatus={kernelStatus}
          confidence={confidence}
          mihmCapacity={observatory?.kernel?.mihm && isRecord(observatory.kernel.mihm) ? observatory.kernel.mihm.operationalCapacity : undefined}
          sourceState={sourceState}
          loadedAt={observatory?.loadedAt}
          governance={observatory?.governance ?? bootstrap?.governance ?? null}
          integrity={integrity}
          loadState={loadState}
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto px-3 pb-3 lg:grid-cols-[310px_minmax(420px,1fr)_360px]">
          <RuntimeLayer data={observatory} bootstrap={bootstrap} onHighlight={setHighlight} />
          <CognitiveField
            nodes={nodes}
            edges={edges}
            state={graph?.sourceState}
            warnings={observatory?.warnings ?? []}
            pendingProposals={pendingProposals}
            approvedMutations={approvedMutations}
            multimediaCount={records(observatory?.multimedia).length}
            sandboxCount={records(observatory?.sandbox).length}
            highlight={highlight}
            publicReading={publicFieldReading(observatory)}
            onNode={(node) => setDrawer({ title: `${node.label} Â· ${nodeType(node)}`, payload: { node, provenance: node.provenance ?? 'graph_nodes' }, lineage: node.lineage ?? [] })}
          />
          <CausalMemory
            active={activeMemory}
            setActive={setActiveMemory}
            items={filteredMemory}
            onOpen={(item) => {
              setHighlight(item.lineage);
              setDrawer({ title: item.title, payload: item.payload, lineage: item.lineage, proposalId: typeof item.payload.proposal_id === 'string' ? item.payload.proposal_id : typeof item.payload.id === 'string' && item.kind === 'proposal' ? item.payload.id : null });
            }}
          />
        </div>

        <ConstitutionalInput
          command={command}
          setCommand={setCommand}
          state={commandState}
          blindMode={blindMode}
          authenticated={auth.status === 'authenticated'}
          onSubmit={handleCommand}
        />
      </section>

      {auth.status !== 'authenticated' && !readOnlyField && (
        <AuthOverlay
          status={auth.status}
          form={authForm}
          setForm={setAuthForm}
          message={authMessage}
          onLogin={handleLogin}
          onMagicLink={handleMagicLink}
          onPublicReadOnly={() => {
            setReadOnlyField(true);
            window.history.replaceState(null, '', '/?read=1');
          }}
        />
      )}

      {drawer && (
        <PayloadDrawer
          drawer={drawer}
          blindMode={blindMode}
          onClose={() => setDrawer(null)}
          onReview={reviewMutation}
        />
      )}
    </main>
  );
}

function TopBar(props: {
  graphState?: SourceState;
  kernelStatus: string;
  confidence: number | null;
  mihmCapacity: unknown;
  sourceState: string;
  loadedAt?: string;
  governance: GovernanceState | null;
  integrity: { value: number | null; label: string };
  loadState: string;
}) {
  const acp = props.governance?.blindMode ? 'blind' : stringValue(props.governance?.status, 'missing');
  return (
    <header className="border-b border-white/10 bg-[#0b0b0a]/92 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-10 w-10 place-items-center border border-teal-200/30 bg-teal-200/10">
            <Shield className="h-5 w-5 text-teal-100" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase text-zinc-500">SYSTEM FRICTION INSTITUTE</p>
            <h1 className="font-display text-sm uppercase text-paper">OBSERVATORY OS</h1>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          <StatusPill label="FIELD" value={stringValue(props.graphState, 'missing')} />
          <StatusPill label="KERNEL" value={props.kernelStatus} />
          <StatusPill label="CONF" value={props.confidence === null ? 'missing' : percent(props.confidence)} state={props.confidence !== null && props.confidence < 0.45 ? 'degraded' : 'observed'} />
          <StatusPill label="MIHM" value={props.mihmCapacity ? percent(props.mihmCapacity) : 'latente'} state={props.mihmCapacity ? 'observed' : 'latent'} />
          <StatusPill label="SOURCE" value={props.sourceState} />
          <StatusPill label="ACP" value={acp} icon={props.governance?.blindMode ? <Lock className="h-3 w-3" /> : undefined} />
          <StatusPill label="INTEGRITY" value={props.integrity.value === null ? 'missing' : percent(props.integrity.value)} state={props.integrity.label} />
          <StatusPill label="TIME" value={dateLabel(props.loadedAt)} state={props.loadState === 'ready' ? 'observed' : 'degraded'} />
        </div>
      </div>
    </header>
  );
}

function StatusPill({ label, value, state, icon }: { label: string; value: string; state?: unknown; icon?: React.ReactNode }) {
  return (
    <div className={`min-w-0 border px-3 py-2 ${stateTone(state ?? value)}`}>
      <p className="font-mono text-[9px] uppercase text-zinc-500">{label}</p>
      <p className="mt-1 flex items-center gap-1 truncate font-mono text-[10px] uppercase">{icon}{value}</p>
    </div>
  );
}

function RuntimeLayer({ data, bootstrap, onHighlight }: { data: ObservatoryState | null; bootstrap: BootstrapState | null; onHighlight: (ids: string[]) => void }) {
  const worldspect = data?.worldspect ?? {};
  const kernel = data?.kernel ?? {};
  const governance = data?.governance ?? bootstrap?.governance ?? {};
  const policy = isRecord(kernel.policy) ? kernel.policy : {};
  const mihm = isRecord(kernel.mihm) ? kernel.mihm : records(data?.mihm)[0] ?? {};
  const twin = isRecord(data?.twin) ? data.twin : {};
  return (
    <aside className="min-h-0 overflow-y-auto border border-white/10 bg-[#11100e]/88 p-3 backdrop-blur">
      <SectionTitle icon={<Layers3 className="h-4 w-4" />} title="RUNTIME LAYER" subtitle="INSTITUTIONAL EXECUTION CONSTRAINTS ACTIVE" />
      <RuntimeModule title="WORLDSPECT" source="data.worldspect" onClick={() => onHighlight(['INF', 'PERC', 'CULT'])} rows={[
        ['WSI', worldspect.wsi ?? 'missing'],
        ['NTI', worldspect.nti ?? 'missing'],
        ['sourceState', worldspect.sourceState ?? 'missing'],
        ['degraded', Array.isArray(worldspect.degraded_sources) ? worldspect.degraded_sources.length : 0],
        ['sourceHealth', isRecord(worldspect.sourceHealth) ? Object.keys(worldspect.sourceHealth).length : 'missing'],
      ]} />
      <RuntimeModule title="KERNEL" source="data.kernel" onClick={() => onHighlight(['WORLDSPECT', 'KERNEL', 'POLICY'])} rows={[
        ['status', kernel.status ?? 'missing'],
        ['confidence', percent(kernel.confidence)],
        ['sourceState', kernel.sourceState ?? 'missing'],
        ['eventId', shortHash(kernel.epistemicEventId ?? kernel.event_id)],
      ]} />
      <RuntimeModule title="MIHM" source="kernel.mihm | mihm.latest" onClick={() => onHighlight(['INF', 'PERC', 'CULT', 'BIO'])} rows={[
        ['regime', mihm.regime ?? 'latente'],
        ['capacity', percent(mihm.operationalCapacity ?? mihm.capacity)],
        ['degradation', mihm.degradation ?? 'latente'],
        ['vector', isRecord(mihm.homeostatic_vector) ? Object.keys(mihm.homeostatic_vector).join(', ') || 'empty' : 'latente'],
      ]} />
      <RuntimeModule title="DELTA" source="kernel.delta | latestProposals" rows={[
        ['pending', records(data?.latestProposals).filter((row) => ['queued', 'proposed'].includes(stringValue(row.status, '').toLowerCase())).length],
        ['accepted', records(data?.mutations).filter((row) => stringValue(row.status, '').includes('approved')).length],
        ['rejected', records(data?.mutations).filter((row) => stringValue(row.status, '') === 'rejected').length],
        ['delta', isRecord(kernel.delta) ? kernel.delta.score ?? 'derived_missing' : 'missing'],
      ]} />
      <RuntimeModule title="POLICY" source="policy_decisions/latest + kernel.policy" onClick={() => onHighlight(['ACP', 'AGT', 'POLICY'])} rows={[
        ['allow_llm', String(policy.allow_llm ?? 'missing')],
        ['allow_proposal', String(policy.allow_proposal ?? 'missing')],
        ['allow_execution', String(policy.allow_execution ?? 'missing')],
        ['reason', policy.reason ?? 'missing'],
      ]} />
      <RuntimeModule title="GOVERNANCE" source="data.governance" onClick={() => onHighlight(['ACP', 'AGT'])} rows={[
        ['ACP active', governance.status ?? 'missing'],
        ['blindMode', String(Boolean(governance.blindMode))],
        ['lastSeen', dateLabel(governance.acpLastSeenAt)],
        ['timeout', governance.acpTimeoutHours ?? 'missing'],
      ]} />
      <RuntimeModule title="TWIN" source="data.twin" rows={[
        ['quarantine', String(true)],
        ['proposals', records(twin.proposals).length],
        ['confidence', percent(twin.confidence)],
        ['self observation', twin.latest_governance_status ? 'active' : 'missing'],
      ]} />
      <RuntimeModule title="SANDBOX" source="data.sandbox" rows={[
        ['snapshots', records(data?.sandbox).filter((row) => stringValue(row.proposal_type, '').includes('snapshot')).length],
        ['diffs', records(data?.sandbox).filter((row) => stringValue(row.proposal_type, '').includes('diff')).length],
        ['status', records(data?.sandbox).length > 0 ? 'quarantined' : 'missing'],
      ]} />
    </aside>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-start gap-3 border-b border-white/10 pb-3">
      <div className="text-teal-100">{icon}</div>
      <div>
        <h2 className="font-display text-xs uppercase text-paper">{title}</h2>
        <p className="mt-1 font-mono text-[9px] uppercase text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}

function RuntimeModule({ title, source, rows, onClick }: { title: string; source: string; rows: [string, unknown][]; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-2 block w-full border border-white/10 bg-black/20 p-3 text-left transition hover:border-teal-200/30">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-[10px] uppercase text-teal-100">{title}</h3>
        <span className="truncate font-mono text-[8px] uppercase text-zinc-600">{source}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {rows.map(([key, value]) => (
          <div key={key} className="min-w-0 border-l border-white/10 pl-2">
            <dt className="font-mono text-[8px] uppercase text-zinc-600">{key}</dt>
            <dd className="truncate font-mono text-[10px] text-zinc-200">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </button>
  );
}

function CognitiveField(props: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  state?: SourceState;
  warnings: string[];
  pendingProposals: number;
  approvedMutations: number;
  multimediaCount: number;
  sandboxCount: number;
  highlight: string[];
  publicReading: string[];
  onNode: (node: GraphNode) => void;
}) {
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; type: string }>();
    props.nodes.forEach((node, index) => map.set(node.nodeId, graphPoint(node, index, props.nodes.length, props.pendingProposals)));
    return map;
  }, [props.nodes, props.pendingProposals]);

  const highlightSet = new Set(props.highlight);
  return (
    <section className={`relative min-h-[560px] overflow-hidden border border-white/10 bg-[#0c0d0c]/88 ${props.state === 'degraded' ? 'shadow-[inset_0_0_80px_rgba(245,158,11,0.10)]' : ''}`}>
      <div className="absolute left-4 top-4 z-10">
        <p className="font-mono text-[10px] uppercase text-zinc-500">COGNITIVE FIELD</p>
        <h2 className="font-display text-sm uppercase text-paper">CONSTITUTIONAL FIELD MAP</h2>
      </div>
      <div className="absolute right-4 top-4 z-10 flex flex-wrap justify-end gap-2">
        <LayerMark label="OBSERVATION RING" active={props.state === 'observed'} />
        <LayerMark label="SIMULATION SHADOW" active={props.sandboxCount > 0} />
        <LayerMark label="MUTATION VECTOR" active={props.approvedMutations > 0} />
        <LayerMark label="PERCEPTUAL LAYER" active={props.multimediaCount > 0} />
      </div>
      <div className="absolute left-4 top-20 z-10 max-w-sm border border-white/10 bg-black/45 p-3 backdrop-blur">
        <p className="font-mono text-[9px] uppercase text-teal-100">Public Field Reading</p>
        <ul className="mt-2 space-y-1 font-mono text-[10px] leading-relaxed text-zinc-300">
          {props.publicReading.map((line: string) => <li key={line}>{line}</li>)}
        </ul>
      </div>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="0.7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(94,234,212,0.24)" strokeWidth="0.15" />
        <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(244,240,231,0.08)" strokeWidth="0.12" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(244,240,231,0.07)" strokeWidth="0.12" strokeDasharray="1 2" />
        <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(244,240,231,0.05)" strokeWidth="0.12" />

        {props.sandboxCount > 0 && <circle cx="50" cy="50" r="38" fill="rgba(148,163,184,0.05)" stroke="rgba(148,163,184,0.18)" strokeDasharray="2 3" />}

        {props.edges.map((edge) => {
          const source = positions.get(edge.sourceNodeId);
          const target = positions.get(edge.targetNodeId);
          if (!source || !target) return null;
          const style = edgeStyle(edge);
          const opacity = Math.max(0.18, Math.min(0.82, numberValue(edge.confidence) ?? numberValue(edge.weight) ?? 0.44));
          return (
            <line
              key={edge.edgeId}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={style.stroke}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              opacity={opacity}
            />
          );
        })}
        {props.nodes.map((node) => {
          const point = positions.get(node.nodeId);
          if (!point) return null;
          const meta = NODE_TYPES[point.type] ?? NODE_TYPES.INF;
          const active = highlightSet.has(node.nodeId) || highlightSet.has(point.type) || Array.from(highlightSet).some((item) => node.nodeId.includes(item));
          const pulse = props.pendingProposals > 0 && (point.type === 'ACP' || point.type === 'AGT');
          return (
            <g key={node.nodeId} filter={active ? 'url(#softGlow)' : undefined}>
              {pulse && <circle cx={point.x} cy={point.y} r="2.8" fill="none" stroke={meta.color} opacity="0.28" />}
              <button type="button" onClick={() => props.onNode(node)}>
                <circle cx={point.x} cy={point.y} r={point.type === 'ACP' ? 2.3 : 1.55} fill="#0b0b0a" stroke={meta.color} strokeWidth={active ? 0.55 : 0.28} />
              </button>
              <text x={point.x + 1.8} y={point.y - 1.2} fill={active ? '#f4f0e7' : 'rgba(244,240,231,0.72)'} fontSize="1.7" fontFamily="JetBrains Mono">
                {meta.label}
              </text>
              <text x={point.x + 1.8} y={point.y + 1.3} fill="rgba(244,240,231,0.42)" fontSize="1.1" fontFamily="JetBrains Mono">
                {node.label.slice(0, 18)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-4 left-4 right-4 grid gap-2 md:grid-cols-4">
        <FieldMetric label="WSI" value="World Stress Index" data={props.warnings.length > 0 ? 'degraded pressure visible' : 'observed pressure stable'} />
        <FieldMetric label="NTI" value="Informational tension" data={props.state === 'degraded' ? 'amber saturation' : 'nominal trace'} />
        <FieldMetric label="PROVENANCE" value="event -> node -> source" data={`${props.nodes.length} nodes / ${props.edges.length} edges`} />
        <FieldMetric label="ARCHIVE" value="AUTHORIZED BY ACP" data={`${props.pendingProposals} pending proposals`} />
      </div>
    </section>
  );
}

function LayerMark({ label, active }: { label: string; active: boolean }) {
  return <span className={`border px-2 py-1 font-mono text-[8px] uppercase ${active ? 'border-teal-200/30 bg-teal-200/10 text-teal-100' : 'border-white/10 bg-black/20 text-zinc-600'}`}>{label}</span>;
}

function FieldMetric({ label, value, data }: { label: string; value: string; data: string }) {
  return (
    <div className="border border-white/10 bg-black/45 p-3 backdrop-blur">
      <p className="font-mono text-[9px] uppercase text-teal-100">{label}</p>
      <p className="mt-1 font-mono text-[10px] uppercase text-zinc-400">{value}</p>
      <p className="mt-2 font-mono text-[10px] text-zinc-200">{data}</p>
    </div>
  );
}

function CausalMemory({ active, setActive, items, onOpen }: { active: string; setActive: (tab: 'ALL' | 'EVENTS' | 'MUTATIONS' | 'PROPOSALS' | 'INHIBITIONS') => void; items: MemoryItem[]; onOpen: (item: MemoryItem) => void }) {
  const tabs = ['ALL', 'EVENTS', 'MUTATIONS', 'PROPOSALS', 'INHIBITIONS'] as const;
  return (
    <aside className="min-h-0 overflow-y-auto border border-white/10 bg-[#11100e]/88 p-3 backdrop-blur">
      <SectionTitle icon={<Archive className="h-4 w-4" />} title="CAUSAL MEMORY" subtitle="ARCHIVE AUTHORIZED BY ACP" />
      <div className="mb-3 grid grid-cols-5 gap-1">
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => setActive(tab)} className={`border px-1 py-2 font-mono text-[8px] uppercase ${active === tab ? 'border-teal-200/30 bg-teal-200/10 text-teal-100' : 'border-white/10 text-zinc-500'}`}>
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="border border-amber-300/20 bg-amber-300/10 p-3 font-mono text-[10px] uppercase text-amber-100">causal archive degraded or empty</p>}
        {items.map((item) => (
          <button key={`${item.kind}:${item.id}`} type="button" onClick={() => onOpen(item)} className="block w-full border border-white/10 bg-black/20 p-3 text-left transition hover:border-teal-200/30">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase text-zinc-500">{dateLabel(item.timestamp)} Â· {item.kind}</p>
                <h3 className="mt-1 truncate font-mono text-[10px] uppercase text-paper">{item.title}</h3>
              </div>
              <span className={`border px-2 py-1 font-mono text-[8px] uppercase ${stateTone(item.policy)}`}>{item.policy}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9px] text-zinc-500">
              <span>conf {item.confidence === null ? 'missing' : percent(item.confidence)}</span>
              <span>{item.evidence}</span>
              <span>{item.lineage.length} lineage</span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ConstitutionalInput(props: {
  command: string;
  setCommand: (value: string) => void;
  state: CommandState;
  blindMode: boolean;
  authenticated: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <footer className="border-t border-white/10 bg-[#0b0b0a]/95 px-3 py-3 backdrop-blur">
      <form onSubmit={props.onSubmit} className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase text-zinc-500">
          {props.blindMode ? <Lock className="h-4 w-4 text-red-200" /> : <Terminal className="h-4 w-4 text-teal-100" />}
          <span>{props.blindMode ? 'Gobernanza bloquea esta acciÃ³n' : 'ObservaciÃ³n del campo'}</span>
        </div>
        <input
          value={props.command}
          onChange={(event) => props.setCommand(event.target.value)}
          disabled={props.blindMode}
          className="min-w-0 flex-1 border border-white/10 bg-black/40 px-3 py-3 font-mono text-xs text-paper outline-none focus:border-teal-200/40 disabled:cursor-not-allowed disabled:border-red-300/20 disabled:text-red-100"
          aria-label="observaciÃ³n narrativa del campo"
          placeholder="Describe quÃ© quieres observar del campoâ€¦"
        />
        <button type="submit" disabled={props.blindMode} className="inline-flex items-center justify-center gap-2 border border-teal-200/30 bg-teal-200/10 px-4 py-3 font-mono text-[10px] uppercase text-teal-100 disabled:border-red-300/20 disabled:bg-red-300/10 disabled:text-red-100">
          <Play className="h-3 w-3" /> Observar
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {COMMANDS.map((cmd) => <button key={cmd} type="button" onClick={() => props.setCommand(`${cmd} `)} className="border border-white/10 px-2 py-1 font-mono text-[8px] uppercase text-zinc-500 hover:text-paper">{cmd}</button>)}
        <span className={`ml-auto font-mono text-[9px] uppercase ${props.state.status === 'error' ? 'text-red-200' : props.state.status === 'done' ? 'text-teal-100' : 'text-zinc-500'}`}>
          {props.authenticated ? props.state.message : 'Modo lectura Â· autentica para modificar el campo'}
        </span>
      </div>
    </footer>
  );
}

function AuthOverlay(props: {
  status: string;
  form: { email: string; password: string };
  setForm: (value: { email: string; password: string }) => void;
  message: string | null;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onMagicLink: () => void;
  onPublicReadOnly: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/92 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg border border-white/15 bg-[#11100e] p-6 shadow-terminal">
        <p className="font-mono text-[10px] uppercase text-zinc-500">SYSTEM FRICTION INSTITUTE</p>
        <h2 className="mt-2 font-display text-lg uppercase text-paper">ACCESS TO OBSERVATORY</h2>
        <p className="mt-4 font-mono text-[10px] uppercase leading-relaxed text-zinc-400">
          Login = acceso. Graph immersion = contexto operacional. El grafo no valida identidad.
        </p>
        <form onSubmit={props.onLogin} className="mt-6 space-y-3">
          <input value={props.form.email} onChange={(event) => props.setForm({ ...props.form, email: event.target.value })} type="email" required placeholder="email" className="w-full border border-white/10 bg-[#050505] px-3 py-3 font-mono text-xs text-paper outline-none focus:border-teal-200/40" />
          <input value={props.form.password} onChange={(event) => props.setForm({ ...props.form, password: event.target.value })} type="password" required placeholder="password" className="w-full border border-white/10 bg-[#050505] px-3 py-3 font-mono text-xs text-paper outline-none focus:border-teal-200/40" />
          <button className="w-full border border-teal-200/30 bg-teal-200/10 px-4 py-3 font-mono text-[10px] uppercase text-teal-100">CONSTITUTIONAL ACCESS</button>
        </form>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={props.onMagicLink} className="border border-white/10 px-3 py-3 font-mono text-[10px] uppercase text-zinc-300">magic link</button>
          <button type="button" onClick={props.onPublicReadOnly} className="border border-white/10 px-3 py-3 font-mono text-[10px] uppercase text-zinc-300">read-only public field</button>
        </div>
        <p className="mt-4 font-mono text-[9px] uppercase text-zinc-500">{props.message ?? props.status}</p>
      </div>
    </div>
  );
}

function PayloadDrawer({ drawer, blindMode, onClose, onReview }: { drawer: DrawerState; blindMode: boolean; onClose: () => void; onReview: (proposalId: string, action: 'accept' | 'reject') => void }) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-white/10 bg-[#11100e] shadow-terminal">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <p className="font-mono text-[10px] uppercase text-zinc-500">PROVENANCE THREAD</p>
          <h2 className="mt-1 font-display text-sm uppercase text-paper">{drawer.title}</h2>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/10 text-zinc-300"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {drawer.lineage.length === 0 ? <span className="font-mono text-[9px] uppercase text-zinc-600">lineage missing</span> : drawer.lineage.map((item) => <span key={item} className="border border-white/10 px-2 py-1 font-mono text-[8px] uppercase text-zinc-400">{shortHash(item)}</span>)}
        </div>
        <pre className="whitespace-pre-wrap border border-white/10 bg-black/35 p-3 font-mono text-[10px] leading-relaxed text-zinc-300">{JSON.stringify(drawer.payload, null, 2)}</pre>
      </div>
      {drawer.proposalId && (
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4">
          <button type="button" disabled={blindMode} onClick={() => onReview(drawer.proposalId as string, 'accept')} className="inline-flex items-center justify-center gap-2 border border-teal-200/30 bg-teal-200/10 px-3 py-3 font-mono text-[10px] uppercase text-teal-100 disabled:opacity-40"><Check className="h-3 w-3" /> accept</button>
          <button type="button" disabled={blindMode} onClick={() => onReview(drawer.proposalId as string, 'reject')} className="inline-flex items-center justify-center gap-2 border border-red-200/30 bg-red-200/10 px-3 py-3 font-mono text-[10px] uppercase text-red-100 disabled:opacity-40"><PauseCircle className="h-3 w-3" /> reject</button>
        </div>
      )}
    </div>
  );
}


