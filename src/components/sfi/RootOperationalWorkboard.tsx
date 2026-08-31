'use client';

import { useEffect, useMemo, useState } from 'react';
import { CognitiveSpineAnatomy, type CognitiveSpineFocus } from '@/components/root/cognitive-spine/CognitiveSpineAnatomy';
import { translateUiText, useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import './RootOperationalWorkboard.css';

type Row = Record<string, any>;

type Props = { enabled: boolean };

function stateClass(value: unknown) {
  const state = String(value ?? '').toLowerCase();
  if (/blocked|missing|failed|critical|degraded|stale|overdue/.test(state)) return 'isBlocked';
  if (/queued|waiting|proposed|pending|unassigned|current_blocked|approved|executed|review_required/.test(state)) return 'isAttention';
  if (/accepted|current|operational|recorded|ready|return_recorded|available|auto_routable|satisfied|healthy/.test(state)) return 'isReady';
  return '';
}

function short(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function Lane({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const {language}=useSfiLanguage();
  return <section className="workLane"><header><span>{translateUiText(title,language)}</span>{typeof count === 'number' && <b>{count}</b>}</header><div className="workLaneBody">{children}</div></section>;
}

function focusItem(kind: string, item: Row, fallback: string): CognitiveSpineFocus {
  const sourceId = short(item.id ?? item.eventId ?? item.cycleId ?? item.sourceRunId, 'unidentified');
  return {
    id: `${kind}:${sourceId}`,
    kind,
    title: short(item.title ?? item.question ?? item.text ?? item.eventName ?? item.action, fallback),
    status: short(item.status ?? item.state ?? item.epistemicClass, 'observed'),
    detail: sourceId,
  };
}

export function RootOperationalWorkboard({ enabled }: Props) {
  const {language,text:ownedText}=useSfiLanguage();
  const ui=(value:string)=>translateUiText(value,language);
  const [data, setData] = useState<Row | null>(null);
  const [caseExecution, setCaseExecution] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    const pull = async () => {
      try {
        const [response, caseResponse] = await Promise.all([
          fetch('/api/root/workboard', { cache: 'no-store' }),
          fetch('/api/root/case-execution', { cache: 'no-store' }),
        ]);
        const [json, caseJson] = await Promise.all([
          response.json().catch(() => null),
          caseResponse.json().catch(() => null),
        ]);
        if (stop) return;
        if (!response.ok || !json?.ok) {
          setError(`${response.status}: ${json?.error ?? 'workboard_read_failed'}`);
          return;
        }
        setData(json.workboard ?? null);
        setCaseExecution(caseResponse.ok && caseJson?.ok ? caseJson : null);
        setError(caseResponse.status !== 403 && !caseResponse.ok ? `case execution ${caseResponse.status}: ${caseJson?.error ?? 'read_failed'}` : null);
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
  const providerHealth = Array.isArray(data?.reports?.health?.providers) ? data.reports.health.providers : [];
  const riskOpportunity = Array.isArray(data?.riskOpportunity) ? data.riskOpportunity : [];
  const returns = Array.isArray(data?.returns) ? data.returns : [];
  const canon = Array.isArray(data?.canonCandidates) ? data.canonCandidates : [];
  const twinProposals = Array.isArray(data?.twinProposals) ? data.twinProposals : [];
  const openUniversalCycles = Array.isArray(data?.openCycles?.universal) ? data.openCycles.universal : [];
  const reserved = Array.isArray(data?.governanceGates?.reservedCapabilities) ? data.governanceGates.reservedCapabilities : [];
  const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
  const caseItems = Array.isArray(caseExecution?.items) ? caseExecution.items : [];
  const nextItems = Array.isArray(data?.operationalNext?.items) ? data.operationalNext.items : [];
  const nextCycles = Array.isArray(data?.operationalNext?.cycles) ? data.operationalNext.cycles : [];
  const nextSummary = data?.operationalNext?.summary ?? {};
  const runtimeLabel = useMemo(() => short(data?.runtime?.summary, 'Runtime sin lectura'), [data]);
  const nextById = useMemo(() => new Map<string, Row>(nextItems.map((item: Row) => [String(item.id), item])), [nextItems]);
  const degradedLaneCount = reportLanes.filter((lane: Row) => lane.state !== 'CURRENT').length;
  const degradedProviderCount = providerHealth.filter((provider: Row) => ['DEGRADED', 'BLOCKED'].includes(String(provider.state ?? '').toUpperCase())).length;
  const systemHealth = error || degradedLaneCount || degradedProviderCount ? 'DEGRADED' : 'NORMAL';

  const focusOptions = useMemo<CognitiveSpineFocus[]>(() => {
    const candidates = [
      ...decisions.slice(0, 3).map((item: Row) => focusItem('decision', item, 'Governance decision')),
      ...blockers.slice(0, 3).map((item: Row) => focusItem('blocker', item, 'Observed blocker')),
      ...executions.slice(0, 3).map((item: Row) => focusItem('execution', item, 'Execution handoff')),
      ...twinProposals.slice(0, 2).map((item: Row) => focusItem('twin', item, 'Twin proposal')),
      ...caseItems.slice(0, 2).map((item: Row) => focusItem('case', item, 'Case action')),
      ...returns.slice(0, 2).map((item: Row) => focusItem('return', item, 'Observed RETURN')),
    ];
    const unique = new Map<string, CognitiveSpineFocus>();
    candidates.forEach((item) => unique.set(item.id, item));
    return [...unique.values()];
  }, [decisions, blockers, executions, twinProposals, caseItems, returns]);

  if (!enabled) return <aside className="rootWorkboard"><div className="workboardLoading">{ownedText('PANEL DE TRABAJO · esperando sesión / presencia gobernada','WORKBOARD · waiting for session / governed presence')}</div></aside>;

  return <aside className="rootWorkboard" aria-label={ownedText('Panel operativo ROOT','ROOT operational workboard')}>
    <div className="workboardHead">
      <div><small>{ui('INICIO OPERATIVO ROOT')}</small><strong>{ui('TRABAJO QUE REQUIERE ATENCIÓN')}</strong></div>
      <span>{data?.authority ? String(data.authority).toUpperCase() : 'VIEWER'} · {ui('SALUD DEL SISTEMA')} {systemHealth}</span>
    </div>

    <div className="workboardSummary">
      <div><small>{ui('ROOT AHORA')}</small><b>{nextSummary.rootActionRequired ?? summary.decisions ?? 0}</b></div>
      <div><small>{ui('SIGUIENTE AUTOMÁTICO')}</small><b>{nextSummary.automaticNext ?? 0}</b></div>
      <div><small>{ui('EJECUCIÓN')}</small><b>{summary.executions ?? 0}</b></div>
      <div><small>{ui('CARRILES DEGRADADOS')}</small><b>{degradedLaneCount}</b></div>
      <div><small>{ui('RETURNS')}</small><b>{summary.returns ?? 0}</b></div>
      <div><small>{ui('ADVERTENCIAS')}</small><b>{summary.warnings ?? 0}</b></div>
    </div>

    <p className="workboardRuntime">{runtimeLabel}</p>
    {error && <p className="workboardError">{ownedText('DEGRADADO','DEGRADED')} · {error}</p>}

    <CognitiveSpineAnatomy
      enabled={enabled}
      canOperate={data?.authority === 'root'}
      focusOptions={focusOptions}
      twinOpenCount={twinProposals.length + openUniversalCycles.length}
    />

    <div className="workboardGrid">
      <Lane title="QUÉ SIGUE / EVENTO ESPERADO" count={nextItems.length + nextCycles.length}>
        {nextItems
          .slice()
          .sort((a: Row, b: Row) => Number(Boolean(b.rootActionRequired)) - Number(Boolean(a.rootActionRequired)))
          .slice(0, 10)
          .map((item: Row) => <article key={`next:${item.id}`} className={stateClass(item.blocker ?? item.status)}>
            <b>{short(item.title, 'Objeto operativo')}</b>
            <span>{short(item.status)} → {short(item.nextExpectedEvent, 'TERMINAL')}</span>
            <small>{ownedText('responsable','owner')}: {short(item.owner)} · ROOT: {item.rootActionRequired ? ownedText('ACCIÓN REQUERIDA','ACTION REQUIRED') : ownedText('ninguna','none')}</small>
            {item.blocker && <small>{ownedText('BLOQUEO','BLOCKER')} · {short(item.blocker)}</small>}
            <small>{short(item.actionLabel)}</small>
            {item.status === 'waiting_evidence' && <a href="/root/evidence-review">{ownedText('REVISAR EVIDENCIA →','REVIEW EVIDENCE →')}</a>}
          </article>)}
        {nextCycles.slice(0, 5).map((cycle: Row) => <article key={`next-cycle:${cycle.cycleId}`} className={stateClass(cycle.state)}>
          <b>{short(cycle.title, 'Ciclo universal')}</b>
          <span>{short(cycle.state)} → {short(cycle.nextExpectedEvent)}</span>
          <small>owner: {short(cycle.owner)} · ROOT: {cycle.rootActionRequired ? 'ACCIÓN REQUERIDA' : 'ninguna'}</small>
          {cycle.blocker && <small>{ownedText('BLOQUEO','BLOCKER')} · {short(cycle.blocker)}</small>}
        </article>)}
        {!nextItems.length && !nextCycles.length && <em>{ownedText('Sin objetos no terminales con transición pendiente.','No non-terminal objects have a pending transition.')}</em>}
      </Lane>

      <Lane title="MIS DECISIONES / DELEGABLES" count={decisions.length}>
        {decisions.slice(0, 6).map((item: Row) => {
          const next = nextById.get(String(item.id));
          return <article key={item.id} className={stateClass(next?.blocker ?? item.status)}>
            <b>{short(item.title, 'Propuesta')}</b>
            <span>{short(item.status)} · {short(item.decisionClass)} · riesgo {short(item.riskLevel, 'unknown')}</span>
            <small>{next ? `${short(next.nextExpectedEvent)} · owner ${short(next.owner)}` : item.decisionClass === 'root_only' ? 'ROOT decide' : 'ROOT o controller autorizado'}</small>
            {next?.rootActionRequired === false && <small>ROOT: ninguna acción ahora.</small>}
          </article>;
        })}
        {!decisions.length && <em>{ownedText('Sin decisiones visibles para esta autoridad.','No decisions are visible for this authority.')}</em>}
      </Lane>

      <Lane title="EJECUCIONES / ASIGNACIÓN" count={executions.length}>
        {executions.slice(0, 6).map((item: Row) => {
          const next = nextById.get(String(item.id));
          return <article key={item.id} className={stateClass(next?.blocker ?? item.execution?.adapterState)}>
            <b>{short(item.title, 'Ejecución')}</b>
            <span>{short(item.status)} · {short(item.execution?.assignmentState)}</span>
            <small>clase: {short(item.execution?.executionClass)} · coordinador: {short(item.execution?.coordinator)}</small>
            <small>adapter: {short(item.execution?.adapterId, 'NO VERIFICADO')} · executor: {short(item.execution?.executor, 'NO ASIGNADO')}</small>
            <small>{next ? `SIGUE: ${short(next.nextExpectedEvent)} · owner ${short(next.owner)}` : short(item.execution?.adapterState)}</small>
            {next?.blocker && <small>{ownedText('BLOQUEO','BLOCKER')} · {short(next.blocker)}</small>}
          </article>;
        })}
        {!executions.length && <em>No hay propuestas en handoff de ejecución.</em>}
      </Lane>

      <Lane title="PROYECTOS / EJECUCIÓN DE CASOS" count={caseItems.length}>
        {caseItems.slice(0, 6).map((item: Row) => <article key={item.id} className={stateClass(item.status)}>
          <b>{short(item.action, 'Case action')}</b>
          <span>{short(item.status)} · riesgo {short(item.riskLevel)} · {short(item.reversibility)}</span>
          <small>case {short(item.caseId)} · intervention {item.interventionRef ? 'sí' : 'no'} · RETURN {item.returnRef ? 'sí' : 'no'}</small>
          <small>platform external action: FALSE</small>
        </article>)}
        {!caseItems.length && <em>{data?.authority === 'root' ? 'Sin case actions observadas.' : 'Projects/Case Execution es visible sólo para ROOT soberano.'}</em>}
      </Lane>

      <Lane title="TWIN / CICLOS ABIERTOS" count={twinProposals.length + openUniversalCycles.length}>
        {twinProposals.slice(0, 4).map((item: Row) => <article key={`twin:${item.id}`} className={stateClass(item.status)}>
          <b>{short(item.title, 'Twin proposal')}</b><span>{short(item.status)} · {short(item.decisionClass)}</span><small>proposal {short(item.id)}</small>
        </article>)}
        {nextCycles.slice(0, 4).map((cycle: Row) => <article key={`cycle:${cycle.cycleId}`} className={stateClass(cycle.state)}>
          <b>{short(cycle.title, 'Ciclo universal abierto')}</b><span>{short(cycle.state)} · espera {short(cycle.nextExpectedEvent)}</span><small>{short(cycle.cycleId)} · owner {short(cycle.owner)}</small>
        </article>)}
        {!twinProposals.length && !openUniversalCycles.length && <em>Sin Twin proposals/ciclos abiertos visibles.</em>}
      </Lane>

      <Lane title="BLOQUEOS / ADVERTENCIAS" count={blockers.length + warnings.length + (nextSummary.blocked ?? 0)}>
        {blockers.slice(0, 6).map((item: Row) => <article key={item.id} className="isBlocked">
          <b>{short(item.title, item.kind)}</b><span>{short(item.state)}</span><small>{short(item.detail)}</small>
        </article>)}
        {nextItems.filter((item: Row) => item.blocker).slice(0, 4).map((item: Row) => <article key={`next-blocker:${item.id}`} className="isBlocked"><b>{short(item.title)}</b><span>{short(item.blocker)}</span><small>next {short(item.nextExpectedEvent)} · owner {short(item.owner)}</small></article>)}
        {warnings.slice(0, 4).map((warning: string, index: number) => <article key={`warning:${index}`} className="isAttention"><span>{warning}</span></article>)}
        {!blockers.length && !warnings.length && !(nextSummary.blocked > 0) && <em>Sin bloqueos observados.</em>}
      </Lane>

      <Lane title="REPORTES / CARRILES DEGRADADOS" count={reports.length}>
        <div className="reportHealthStrip">{reportLanes.map((lane: Row) => <span key={lane.key} className={stateClass(lane.state)}>{short(lane.key)} · {short(lane.state)}</span>)}</div>
        {reports.slice(0, 5).map((report: Row) => <details key={report.id} className={stateClass(report.status)}>
          <summary><b>{short(report.title, 'Reporte')}</b><span>{short(report.status)}</span></summary>
          <p>{short(report.body, 'Sin cuerpo legible.')}</p>
          {Array.isArray(report.warnings) && report.warnings.length > 0 && <small>{report.warnings.join(' · ')}</small>}
        </details>)}
        {!reports.length && <em>No hay reportes legibles en inbox.</em>}
      </Lane>

      <Lane title="LLM PROVIDERS · CONFIG ≠ HEALTH" count={providerHealth.length}>
        {providerHealth.map((provider: Row) => <article key={provider.id} className={stateClass(provider.state ?? (provider.available ? 'configured' : 'unconfigured'))}>
          <b>{short(provider.id).toUpperCase()}</b>
          <span>{short(provider.state, provider.available ? 'CONFIGURED / UNTESTED' : 'UNCONFIGURED')} · {short(provider.model)}</span>
          <small>configured {provider.configured ?? provider.available ? 'sí' : 'no'} · canary {provider.canaryOk === true ? 'OK' : provider.canaryOk === false ? 'FAIL' : 'UNTESTED'}</small>
          {provider.lastError && <small>last error · {short(provider.lastErrorClass)} · {short(provider.lastError)}</small>}
          {provider.lastSuccessAt && <small>last success · {short(provider.lastSuccessAt)}</small>}
        </article>)}
        {!providerHealth.length && <em>Sin lectura de providers.</em>}
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
          <b>{short(item.name)}</b><span>{short(item.status)}</span>
          <small>{item.executionAuthorized ? `AUTORIZADA · owner ${short(item.implementationOwner)} · el router puede continuar sin otro gate mecánico.` : 'NO autorizada para ejecución; espera una decisión gobernada.'}</small>
        </article>)}
      </Lane>
    </div>

    <footer className="workboardBoundary">cada estado no-terminal → nextExpectedEvent + owner + blocker + rootActionRequired · proposal → authorization → auto-route → assignment → bounded execution/retry → RETURN → calibration → learning → ROOT canon/close · external actions fail closed without adapter</footer>
  </aside>;
}
