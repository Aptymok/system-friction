'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { RootSovereignState, RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from './sovereignTypes';
import { LogbookSelectorPanel } from '@/components/root/logbook/LogbookSelectorPanel';

type Panel = 'agents' | 'governance' | 'twin' | 'logbook';

type Item = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  status: string;
  source: string;
  observedAt: string | null;
  raw: unknown;
};

const PANELS: Array<{ id: Panel; label: string; question: string }> = [
  { id: 'agents', label: 'AGENTES', question: '¿Quién puede hacer qué y qué ejecución real lo demuestra?' },
  { id: 'governance', label: 'GOBERNANZA', question: '¿Qué requiere autoridad humana ahora?' },
  { id: 'twin', label: 'DECISIONES DEL TWIN', question: '¿Qué recuerda, propone o deja pendiente el Twin?' },
  { id: 'logbook', label: 'BITÁCORA', question: '¿Qué pasó, en qué orden y desde qué fuente?' },
];

const PRIMARY_SURFACES = [
  ['/pipeline', 'PIPELINE'],
  ['/field', 'FIELD'],
  ['/method-lab', 'METHOD LAB'],
  ['/observatory', 'OBSERVATORY'],
] as const;

function text(value: unknown, fallback = 'MISSING') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function rowDate(row: RootRow): string | null {
  const value = row.observed_at ?? row.created_at ?? row.updated_at ?? row.executed_at ?? row.timestamp;
  return typeof value === 'string' && value ? value : null;
}
function when(value: string | null) {
  if (!value) return 'SIN FECHA';
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed) : value;
}
function selected(item: Item): RootSelection {
  return {
    kind: item.subtitle,
    id: item.id,
    title: item.title,
    source: item.source,
    observedAt: item.observedAt,
    confidence: null,
    evidenceIds: [],
    warning: null,
    data: item.raw,
  };
}
function itemFromRow(row: RootRow, index: number, source: string, fallbackKind: string): Item {
  return {
    id: text(row.id ?? row.event_id ?? row.decision_id ?? row.run_id ?? row.memory_key, `${fallbackKind}-${index}`),
    title: text(row.title ?? row.label ?? row.name ?? row.decision_id ?? row.event_type ?? row.action, `Registro ${index + 1}`),
    subtitle: text(row.type ?? row.kind ?? row.status, fallbackKind),
    summary: text(row.summary ?? row.description ?? row.explanation ?? row.statement ?? row.result ?? row.status, 'Registro persistido sin resumen legible.'),
    status: text(row.status ?? row.state ?? row.lifecycle_status, 'OBSERVED'),
    source,
    observedAt: rowDate(row),
    raw: row,
  };
}
function ms(value: string | null) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function RootGovernanceObservatory({
  state,
  refreshing,
  warning,
  onRefresh,
  onSelect,
  onAction,
}: {
  state: RootSovereignState;
  refreshing: boolean;
  warning: string | null;
  onRefresh: () => void;
  onSelect: (selection: RootSelection) => void;
  onAction: (action: RootActionRequest) => void;
}) {
  const [panel, setPanel] = useState<Panel>('governance');
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    const key = 'sfi.root.last-seen.v1';
    const previous = window.localStorage.getItem(key);
    setLastSeen(previous);
    window.localStorage.setItem(key, state.generatedAt);
  }, [state.generatedAt]);

  const agents = useMemo<Item[]>(() => state.agents.data.agents.map((agent, index) => ({
    id: agent.id || `agent-${index}`,
    title: agent.role || agent.id || `Agente ${index + 1}`,
    subtitle: text(agent.state?.value ?? agent.availability, 'REGISTERED'),
    summary: agent.error
      ? `Dependencia degradada: ${agent.error}`
      : text(agent.lastResult, 'Agente registrado; la ausencia de ejecución persistida no se interpreta como actividad.'),
    status: text(agent.state?.value ?? agent.availability, 'REGISTERED'),
    source: state.agents.source,
    observedAt: agent.lastRun ?? null,
    raw: agent,
  })), [state.agents]);

  const governance = useMemo<Item[]>(() => [
    ...state.governance.data.proposals.map((row, index) => itemFromRow(row, index, state.governance.source, 'proposal')),
    ...state.governance.data.mutations.map((row, index) => itemFromRow(row, index, state.governance.source, 'mutation')),
  ].sort((a, b) => ms(b.observedAt) - ms(a.observedAt)), [state.governance]);

  const twin = useMemo<Item[]>(() => [
    ...state.cognitiveTwin.data.decisions.map((row, index) => itemFromRow(row, index, state.cognitiveTwin.source, 'decision')),
    ...state.cognitiveTwin.data.memory.map((row, index) => itemFromRow(row, index, state.cognitiveTwin.source, 'memory')),
    ...state.cognitiveTwin.data.runs.map((row, index) => itemFromRow(row, index, state.cognitiveTwin.source, 'run')),
  ].sort((a, b) => ms(b.observedAt) - ms(a.observedAt)), [state.cognitiveTwin]);

  const changes = useMemo(() => {
    if (!lastSeen) return [] as Item[];
    const cutoff = Date.parse(lastSeen);
    if (!Number.isFinite(cutoff)) return [] as Item[];
    return [...governance, ...twin, ...agents].filter((item) => ms(item.observedAt) > cutoff).sort((a, b) => ms(b.observedAt) - ms(a.observedAt));
  }, [lastSeen, governance, twin, agents]);

  const openGovernance = governance.filter((item) => !['executed', 'closed', 'rejected', 'denied', 'resolved'].includes(item.status.toLowerCase()));
  const active = PANELS.find((item) => item.id === panel)!;

  function runObservationCycle() {
    onAction({
      id: `root-observe-${Date.now()}`,
      label: 'Actualizar observación institucional',
      effect: 'Ejecuta el ciclo de observación y aprendizaje disponible sin autorizar acciones irreversibles.',
      target: 'SFI institutional observation',
      endpoint: '/api/root/operational/trigger-observation?job=all',
      method: 'POST',
    });
  }

  const list = panel === 'agents' ? agents : panel === 'governance' ? openGovernance : panel === 'twin' ? twin : [];

  return <main className="root-canonical">
    <header className="root-canonical__header">
      <div>
        <span>SYSTEM FRICTION INSTITUTE · ROOT</span>
        <h1>Revisar. Decidir. Registrar.</h1>
        <p>ROOT no es un tablero de curiosidad. Presenta únicamente aquello que requiere lectura institucional, autoridad humana o trazabilidad.</p>
      </div>
      <div className="root-canonical__actions">
        <button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'ACTUALIZANDO…' : 'ACTUALIZAR'}</button>
        <button type="button" onClick={runObservationCycle}>OBSERVAR SISTEMA</button>
      </div>
    </header>

    <nav className="root-canonical__surfaces" aria-label="Superficies operativas de SFI">
      {PRIMARY_SURFACES.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
      <span />
      <Link href="/studio">STUDIO</Link>
      <Link href="/library">LIBRARY</Link>
    </nav>

    {warning ? <div className="root-canonical__warning"><b>LECTURA PARCIAL</b><span>{warning}</span></div> : null}

    <section className="root-canonical__since">
      <div><span>DESDE TU ÚLTIMA APERTURA EN ESTE NAVEGADOR</span><strong>{lastSeen ? changes.length : '—'}</strong></div>
      <p>{lastSeen ? (changes.length ? `${changes.length} registros posteriores a ${when(lastSeen)}.` : `No aparecen registros posteriores a ${when(lastSeen)} en las fuentes cargadas.`) : 'Se estableció el punto de referencia para la próxima apertura.'}</p>
      {changes.length ? <div>{changes.slice(0, 5).map((item) => <button key={`${item.subtitle}:${item.id}`} onClick={() => onSelect(selected(item))}><b>{item.title}</b><small>{item.subtitle} · {when(item.observedAt)}</small></button>)}</div> : null}
    </section>

    <nav className="root-canonical__tabs">
      {PANELS.map((item) => <button type="button" key={item.id} data-active={panel === item.id} onClick={() => setPanel(item.id)}><b>{item.label}</b><span>{item.question}</span></button>)}
    </nav>

    <section className="root-canonical__workspace">
      <header><div><span>{active.label}</span><h2>{active.question}</h2></div><strong>{panel === 'logbook' ? 'LIVE' : list.length}</strong></header>

      {panel === 'logbook' ? <LogbookSelectorPanel /> : null}

      {panel !== 'logbook' ? <div className="root-canonical__list">
        {list.length ? list.slice(0, 80).map((item) => <button type="button" key={`${item.subtitle}:${item.id}`} onClick={() => onSelect(selected(item))}>
          <div><span>{item.subtitle}</span><b>{item.title}</b><p>{item.summary}</p></div>
          <aside><strong>{item.status}</strong><small>{when(item.observedAt)}</small></aside>
        </button>) : <div className="root-canonical__empty"><b>NADA QUE RESOLVER EN ESTE CORTE</b><p>La ausencia de registros no se sustituye con elementos simulados.</p></div>}
      </div> : null}

      {panel === 'governance' ? <footer className="root-canonical__footer"><Link href="/root/decisions">ABRIR COLA DE DECISIONES DETALLADA</Link><span>Se absorberá en este panel cuando sus acciones específicas queden migradas.</span></footer> : null}
      {panel === 'twin' ? <footer className="root-canonical__footer"><Link href="/root/cognitive-twin">ABRIR DETALLE DEL TWIN</Link><span>Memoria no equivale a autoridad.</span></footer> : null}
    </section>

    <style jsx>{`
      .root-canonical{min-height:100vh;background:#f3f0e8;color:#171b1e;padding:28px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.root-canonical__header{display:flex;justify-content:space-between;gap:28px;padding-bottom:22px;border-bottom:1px solid #bca86d}.root-canonical__header span,.root-canonical__since span,.root-canonical__workspace>header span{font-size:9px;letter-spacing:.16em;color:#8b7336}.root-canonical__header h1{font:400 36px/1.05 Georgia,serif;margin:7px 0;color:#17232d}.root-canonical__header p{max-width:820px;margin:0;color:#58636a;font:14px/1.65 Georgia,serif}.root-canonical__actions{display:flex;gap:8px;align-items:flex-start}.root-canonical button,.root-canonical a{font-family:inherit}.root-canonical__actions button{border:1px solid #758795;background:#e9edf0;color:#223744;padding:9px 11px;font-size:9px}.root-canonical__actions button:last-child{border-color:#a68b48;background:#c5aa66;color:#15212a}.root-canonical__surfaces{display:flex;gap:7px;align-items:center;padding:12px 0;border-bottom:1px solid #d7d0bf}.root-canonical__surfaces a{color:#334b5c;text-decoration:none;border:1px solid #bac5cc;background:#edf1f3;padding:7px 9px;font-size:8px}.root-canonical__surfaces span{flex:1}.root-canonical__surfaces a:nth-last-child(-n+2){background:transparent;border-color:#d1c8b1;color:#786b4a}.root-canonical__warning{margin-top:12px;border-left:3px solid #9b6b45;background:#eee4d6;padding:10px 12px;display:grid;gap:4px}.root-canonical__warning b{font-size:8px;color:#6f472e}.root-canonical__warning span{font:12px/1.5 Georgia,serif;color:#664f40}.root-canonical__since{display:grid;grid-template-columns:220px 1fr;gap:18px;padding:18px 0;border-bottom:1px solid #d7d0bf}.root-canonical__since>div:first-child{display:grid;gap:6px}.root-canonical__since strong{font:400 28px Georgia,serif;color:#263c49}.root-canonical__since p{margin:0;color:#667177;font:12px/1.55 Georgia,serif}.root-canonical__since>div:last-child{grid-column:2;display:flex;gap:6px;flex-wrap:wrap}.root-canonical__since button{border:1px solid #d1c8b1;background:#faf8f3;text-align:left;padding:7px 9px;display:grid;gap:2px}.root-canonical__since button b{font-size:8px}.root-canonical__since button small{font-size:7px;color:#7a7468}.root-canonical__tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:18px 0}.root-canonical__tabs button{text-align:left;border:1px solid #bec8ce;background:#e7ecef;padding:13px;color:#4b5c66;display:grid;gap:7px}.root-canonical__tabs button[data-active=true]{background:#17303f;color:#f3f5f4;border-color:#17303f;box-shadow:inset 0 -3px #c3a35d}.root-canonical__tabs b{font-size:9px;letter-spacing:.1em}.root-canonical__tabs span{font:11px/1.45 Georgia,serif;opacity:.82}.root-canonical__workspace{border:1px solid #b9c3c8;background:#fbfaf6;min-height:520px}.root-canonical__workspace>header{display:flex;justify-content:space-between;gap:20px;padding:18px;border-bottom:1px solid #d6d9d8;background:#e9eef0}.root-canonical__workspace h2{font:400 22px Georgia,serif;margin:5px 0 0;color:#243b49}.root-canonical__workspace>header>strong{font:400 28px Georgia,serif;color:#aa8d49}.root-canonical__list{display:grid}.root-canonical__list>button{display:grid;grid-template-columns:1fr 180px;gap:18px;text-align:left;border:0;border-bottom:1px solid #e3dfd5;background:transparent;padding:14px 18px;color:#263238}.root-canonical__list>button:hover{background:#f1f4f4}.root-canonical__list span{font-size:7px;color:#987b3d;letter-spacing:.1em}.root-canonical__list b{display:block;margin-top:4px;font:600 13px Georgia,serif;color:#263d49}.root-canonical__list p{margin:4px 0 0;color:#68747a;font:11px/1.5 Georgia,serif}.root-canonical__list aside{text-align:right;display:grid;align-content:start;gap:5px}.root-canonical__list aside strong{font-size:8px;color:#556c78}.root-canonical__list aside small{font-size:7px;color:#89877f}.root-canonical__empty{padding:50px 18px;color:#777d7e;text-align:center}.root-canonical__empty b{font-size:9px;color:#53666f}.root-canonical__empty p{font:12px Georgia,serif}.root-canonical__footer{display:flex;justify-content:space-between;gap:12px;padding:12px 18px;background:#f0eee7;border-top:1px solid #d9d3c3}.root-canonical__footer a{font-size:8px;color:#725a28}.root-canonical__footer span{font:10px Georgia,serif;color:#7c776c}@media(max-width:900px){.root-canonical{padding:16px}.root-canonical__header{display:grid}.root-canonical__tabs{grid-template-columns:1fr 1fr}.root-canonical__since{grid-template-columns:1fr}.root-canonical__since>div:last-child{grid-column:1}.root-canonical__list>button{grid-template-columns:1fr}.root-canonical__list aside{text-align:left}.root-canonical__surfaces{overflow:auto}.root-canonical__actions{flex-wrap:wrap}}
    `}</style>
  </main>;
}
