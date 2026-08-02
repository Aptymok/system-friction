'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  FileUp,
  Gauge,
  Loader2,
  LockKeyhole,
  Orbit,
  Route,
  Sparkles,
} from 'lucide-react';

type GraphNode = {
  id: string;
  node_type: 'attractor' | 'mark' | 'event' | 'evidence' | 'intervention' | 'return' | 'learning';
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

type Point = { x: number; y: number; radius: number };

type UploadState = {
  note: string;
  source: string;
  reliability: number;
  file: File | null;
};

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result;
}

function nodeRadius(type: GraphNode['node_type'], weight: number) {
  if (type === 'attractor') return 34;
  const base: Record<GraphNode['node_type'], number> = {
    attractor: 34,
    mark: 7,
    event: 8,
    evidence: 10,
    intervention: 12,
    return: 11,
    learning: 9,
  };
  return base[type] + Math.round(Math.max(0, Math.min(1, weight)) * 5);
}

function colorFor(type: GraphNode['node_type']) {
  const colors: Record<GraphNode['node_type'], string> = {
    attractor: '#d5b45b',
    mark: '#918672',
    event: '#9c765c',
    evidence: '#79a1a8',
    intervention: '#b98d60',
    return: '#7f9d72',
    learning: '#9a82ac',
  };
  return colors[type];
}

function dateLabel(value: string | null) {
  if (!value) return 'Sin retorno programado';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function UserAttractorObservatory({
  userEmail,
  entitlement,
  caseData,
  attractor,
  graph,
  evidence,
  world,
  nextReturnAt,
}: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(graph.nodes.find((node) => node.is_central)?.id ?? null);
  const [upload, setUpload] = useState<UploadState>({ note: '', source: 'observación directa', reliability: 0.7, file: null });
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<null | {
    status: string;
    reason: string;
    nextAction: string;
    confidence: number;
  }>(null);

  const positions = useMemo(() => {
    const points = new Map<string, Point>();
    const central = graph.nodes.find((node) => node.is_central || node.node_type === 'attractor');
    if (central) points.set(central.id, { x: 50, y: 50, radius: nodeRadius('attractor', central.weight) });
    const peripheral = graph.nodes.filter((node) => node.id !== central?.id);
    peripheral.forEach((node, index) => {
      const seed = hash(node.id);
      const ring = index % 3;
      const distance = 22 + ring * 10 + (seed % 9);
      const angle = ((seed % 360) * Math.PI) / 180;
      const x = 50 + Math.cos(angle) * distance;
      const y = 50 + Math.sin(angle) * distance * 0.78;
      points.set(node.id, {
        x: Math.max(7, Math.min(93, x)),
        y: Math.max(9, Math.min(91, y)),
        radius: nodeRadius(node.node_type, node.weight),
      });
    });
    return points;
  }, [graph.nodes]);

  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const tension = Math.max(0, Math.min(1, world.tension ?? 0.35));
  const friction = Math.max(0, Math.min(1, world.friction ?? 0.45));
  const viscosityBlur = 22 + friction * 38;
  const gridOpacity = 0.08 + tension * 0.12;

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
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (nextError) {
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'evidence_upload_failed');
    }
  }

  return (
    <main className="min-h-screen bg-[#040403] text-[#d9d2c2]">
      <header className="border-b border-[#29251c] px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#c8a951]">SFI / Mi observatorio</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#f5eedc] md:text-5xl">Trayectoria hacia el atractor.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#918979]">El nodo dorado es el centro de dirección y objetivo. El campo no representa una identidad fija: muestra eventos, evidencia y decisiones según su relación con esa trayectoria.</p>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.14em]">
            <span className="border border-[#29251c] px-3 py-2 text-[#7f786b]">{userEmail}</span>
            <span className="border border-[#594c2c] px-3 py-2 text-[#c8a951]">{entitlement.active ? entitlement.tier : 'observación limitada'}</span>
            <span className="border border-[#29251c] px-3 py-2 text-[#7f786b]">{world.regime}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1700px] gap-5 px-5 py-5 md:px-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-5">
          <section className="grid gap-px border border-[#29251c] bg-[#29251c] md:grid-cols-4">
            <div className="bg-[#080806] p-4"><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766f62]">Atractor</div><div className="mt-2 text-lg text-[#f1e7ce]">{attractor.label}</div></div>
            <div className="bg-[#080806] p-4"><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766f62]">Confianza</div><div className="mt-2 text-lg text-[#f1e7ce]">{Math.round(attractor.confidence * 100)}%</div></div>
            <div className="bg-[#080806] p-4"><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766f62]">Tensión del campo</div><div className="mt-2 text-lg text-[#f1e7ce]">{Math.round(tension * 100)}%</div></div>
            <div className="bg-[#080806] p-4"><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#766f62]">Próximo retorno</div><div className="mt-2 text-sm text-[#f1e7ce]">{dateLabel(nextReturnAt)}</div></div>
          </section>

          <section className="relative min-h-[680px] overflow-hidden border border-[#332d20] bg-[#050504]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(rgba(200,169,81,${gridOpacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(200,169,81,${gridOpacity}) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(213,180,91,0.12), transparent 27%), radial-gradient(circle at 17% 28%, rgba(91,113,122,${0.08 + tension * 0.12}), transparent 28%), radial-gradient(circle at 82% 72%, rgba(120,76,66,${0.08 + friction * 0.14}), transparent 31%)`,
                backgroundSize: '36px 36px, 36px 36px, auto, auto, auto',
              }}
            />
            <div className="absolute left-[13%] top-[24%] h-40 w-56 rounded-full bg-[#43545b1f]" style={{ filter: `blur(${viscosityBlur}px)` }} />
            <div className="absolute bottom-[16%] right-[11%] h-48 w-64 rounded-full bg-[#6b41351e]" style={{ filter: `blur(${viscosityBlur + 8}px)` }} />

            <div className="absolute left-4 top-4 z-20 border border-[#332d20] bg-[#070706dd] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8f8778] backdrop-blur">
              viscosidad {Math.round(friction * 100)} · tensión {Math.round(tension * 100)} · nodos {graph.nodes.length}
            </div>

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Grafo longitudinal del atractor">
              <defs>
                <filter id="goldGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {graph.edges.map((edge) => {
                const source = positions.get(edge.source_node_id);
                const target = positions.get(edge.target_node_id);
                if (!source || !target) return null;
                const midpointX = (source.x + target.x) / 2 + edge.curvature * 8;
                const midpointY = (source.y + target.y) / 2 - edge.curvature * 6;
                return (
                  <path
                    key={edge.id}
                    d={`M ${source.x} ${source.y} Q ${midpointX} ${midpointY} ${target.x} ${target.y}`}
                    fill="none"
                    stroke={edge.direction === 'toward_attractor' ? '#b69a52' : '#665f52'}
                    strokeWidth={0.12 + Math.max(0.08, edge.strength * 0.32)}
                    strokeOpacity={0.25 + edge.strength * 0.65}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              {graph.nodes.map((node) => {
                const point = positions.get(node.id);
                if (!point) return null;
                const selected = node.id === selectedNodeId;
                return (
                  <g key={node.id} onClick={() => setSelectedNodeId(node.id)} className="cursor-pointer">
                    {node.is_central ? <circle cx={point.x} cy={point.y} r={5.2} fill="none" stroke="#d5b45b" strokeWidth="0.18" strokeOpacity="0.5" filter="url(#goldGlow)" /> : null}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={node.is_central ? 2.6 : point.radius / 12}
                      fill={colorFor(node.node_type)}
                      fillOpacity={node.is_central ? 1 : 0.72}
                      stroke={selected ? '#f5e4aa' : '#18150f'}
                      strokeWidth={selected ? 0.4 : 0.16}
                      filter={node.is_central ? 'url(#goldGlow)' : undefined}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
            </svg>

            <div className="absolute bottom-4 left-4 z-20 max-w-sm border border-[#332d20] bg-[#070706e8] p-4 backdrop-blur">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#c8a951]"><Route className="h-4 w-4" /> Dirección</div>
              <p className="mt-2 text-sm leading-6 text-[#b9af9c]">{attractor.direction}</p>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="border border-[#29251c] bg-[#080806] p-5">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]"><Sparkles className="h-4 w-4" /> Perturbación mínima</div>
              <h2 className="mt-3 text-xl text-[#f1e7ce]">{attractor.perturbation.title || 'Perturbación pendiente'}</h2>
              <p className="mt-3 text-sm leading-7 text-[#9d9484]">{attractor.perturbation.instruction || 'El campo aún no tiene una perturbación declarada.'}</p>
              {entitlement.active ? (
                <Link href={`/field?case=${encodeURIComponent(caseData.id)}`} className="mt-5 inline-flex items-center gap-2 border border-[#6c5b31] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.15em] text-[#c8a951]">Abrir ciclo de campo <ArrowRight className="h-4 w-4" /></Link>
              ) : (
                <div className="mt-5 flex items-center gap-2 border border-[#3c3528] px-4 py-3 text-xs text-[#81796c]"><LockKeyhole className="h-4 w-4" /> La acción se habilita con acceso de campo.</div>
              )}
            </div>

            <div className="border border-[#29251c] bg-[#080806] p-5">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]"><Gauge className="h-4 w-4" /> Estado de trayectoria</div>
              <p className="mt-3 text-sm leading-7 text-[#9d9484]">{attractor.summary}</p>
              <div className="mt-4 h-1 bg-[#201c14]"><div className="h-full bg-[#c8a951]" style={{ width: `${Math.round(attractor.confidence * 100)}%` }} /></div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#6f685b]">confianza declarada · {Math.round(attractor.confidence * 100)}%</div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="border border-[#29251c] bg-[#080806] p-5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]"><CircleDot className="h-4 w-4" /> Nodo seleccionado</div>
            {selectedNode ? (
              <div className="mt-4">
                <div className="text-xl text-[#f1e7ce]">{selectedNode.label}</div>
                <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#70695d]">{selectedNode.node_type}</div>
                <p className="mt-3 text-sm leading-6 text-[#9d9484]">{selectedNode.summary || 'Sin resumen adicional.'}</p>
              </div>
            ) : <p className="mt-4 text-sm text-[#81796c]">Selecciona un nodo.</p>}
          </section>

          <section className="border border-[#3d3421] bg-[#0b0905] p-5">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]"><FileUp className="h-4 w-4" /> Evidencia al nodo central</div>
            <p className="mt-3 text-xs leading-6 text-[#8e8576]">La evidencia se conserva como nodo. MIHM evalúa relevancia y trazabilidad antes de integrarla a la trayectoria.</p>
            {!entitlement.active ? (
              <div className="mt-4 border border-[#3c3528] p-3 text-xs leading-5 text-[#81796c]">El observatorio puede leerse, pero la carga de evidencia requiere acceso de campo activo.</div>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777063]">Qué ocurrió</span><textarea value={upload.note} onChange={(event) => setUpload((current) => ({ ...current, note: event.target.value }))} rows={4} className="border border-[#302b20] bg-[#050504] p-3 text-sm text-[#eee6d4] outline-none focus:border-[#c8a951]" /></label>
                <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777063]">Fuente</span><input value={upload.source} onChange={(event) => setUpload((current) => ({ ...current, source: event.target.value }))} className="border border-[#302b20] bg-[#050504] p-3 text-sm text-[#eee6d4] outline-none focus:border-[#c8a951]" /></label>
                <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777063]">Archivo opcional · máx. 8 MB</span><input type="file" onChange={(event) => setUpload((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} className="text-xs text-[#8e8576]" /></label>
                <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#777063]">Confiabilidad declarada · {Math.round(upload.reliability * 100)}%</span><input type="range" min={0.1} max={1} step={0.1} value={upload.reliability} onChange={(event) => setUpload((current) => ({ ...current, reliability: Number(event.target.value) }))} /></label>
                <button type="button" onClick={() => void submitEvidence()} disabled={status === 'uploading' || (!upload.note.trim() && !upload.file)} className="inline-flex w-full items-center justify-center gap-2 bg-[#c8a951] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#050504] disabled:opacity-40">
                  {status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />} Aplicar MIHM y registrar
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

          <section className="border border-[#29251c] bg-[#080806] p-5">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Evaluaciones recientes</div>
            <div className="mt-4 space-y-3">
              {evidence.length ? evidence.map((item) => (
                <article key={item.id} className="border border-[#29251c] p-3">
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em]"><span className="text-[#a8c58c]">{item.status}</span><span className="text-[#6f685d]">{Math.round(item.confidence * 100)}%</span></div>
                  <p className="mt-2 text-xs leading-5 text-[#918979]">{item.reason}</p>
                </article>
              )) : <p className="text-xs leading-5 text-[#81796c]">Aún no existen evaluaciones posteriores a la calibración.</p>}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
