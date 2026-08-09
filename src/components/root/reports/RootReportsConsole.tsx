'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Row = Record<string, unknown>;

const REPORT_TYPES = [
  'world_vector_internal',
  'world_vector_public',
  'ifnorm',
  'sfi_dr01',
  'neural_graph_evidence',
  'amv_recurrence',
  'calibration',
  'atlas_entry',
  'linkedin_draft',
  'contact_draft',
] as const;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function when(value: unknown) {
  if (typeof value !== 'string') return 'SIN FECHA';
  const date = new Date(value);
  return Number.isFinite(date.valueOf())
    ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : value;
}

export function RootReportsConsole({ initialReports, canGenerate, actorLabel }: {
  initialReports: Row[];
  canGenerate: boolean;
  actorLabel: string;
}) {
  const [reports, setReports] = useState<Row[]>(initialReports);
  const [selectedId, setSelectedId] = useState<string | null>(() => text(initialReports[0]?.id, '') || null);
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]>('world_vector_internal');
  const [subject, setSubject] = useState('');
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => reports.find((row) => text(row.id, '') === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );
  const output = record(selected?.output_envelope);
  const trace = record(output.trace);
  const evidence = strings(output.evidence).length ? strings(output.evidence) : strings(selected?.evidence_refs);
  const warnings = strings(output.warnings).length ? strings(output.warnings) : strings(selected?.limitations);

  async function generate() {
    if (!canGenerate || running) return;
    setRunning(true);
    setMessage(null);
    try {
      const response = await fetch('/api/root/agentic/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, subject: subject.trim() || undefined }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) {
        throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      }
      const run = record(body.reportRun);
      if (text(run.id, '')) {
        setReports((current) => [run, ...current.filter((row) => text(row.id, '') !== text(run.id, ''))]);
        setSelectedId(text(run.id, ''));
      }
      setMessage('Reporte generado y persistido en Cognitive Twin Runs.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible generar el reporte.');
    } finally {
      setRunning(false);
    }
  }

  return <main className="rr-root">
    <header className="rr-header">
      <div>
        <span>SFI · ROOT · REPORTES</span>
        <h1>Bandeja de reportes de agentes</h1>
        <p>Lectura humana de outputs persistidos. Un reporte generado no equivale a aprobación, publicación ni verdad canónica.</p>
      </div>
      <div className="rr-meta"><strong>{actorLabel}</strong><Link href="/root">VOLVER A ROOT</Link></div>
    </header>

    <section className="rr-compose">
      <label>TIPO
        <select value={type} onChange={(event) => setType(event.target.value as (typeof REPORT_TYPES)[number])} disabled={!canGenerate || running}>
          {REPORT_TYPES.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
      <label>SUJETO / FOCO
        <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Opcional: empresa, fenómeno, caso o vector" disabled={!canGenerate || running}/>
      </label>
      <button type="button" onClick={() => void generate()} disabled={!canGenerate || running}>{running ? 'GENERANDO…' : canGenerate ? 'GENERAR REPORTE' : 'OBSERVER · SOLO LECTURA'}</button>
      {message ? <p>{message}</p> : null}
    </section>

    <section className="rr-workspace">
      <aside className="rr-list">
        <div className="rr-list-title"><span>HISTORIAL</span><b>{reports.length}</b></div>
        {reports.length ? reports.map((row) => {
          const envelope = record(row.output_envelope);
          const id = text(row.id, '');
          return <button key={id || text(row.task_id)} type="button" className={selectedId === id ? 'active' : ''} onClick={() => setSelectedId(id)}>
            <span>{text(envelope.title, text(row.objective, 'Reporte'))}</span>
            <small>{when(row.created_at)} · {text(row.status, 'UNKNOWN')}</small>
          </button>;
        }) : <div className="rr-empty">MISSING · todavía no hay reportes persistidos del ReportAgent.</div>}
      </aside>

      <article className="rr-reader">
        {selected ? <>
          <div className="rr-kicker">{text(output.type, 'report').replaceAll('_', ' ')} · {text(selected.status, 'UNKNOWN')}</div>
          <h2>{text(output.title, text(selected.objective, 'Reporte'))}</h2>
          <div className="rr-runmeta">
            <span>{when(selected.created_at)}</span>
            <span>{text(selected.provider, text(output.provider, 'provider n/d'))}</span>
            <span>{evidence.length} evidencias referenciadas</span>
          </div>
          <div className="rr-body">{text(output.body, 'MISSING · el run no contiene body legible.')}</div>

          <details open>
            <summary>EVIDENCIA UTILIZADA · {evidence.length}</summary>
            {evidence.length ? <ul>{evidence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>MISSING · no hay referencias de evidencia persistidas para este reporte.</p>}
          </details>

          <details>
            <summary>PROVENANCE / TRACE</summary>
            <pre>{Object.keys(trace).length ? JSON.stringify(trace, null, 2) : 'MISSING · no hay trace persistido.'}</pre>
          </details>

          <details>
            <summary>LIMITACIONES / WARNINGS · {warnings.length}</summary>
            {warnings.length ? <ul>{warnings.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>Sin warnings declarados en este run.</p>}
          </details>

          <details>
            <summary>ESTADO DE APROBACIÓN</summary>
            <pre>{JSON.stringify(record(output.approval_queue), null, 2)}</pre>
          </details>
        </> : <div className="rr-empty-reader">Selecciona un reporte o genera el primero.</div>}
      </article>
    </section>

    <style jsx>{`
      .rr-root{min-height:100vh;background:#060605;color:#c8c4b8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:28px;box-sizing:border-box}.rr-header{display:flex;justify-content:space-between;gap:30px;border-bottom:1px solid rgba(200,169,81,.18);padding-bottom:22px}.rr-header span,.rr-kicker{font-size:10px;letter-spacing:.18em;color:#9d8654}.rr-header h1{margin:7px 0 8px;font:400 32px Georgia,serif;color:#e3d4b0}.rr-header p{margin:0;max-width:840px;color:#777065;font:14px/1.6 Georgia,serif}.rr-meta{display:flex;align-items:flex-start;gap:10px;font-size:9px}.rr-meta strong,.rr-meta a{border:1px solid rgba(200,169,81,.24);padding:8px 10px;color:#baa665;text-decoration:none}.rr-compose{display:grid;grid-template-columns:260px minmax(320px,1fr) auto;gap:12px;align-items:end;padding:18px 0;border-bottom:1px solid rgba(200,169,81,.1)}.rr-compose label{display:grid;gap:6px;color:#756a4d;font-size:8px;letter-spacing:.14em}.rr-compose select,.rr-compose input{background:#0a0a09;border:1px solid rgba(200,169,81,.22);color:#d5c7a7;padding:10px;font:11px ui-monospace,monospace}.rr-compose button{height:36px;border:1px solid rgba(200,169,81,.38);background:transparent;color:#d3b96e;padding:0 15px;font:9px ui-monospace,monospace;letter-spacing:.08em}.rr-compose button:disabled{opacity:.45}.rr-compose>p{grid-column:1/-1;margin:0;color:#a28e60;font-size:9px}.rr-workspace{display:grid;grid-template-columns:minmax(280px,360px) 1fr;min-height:calc(100vh - 210px)}.rr-list{border-right:1px solid rgba(200,169,81,.1);padding:15px 14px 15px 0;max-height:calc(100vh - 210px);overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(200,169,81,.24) transparent}.rr-list::-webkit-scrollbar,.rr-reader::-webkit-scrollbar{width:6px;height:6px}.rr-list::-webkit-scrollbar-track,.rr-reader::-webkit-scrollbar-track{background:transparent}.rr-list::-webkit-scrollbar-thumb,.rr-reader::-webkit-scrollbar-thumb{background:rgba(200,169,81,.18);border-radius:10px}.rr-list-title{display:flex;justify-content:space-between;padding:0 5px 10px;color:#6f644a;font-size:8px;letter-spacing:.15em}.rr-list button{width:100%;display:grid;gap:4px;text-align:left;background:transparent;border:0;border-bottom:1px solid rgba(200,169,81,.06);padding:11px 8px;color:#aaa399;font:10px ui-monospace,monospace;cursor:pointer}.rr-list button.active{background:rgba(200,169,81,.06);color:#e0c987;border-left:2px solid #a98b45}.rr-list button small{color:#5d584e;font-size:8px}.rr-reader{padding:30px 38px;max-height:calc(100vh - 210px);overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(200,169,81,.24) transparent}.rr-reader h2{font:400 28px/1.2 Georgia,serif;color:#e7d8b4;margin:8px 0 12px}.rr-runmeta{display:flex;gap:14px;flex-wrap:wrap;color:#5e594f;font-size:8px;padding-bottom:22px}.rr-body{white-space:pre-wrap;font:15px/1.72 Georgia,serif;color:#bbb3a5;max-width:1050px;padding:0 0 25px}.rr-reader details{border-top:1px solid rgba(200,169,81,.08);padding:13px 0}.rr-reader summary{cursor:pointer;color:#8d7b50;font-size:8px;letter-spacing:.12em}.rr-reader ul,.rr-reader p,.rr-reader pre{color:#827b70;font-size:10px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.rr-empty,.rr-empty-reader{color:#5f594e;font:italic 13px Georgia,serif;padding:30px 10px}.rr-empty-reader{padding:80px 20px;text-align:center}@media(max-width:900px){.rr-root{padding:18px}.rr-header{display:grid}.rr-compose{grid-template-columns:1fr}.rr-workspace{grid-template-columns:1fr}.rr-list{border-right:0;border-bottom:1px solid rgba(200,169,81,.1);max-height:240px;padding-right:0}.rr-reader{max-height:none;padding:25px 4px}.rr-compose>p{grid-column:1}}
    `}</style>
  </main>;
}
