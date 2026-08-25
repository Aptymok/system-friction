'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, any>;

type Props = {
  enabled: boolean;
};

function stateClass(value: unknown) {
  const state = String(value ?? '').toLowerCase();
  if (/blocked|missing|failed|critical|degraded/.test(state)) return 'isBlocked';
  if (/queued|waiting|proposed|unassigned|current_blocked/.test(state)) return 'isAttention';
  if (/accepted|current|operational|recorded|ready/.test(state)) return 'isReady';
  return '';
}

function short(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function Lane({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return <section className="workLane"><header><span>{title}</span>{typeof count === 'number' && <b>{count}</b>}</header><div className="workLaneBody">{children}</div></section>;
}

export function RootOperationalWorkboard({ enabled }: Props) {
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    const pull = async () => {
      try {
        const response = await fetch('/api/root/workboard', { cache: 'no-store' });
        const json = await response.json().catch(() => null);
        if (stop) return;
        if (!response.ok || !json?.ok) {
          setError(`${response.status}: ${json?.error ?? 'workboard_read_failed'}`);
          return;
        }
        setData(json.workboard ?? null);
        setError(null);
      } catch (cause) {
        if (!stop) setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    void pull();
    const timer = window.setInterval(pull, 30000);
    return () => { stop = true; window.clearInterval(timer); };
  }, [enabled]);

  const summary = data?.summary ?? {};
  const decisions = Array.isArray(data?.decisions) ? data.decisions : [];
  const executions = Array.isArray(data?.executions) ? data.executions : [];
  const blockers = Array.isArray(data?.blockers) ? data.blockers : [];
  const reports = Array.isArray(data?.reports?.recent) ? data.reports.recent : [];
  const reportLanes = Array.isArray(data?.reports?.health?.lanes) ? data.reports.health.lanes : [];
  const riskOpportunity = Array.isArray(data?.riskOpportunity) ? data.riskOpportunity : [];
  const returns = Array.isArray(data?.returns) ? data.returns : [];
  const canon = Array.isArray(data?.canonCandidates) ? data.canonCandidates : [];
  const reserved = Array.isArray(data?.governanceGates?.reservedCapabilities) ? data.governanceGates.reservedCapabilities : [];
  const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
  const runtimeLabel = useMemo(() => short(data?.runtime?.summary, 'Runtime sin lectura'), [data]);

  if (!enabled) return <aside className="rootWorkboard"><div className="workboardLoading">WORKBOARD · esperando sesión / presencia gobernada</div></aside>;

  return <aside className="rootWorkboard" aria-label="ROOT operational workboard">
    <div className="workboardHead">
      <div><small>ROOT OPERATIONAL HOME</small><strong>TRABAJO QUE REQUIERE ATENCIÓN</strong></div>
      <span>{data?.authority ? String(data.authority).toUpperCase() : 'VIEWER'}</span>
    </div>

    <div className="workboardSummary">
      <div><small>DECIDIR</small><b>{summary.decisions ?? 0}</b></div>
      <div><small>EJECUCIÓN</small><b>{summary.executions ?? 0}</b></div>
      <div><small>ADAPTER GAPS</small><b>{summary.executionAdapterGaps ?? 0}</b></div>
      <div><small>RETURNS</small><b>{summary.returns ?? 0}</b></div>
      <div><small>CANON</small><b>{summary.canonCandidates ?? 0}</b></div>
      <div><small>WARNINGS</small><b>{summary.warnings ?? 0}</b></div>
    </div>

    <p className="workboardRuntime">{runtimeLabel}</p>
    {error && <p className="workboardError">DEGRADED · {error}</p>}

    <div className="workboardGrid">
      <Lane title="MIS DECISIONES / DELEGABLES" count={decisions.length}>
        {decisions.slice(0, 6).map((item: Row) => <article key={item.id} className={stateClass(item.status)}>
          <b>{short(item.title, 'Propuesta')}</b>
          <span>{short(item.status)} · {short(item.decisionClass)} · riesgo {short(item.riskLevel, 'unknown')}</span>
          <small>{item.decisionClass === 'root_only' ? 'ROOT decide' : 'ROOT o controller autorizado'}</small>
        </article>)}
        {!decisions.length && <em>Sin decisiones visibles para esta autoridad.</em>}
      </Lane>

      <Lane title="EJECUCIONES / ASSIGNMENT" count={executions.length}>
        {executions.slice(0, 6).map((item: Row) => <article key={item.id} className={stateClass(item.execution?.adapterState)}>
          <b>{short(item.title, 'Ejecución')}</b>
          <span>{short(item.status)} · {short(item.execution?.assignmentState)}</span>
          <small>coordinador: {short(item.execution?.coordinator)} · executor: {short(item.execution?.executor, 'NO ASIGNADO')}</small>
          <small>{short(item.execution?.adapterState)}</small>
        </article>)}
        {!executions.length && <em>No hay propuestas en handoff de ejecución.</em>}
      </Lane>

      <Lane title="BLOQUEOS / WARNINGS" count={blockers.length + warnings.length}>
        {blockers.slice(0, 6).map((item: Row) => <article key={item.id} className="isBlocked">
          <b>{short(item.title, item.kind)}</b><span>{short(item.state)}</span><small>{short(item.detail)}</small>
        </article>)}
        {warnings.slice(0, 4).map((warning: string, index: number) => <article key={`warning:${index}`} className="isAttention"><span>{warning}</span></article>)}
        {!blockers.length && !warnings.length && <em>Sin bloqueos observados.</em>}
      </Lane>

      <Lane title="REPORTES" count={reports.length}>
        <div className="reportHealthStrip">{reportLanes.map((lane: Row) => <span key={lane.key} className={stateClass(lane.state)}>{short(lane.key)} · {short(lane.state)}</span>)}</div>
        {reports.slice(0, 5).map((report: Row) => <details key={report.id} className={stateClass(report.status)}>
          <summary><b>{short(report.title, 'Reporte')}</b><span>{short(report.status)}</span></summary>
          <p>{short(report.body, 'Sin cuerpo legible.')}</p>
          {Array.isArray(report.warnings) && report.warnings.length > 0 && <small>{report.warnings.join(' · ')}</small>}
        </details>)}
        {!reports.length && <em>No hay reportes legibles en inbox.</em>}
      </Lane>

      <Lane title="RIESGO / OPORTUNIDAD" count={riskOpportunity.length}>
        {riskOpportunity.slice(0, 8).map((item: Row) => <article key={item.id} className={item.kind === 'risk' ? 'isAttention' : ''}>
          <b>{String(item.kind ?? '').toUpperCase()}</b><span>{short(item.text)}</span><small>{short(item.epistemicClass)} · run {short(item.sourceRunId)}</small>
        </article>)}
        {!riskOpportunity.length && <em>No hay riesgos/oportunidades estructurados en los runs recientes; no se infieren aquí.</em>}
      </Lane>

      <Lane title="RETURN / CALIBRACIÓN" count={returns.length}>
        {returns.slice(0, 6).map((item: Row) => <article key={item.id} className="isReady">
          <b>{short(item.eventName, 'RETURN')}</b><span>{short(item.epistemicClass)}</span><small>{short(item.occurredAt)}</small>
        </article>)}
        {!returns.length && <em>No hay RETURN reciente observado en la fuente consultada.</em>}
      </Lane>

      <Lane title="CANON QUEUE · ROOT ONLY" count={canon.length}>
        {canon.slice(0, 6).map((item: Row) => <article key={item.id} className="isAttention">
          <b>{short(item.title, 'Candidato')}</b><span>accepted + outcome recorded</span><small>La promoción exige contrato, evidencia, tests, reproducibilidad, migración y rollback.</small>
        </article>)}
        {!canon.length && <em>Sin candidatos observados para revisión canónica.</em>}
      </Lane>

      <Lane title="CAPACIDADES RESERVADAS" count={reserved.length}>
        {reserved.map((item: Row) => <article key={item.id} className={stateClass(item.status)}>
          <b>{short(item.name)}</b><span>{short(item.status)}</span><small>{item.executionAuthorized ? 'Gobernanza permite handoff; este workboard NO la ejecuta.' : 'NO autorizada para ejecución desde esta superficie.'}</small>
        </article>)}
      </Lane>
    </div>

    <footer className="workboardBoundary">proposal → authorization → routing/readiness → assignment → execution → RETURN → calibration → learning → ROOT canon/close · auto-dispatch OFF · self-healing OFF</footer>
  </aside>;
}
