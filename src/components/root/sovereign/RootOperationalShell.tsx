'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from './sovereignTypes';
import { RootRevenueWorkspace } from './RootRevenueWorkspace';
import './root-operational-shell.css';

type ModuleId =
  | 'attention'
  | 'system'
  | 'world'
  | 'cases'
  | 'attractors'
  | 'interested'
  | 'studio'
  | 'field'
  | 'observatory'
  | 'library'
  | 'agents'
  | 'history';

type CommercialWorkspace = {
  clients?: RootRow[];
  opportunities?: RootRow[];
  proposals?: RootRow[];
  counts?: Record<string, number>;
};

type ModuleDefinition = {
  id: ModuleId;
  label: string;
  topo: 'I' | 'II' | 'III';
  glyph: 'eye' | 'phi' | 'field' | 'world' | 'case' | 'attractor' | 'people' | 'studio' | 'map' | 'observe' | 'library' | 'agent' | 'history';
};

const MODULES: ModuleDefinition[] = [
  { id: 'attention', label: 'Atención', topo: 'I', glyph: 'eye' },
  { id: 'system', label: 'ΦSF · Sistema', topo: 'I', glyph: 'phi' },
  { id: 'world', label: 'World Spectrum', topo: 'I', glyph: 'world' },
  { id: 'cases', label: 'Casos', topo: 'II', glyph: 'case' },
  { id: 'attractors', label: 'Atractores', topo: 'II', glyph: 'attractor' },
  { id: 'interested', label: 'Posibles interesados', topo: 'II', glyph: 'people' },
  { id: 'studio', label: 'Studio', topo: 'III', glyph: 'studio' },
  { id: 'field', label: 'Field / Map', topo: 'III', glyph: 'map' },
  { id: 'observatory', label: 'Observatory', topo: 'III', glyph: 'observe' },
  { id: 'library', label: 'Library', topo: 'III', glyph: 'library' },
  { id: 'agents', label: 'Agentes', topo: 'III', glyph: 'agent' },
  { id: 'history', label: 'Bitácora', topo: 'III', glyph: 'history' },
];

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function time(value: unknown) {
  const raw = text(value, '');
  if (!raw) return 'Sin fecha';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? raw : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function rowTime(row: RootRow) {
  return row.observed_at ?? row.created_at ?? row.updated_at ?? row.executed_at ?? row.timestamp;
}

function rowTitle(row: RootRow, fallback: string) {
  return text(row.title ?? row.label ?? row.name ?? row.event_type ?? row.action ?? row.type ?? row.status, fallback);
}

function rowSummary(row: RootRow) {
  return text(row.summary ?? row.public_summary ?? row.description ?? row.explanation ?? row.statement ?? row.result ?? row.objective ?? row.status, 'Registro sin explicación legible.');
}

function statusClass(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes('degrad') || lower.includes('error') || lower.includes('blocked') || lower.includes('missing')) return 'attention';
  if (lower.includes('ok') || lower.includes('observed') || lower.includes('active') || lower.includes('available')) return 'ok';
  return 'neutral';
}

function Icon({ glyph }: { glyph: ModuleDefinition['glyph'] }) {
  const common = { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.15 };
  if (glyph === 'phi') return <svg {...common}><circle cx="8" cy="8" r="6"/><line x1="8" y1="2" x2="8" y2="14"/></svg>;
  if (glyph === 'field') return <svg {...common}><path d="M2 8Q5 2 8 8T14 8"/><path d="M2 5Q5 1 8 5T14 5" opacity=".45"/><path d="M2 11Q5 7 8 11T14 11" opacity=".45"/></svg>;
  if (glyph === 'world') return <svg {...common}><circle cx="8" cy="8" r="6"/><path d="M2 8Q5 5 8 8T14 8"/><path d="M8 2Q11 5 8 8T8 14"/></svg>;
  if (glyph === 'case') return <svg {...common}><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M5 3V1.8h6V3M5 7h6M5 10h4"/></svg>;
  if (glyph === 'attractor') return <svg {...common}><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="8" r="5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2"/></svg>;
  if (glyph === 'people') return <svg {...common}><circle cx="6" cy="6" r="2"/><circle cx="11.5" cy="6.5" r="1.5"/><path d="M2.5 13c.5-2.5 2-3.8 3.5-3.8S9 10.5 9.5 13M9.5 10c1.7.2 2.7 1.2 3 3"/></svg>;
  if (glyph === 'studio') return <svg {...common}><path d="M2 11l4-7 3 5 2-3 3 5"/><path d="M2 13h12"/></svg>;
  if (glyph === 'map') return <svg {...common}><path d="M2 3l4-1 4 2 4-1v10l-4 1-4-2-4 1z"/><path d="M6 2v10M10 4v10"/></svg>;
  if (glyph === 'observe' || glyph === 'eye') return <svg {...common}><path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.8"/></svg>;
  if (glyph === 'library') return <svg {...common}><path d="M3 2h3v12H3zM7 2h3v12H7zM11 3h2v11h-2z"/></svg>;
  if (glyph === 'agent') return <svg {...common}><circle cx="8" cy="6" r="3"/><path d="M4 14c.5-3 2-4.5 4-4.5s3.5 1.5 4 4"/></svg>;
  return <svg {...common}><rect x="2" y="2" width="12" height="12" rx="1"/><path d="M5 6h6M5 9h4M5 12h5"/></svg>;
}

function scalar(state: RootSovereignState, id: string) {
  const item = state.system.data.matrix.find((entry) => entry.id === id);
  return item?.state.value ?? null;
}

function numericFromMatrix(state: RootSovereignState, tokens: string[]) {
  const item = state.system.data.matrix.find((entry) => tokens.some((token) => `${entry.id} ${entry.label}`.toLowerCase().includes(token)));
  return num(item?.state.value, NaN);
}

function useCommercial(generatedAt: string) {
  const [workspace, setWorkspace] = useState<CommercialWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/root/commercial', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
        if (!cancelled) { setWorkspace(body.data); setError(null); }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'commercial_workspace_failed'); });
    return () => { cancelled = true; };
  }, [generatedAt]);
  return { workspace, error };
}

export function RootOperationalShell({
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
  const [activeModule, setActiveModule] = useState<ModuleId | null>(null);
  const [clock, setClock] = useState('');
  const { workspace: commercial, error: commercialError } = useCommercial(state.generatedAt);

  useEffect(() => {
    const update = () => setClock(new Date().toISOString().replace('T', ' ').slice(0, 19));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setActiveModule(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const phi = numericFromMatrix(state, ['phi', 'friction']);
  const ihg = numericFromMatrix(state, ['ihg']);
  const nti = numericFromMatrix(state, ['nti']);
  const ldi = numericFromMatrix(state, ['ldi']);
  const regime = text(scalar(state, 'governance') ?? scalar(state, 'cognitive-runtime'), 'OBSERVED').toUpperCase();
  const opportunities = commercial?.opportunities ?? [];
  const clients = commercial?.clients ?? [];
  const proposals = commercial?.proposals ?? [];
  const pendingEvidence = state.predictions.data.evidenceRequests.length;
  const openCases = opportunities.length + state.governance.data.proposals.filter((row) => !['closed', 'executed', 'rejected'].includes(text(row.status).toLowerCase())).length;
  const degradedAgents = state.agents.data.agents.filter((agent) => agent.error || statusClass(text(agent.state.value ?? agent.availability)) === 'attention');

  const systemRows = useMemo(() => state.system.data.matrix.slice(0, 18), [state]);
  const worldRows = useMemo(() => [
    ...state.evidence.data.nodes.slice(0, 8).map((node) => ({ label: node.label, value: node.confidence ?? 0, state: node.epistemicClass })),
    ...state.amv.data.attractors.slice(0, 5).map((row, index) => ({ label: rowTitle(row, `Atractor ${index + 1}`), value: num(row.confidence ?? row.score, .45), state: 'attractor' })),
  ].slice(0, 10), [state]);

  function selectRow(row: RootRow, kind: string, index: number) {
    onSelect({
      kind,
      id: text(row.id ?? row.event_id ?? row.created_at, `${kind}-${index}`),
      title: rowTitle(row, `${kind} ${index + 1}`),
      source: text(row.source, 'ROOT'),
      observedAt: text(rowTime(row), '') || null,
      confidence: Number.isFinite(num(row.confidence, NaN)) ? num(row.confidence) : null,
      evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : [],
      warning: null,
      data: row,
    });
  }

  function runObservation() {
    onAction({
      id: `root-observation-${Date.now()}`,
      label: 'Actualizar observación y aprendizaje',
      effect: 'Ejecuta el ciclo disponible de observación, reportes y auditoría con datos persistidos.',
      target: 'WorldSpect + evidencia institucional',
      endpoint: '/api/root/operational/trigger-observation?job=all',
      method: 'POST',
    });
  }

  return (
    <main className="ros-root">
      <header className="ros-header">
        <strong>SFI</strong><i />
        <span>OBSERVATORIO <b>OPERACIONAL</b></span><i />
        <span>ΦSF <b>{Number.isFinite(phi) ? phi.toFixed(3) : '—'}</b></span><i />
        <span className={`ros-regime ${statusClass(regime)}`}>{regime}</span><i />
        <span>IHG <b>{Number.isFinite(ihg) ? ihg.toFixed(2) : '—'}</b></span>
        <span>NTI <b>{Number.isFinite(nti) ? nti.toFixed(2) : '—'}</b></span>
        <span>LDI <b>{Number.isFinite(ldi) ? ldi.toFixed(2) : '—'}</b></span>
        <div className="ros-header-right"><button type="button" onClick={onRefresh}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR'}</button><span>{clock}</span></div>
      </header>

      <aside className="ros-sidebar" aria-label="Módulos ROOT">
        {(['I', 'II', 'III'] as const).map((topo) => <div className="ros-side-group" key={topo}><small>{topo}</small>{MODULES.filter((module) => module.topo === topo).map((module) => <button key={module.id} type="button" className={activeModule === module.id ? 'active' : ''} onClick={() => setActiveModule(module.id)}><Icon glyph={module.glyph}/><span>{module.label}</span></button>)}</div>)}
      </aside>

      <section className="ros-observatory">
        {warning ? <div className="ros-warning">{warning}</div> : null}
        <div className="ros-zone ros-zone-a">
          <button className="ros-panel ros-panel-phi" type="button" onClick={() => setActiveModule('system')}>
            <span>ΦSF · RÉGIMEN</span><small>TOPO-II</small>
            <div className="ros-phi-core"><strong className={Number.isFinite(phi) && phi < .22 ? 'crit' : 'warn'}>{Number.isFinite(phi) ? phi.toFixed(3) : '—'}</strong><em>IHG·NTI / (1+LDI) + ξ</em><b>{regime}</b></div>
          </button>
          <button className="ros-panel ros-panel-field" type="button" onClick={() => setActiveModule('attention')}>
            <span>CAMPO DE ATENCIÓN</span><small>TOPO-I</small>
            <div className="ros-node-field">
              <i className="n1"/><i className="n2"/><i className="n3"/><i className="n4"/><i className="n5"/>
              <strong>{pendingEvidence}</strong><em>evidencias pendientes</em>
            </div>
          </button>
          <button className="ros-panel ros-panel-cases" type="button" onClick={() => setActiveModule('cases')}>
            <span>CASOS PROPUESTOS</span><small>TOPO-II</small>
            <div className="ros-count"><strong>{openCases}</strong><em>objetos abiertos</em><b>{proposals.length} propuestas comerciales</b></div>
          </button>
          <button className="ros-panel ros-panel-world" type="button" onClick={() => setActiveModule('world')}>
            <span>WORLD SPECTRUM</span><small>TOPO-III</small>
            <div className="ros-spectrum">{worldRows.slice(0, 7).map((row, index) => <i key={`${row.label}-${index}`} style={{ height: `${18 + Math.max(.08, Math.min(1, row.value)) * 70}%` }} title={row.label}/>)}</div>
          </button>
        </div>

        <div className="ros-zone ros-zone-b">
          <button className="ros-panel ros-panel-system" type="button" onClick={() => setActiveModule('system')}>
            <span>TENSIÓN LONGITUDINAL</span><small>TOPO-II</small>
            <svg viewBox="0 0 100 35" aria-hidden="true"><path d="M0 29 C10 17 17 25 26 18 S43 28 52 14 S68 20 78 8 S91 15 100 6"/></svg>
          </button>
          <button className="ros-panel ros-panel-attractors" type="button" onClick={() => setActiveModule('attractors')}>
            <span>ATRACTORES · EVIDENCIA</span><small>TOPO-II</small>
            <div className="ros-attractor-mini"><i/><i/><i/><i/><i/><strong>{state.amv.data.attractors.length}</strong></div>
          </button>
          <button className="ros-panel ros-panel-interested" type="button" onClick={() => setActiveModule('interested')}>
            <span>POSIBLES INTERESADOS</span><small>TOPO-II</small>
            <div className="ros-count"><strong>{clients.length}</strong><em>actores registrados</em><b>{opportunities.length} oportunidades</b></div>
          </button>
          <button className="ros-panel ros-panel-agents" type="button" onClick={() => setActiveModule('agents')}>
            <span>AGENTES</span><small>TOPO-I</small>
            <div className="ros-count"><strong>{state.agents.data.agents.length}</strong><em>registrados</em><b className={degradedAgents.length ? 'crit' : ''}>{degradedAgents.length} requieren atención</b></div>
          </button>
        </div>

        <div className="ros-zone ros-zone-c">
          <button className="ros-panel ros-panel-history" type="button" onClick={() => setActiveModule('history')}>
            <span>CRONOLOGÍA VIVA</span><small>TOPO-III</small>
            <div className="ros-timeline">{state.execution.data.recentActions.slice(0, 10).reverse().map((row, index) => <i key={text(row.id, String(index))} className={index > 6 ? 'hot' : ''}/>)}</div>
          </button>
          <button className="ros-panel ros-panel-log" type="button" onClick={() => setActiveModule('history')}>
            <span>BITÁCORA OPERACIONAL</span>
            <div className="ros-log-list">{state.execution.data.recentActions.slice(0, 5).map((row, index) => <p key={text(row.id, String(index))}><time>{time(rowTime(row)).slice(-8)}</time><b>{rowTitle(row, 'Acción')}</b></p>)}</div>
          </button>
          <button className="ros-panel ros-panel-manager" type="button" onClick={() => setActiveModule('attention')}>
            <span>PROJECT EXECUTION MANAGER</span>
            <div className="ros-manager-copy"><strong>{pendingEvidence + degradedAgents.length + openCases}</strong><p>condiciones requieren revisión</p><em>Casos · evidencia · agentes · superficies</em></div>
          </button>
        </div>
      </section>

      {activeModule ? (
        <div className="ros-module-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveModule(null); }}>
          <section className="ros-module-window" role="dialog" aria-modal="true" aria-label={MODULES.find((module) => module.id === activeModule)?.label}>
            <header><div><span>SFI · ROOT MODULE</span><h2>{MODULES.find((module) => module.id === activeModule)?.label}</h2></div><button type="button" onClick={() => setActiveModule(null)}>ESC · CERRAR</button></header>
            <div className="ros-module-body">
              {activeModule === 'attention' ? <AttentionModule state={state} openCases={openCases} pendingEvidence={pendingEvidence} degradedAgents={degradedAgents.length} runObservation={runObservation} openModule={setActiveModule}/> : null}
              {activeModule === 'system' ? <SystemModule rows={systemRows} /> : null}
              {activeModule === 'world' ? <WorldModule state={state} /> : null}
              {activeModule === 'cases' ? <RootRevenueWorkspace /> : null}
              {activeModule === 'attractors' ? <AttractorModule state={state} selectRow={selectRow} /> : null}
              {activeModule === 'interested' ? <InterestedModule commercial={commercial} error={commercialError} /> : null}
              {activeModule === 'studio' ? <SurfaceModule title="Studio" href="/studio" status={text(state.execution.data.capabilities.find((capability) => capability.id.includes('studio'))?.state, 'No determinado')} details="Objetos, reportes y capacidades de análisis disponibles desde la superficie Studio." /> : null}
              {activeModule === 'field' ? <SurfaceModule title="Field / Map" href="/field/map" status={text(state.system.data.matrix.find((item) => item.id.includes('field'))?.state.value, 'Requiere verificación')} details="Campo mundial, nodos geográficos, trayectorias y evidencia vinculada." /> : null}
              {activeModule === 'observatory' ? <SurfaceModule title="Observatory" href="/observatory" status="Disponible" details="Lectura pública del campo mundial y sus cambios persistidos." /> : null}
              {activeModule === 'library' ? <SurfaceModule title="Library" href="/library" status="Disponible" details="Publicaciones, metodología, archivos y memoria institucional." /> : null}
              {activeModule === 'agents' ? <AgentModule state={state} /> : null}
              {activeModule === 'history' ? <HistoryModule state={state} selectRow={selectRow} /> : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function AttentionModule({ state, openCases, pendingEvidence, degradedAgents, runObservation, openModule }: { state: RootSovereignState; openCases: number; pendingEvidence: number; degradedAgents: number; runObservation: () => void; openModule: (id: ModuleId) => void }) {
  const priorities = [
    { label: 'Casos nuevos propuestos', value: openCases, target: 'cases' as ModuleId, note: 'Selecciona los objetos que merecen metodología, propuesta o cierre.' },
    { label: 'Evidencia pendiente', value: pendingEvidence, target: 'attractors' as ModuleId, note: 'Los nodos urgentes deben recibir evidencia antes de convertirse en decisión.' },
    { label: 'Agentes a revisar', value: degradedAgents, target: 'agents' as ModuleId, note: 'Errores, bloqueos o estados degradados visibles desde el inventario real.' },
    { label: 'Advertencias de sistema', value: state.warnings.length, target: 'system' as ModuleId, note: 'Fuentes o lectores de ROOT que no entregaron un estado completo.' },
  ];
  return <div className="ros-liturgical-grid"><section className="ros-lit-panel"><span>I · NÁRTEX</span><h3>EL SISTEMA OBSERVA</h3><p>ROOT muestra primero lo que requiere atención y no obliga a recorrer pantallas para descubrirlo.</p><button type="button" onClick={runObservation}>ACTUALIZAR OBSERVACIÓN</button></section><section className="ros-lit-panel wide"><span>II · NAVE</span><h3>PENDIENTES ACTIVOS</h3><div className="ros-priority-list">{priorities.map((item) => <button type="button" key={item.label} onClick={() => openModule(item.target)}><strong>{item.value}</strong><div><b>{item.label}</b><p>{item.note}</p></div></button>)}</div></section></div>;
}

function SystemModule({ rows }: { rows: RootSovereignState['system']['data']['matrix'] }) {
  return <div className="ros-module-grid">{rows.map((item) => <article key={item.id}><span>{item.label}</span><strong className={statusClass(text(item.state.status))}>{text(item.state.value, item.state.status)}</strong><p>{item.state.explanation}</p><small>{item.state.source} · {time(item.state.observedAt)}</small></article>)}</div>;
}

function WorldModule({ state }: { state: RootSovereignState }) {
  const rows = state.evidence.data.nodes.slice(0, 24);
  return <div className="ros-world-grid">{rows.map((node) => <article key={node.id}><span>{node.epistemicClass}</span><h3>{node.label}</h3><p>{text(node.payload.public_summary ?? node.payload.summary ?? node.payload.description, 'Evidencia mundial sin resumen.')}</p><footer><b>{node.confidence === null ? '—' : `${Math.round(node.confidence * 100)}%`}</b><small>{time(node.observedAt)}</small></footer></article>)}</div>;
}

function AttractorModule({ state, selectRow }: { state: RootSovereignState; selectRow: (row: RootRow, kind: string, index: number) => void }) {
  const attractors = state.amv.data.attractors;
  const requests = state.predictions.data.evidenceRequests;
  return <div className="ros-attractor-field"><svg viewBox="0 0 100 62" aria-label="Campo de atractores y evidencia"><circle cx="50" cy="31" r="4" className="core"/>{attractors.slice(0, 18).map((row, index) => { const angle = (index / Math.max(1, attractors.length)) * Math.PI * 2; const x = 50 + Math.cos(angle) * (16 + (index % 3) * 5); const y = 31 + Math.sin(angle) * (13 + (index % 4) * 3); return <g key={text(row.id, String(index))} onClick={() => selectRow(row, 'atractor', index)}><circle cx={x} cy={y} r={1.6 + Math.min(2, num(row.confidence ?? row.score, .4) * 2)} className="attractor"/><text x={x + 2} y={y - 1}>{rowTitle(row, `A${index + 1}`).slice(0, 18)}</text></g>; })}{requests.slice(0, 18).map((row, index) => { const angle = (index / Math.max(1, requests.length)) * Math.PI * 2 + .25; const x = 50 + Math.cos(angle) * 28; const y = 31 + Math.sin(angle) * 23; return <g key={text(row.id, `e-${index}`)} onClick={() => selectRow(row, 'evidencia pendiente', index)}><rect x={x - 1.4} y={y - 1.4} width="2.8" height="2.8" className="evidence urgent"/><text x={x + 2} y={y - 1}>{rowTitle(row, `E${index + 1}`).slice(0, 18)}</text></g>; })}</svg><aside><span>GRAMÁTICA</span><p><i className="dot attractor"/> Atractor o estrategia persistida</p><p><i className="square urgent"/> Evidencia requerida o vencida</p><p><strong>{requests.length}</strong> solicitudes pendientes</p><p><strong>{attractors.length}</strong> atractores observados</p></aside></div>;
}

function InterestedModule({ commercial, error }: { commercial: CommercialWorkspace | null; error: string | null }) {
  if (error) return <div className="ros-empty">No fue posible leer la capa comercial: {error}</div>;
  const clients = commercial?.clients ?? [];
  const opportunities = commercial?.opportunities ?? [];
  const proposals = commercial?.proposals ?? [];
  const clientById = new Map(clients.map((client) => [String(client.id), client]));
  return <div className="ros-atlas"><nav>{['I · Nártex', 'II · Nave', 'III · Crucero', 'IV · Presbiterio', 'V · Santuario', 'VI · Ambulatorio'].map((phase, index) => <span key={phase} className={index === 0 ? 'active' : ''}><i/>{phase}</span>)}</nav><div className="ros-atlas-scroll"><section><span>I · NÁRTEX</span><h3>EL SISTEMA OBSERVA</h3><p>Actores y organizaciones detectados mediante evidencia y oportunidades persistidas.</p><div className="ros-altar"><b>{clients.length}</b><em>actores registrados</em></div></section><section><span>II · NAVE</span><h3>SEÑALES Y DOLORES</h3>{opportunities.slice(0, 8).map((row, index) => <article key={text(row.id, String(index))}><b>{text(clientById.get(String(row.client_id))?.name, rowTitle(row, 'Actor'))}</b><p>{text(row.problem_statement, 'Dolor no registrado')}</p></article>)}</section><section><span>III · CRUCERO</span><h3>VECTORES MAESTROS</h3><Metric label="Oportunidades" value={opportunities.length}/><Metric label="Propuestas" value={proposals.length}/><Metric label="Actores" value={clients.length}/><Metric label="Valor estimado" value={opportunities.reduce((sum, row) => sum + num(row.estimated_value), 0)} money/></section><section><span>IV · PRESBITERIO</span><h3>ESTRATEGIA PROPUESTA</h3>{opportunities.slice(0, 8).map((row, index) => <article key={text(row.id, String(index))}><b>{text(row.recommended_offer, 'Oferta pendiente')}</b><p>{text(row.next_action, 'Revisar evidencia y definir siguiente acción.')}</p></article>)}</section><section><span>V · SANTUARIO</span><h3>PROYECCIÓN</h3>{opportunities.slice(0, 8).map((row, index) => <article key={text(row.id, String(index))}><b>{Math.round(num(row.probability) * 100)}%</b><p>{text(clientById.get(String(row.client_id))?.name, 'Actor')} · {text(row.stage, 'identified')}</p></article>)}</section><section><span>VI · AMBULATORIO</span><h3>REGISTRO Y CONTACTO</h3>{proposals.slice(0, 8).map((row, index) => <article key={text(row.id, String(index))}><b>{text(row.proposal_number, 'Propuesta')}</b><p>{text(row.title)} · {text(row.status)}</p></article>)}<p className="ros-note">La vista no contiene chat. El contacto, el PDF y el envío se ejecutan desde acciones aprobadas del caso.</p></section></div></div>;
}

function Metric({ label, value, money = false }: { label: string; value: number; money?: boolean }) {
  const display = money ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value) : String(value);
  return <div className="ros-metric"><span>{label}</span><strong>{display}</strong><i style={{ width: `${Math.min(100, Math.max(4, money ? value / 1000 : value * 8))}%` }}/></div>;
}

function SurfaceModule({ title, href, status, details }: { title: string; href: string; status: string; details: string }) {
  return <div className="ros-surface-module"><span>SURFACE MODULE</span><h3>{title}</h3><strong className={statusClass(status)}>{status}</strong><p>{details}</p><Link href={href}>ABRIR SUPERFICIE COMPLETA →</Link></div>;
}

function AgentModule({ state }: { state: RootSovereignState }) {
  return <div className="ros-agent-grid">{state.agents.data.agents.map((agent) => <article key={agent.id}><span>{agent.provider ?? 'provider n/a'}</span><h3>{agent.role || agent.id}</h3><strong className={statusClass(text(agent.state.value ?? agent.availability))}>{text(agent.state.value ?? agent.availability)}</strong><p>{agent.error ?? agent.lastResult ?? 'Sin resultado registrado.'}</p><small>{agent.lastRun ? time(agent.lastRun) : 'Nunca ejecutado'}</small></article>)}</div>;
}

function HistoryModule({ state, selectRow }: { state: RootSovereignState; selectRow: (row: RootRow, kind: string, index: number) => void }) {
  const rows = [...state.execution.data.recentActions, ...state.governance.data.audits, ...state.predictions.data.outcomes].sort((a, b) => String(rowTime(b) ?? '').localeCompare(String(rowTime(a) ?? ''))).slice(0, 80);
  return <div className="ros-history-list">{rows.map((row, index) => <button type="button" key={text(row.id, String(index))} onClick={() => selectRow(row, 'historia', index)}><time>{time(rowTime(row))}</time><b>{rowTitle(row, `Evento ${index + 1}`)}</b><p>{rowSummary(row)}</p></button>)}</div>;
}
