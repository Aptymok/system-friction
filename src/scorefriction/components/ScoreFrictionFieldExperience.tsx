'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Activity, AlertTriangle, Beaker, BookOpen, Brain, FileText, Gauge, Layers3, Radio, Sparkles } from 'lucide-react';
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
  const severity = severityTone(alert.severity);
  const graphNodes = rows(graph?.nodes);
  const signalNodes = [
    ...rows(cycle?.weak_signals).map((node, index) => ({ ...node, type: 'senal', id: `weak-${index}` })),
    ...rows(cycle?.persistent_signals).map((node, index) => ({ ...node, type: 'persistencia', id: `persistent-${index}` })),
    ...rows(cycle?.attractors).map((node, index) => ({ ...node, type: 'atractor', id: `attractor-${index}` })),
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
      body: JSON.stringify({ case_id: caseId, prompt: scalar(cycle?.minimal_action, 'ScoreFriction minimal action'), assets: ['text', 'image'] }),
    }).then((res) => res.json()).catch((error) => ({ ok: false, status: 'render_failed', error: String(error) }));
    setMediaResult(result);
  }

  return (
    <main className={`sf-field sf-${severity}`} style={fieldStyle}>
      <header className="sf-header">
        <div className="sf-brand">ScoreFriction</div>
        <div><span>OBJETIVO</span><b>{scalar(cycle?.objective, 'no declarado')}</b></div>
        <div><span>REGIMEN</span><b>{scalar(regime.vector ?? regime.world)}</b></div>
        <div><span>DIRECCION</span><b>{scalar(direction.current)}</b></div>
        <div><span>DEGRADACION</span><b>{scalar(degradation.level)}</b></div>
        <div className={`sf-alert sf-alert-${severity}`}><span>ALERTA</span><b>{scalar(alert.severity, 'none')}</b></div>
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
          <h1>{scalar(direction.projected ?? direction.current, 'sin direccion suficiente')}</h1>
          <p>{scalar(alert.action_required ?? cycle?.minimal_action, 'Esperando evidencia para proponer accion minima.')}</p>
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
        <div className="sf-panel-title"><Brain size={16} /> AMV Thoughts</div>
        <div className="sf-thought">
          {thoughts[0] ? scalar(thoughts[0].thought) : severity === 'critical' ? 'Veo degradacion alta. Necesito evidencia antes/despues para confirmar direccion.' : 'Esta senal aun no basta. Necesito mas evidencia.'}
        </div>
        <div className="sf-action-box">
          <span>Accion minima</span>
          <p>{scalar(alert.action_required ?? record(cycle?.minimal_action).action, 'Abrir observacion y registrar evidencia puntual.')}</p>
        </div>
        <div className="sf-action-box">
          <span>Evidencia requerida</span>
          <p>{scalar(alert.evidence_required, 'Antes/despues, fuente, outcome y ventana de verificacion.')}</p>
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
            {drawer === 'Evaluador' ? <pre>{JSON.stringify({ contrast: cycle?.contrast, analysis_modes: ['MIHM', 'PSI', 'WSV', 'SCOREFRICTION', 'AMV'] }, null, 2)}</pre> : null}
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
        .sf-field {
          --gold: #d8b64a;
          --paper: #e6dcc8;
          --muted: #8a8172;
          --line: rgba(216, 182, 74, 0.16);
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 48%, rgba(216, 182, 74, calc(0.08 + var(--alert-alpha))) 0, transparent 28%),
            radial-gradient(circle at 50% 50%, rgba(140, 34, 34, calc(var(--degradation) * 0.16)) 0, transparent 52%),
            #040403;
          color: var(--paper);
        }
        .sf-header {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 30;
          display: grid;
          grid-template-columns: 180px repeat(5, minmax(120px, 1fr));
          gap: 1px;
          border-bottom: 1px solid var(--line);
          background: rgba(4, 4, 3, 0.82);
          backdrop-filter: blur(18px);
          font-family: var(--font-mono), monospace;
        }
        .sf-header > div {
          min-height: 58px;
          padding: 12px 14px;
          border-left: 1px solid rgba(216, 182, 74, 0.08);
        }
        .sf-brand {
          color: var(--gold);
          text-transform: uppercase;
          letter-spacing: 0.24em;
          font-size: 11px;
          font-weight: 700;
        }
        .sf-header span {
          display: block;
          color: rgba(230, 220, 200, 0.38);
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sf-header b {
          display: block;
          margin-top: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--paper);
          font-size: 12px;
          font-weight: 500;
        }
        .sf-alert-critical b { color: #ff7568; }
        .sf-alert-warning b { color: #ffc266; }
        .sf-alert-watch b { color: #d8b64a; }
        .sf-left-rail {
          position: fixed;
          left: 18px;
          top: 92px;
          bottom: 160px;
          z-index: 20;
          display: flex;
          width: 132px;
          flex-direction: column;
          gap: 8px;
        }
        .sf-left-rail button,
        .sf-drawer-buttons button,
        .sf-drawer-header button,
        .sf-primary {
          border: 1px solid rgba(216, 182, 74, 0.18);
          background: rgba(8, 7, 6, 0.62);
          color: rgba(230, 220, 200, 0.62);
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .sf-left-rail button {
          padding: 11px 12px;
          text-align: left;
        }
        .sf-left-rail button.active {
          border-color: rgba(216, 182, 74, 0.62);
          background: rgba(216, 182, 74, 0.11);
          color: var(--gold);
        }
        .sf-center {
          position: absolute;
          inset: 58px 360px 134px 160px;
          overflow: hidden;
        }
        .sf-field-bg {
          position: absolute;
          inset: 4%;
          background-image:
            linear-gradient(rgba(216, 182, 74, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(216, 182, 74, 0.035) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(circle, black 0 58%, transparent 78%);
        }
        .sf-orbit {
          position: absolute;
          left: 50%;
          top: 50%;
          border: 1px solid rgba(216, 182, 74, 0.18);
          border-radius: 50%;
          transform: translate(-50%, -50%) rotate(-8deg);
        }
        .sf-orbit-a {
          width: min(70vw, 860px);
          height: min(45vw, 520px);
          box-shadow: 0 0 90px rgba(216, 182, 74, 0.06);
        }
        .sf-orbit-b {
          width: min(48vw, 620px);
          height: min(31vw, 360px);
          transform: translate(-50%, -50%) rotate(18deg);
        }
        .sf-core {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 5;
          width: min(430px, 44vw);
          transform: translate(-50%, -50%);
          text-align: center;
        }
        .sf-field-label {
          position: absolute;
          left: 50%;
          top: 6%;
          z-index: 6;
          transform: translateX(-50%);
          color: rgba(216, 182, 74, 0.82);
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .sf-core-pulse {
          margin: 0 auto 18px;
          width: 84px;
          height: 84px;
          border: 1px solid rgba(216, 182, 74, 0.54);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(216, 182, 74, 0.24), transparent 64%);
          box-shadow: 0 0 70px rgba(216, 182, 74, calc(0.16 + var(--alert-alpha)));
        }
        .sf-core h1 {
          margin: 0;
          color: #fff7df;
          font-size: clamp(28px, 4vw, 58px);
          font-weight: 600;
          letter-spacing: 0;
          line-height: 1.02;
        }
        .sf-core p {
          margin: 16px auto 0;
          max-width: 460px;
          color: rgba(230, 220, 200, 0.66);
          font-size: 14px;
          line-height: 1.7;
        }
        .sf-node {
          position: absolute;
          z-index: 7;
          max-width: 170px;
          transform: translate(-50%, -50%);
          border-left: 1px solid rgba(216, 182, 74, 0.38);
          background: rgba(4, 4, 3, 0.72);
          padding: 8px 10px;
          backdrop-filter: blur(12px);
        }
        .sf-node span {
          display: block;
          color: rgba(216, 182, 74, 0.62);
          font-family: var(--font-mono), monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .sf-node b {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: rgba(230, 220, 200, 0.82);
          font-size: 11px;
          font-weight: 500;
        }
        .sf-empty-field {
          position: absolute;
          left: 50%;
          top: 68%;
          transform: translateX(-50%);
          color: rgba(230, 220, 200, 0.36);
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sf-right-panel {
          position: fixed;
          right: 18px;
          top: 92px;
          bottom: 160px;
          z-index: 20;
          width: 320px;
          border: 1px solid rgba(216, 182, 74, 0.16);
          background: rgba(8, 7, 6, 0.72);
          padding: 16px;
          backdrop-filter: blur(18px);
        }
        .sf-panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--gold);
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sf-thought {
          margin-top: 18px;
          color: #fff1d0;
          font-size: 20px;
          line-height: 1.35;
        }
        .sf-action-box {
          margin-top: 18px;
          border-top: 1px solid rgba(216, 182, 74, 0.12);
          padding-top: 14px;
        }
        .sf-action-box span {
          color: rgba(216, 182, 74, 0.7);
          font-family: var(--font-mono), monospace;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sf-action-box p {
          margin: 8px 0 0;
          color: rgba(230, 220, 200, 0.72);
          font-size: 13px;
          line-height: 1.6;
        }
        .sf-drawer-buttons {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 16px;
          display: grid;
          gap: 8px;
        }
        .sf-drawer-buttons button,
        .sf-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 11px;
          text-align: left;
        }
        .sf-timeline {
          position: fixed;
          left: 18px;
          right: 18px;
          bottom: 18px;
          z-index: 22;
          display: grid;
          grid-template-columns: 170px minmax(0, 1fr);
          gap: 14px;
          border: 1px solid rgba(216, 182, 74, 0.14);
          background: rgba(5, 5, 4, 0.78);
          padding: 12px;
          backdrop-filter: blur(18px);
        }
        .sf-timeline-label {
          color: var(--gold);
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sf-timeline-items {
          display: flex;
          gap: 10px;
          overflow-x: auto;
        }
        .sf-timeline article {
          min-width: 260px;
          border-left: 1px solid rgba(216, 182, 74, 0.18);
          padding-left: 10px;
        }
        .sf-timeline span {
          color: rgba(230, 220, 200, 0.34);
          font-family: var(--font-mono), monospace;
          font-size: 8px;
        }
        .sf-timeline b {
          display: block;
          margin-top: 4px;
          color: rgba(230, 220, 200, 0.82);
          font-size: 12px;
        }
        .sf-timeline p {
          margin: 4px 0 0;
          color: rgba(230, 220, 200, 0.52);
          font-size: 11px;
          line-height: 1.4;
        }
        .sf-drawer {
          position: fixed;
          inset: 76px 40px 40px 170px;
          z-index: 60;
          border: 1px solid rgba(216, 182, 74, 0.22);
          background: rgba(3, 3, 2, 0.96);
          box-shadow: 0 30px 160px rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(22px);
        }
        .sf-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(216, 182, 74, 0.14);
          padding: 14px 16px;
          color: var(--gold);
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sf-drawer-header div {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sf-drawer-header button {
          padding: 8px 12px;
        }
        .sf-drawer-body {
          height: calc(100% - 54px);
          overflow: auto;
          padding: 18px;
        }
        .sf-drawer-body pre {
          white-space: pre-wrap;
          border: 1px solid rgba(216, 182, 74, 0.14);
          background: rgba(0, 0, 0, 0.34);
          padding: 14px;
          color: rgba(230, 220, 200, 0.72);
          font-size: 12px;
          line-height: 1.6;
        }
        .sf-primary {
          margin-bottom: 12px;
          color: var(--gold);
        }
        @media (max-width: 980px) {
          .sf-header {
            grid-template-columns: 1fr 1fr;
            position: relative;
          }
          .sf-center {
            inset: 220px 16px 360px 16px;
          }
          .sf-left-rail {
            top: 154px;
            right: 16px;
            bottom: auto;
            left: 16px;
            width: auto;
            flex-direction: row;
            overflow-x: auto;
          }
          .sf-right-panel {
            top: auto;
            right: 16px;
            bottom: 160px;
            left: 16px;
            width: auto;
            height: 190px;
          }
          .sf-drawer-buttons {
            position: static;
            margin-top: 12px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sf-timeline {
            grid-template-columns: 1fr;
          }
          .sf-drawer {
            inset: 30px 12px;
          }
        }
      `}</style>
    </main>
  );
}
