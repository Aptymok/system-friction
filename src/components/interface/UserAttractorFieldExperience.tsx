'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, FileUp, Loader2, Orbit, Sparkles, Target } from 'lucide-react';

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

type UploadState = { note: string; source: string; reliability: number; file: File | null };
type AgentResult = {
  reading: string;
  frictionReading: string;
  conversionBreak: string;
  proposedMicroExecution: string;
  nextAction: string;
  confidence: number;
  risk: string;
  provider: string;
  warnings: string[];
};

const WIDTH = 1000;
const HEIGHT = 620;

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function formatDate(value: string | null) {
  if (!value) return 'Todavía no hay una fecha programada';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusText(value: string) {
  const labels: Record<string, string> = {
    ACCEPTED: 'La evidencia aporta a la trayectoria',
    PARTIAL: 'La evidencia aporta sólo una parte',
    OBSERVED_NOT_INTEGRATED: 'La evidencia fue observada, pero aún no cambia la lectura',
    REJECTED: 'La evidencia no sostiene esta lectura',
  };
  return labels[value] ?? value;
}

function nodeColor(type: PersistedNodeType) {
  const colors: Record<PersistedNodeType, string> = {
    attractor: '#e1bd58',
    mark: '#c6b89c',
    event: '#c97d5c',
    evidence: '#75b9c7',
    intervention: '#df9458',
    return: '#8fbd79',
    learning: '#b28bc8',
  };
  return colors[type];
}

function positions(nodes: GraphNode[]) {
  const result = new Map<string, { x: number; y: number }>();
  const central = nodes.find((node) => node.is_central || node.node_type === 'attractor');
  if (central) result.set(central.id, { x: WIDTH / 2, y: HEIGHT / 2 });
  const peripheral = nodes.filter((node) => node.id !== central?.id);
  peripheral.forEach((node, index) => {
    const seed = hash(node.id);
    const ring = 150 + (seed % 3) * 70;
    const angle = peripheral.length ? (index / peripheral.length) * Math.PI * 2 + ((seed % 31) / 100) : 0;
    result.set(node.id, {
      x: Math.max(70, Math.min(WIDTH - 70, WIDTH / 2 + Math.cos(angle) * ring)),
      y: Math.max(65, Math.min(HEIGHT - 65, HEIGHT / 2 + Math.sin(angle) * ring * 0.72)),
    });
  });
  return result;
}

function path(source: { x: number; y: number }, target: { x: number; y: number }, curvature: number) {
  const middleX = (source.x + target.x) / 2;
  const middleY = (source.y + target.y) / 2;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const bend = Math.max(-1, Math.min(1, curvature)) * 110;
  return `M ${source.x} ${source.y} Q ${middleX + (-dy / length) * bend} ${middleY + (dx / length) * bend} ${target.x} ${target.y}`;
}

export default function UserAttractorFieldExperience(props: Props) {
  const { entitlement, caseData, attractor, graph, evidence, world, nextReturnAt, userEmail } = props;
  const [selectedId, setSelectedId] = useState<string | null>(graph.nodes.find((node) => node.is_central)?.id ?? graph.nodes[0]?.id ?? null);
  const [upload, setUpload] = useState<UploadState>({ note: '', source: 'observación directa', reliability: 0.7, file: null });
  const [status, setStatus] = useState<'idle' | 'uploading' | 'interpreting' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentResult | null>(null);
  const pointMap = useMemo(() => positions(graph.nodes), [graph.nodes]);
  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const selected = selectedId ? nodeMap.get(selectedId) ?? null : null;
  const realEdges = graph.edges.filter((edge) => pointMap.has(edge.source_node_id) && pointMap.has(edge.target_node_id));

  async function submitEvidence() {
    if (!entitlement.active || (!upload.note.trim() && !upload.file)) return;
    setStatus('uploading');
    setMessage(null);
    try {
      const form = new FormData();
      form.set('caseId', caseData.id);
      form.set('note', upload.note);
      form.set('source', upload.source);
      form.set('reliability', String(upload.reliability));
      if (upload.file) form.set('file', upload.file);
      const response = await fetch('/api/interface/observatory/evidence', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || 'No fue posible guardar la evidencia.');
      setUpload({ note: '', source: 'observación directa', reliability: 0.7, file: null });
      setMessage(`${statusText(body.assessment.status)}. ${body.assessment.reason}`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible guardar la evidencia.');
      setStatus('error');
      return;
    }
    setStatus('idle');
  }

  async function interpret() {
    setStatus('interpreting');
    setMessage(null);
    setAgent(null);
    try {
      const response = await fetch('/api/interface/observatory/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          selectedTitle: selected?.label ?? attractor.label,
          selectedSummary: selected?.summary ?? attractor.summary,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || 'No fue posible generar la lectura.');
      setAgent(body as AgentResult);
      setStatus('idle');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible generar la lectura.');
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen bg-[#050504] text-[#d9d1bf]">
      <header className="border-b border-[#302a1f] px-5 py-6 md:px-10">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">SFI · observatorio personal</div>
            <h1 className="mt-3 text-3xl text-[#f4ecd9] md:text-5xl">Tu trayectoria, construida con evidencia real.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#958d7d]">Este espacio no completa vacíos con datos de ejemplo. Sólo muestra hechos, relaciones, intervenciones y aprendizajes que ya fueron registrados en tu caso.</p>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.13em]">
            <span className="border border-[#302a1f] px-3 py-2 text-[#8c8476]">{userEmail ?? 'Cuenta privada'}</span>
            <Link href="/interface?new=1" className="border border-[#574927] px-3 py-2 text-[#c8a951]">Iniciar otra trayectoria</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] gap-6 px-5 py-7 md:px-10 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <section className="border border-[#302a1f] bg-[#090908] p-5 md:p-7">
            <div className="grid gap-5 md:grid-cols-3">
              <div><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#91866d]">Objetivo declarado</span><p className="mt-3 text-lg leading-7 text-[#eee3c9]">{attractor.objective || 'Todavía no se registró un objetivo.'}</p></div>
              <div><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#91866d]">Dirección observada</span><p className="mt-3 text-lg leading-7 text-[#eee3c9]">{attractor.direction || 'Todavía no se ha determinado una dirección.'}</p></div>
              <div><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#91866d]">Próximo retorno</span><p className="mt-3 text-lg leading-7 text-[#eee3c9]">{formatDate(nextReturnAt)}</p></div>
            </div>
          </section>

          <section className="overflow-hidden border border-[#302a1f] bg-[#080807]">
            <div className="flex flex-col gap-3 border-b border-[#302a1f] p-5 md:flex-row md:items-end md:justify-between">
              <div><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Mapa de trayectoria</span><h2 className="mt-2 text-2xl text-[#f3ead6]">Lo que ya está conectado en tu caso</h2></div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#827867]">{graph.nodes.length} puntos · {realEdges.length} relaciones persistidas</div>
            </div>
            {graph.nodes.length ? (
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[560px] w-full bg-[radial-gradient(circle_at_center,rgba(95,36,70,.13),transparent_46%)]" role="img" aria-label="Trayectoria basada en nodos y relaciones persistidos">
                {realEdges.map((edge) => {
                  const source = pointMap.get(edge.source_node_id);
                  const target = pointMap.get(edge.target_node_id);
                  if (!source || !target) return null;
                  return <path key={edge.id} d={path(source, target, edge.curvature)} fill="none" stroke="#947944" strokeOpacity={Math.max(.16, Math.min(.75, edge.strength))} strokeWidth={1 + Math.max(0, edge.strength) * 2} />;
                })}
                {graph.nodes.map((node) => {
                  const point = pointMap.get(node.id);
                  if (!point) return null;
                  const radius = node.is_central ? 24 : 8 + Math.max(0, Math.min(1, node.weight)) * 8;
                  return <g key={node.id} role="button" tabIndex={0} onClick={() => setSelectedId(node.id)} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedId(node.id); }} className="cursor-pointer outline-none">
                    <circle cx={point.x} cy={point.y} r={radius * 2.1} fill={nodeColor(node.node_type)} opacity={selectedId === node.id ? .24 : .09} />
                    <circle cx={point.x} cy={point.y} r={radius} fill={nodeColor(node.node_type)} stroke={selectedId === node.id ? '#fff0b6' : '#17130b'} strokeWidth={selectedId === node.id ? 3 : 1} />
                    {(node.is_central || selectedId === node.id) ? <text x={point.x + radius + 8} y={point.y + 4} fill="#e7d6aa" fontSize="13">{node.label.slice(0, 42)}</text> : null}
                  </g>;
                })}
              </svg>
            ) : (
              <div className="grid min-h-[430px] place-items-center p-8 text-center"><div><Orbit className="mx-auto h-8 w-8 text-[#c8a951]" /><h3 className="mt-4 text-xl text-[#f0e5cc]">Todavía no existe un mapa persistido.</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#908777]">Carga evidencia o registra una microejecución. El mapa aparecerá cuando existan nodos y relaciones reales.</p></div></div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="border border-[#302a1f] bg-[#090908] p-5">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Punto seleccionado</div>
            {selected ? <><h2 className="mt-3 text-2xl text-[#f1e5ca]">{selected.label}</h2><p className="mt-3 text-sm leading-7 text-[#9b927f]">{selected.summary || 'Este punto todavía no tiene una explicación registrada.'}</p><dl className="mt-5 space-y-3 text-sm"><div><dt className="text-[#766d5d]">Tipo</dt><dd className="text-[#d8cbaa]">{selected.node_type}</dd></div><div><dt className="text-[#766d5d]">Observado</dt><dd className="text-[#d8cbaa]">{formatDate(selected.observed_at)}</dd></div></dl></> : <p className="mt-3 text-sm leading-7 text-[#908777]">Selecciona un punto del mapa para revisar su significado.</p>}
            <button type="button" onClick={() => void interpret()} disabled={status === 'interpreting'} className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-[#c8a951] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#050504] disabled:opacity-40">{status === 'interpreting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Pedir lectura al agente SFI</button>
          </section>

          {agent ? <section className="border border-[#645327] bg-[#0d0c08] p-5"><div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Lectura del agente MOP-H</div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#d8cdb5]">{agent.reading}</p><div className="mt-5 border-t border-[#302a1f] pt-4"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#9d8c68]">Microejecución propuesta</span><p className="mt-2 text-sm leading-7 text-[#f0dfb8]">{agent.proposedMicroExecution}</p></div><p className="mt-4 text-xs leading-6 text-[#827867]">Confianza del agente: {Math.round(agent.confidence * 100)}%. Esta lectura no se persiste ni se ejecuta automáticamente.</p></section> : null}

          <section className="border border-[#302a1f] bg-[#090908] p-5">
            <div className="flex items-center gap-2"><FileUp className="h-4 w-4 text-[#c8a951]" /><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Agregar evidencia</span></div>
            <p className="mt-3 text-xs leading-6 text-[#8d8474]">Añade algo que observaste o un archivo que ayude a confirmar, matizar o contradecir la trayectoria.</p>
            <textarea value={upload.note} onChange={(event) => setUpload((current) => ({ ...current, note: event.target.value }))} rows={4} placeholder="Describe qué ocurrió y por qué puede ser relevante." className="mt-4 w-full resize-y border border-[#302a1f] bg-[#050504] px-3 py-3 text-sm text-[#eee4cb] outline-none focus:border-[#c8a951]" />
            <input type="text" value={upload.source} onChange={(event) => setUpload((current) => ({ ...current, source: event.target.value }))} aria-label="Origen de la evidencia" className="mt-3 w-full border border-[#302a1f] bg-[#050504] px-3 py-3 text-sm text-[#eee4cb] outline-none focus:border-[#c8a951]" />
            <input type="file" onChange={(event) => setUpload((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} className="mt-3 block w-full text-xs text-[#918979]" />
            <label className="mt-4 grid gap-2 text-xs text-[#918979]"><span>Qué tan confiable consideras la fuente: {Math.round(upload.reliability * 100)}%</span><input type="range" min={0} max={1} step={0.05} value={upload.reliability} onChange={(event) => setUpload((current) => ({ ...current, reliability: Number(event.target.value) }))} /></label>
            <button type="button" onClick={() => void submitEvidence()} disabled={!entitlement.active || status === 'uploading' || (!upload.note.trim() && !upload.file)} className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-[#66552c] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-35">{status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Guardar y evaluar</button>
          </section>

          {message ? <section className="border border-[#5a4926] bg-[#0d0b07] p-4 text-sm leading-6 text-[#d2bd8b]">{message}</section> : null}

          <section className="border border-[#302a1f] bg-[#090908] p-5">
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-[#c8a951]" /><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Lectura disponible</span></div>
            <p className="mt-3 text-sm leading-7 text-[#968d7d]">{attractor.summary || 'Todavía no existe una lectura consolidada.'}</p>
            {attractor.perturbation.instruction ? <div className="mt-4 border-l-2 border-[#c8a951] pl-4"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#9d8c68]">Microejecución registrada</span><p className="mt-2 text-sm leading-7 text-[#e7d6ae]">{attractor.perturbation.instruction}</p></div> : null}
          </section>

          {(world.friction !== null || world.tension !== null || world.confidence !== null) ? <section className="border border-[#302a1f] bg-[#090908] p-5"><div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Contexto general</div><p className="mt-3 text-xs leading-6 text-[#8d8474]">Esta información describe el entorno observado por SFI; no define tu caso.</p><dl className="mt-4 space-y-2 text-sm"><div><dt className="text-[#766d5d]">Régimen</dt><dd className="text-[#d8cbaa]">{world.regime === 'MISSING' ? 'Sin lectura disponible' : world.regime}</dd></div>{world.friction !== null ? <div><dt className="text-[#766d5d]">Fricción observada</dt><dd className="text-[#d8cbaa]">{Math.round(world.friction * 100)}%</dd></div> : null}{world.tension !== null ? <div><dt className="text-[#766d5d]">Tensión observada</dt><dd className="text-[#d8cbaa]">{Math.round(world.tension * 100)}%</dd></div> : null}</dl></section> : null}

          {evidence.length ? <section className="border border-[#302a1f] bg-[#090908] p-5"><div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Evaluaciones recientes</div><div className="mt-4 space-y-3">{evidence.slice(0, 5).map((item) => <div key={item.id} className="border border-[#272219] p-3"><strong className="text-sm text-[#e7d8b8]">{statusText(item.status)}</strong><p className="mt-2 text-xs leading-6 text-[#8f8676]">{item.reason}</p></div>)}</div></section> : null}
        </aside>
      </section>
    </main>
  );
}
