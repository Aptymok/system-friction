'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { RootReportCategory, RootReportHealth, RootReportInbox, RootReportInboxItem } from '@/lib/reports/rootReportInbox';

const CATEGORY_LABEL: Record<RootReportCategory | 'all', string> = {
  all: 'TODOS',
  world: 'MUNDO',
  internal: 'INTERNO',
  prospects: 'PROSPECTOS',
  attractor: 'ATRACTOR',
  evidence: 'EVIDENCIA',
  drafts: 'BORRADORES',
  other: 'OTROS',
};

function when(value: string | null) {
  if (!value) return 'SIN FECHA';
  const date = new Date(value);
  return Number.isFinite(date.valueOf())
    ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : value;
}
function searchable(item: RootReportInboxItem) {
  return [
    item.title,
    item.body,
    item.category,
    item.cadence,
    item.reportType,
    item.scheduleKey ?? '',
    item.status,
    item.provider ?? '',
    item.evidence.join(' '),
    item.warnings.join(' '),
    JSON.stringify(item.metadata),
  ].join(' ').toLowerCase();
}
function tone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes('current') || normalized.includes('ready') || normalized.includes('observed') || normalized.includes('completed')) return 'ok';
  if (normalized.includes('blocked') || normalized.includes('failed') || normalized.includes('missing')) return 'bad';
  return 'warn';
}

export function RootReportsConsole({ initialInbox, initialHealth, actorLabel }: {
  initialInbox: RootReportInbox;
  initialHealth: RootReportHealth;
  actorLabel: string;
}) {
  const [inbox, setInbox] = useState(initialInbox);
  const [health, setHealth] = useState(initialHealth);
  const [selectedId, setSelectedId] = useState<string | null>(() => initialInbox.items[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<RootReportCategory | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inbox.items.filter((item) => (category === 'all' || item.category === category) && (!q || searchable(item).includes(q)));
  }, [inbox.items, category, query]);

  const selected = useMemo(() => {
    return filtered.find((item) => item.id === selectedId)
      ?? inbox.items.find((item) => item.id === selectedId)
      ?? filtered[0]
      ?? null;
  }, [filtered, inbox.items, selectedId]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch('/api/root/reports', { credentials: 'include', cache: 'no-store' });
      const body = await response.json().catch(() => null) as { ok?: boolean; inbox?: RootReportInbox; health?: RootReportHealth; error?: string; details?: string } | null;
      if (!response.ok || !body?.ok || !body.inbox || !body.health) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setInbox(body.inbox);
      setHealth(body.health);
      setSelectedId((current) => current && body.inbox?.items.some((item) => item.id === current) ? current : body.inbox?.items[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar los reportes.');
    } finally {
      setRefreshing(false);
    }
  }

  return <main className="rr-root">
    <header className="rr-header">
      <div>
        <span>SFI · ROOT · REPORT INBOX</span>
        <h1>Reportes generados por SFI</h1>
        <p>Esta superficie no te pide una pregunta para fabricar una lectura. Muestra reportes ya producidos por agentes, ciclos de continuidad y Prospect Radar. El único texto que escribes aquí es para <strong>buscar dentro de lo que ya existe</strong>.</p>
      </div>
      <div className="rr-meta"><strong>{actorLabel}</strong><button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR'}</button><Link href="/root">VOLVER A ROOT</Link></div>
    </header>

    <section className="rr-health">
      <div className="rr-health-summary"><span>REPORTES</span><strong>{health.totalReports}</strong><small>último · {when(health.latestReportAt)}</small></div>
      {health.lanes.map((lane) => <div key={lane.key} className="rr-lane" data-tone={tone(lane.state)}>
        <span>{lane.label}</span><strong>{lane.state === 'CURRENT' ? 'AL CORRIENTE' : lane.state === 'CURRENT_BLOCKED' ? 'PERIODO GENERADO · BLOQUEADO/DEGRADADO' : lane.state === 'NEVER_GENERATED' ? 'SIN PRIMER RUN' : 'FALTA PERIODO ACTUAL'}</strong><small>{lane.lastGeneratedAt ? when(lane.lastGeneratedAt) : 'sin ejecución persistida'}</small>
      </div>)}
    </section>

    {inbox.warnings.length || health.warnings.length || error ? <section className="rr-warning">
      <strong>OBSERVABILIDAD</strong>
      {error ? <p>{error}</p> : null}
      {[...new Set([...inbox.warnings, ...health.warnings])].map((warning) => <p key={warning}>{warning}</p>)}
    </section> : null}

    <section className="rr-controls">
      <label><span>BUSCAR EN REPORTES YA GENERADOS</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="empresa, evidencia, mundo, MIHM, atractor, agente, señal…" /></label>
      <div className="rr-filters">{(['all', 'world', 'internal', 'prospects', 'attractor', 'evidence', 'drafts', 'other'] as const).map((item) => <button key={item} type="button" className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{CATEGORY_LABEL[item]}<b>{item === 'all' ? inbox.counts.total : inbox.counts[item]}</b></button>)}</div>
    </section>

    <section className="rr-workspace">
      <aside className="rr-list">
        <div className="rr-list-title"><span>RESULTADOS</span><b>{filtered.length}</b></div>
        {filtered.length ? filtered.map((item) => <button key={item.id} type="button" className={selected?.id === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}>
          <span className="rr-item-type">{CATEGORY_LABEL[item.category]} · {item.cadence.toUpperCase()}</span>
          <strong>{item.title}</strong>
          <small>{when(item.createdAt)} · {item.status}</small>
          <em>{item.sourceTable}</em>
        </button>) : <div className="rr-empty"><strong>SIN COINCIDENCIAS</strong><p>El buscador no genera contenido. Ajusta el texto o el filtro para localizar un reporte existente.</p></div>}
      </aside>

      <article className="rr-reader">
        {selected ? <>
          <div className="rr-kicker">{CATEGORY_LABEL[selected.category]} · {selected.reportType.replaceAll('_', ' ')} · {selected.cadence}</div>
          <h2>{selected.title}</h2>
          <div className="rr-runmeta"><span>{when(selected.createdAt)}</span><span>{selected.status}</span><span>{selected.provider ?? 'provider n/d'}</span><span>{selected.evidence.length} referencias</span><span>{selected.sourceTable}</span></div>
          <div className="rr-body">{selected.body}</div>
          <details open><summary>EVIDENCIA / FUENTES · {selected.evidence.length}</summary>{selected.evidence.length ? <ul>{selected.evidence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>MISSING · este reporte no declaró referencias de evidencia.</p>}</details>
          <details><summary>LIMITACIONES / WARNINGS · {selected.warnings.length}</summary>{selected.warnings.length ? <ul>{selected.warnings.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>Sin warnings declarados.</p>}</details>
          <details><summary>PROVENANCE / TRACE</summary><pre>{Object.keys(selected.trace).length ? JSON.stringify(selected.trace, null, 2) : 'MISSING · no hay trace persistido.'}</pre></details>
          <details><summary>METADATA</summary><pre>{JSON.stringify(selected.metadata, null, 2)}</pre></details>
          <details><summary>GOBERNANZA / APROBACIÓN</summary><pre>{Object.keys(selected.approvalQueue).length ? JSON.stringify(selected.approvalQueue, null, 2) : 'Lectura interna; no hay acción externa en cola para este reporte.'}</pre></details>
        </> : <div className="rr-empty-reader"><strong>NO HAY REPORTES QUE LEER.</strong><p>ROOT no inventará uno para llenar la pantalla. El próximo ciclo programado aparecerá cuando exista un run persistido.</p></div>}
      </article>
    </section>

    <style jsx>{`
      .rr-root{min-height:100vh;background:#060605;color:#c8c4b8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:28px;box-sizing:border-box}.rr-header{display:flex;justify-content:space-between;gap:30px;border-bottom:1px solid rgba(200,169,81,.18);padding-bottom:22px}.rr-header>div:first-child{max-width:980px}.rr-header span,.rr-kicker,.rr-controls label>span{font-size:9px;letter-spacing:.16em;color:#9d8654}.rr-header h1{margin:7px 0 8px;font:400 34px Georgia,serif;color:#e3d4b0}.rr-header p{margin:0;color:#81796c;font:14px/1.6 Georgia,serif}.rr-header p strong{color:#bba56e;font-weight:400}.rr-meta{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;font-size:9px}.rr-meta strong,.rr-meta a,.rr-meta button{border:1px solid rgba(200,169,81,.24);background:transparent;padding:8px 10px;color:#baa665;text-decoration:none;font:9px ui-monospace,monospace}.rr-meta button{cursor:pointer}.rr-meta button:disabled{opacity:.45}
      .rr-health{display:grid;grid-template-columns:180px repeat(5,minmax(150px,1fr));gap:8px;padding:18px 0;border-bottom:1px solid rgba(200,169,81,.1)}.rr-health-summary,.rr-lane{border:1px solid rgba(200,169,81,.1);background:#090908;padding:12px;display:grid;gap:6px}.rr-health-summary span,.rr-lane span{font-size:7px;letter-spacing:.12em;color:#75694d}.rr-health-summary strong{font-size:24px;color:#d8c488}.rr-lane strong{font-size:9px;color:#aa9b76}.rr-health-summary small,.rr-lane small{font-size:7px;color:#5e594e}.rr-lane[data-tone=ok]{border-color:rgba(91,151,101,.28)}.rr-lane[data-tone=ok] strong{color:#7cad83}.rr-lane[data-tone=bad]{border-color:rgba(172,86,75,.28)}.rr-lane[data-tone=bad] strong{color:#c37a70}.rr-lane[data-tone=warn] strong{color:#c0a35f}
      .rr-warning{margin:14px 0;border-left:2px solid rgba(190,132,76,.6);background:rgba(150,92,45,.04);padding:10px 14px}.rr-warning strong{font-size:8px;color:#b98758}.rr-warning p{margin:5px 0;color:#8f765f;font-size:9px;overflow-wrap:anywhere}
      .rr-controls{display:grid;gap:12px;padding:18px 0;border-bottom:1px solid rgba(200,169,81,.1)}.rr-controls label{display:grid;gap:7px}.rr-controls input{width:min(980px,100%);box-sizing:border-box;background:#090908;border:1px solid rgba(200,169,81,.24);padding:12px 13px;color:#dfd2b4;font:12px ui-monospace,monospace;outline:none}.rr-controls input:focus{border-color:rgba(200,169,81,.55)}.rr-filters{display:flex;gap:6px;flex-wrap:wrap}.rr-filters button{border:1px solid rgba(200,169,81,.12);background:#080807;color:#746b58;padding:8px 10px;font:8px ui-monospace,monospace;cursor:pointer}.rr-filters button b{margin-left:7px;color:#a6915f}.rr-filters button.active{border-color:rgba(200,169,81,.48);color:#d2bb7d;background:rgba(200,169,81,.045)}
      .rr-workspace{display:grid;grid-template-columns:minmax(300px,390px) 1fr;min-height:620px}.rr-list{border-right:1px solid rgba(200,169,81,.1);padding:15px 14px 15px 0;max-height:760px;overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(200,169,81,.24) transparent}.rr-list-title{display:flex;justify-content:space-between;padding:0 7px 10px;color:#6f644a;font-size:8px;letter-spacing:.15em}.rr-list button{width:100%;display:grid;gap:5px;text-align:left;background:transparent;border:0;border-bottom:1px solid rgba(200,169,81,.06);padding:12px 9px;color:#aaa399;cursor:pointer}.rr-list button.active{background:rgba(200,169,81,.06);border-left:2px solid #a98b45}.rr-item-type{font-size:7px;color:#806f48;letter-spacing:.1em}.rr-list button strong{font:400 13px/1.35 Georgia,serif;color:#bcb3a3}.rr-list button.active strong{color:#e0c987}.rr-list button small{color:#5d584e;font-size:8px}.rr-list button em{font-style:normal;color:#444139;font-size:7px}.rr-reader{padding:30px 38px;max-height:760px;overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(200,169,81,.24) transparent}.rr-reader h2{font:400 29px/1.2 Georgia,serif;color:#e7d8b4;margin:8px 0 12px}.rr-runmeta{display:flex;gap:12px;flex-wrap:wrap;color:#5e594f;font-size:8px;padding-bottom:22px}.rr-body{white-space:pre-wrap;font:15px/1.72 Georgia,serif;color:#bbb3a5;max-width:1100px;padding:0 0 25px}.rr-reader details{border-top:1px solid rgba(200,169,81,.08);padding:13px 0}.rr-reader summary{cursor:pointer;color:#8d7b50;font-size:8px;letter-spacing:.12em}.rr-reader ul,.rr-reader p,.rr-reader pre{color:#827b70;font-size:10px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.rr-empty,.rr-empty-reader{color:#70685b;font:13px/1.6 Georgia,serif;padding:30px 10px}.rr-empty strong,.rr-empty-reader strong{color:#9b8756;font:9px ui-monospace,monospace;letter-spacing:.1em}.rr-empty p,.rr-empty-reader p{margin-top:8px}.rr-empty-reader{padding:80px 20px;text-align:center}
      @media(max-width:1350px){.rr-health{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.rr-root{padding:18px}.rr-header{display:grid}.rr-health{grid-template-columns:1fr}.rr-workspace{grid-template-columns:1fr}.rr-list{border-right:0;border-bottom:1px solid rgba(200,169,81,.1);max-height:280px;padding-right:0}.rr-reader{max-height:none;padding:25px 4px}}
    `}</style>
  </main>;
}
