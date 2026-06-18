'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Activity, Beaker, BookOpen, Brain, FileText, Gauge, Layers3, Radio, Sparkles } from 'lucide-react';
import SfiLabClient from '@/components/scorefriction/SfiLabClient';

type Row = Record<string, unknown>;

const SCOPES = ['World', 'Culture', 'Music', 'Writing', 'Cinema', 'Institution', 'Personal', 'Project'];
const DRAWERS = ['SFI-LAB / Campaign Generator', 'Evaluador', 'Media Render', 'Evidence Ledger', 'Self Observability', 'Technical State'] as const;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function scalar(value: unknown, fallback = 'sin datos suficientes') {
  if (value === null || typeof value === 'undefined' || value === '') return fallback;
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

function n(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function severityTone(severity: unknown) {
  const text = String(severity ?? '').toLowerCase();
  if (text === 'critical') return 'critical';
  if (text === 'warning') return 'warning';
  if (text === 'watch') return 'watch';
  return 'none';
}

function nodeLabel(node: Row, index: number) {
  return scalar(node.label ?? node.name ?? node.vector ?? node.domain ?? node.id, `nodo ${index + 1}`);
}

export function ScoreFrictionFieldExperience() {
  const [caseId] = useState('SFI-OP-LOCAL');
  const [scope, setScope] = useState('Culture');
  const [cycle, setCycle] = useState<Row | null>(null);
  const [graph, setGraph] = useState<Row | null>(null);
  const [thoughts, setThoughts] = useState<Row[]>([]);
  const [logbook, setLogbook] = useState<Row[]>([]);
  const [self, setSelf] = useState<Row | null>(null);
  const [drawer, setDrawer] = useState<(typeof DRAWERS)[number]>('SFI-LAB / Campaign Generator');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mediaResult, setMediaResult] = useState<Row | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [cycleResponse, graphResponse, thoughtsResponse, logbookResponse, selfResponse] = await Promise.all([
        fetch(`/api/scorefriction/operational-cycle?case_id=${encodeURIComponent(caseId)}&scope=${scope.toLowerCase()}`, { cache: 'no-store' }).then((res) => res.json()).catch((error) => ({ ok: false, error: String(error) })),
        fetch(`/api/root/neural-graph/live?case_id=${encodeURIComponent(caseId)}`, { cache: 'no-store' }).then((res) => res.json()).catch((error) => ({ ok: false, error: String(error), nodes: [] })),
        fetch(`/api/amv/thoughts/live?case_id=${encodeURIComponent(caseId)}`, { cache: 'no-store' }).then((res) => res.json()).catch(() => ({ thoughts: [] })),
        fetch(`/api/logbook/visible?role=system&case_id=${encodeURIComponent(caseId)}`, { cache: 'no-store' }).then((res) => res.json()).catch(() => ({ entries: [] })),
        fetch('/api/root/self-observability', { cache: 'no-store' }).then((res) => res.json()).catch((error) => ({ ok: false, system_health: 'critical', error: String(error) })),
      ]);
      if (cancelled) return;
      setCycle(record(cycleResponse.state));
      setGraph(graphResponse);
      setThoughts(rows(thoughtsResponse.thoughts));
      setLogbook(rows(logbookResponse.entries));
      setSelf(selfResponse);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [caseId, scope]);

  const regime = record(cycle?.regime);
  const direction = record(cycle?.direction);
  const degradation = record(cycle?.degradation);
  const alert = record(cycle?.alert);
  const technical = record(cycle?.technical_state);
  const analysis = record(cycle?.operational_analysis);
  const world = record(analysis.world);
  const filtered = record(analysis.filtered_vector);
  const mihm = record(analysis.mihm_values);
  const psi = record(analysis.psi_values);
  const score = record(analysis.scorefriction_values);
  const experiment = record(rows(cycle?.recommended_experiments)[0] ?? rows(analysis.recommended_experiments)[0]);
  const severity = severityTone(alert.severity);
  const graphNodes = rows(graph?.nodes);
  const signalNodes = [
    ...rows(cycle?.weak_signals).map((node, index) => ({ ...node, type: 'senal', id: `weak-${index}` })),
    ...rows(cycle?.persistent_signals).map((node, index) => ({ ...node, type: 'persistencia', id: `persistent-${index}` })),
    ...graphNodes.slice(0, 10),
  ];
  const fieldNodes = signalNodes.length ? signalNodes : graphNodes;
  const fieldStyle = useMemo(() => ({
    '--degradation': String(Math.min(1, Math.max(0, Number(degradation.level ?? 0)))),
    '--alert-alpha': severity === 'critical' ? '0.28' : severity === 'warning' ? '0.18' : severity === 'watch' ? '0.1' : '0.04',
  } as CSSProperties), [degradation.level, severity]);

  async function runMediaRender() {
    const result = await fetch('/api/scorefriction/media/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ case_id: caseId, prompt: scalar(experiment.action, 'ScoreFriction minimal action'), assets: ['text', 'image'] }),
    }).then((res) => res.json()).catch((error) => ({ ok: false, status: 'render_failed', error: String(error) }));
    setMediaResult(result);
  }

  async function askAmv() {
    const response = await fetch('/api/scorefriction/amv/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, case_id: caseId, objective: cycle?.objective, scope: scope.toLowerCase(), evaluated_object: scalar(experiment.hypothesis, '') }),
    }).then((res) => res.json());
    setAnswer(String(response.answer ?? 'sin respuesta'));
  }

  return (
    <main className={`sf-field sf-${severity}`} style={fieldStyle}>
      <header className="sf-header">
        <div className="sf-brand">ScoreFriction</div>
        <div><span>OBJETIVO</span><b>{scalar(cycle?.objective, 'no declarado')}</b></div>
        <div><span>REGIMEN</span><b>{scalar(regime.vector ?? regime.world)}</b></div>
        <div><span>DIRECCION</span><b>{scalar(direction.current)}</b></div>
        <div><span>DEGRADACION</span><b>{scalar(degradation.level)}</b></div>
        <div className={`sf-alert sf-alert-${severity}`}><span>EXPERIMENTO</span><b>{scalar(experiment.status, 'watch_only')}</b></div>
      </header>

      <aside className="sf-left-rail" aria-label="Filtros vectoriales">
        {SCOPES.map((item) => (
          <button key={item} type="button" className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{item}</button>
        ))}
      </aside>

      <section className="sf-center" aria-label="Neural Field vivo">
        <div className="sf-field-bg" />
        <div className="sf-orbit sf-orbit-a" />
        <div className="sf-orbit sf-orbit-b" />
        <div className="sf-field-label">Neural Field / Attractor Map</div>
        <div className="sf-core">
          <div className="sf-core-pulse" />
          <h1>{scalar(record(analysis.object_world_fit).verdict ?? direction.projected ?? direction.current, 'sin direccion suficiente')}</h1>
          <p>{scalar(experiment.plain_language ?? experiment.action, 'Esperando evidencia para proponer experimento verificable.')}</p>
        </div>
        {fieldNodes.length ? fieldNodes.slice(0, 18).map((node, index) => {
          const angle = (index / Math.max(1, fieldNodes.length)) * Math.PI * 2;
          const radius = 32 + (index % 4) * 10;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius * 0.72;
          return (
            <div key={`${scalar(node.id)}-${index}`} className={`sf-node sf-node-${String(node.type ?? 'event').replace(/[^a-z0-9_-]/gi, '').toLowerCase()}`} style={{ left: `${x}%`, top: `${y}%` }}>
              <span>{String(node.type ?? 'evento')}</span>
              <b>{nodeLabel(node, index)}</b>
            </div>
          );
        }) : (
          <div className="sf-empty-field">sin datos suficientes para graph vivo</div>
        )}
      </section>

      <aside className="sf-right-panel">
        <div className="sf-panel-title"><Brain size={16} /> AMV operativo</div>
        <div className="sf-thought">
          {scalar(experiment.plain_language ?? thoughts[0]?.thought, 'No hagas campaÃ±a todavÃ­a. Guarda evidencia y observa el siguiente cambio real del vector.')}
        </div>
        <div className="sf-action-box">
          <span>Hoy en el mundo</span>
          <p>{scalar(world.summary)}</p>
        </div>
        <div className="sf-action-box">
          <span>Vector seleccionado</span>
          <p>{scalar(filtered.summary)}</p>
        </div>
        <div className="sf-action-box">
          <span>Valores</span>
          <p>MIHM coherencia {scalar(mihm.coherence)} Â· PSI persistencia {scalar(psi.persistence)} Â· oportunidad {scalar(score.opportunity)}</p>
        </div>
        <div className="sf-action-box">
          <span>Accion verificable</span>
          <p>{scalar(experiment.action)}</p>
        </div>
        <div className="sf-action-box">
          <span>Condicion</span>
          <p>{scalar(experiment.success_condition)}</p>
        </div>
        <div className="sf-ask">
          <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="pregunta: Â¿quÃ© hago?, Â¿quÃ© verifico?" />
          <button onClick={() => void askAmv()}>Preguntar</button>
          {answer ? <p>{answer}</p> : null}
        </div>
        <div className="sf-drawer-buttons">
          {DRAWERS.map((item) => (
            <button key={item} type="button" onClick={() => { setDrawer(item); setDrawerOpen(true); }}>
              {item === 'SFI-LAB / Campaign Generator' ? <Beaker size={14} /> : item === 'Media Render' ? <Radio size={14} /> : item === 'Evidence Ledger' ? <BookOpen size={14} /> : item === 'Technical State' ? <Gauge size={14} /> : item === 'Self Observability' ? <Activity size={14} /> : <FileText size={14} />}
              {item}
            </button>
          ))}
        </div>
      </aside>

      <footer className="sf-timeline">
        <div className="sf-timeline-label">Bitacora / timeline real</div>
        <div className="sf-timeline-items">
          {logbook.length ? logbook.slice(0, 8).map((entry) => (
            <article key={scalar(entry.id)}>
              <span>{scalar(entry.created_at, '')}</span>
              <b>{scalar(entry.title ?? entry.event_type)}</b>
              <p>{scalar(entry.summary, '')}</p>
            </article>
          )) : <article><b>sin entradas visibles</b><p>La bitacora aparecera cuando exista analisis, evidencia o aprendizaje registrado.</p></article>}
        </div>
      </footer>

      {drawerOpen ? (
        <div className="sf-drawer">
          <div className="sf-drawer-header">
            <div><Layers3 size={16} /> {drawer}</div>
            <button type="button" onClick={() => setDrawerOpen(false)}>Cerrar</button>
          </div>
          <div className="sf-drawer-body">
            {drawer === 'SFI-LAB / Campaign Generator' ? <SfiLabClient embedded /> : null}
            {drawer === 'Evaluador' ? <pre>{JSON.stringify({ world, filtered, mihm, psi, score, experiment }, null, 2)}</pre> : null}
            {drawer === 'Media Render' ? (
              <div>
                <button type="button" className="sf-primary" onClick={() => void runMediaRender()}><Sparkles size={14} /> Ejecutar Media Render</button>
                <pre>{JSON.stringify(mediaResult ?? { status: 'sin ejecucion' }, null, 2)}</pre>
              </div>
            ) : null}
            {drawer === 'Evidence Ledger' ? <pre>{JSON.stringify({ evidence: rows(cycle?.evidence), logbook }, null, 2)}</pre> : null}
            {drawer === 'Self Observability' ? <pre>{JSON.stringify(self, null, 2)}</pre> : null}
            {drawer === 'Technical State' ? <pre>{JSON.stringify({ technical_state: technical, supabase_degraded_note: technical.supabase_ok === false ? 'Supabase no esta operativo o presenta SELF_SIGNED_CERT_IN_CHAIN. Configurar NODE_EXTRA_CA_CERTS o certificado corporativo; no usar NODE_TLS_REJECT_UNAUTHORIZED=0 como solucion permanente.' : null }, null, 2)}</pre> : null}
          </div>
        </div>
      ) : null}
      <style jsx>{`
        .sf-field { --gold: #d8b64a; --paper: #e6dcc8; --muted: #8a8172; --line: rgba(216,182,74,.16); position: relative; min-height: 100vh; overflow: hidden; background: radial-gradient(circle at 50% 48%, rgba(216,182,74,calc(.08 + var(--alert-alpha))) 0, transparent 28%), radial-gradient(circle at 50% 50%, rgba(140,34,34,calc(var(--degradation) * .16)) 0, transparent 52%), #040403; color: var(--paper); }
        .sf-header { position: fixed; inset: 0 0 auto 0; z-index: 30; display: grid; grid-template-columns: 180px repeat(5,minmax(120px,1fr)); gap: 1px; border-bottom: 1px solid var(--line); background: rgba(4,4,3,.82); backdrop-filter: blur(18px); font-family: monospace; }
        .sf-header>div { min-height: 58px; padding: 12px 14px; border-left: 1px solid var(--line); }
        .sf-brand { color: var(--gold); text-transform: uppercase; letter-spacing: .22em; font-size: 12px; }
        .sf-header span { display: block; color: var(--muted); font-size: 9px; letter-spacing: .18em; }
        .sf-header b { display: block; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 500; }
        .sf-left-rail { position: fixed; z-index: 25; top: 88px; bottom: 150px; left: 18px; display: flex; flex-direction: column; gap: 8px; }
        .sf-left-rail button { width: 118px; border: 1px solid var(--line); background: rgba(8,7,6,.72); padding: 9px 10px; color: var(--muted); font: 10px monospace; text-align: left; text-transform: uppercase; letter-spacing: .13em; }
        .sf-left-rail button.active { border-color: rgba(216,182,74,.7); background: rgba(216,182,74,.12); color: var(--paper); }
        .sf-center { position: absolute; inset: 58px 390px 148px 150px; overflow: hidden; }
        .sf-field-bg, .sf-orbit { position: absolute; inset: 10%; border: 1px solid rgba(216,182,74,.12); border-radius: 999px; }
        .sf-orbit-a { inset: 18%; transform: rotate(-8deg); }
        .sf-orbit-b { inset: 30%; transform: rotate(16deg); }
        .sf-field-label { position: absolute; left: 22px; top: 22px; color: var(--gold); font: 10px monospace; letter-spacing: .18em; text-transform: uppercase; }
        .sf-core { position: absolute; left: 50%; top: 50%; width: min(520px,60vw); transform: translate(-50%,-50%); text-align: center; }
        .sf-core-pulse { width: 96px; height: 96px; margin: 0 auto 20px; border-radius: 999px; background: rgba(216,182,74,.16); box-shadow: 0 0 90px rgba(216,182,74,.22); }
        .sf-core h1 { margin: 0; font-size: clamp(28px,5vw,76px); font-weight: 300; letter-spacing: -.07em; }
        .sf-core p { margin: 18px auto 0; max-width: 680px; color: #a69b88; line-height: 1.6; font-size: 14px; }
        .sf-node { position: absolute; transform: translate(-50%,-50%); max-width: 150px; border: 1px solid rgba(216,182,74,.22); background: rgba(0,0,0,.72); padding: 8px 10px; font: 10px monospace; }
        .sf-node span { display:block; color: var(--muted); text-transform: uppercase; font-size: 8px; }
        .sf-node b { color: var(--paper); font-weight: 500; }
        .sf-empty-field { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); color: var(--muted); font: 12px monospace; }
        .sf-right-panel { position: fixed; z-index: 25; right: 18px; top: 82px; bottom: 150px; width: 350px; overflow: auto; border: 1px solid var(--line); background: rgba(8,7,6,.86); padding: 16px; backdrop-filter: blur(16px); }
        .sf-panel-title { display:flex; gap:8px; align-items:center; color:var(--gold); font: 11px monospace; letter-spacing:.16em; text-transform:uppercase; }
        .sf-thought, .sf-action-box { margin-top: 13px; border: 1px solid rgba(216,182,74,.14); background: rgba(0,0,0,.35); padding: 12px; color:#c9bea8; font: 12px monospace; line-height: 1.5; }
        .sf-action-box span { display:block; color:var(--muted); font-size:9px; text-transform:uppercase; letter-spacing:.14em; margin-bottom:6px; }
        .sf-action-box p { margin:0; }
        .sf-ask { margin-top:13px; display:grid; gap:8px; }
        .sf-ask input { border:1px solid rgba(216,182,74,.18); background:#050504; color:var(--paper); padding:9px; font:11px monospace; }
        .sf-ask button, .sf-primary { border:1px solid rgba(216,182,74,.38); background:rgba(216,182,74,.1); color:var(--gold); padding:9px; font:10px monospace; text-transform:uppercase; }
        .sf-ask p { margin:0; border:1px solid rgba(216,182,74,.14); padding:10px; font:11px monospace; color:#d8d0bd; }
        .sf-drawer-buttons { display:grid; gap:8px; margin-top:14px; }
        .sf-drawer-buttons button { display:flex; gap:8px; align-items:center; border:1px solid rgba(216,182,74,.14); background:#050504; color:#9b927f; padding:10px; font:10px monospace; text-align:left; }
        .sf-timeline { position:fixed; z-index:26; left:18px; right:18px; bottom:18px; height:112px; border:1px solid var(--line); background:rgba(8,7,6,.86); padding:12px; display:grid; grid-template-columns:150px 1fr; gap:12px; backdrop-filter: blur(16px); }
        .sf-timeline-label { color:var(--gold); font:9px monospace; letter-spacing:.16em; text-transform:uppercase; }
        .sf-timeline-items { display:flex; gap:10px; overflow:auto; }
        .sf-timeline article { min-width:240px; border-left:1px solid rgba(216,182,74,.22); padding-left:10px; font:10px monospace; color:#9b927f; }
        .sf-timeline b { display:block; color:#d8d0bd; margin:3px 0; }
        .sf-drawer { position:fixed; z-index:60; inset:76px 70px 40px 70px; border:1px solid rgba(216,182,74,.28); background:rgba(5,5,4,.96); backdrop-filter: blur(22px); box-shadow:0 30px 90px rgba(0,0,0,.55); }
        .sf-drawer-header { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(216,182,74,.18); padding:14px 18px; color:var(--gold); font:11px monospace; text-transform:uppercase; letter-spacing:.14em; }
        .sf-drawer-header div { display:flex; gap:8px; align-items:center; }
        .sf-drawer-header button { border:1px solid rgba(216,182,74,.22); background:transparent; color:var(--paper); padding:7px 10px; }
        .sf-drawer-body { height:calc(100% - 52px); overflow:auto; padding:18px; }
        .sf-drawer pre { white-space:pre-wrap; color:#b8ad99; font:11px monospace; }
        @media(max-width: 1100px){ .sf-header{grid-template-columns:1fr 1fr}.sf-left-rail{position:static; padding-top:70px; flex-direction:row; overflow:auto}.sf-center{inset:140px 16px 420px 16px}.sf-right-panel{left:16px; right:16px; top:auto; bottom:150px; width:auto; height:250px}.sf-timeline{height:116px}.sf-drawer{inset:40px 16px;} }
      `}</style>
    </main>
  );
}