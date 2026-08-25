'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export type CognitiveSpineFocus = {
  id: string;
  kind: string;
  title: string;
  status?: string | null;
  detail?: string | null;
};

type Row = Record<string, any>;
type RootJob = 'daily' | 'reports' | 'audit' | 'all';
type ParkPanel = 'park' | 'logbook' | 'operate';
type ParkZoneId = 'observer' | 'memory' | 'affective' | 'signal' | 'fragment' | 'core' | 'return';

type Props = {
  enabled: boolean;
  canOperate: boolean;
  focusOptions: CognitiveSpineFocus[];
  twinOpenCount: number;
};

const ACTIVITY_WINDOW_MS = 15 * 60 * 1000;

const ZONES: Array<{
  id: ParkZoneId;
  label: string;
  question: string;
  layers?: string[];
  agentIds?: string[];
}> = [
  { id: 'observer', label: 'OBSERVER GATE', question: '¿Qué está entrando al campo y con qué procedencia?', layers: ['observe', 'reconstruct'] },
  { id: 'memory', label: 'MEMORY BASIN', question: '¿Qué memoria, decisión, contradicción o deuda acompaña al estado?', agentIds: ['historical_scout', 'context_builder', 'reality_calibration'] },
  { id: 'affective', label: 'AFFECTIVE LOOP', question: '¿Qué lectura psicológica está realmente disponible?', agentIds: ['psychological_simulator'] },
  { id: 'signal', label: 'SIGNAL MARSH', question: '¿Qué señales externas/contextuales están disponibles sin convertirse en evidencia por herencia?', agentIds: ['field_observer', 'cultural_simulator'] },
  { id: 'fragment', label: 'FRAGMENT DOCK', question: '¿Qué fragmentos, propuestas o bloqueos esperan integración, decisión o handoff?', layers: ['decide', 'act'] },
  { id: 'core', label: 'COGNITIVE SPINE', question: '¿Cuál es el estado sellado que organiza la lectura institucional?', layers: ['observe', 'reconstruct', 'simulate', 'understand', 'project', 'decide', 'act', 'learn'] },
  { id: 'return', label: 'EXECUTION / RETURN', question: '¿Qué se ejecutó y qué regresó de realidad?', layers: ['act', 'learn'] },
];

function stateClass(value: unknown) {
  const state = String(value ?? '').toLowerCase();
  if (/missing|failed|blocked|critical|degraded|unavailable/.test(state)) return 'isBlocked';
  if (/gated|queued|waiting|pending|ready|proposed|evidence/.test(state)) return 'isAttention';
  if (/operational|observed|accepted|recorded|connected|functional|available|closed|completed/.test(state)) return 'isReady';
  return 'isContext';
}

function short(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function compactHash(value: unknown) {
  const text = short(value, '—');
  return text.length > 22 ? `${text.slice(0, 10)}…${text.slice(-8)}` : text;
}

function newestTimestamp(rows: Row[]) {
  const values = rows
    .map((row) => row.occurredAt ?? row.created_at ?? row.createdAt)
    .filter((value): value is string => typeof value === 'string')
    .sort((a, b) => b.localeCompare(a));
  return values[0] ?? null;
}

function strongestState(values: unknown[]) {
  const classes = values.map(stateClass);
  if (classes.includes('isBlocked')) return 'isBlocked';
  if (classes.includes('isAttention')) return 'isAttention';
  if (classes.includes('isReady')) return 'isReady';
  return 'isContext';
}

export function CognitiveSpineAnatomy({ enabled, canOperate, focusOptions, twinOpenCount }: Props) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<ParkPanel>('park');
  const [spine, setSpine] = useState<Row | null>(null);
  const [runtime, setRuntime] = useState<Row | null>(null);
  const [logbook, setLogbook] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<ParkZoneId>('core');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [operationBusy, setOperationBusy] = useState<RootJob | null>(null);
  const [operationResult, setOperationResult] = useState<Row | null>(null);
  const [question, setQuestion] = useState('');
  const [planBusy, setPlanBusy] = useState(false);
  const [planResult, setPlanResult] = useState<Row | null>(null);

  useEffect(() => {
    if (!focusOptions.length) {
      setFocusId('');
      return;
    }
    if (!focusOptions.some((item) => item.id === focusId)) setFocusId(focusOptions[0].id);
  }, [focusOptions, focusId]);

  const pullReadModels = useCallback(async () => {
    if (!enabled || !open) return;
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/root/cognitive-spine/status', { cache: 'no-store' }),
        fetch('/api/root/cognitive-runtime', { cache: 'no-store' }),
      ];
      if (canOperate) requests.push(fetch('/api/logbook/visible?role=root', { cache: 'no-store' }));
      const responses = await Promise.all(requests);
      const json = await Promise.all(responses.map((response) => response.json().catch(() => null)));
      const [spineResponse, runtimeResponse, logbookResponse] = responses;
      const [spineJson, runtimeJson, logbookJson] = json;
      setSpine(spineResponse.ok && spineJson?.ok ? spineJson : null);
      setRuntime(runtimeResponse.ok && runtimeJson?.ok ? runtimeJson : null);
      if (canOperate) setLogbook(logbookResponse?.ok && logbookJson?.ok && Array.isArray(logbookJson.entries) ? logbookJson.entries : []);
      const failures = [
        !spineResponse.ok ? `spine ${spineResponse.status}:${spineJson?.error ?? 'read_failed'}` : null,
        !runtimeResponse.ok ? `runtime ${runtimeResponse.status}:${runtimeJson?.error ?? 'read_failed'}` : null,
        canOperate && logbookResponse && !logbookResponse.ok ? `logbook ${logbookResponse.status}:${logbookJson?.error ?? 'read_failed'}` : null,
      ].filter(Boolean);
      setError(failures.length ? failures.join(' · ') : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [enabled, open, canOperate]);

  useEffect(() => {
    if (!enabled || !open) return;
    void pullReadModels();
    const timer = window.setInterval(() => void pullReadModels(), 30000);
    return () => window.clearInterval(timer);
  }, [enabled, open, pullReadModels]);

  const runtimeState = runtime?.runtime ?? null;
  const agents: Row[] = Array.isArray(runtimeState?.agents) ? runtimeState.agents : [];
  const layers: Row[] = Array.isArray(runtimeState?.layers) ? runtimeState.layers : [];
  const events: Row[] = Array.isArray(runtimeState?.eventGraph?.recentEvents) ? runtimeState.eventGraph.recentEvents : [];
  const spineStatus = spine?.status ?? null;
  const focus = focusOptions.find((item) => item.id === focusId) ?? focusOptions[0] ?? null;
  const selectedZone = ZONES.find((zone) => zone.id === selectedZoneId) ?? ZONES[5];
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? null;

  const agentById = useMemo(() => new Map(agents.map((agent) => [String(agent.id), agent])), [agents]);
  const layerById = useMemo(() => new Map(layers.map((layer) => [String(layer.id), layer])), [layers]);
  const recentExecutionIds = useMemo(() => {
    const cutoff = Date.now() - ACTIVITY_WINDOW_MS;
    return new Set(events
      .filter((event) => event.eventName === 'SFI_AGENT_EXECUTED')
      .filter((event) => typeof event.occurredAt === 'string' && new Date(event.occurredAt).getTime() >= cutoff)
      .map((event) => String(event.sourceId ?? '')));
  }, [events]);

  const zoneAgents = useCallback((zone: typeof ZONES[number]) => {
    const explicit = (zone.agentIds ?? []).map((id) => agentById.get(id)).filter(Boolean) as Row[];
    const byLayer = agents.filter((agent) => (zone.layers ?? []).includes(String(agent.layer)));
    const unique = new Map<string, Row>();
    [...explicit, ...byLayer].forEach((agent) => unique.set(String(agent.id), agent));
    return [...unique.values()];
  }, [agentById, agents]);

  const zoneVisualState = useCallback((zone: typeof ZONES[number]) => {
    if (!runtimeState && zone.id !== 'memory') return 'isContext';
    if (zone.id === 'memory') {
      if (spine && !spineStatus?.available) return 'isBlocked';
      if (!spine) return 'isContext';
      return Number(spineStatus?.state?.verificationDebt ?? 0) > 0 ? 'isAttention' : 'isReady';
    }
    if (zone.id === 'signal') {
      if (spine && !spineStatus?.available) return 'isBlocked';
      const surface = Array.isArray(spineStatus?.surfaces) ? spineStatus.surfaces.find((item: Row) => item.surface === 'WORLDSPECT') : null;
      if (!surface) return 'isContext';
      return surface.operationalCtConsumed === true ? 'isReady' : 'isContext';
    }
    if (zone.id === 'fragment') {
      if (twinOpenCount > 0 || focusOptions.some((item) => stateClass(item.status) === 'isBlocked')) return 'isAttention';
    }
    if (zone.id === 'core') return strongestState([runtimeState?.status, spineStatus?.available ? 'available' : spine ? 'unavailable' : 'connecting']);
    const assignedAgents = zoneAgents(zone);
    const layerStates = (zone.layers ?? []).map((id) => layerById.get(id)?.status);
    return strongestState([...assignedAgents.map((agent) => agent.status), ...layerStates]);
  }, [runtimeState, spine, spineStatus, twinOpenCount, focusOptions, zoneAgents, layerById]);

  const zoneIsLive = useCallback((zone: typeof ZONES[number]) => zoneAgents(zone).some((agent) => recentExecutionIds.has(String(agent.id))), [zoneAgents, recentExecutionIds]);
  const selectedZoneAgents = zoneAgents(selectedZone);
  const selectedZoneEvents = events.filter((event) => selectedZoneAgents.some((agent) => String(agent.id) === String(event.sourceId))).slice(0, 12);
  const lastSelectedAgentExecution = selectedAgent
    ? events.find((event) => event.eventName === 'SFI_AGENT_EXECUTED' && event.sourceId === selectedAgent.id) ?? null
    : null;

  const counts = useMemo(() => ({
    total: agents.length,
    operational: agents.filter((agent) => agent.status === 'operational').length,
    gated: agents.filter((agent) => agent.status === 'gated').length,
    degraded: agents.filter((agent) => agent.status === 'degraded').length,
    missing: agents.filter((agent) => agent.status === 'missing').length,
  }), [agents]);

  const runRootJob = async (job: RootJob) => {
    if (!canOperate || operationBusy) return;
    setOperationBusy(job);
    setOperationResult(null);
    try {
      const response = await fetch(`/api/root/operational/trigger-observation?job=${job}`, { method: 'POST' });
      const json = await response.json().catch(() => null);
      setOperationResult({ ok: response.ok && json?.ok !== false, status: response.status, job, ...(json ?? {}) });
      if (!response.ok) setError(`${response.status}: ${json?.error ?? 'root_operation_failed'}`);
      await pullReadModels();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setOperationBusy(null);
    }
  };

  const planQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!canOperate || planBusy || !question.trim()) return;
    setPlanBusy(true);
    setPlanResult(null);
    try {
      const response = await fetch('/api/root/cognitive-runtime', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });
      const json = await response.json().catch(() => null);
      setPlanResult({ ok: response.ok && json?.ok !== false, status: response.status, ...(json ?? {}) });
      if (!response.ok) setError(`${response.status}: ${json?.error ?? 'cognitive_plan_failed'}`);
      await pullReadModels();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPlanBusy(false);
    }
  };

  if (!open) {
    return <button className="csOpen" disabled={!enabled} onClick={() => setOpen(true)}>
      <span>ENTER COGNITIVE SPINE</span><small>LIVE PARK · {twinOpenCount} TWIN/CYCLOS · OBSERVE FIRST</small>
    </button>;
  }

  if (typeof document === 'undefined') return null;

  return createPortal(<section className="csOverlay" aria-label="Cognitive Spine live operational park">
    <header className="csHead">
      <div><small>SFI · ROOT · OBSERVATIONAL INSTRUMENT</small><strong>COGNITIVE SPINE / TWIN</strong></div>
      <div className="csHeadState">
        <span>{runtimeState ? `${counts.operational}/${counts.total} AGENTS OBSERVED` : 'RUNTIME UNOBSERVED'}</span>
        {runtimeState && <span>{counts.gated} GATED · {counts.degraded} DEGRADED · {counts.missing} MISSING</span>}
        <span>{spine ? (spineStatus?.available ? 'SPINE AVAILABLE' : 'SPINE UNAVAILABLE') : 'SPINE CONNECTING'}</span>
      </div>
      <div className="csHeadActions">
        <button className={panel === 'park' ? 'active' : ''} onClick={() => setPanel('park')}>PARK</button>
        <button className={panel === 'logbook' ? 'active' : ''} onClick={() => setPanel('logbook')}>LOGBOOK</button>
        <button className={panel === 'operate' ? 'active' : ''} onClick={() => setPanel('operate')}>OPERATE</button>
        <button onClick={() => setOpen(false)}>CLOSE</button>
      </div>
    </header>

    <div className="csFocusStrip">
      <div><small>OBSERVED OBJECT · NEVER LOST</small><strong>{focus?.title ?? 'SFI institutional state'}</strong><span>{focus ? `${focus.kind} · ${focus.status ?? 'state unknown'} · ${focus.detail ?? focus.id}` : 'No actionable object selected; anatomy remains institutional.'}</span></div>
      <div className="csFocusChoices">
        {focusOptions.slice(0, 8).map((item) => <button key={item.id} className={item.id === focus?.id ? 'active' : ''} onClick={() => setFocusId(item.id)}>{item.kind}</button>)}
      </div>
    </div>

    <div className="csParkShell">
      <div className="csParkStage">
        <picture className="csParkArt" aria-hidden="true">
          <source media="(max-width: 680px)" srcSet="/cognitive-spine/park-mobile.avif" />
          <source media="(max-width: 1100px)" srcSet="/cognitive-spine/park-tablet.avif" />
          <img src="/cognitive-spine/park-desktop.avif" alt="" draggable={false} />
        </picture>
        <div className="csAmbient" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
        <div className="csScan" aria-hidden="true"/>

        {ZONES.map((zone) => {
          const state = zoneVisualState(zone);
          const live = zoneIsLive(zone);
          const assigned = zoneAgents(zone);
          return <button
            key={zone.id}
            className={`csZone zone-${zone.id} ${state} ${live ? 'isLive' : ''} ${selectedZoneId === zone.id ? 'active' : ''}`}
            onClick={() => { setSelectedZoneId(zone.id); setSelectedAgentId(''); setPanel('park'); }}
            aria-label={`${zone.label}: ${zone.question}`}
          >
            <span className="csZoneRing"/>
            <small>{live ? 'LIVE' : state === 'isAttention' ? 'ATTN' : state === 'isBlocked' ? 'DEGRADED' : 'OBSERVE'}</small>
            <b>{assigned.length || (zone.id === 'memory' ? Number(spineStatus?.state?.memory ?? 0) : 0)}</b>
            <span className="csZoneAgents" aria-hidden="true">{assigned.slice(0, 7).map((agent) => <i key={agent.id} className={`${stateClass(agent.status)} ${recentExecutionIds.has(String(agent.id)) ? 'isLive' : ''}`}/>)}</span>
          </button>;
        })}
      </div>

      <aside className={`csInspector panel-${panel}`}>
        {panel === 'park' && <>
          <section className="csZoneReadout">
            <small>ATTRACTION / SYSTEM ORGAN</small>
            <h3>{selectedZone.label}</h3>
            <p>{selectedZone.question}</p>
            <div className="csStateRow"><span className={zoneVisualState(selectedZone)}>{zoneVisualState(selectedZone).replace('is', '').toUpperCase()}</span>{zoneIsLive(selectedZone) && <b>RECENT EXECUTION ≤15M</b>}</div>
          </section>

          <section>
            <small>{selectedAgent ? 'SELECTED AGENT' : 'AGENTS IN THIS ORGAN'}</small>
            {selectedAgent ? <>
              <h3>{short(selectedAgent.name, selectedAgent.id)}</h3>
              <p>{short(selectedAgent.purpose)}</p>
              <dl>
                <div><dt>status</dt><dd className={stateClass(selectedAgent.status)}>{short(selectedAgent.status)}</dd></div>
                <div><dt>layer</dt><dd>{short(selectedAgent.layer)}</dd></div>
                <div><dt>domain</dt><dd>{short(selectedAgent.domain)}</dd></div>
                <div><dt>authority</dt><dd>{short(selectedAgent.authorityLevel)}</dd></div>
                <div><dt>human gate</dt><dd>{selectedAgent.humanApprovalRequired ? 'YES' : 'NO'}</dd></div>
                <div><dt>last observed execution</dt><dd>{short(lastSelectedAgentExecution?.occurredAt, 'none in recent event window')}</dd></div>
              </dl>
              {Array.isArray(selectedAgent.evidence?.warnings) && selectedAgent.evidence.warnings.length > 0 && <div className="csWarnings">{selectedAgent.evidence.warnings.slice(0, 5).map((warning: string) => <span key={warning}>{warning}</span>)}</div>}
            </> : <div className="csAgentList">{selectedZoneAgents.map((agent) => <button key={agent.id} onClick={() => setSelectedAgentId(String(agent.id))}><b>{short(agent.name, agent.id)}</b><span className={stateClass(agent.status)}>{short(agent.status)}</span></button>)}</div>}
          </section>

          {selectedZoneId === 'core' || selectedZoneId === 'memory' ? <section>
            <small>SEALED SPINE SNAPSHOT</small>
            <dl>
              <div><dt>snapshot</dt><dd>{compactHash(spineStatus?.snapshot?.hash)}</dd></div>
              <div><dt>cutoff</dt><dd>{short(spineStatus?.snapshot?.sourceCutoff)}</dd></div>
              <div><dt>sources</dt><dd>{spineStatus?.state?.sources ?? '—'}</dd></div>
              <div><dt>evidence</dt><dd>{spineStatus?.state?.evidence ?? '—'}</dd></div>
              <div><dt>memory</dt><dd>{spineStatus?.state?.memory ?? '—'}</dd></div>
              <div><dt>decisions</dt><dd>{spineStatus?.state?.decisions ?? '—'}</dd></div>
              <div><dt>contradictions</dt><dd>{spineStatus?.state?.contradictions ?? '—'}</dd></div>
              <div><dt>verification debt</dt><dd>{spineStatus?.state?.verificationDebt ?? '—'}</dd></div>
            </dl>
          </section> : <section>
            <small>RECENT TRACE</small>
            <div className="csTraceList">{selectedZoneEvents.slice(0, 6).map((event) => <article key={event.eventId}><b>{short(event.eventName)}</b><span>{short(event.sourceId)} · {short(event.epistemicClass)}</span><small>{short(event.occurredAt)}</small></article>)}{!selectedZoneEvents.length && <em>No recent event attributed to this organ in the observed window.</em>}</div>
          </section>}
        </>}

        {panel === 'logbook' && <section className="csLogbookPanel">
          <small>VISIBLE INSTITUTIONAL LOGBOOK</small>
          <h3>BITÁCORA</h3>
          {!canOperate && <p>La lectura completa de esta bitácora se mantiene en ROOT soberano. Esta sesión conserva observabilidad del workboard, no eleva autoridad.</p>}
          {canOperate && <div className="csLogbookList">{logbook.slice(0, 40).map((entry) => <article key={entry.id}><header><b>{short(entry.title, entry.event_type)}</b><span>{short(entry.scope)}</span></header><p>{short(entry.summary, 'Sin resumen legible.')}</p><small>{short(entry.event_type)} · {short(entry.created_at)}</small></article>)}{!logbook.length && <em>No hay entradas visibles en la fuente actual.</em>}</div>}
        </section>}

        {panel === 'operate' && <>
          <section>
            <small>ROOT OPERATOR DOCK · EXISTING CONTRACTS ONLY</small>
            <h3>OBSERVE / PERSIST / CYCLE</h3>
            <p>Estos controles llaman al runner ROOT ya existente. No habilitan auto-dispatch, efectos externos, gasto, publicación ni promoción a canon.</p>
            {!canOperate && <p className="csError">ROOT sovereign authority required.</p>}
            <div className="csOperationGrid">
              <button disabled={!canOperate || Boolean(operationBusy)} onClick={() => void runRootJob('daily')}><b>{operationBusy === 'daily' ? 'RUNNING…' : 'OBSERVE'}</b><span>daily observation + persistence + institutional cycle</span></button>
              <button disabled={!canOperate || Boolean(operationBusy)} onClick={() => void runRootJob('reports')}><b>{operationBusy === 'reports' ? 'RUNNING…' : 'REPORTS'}</b><span>internal + public report agents</span></button>
              <button disabled={!canOperate || Boolean(operationBusy)} onClick={() => void runRootJob('audit')}><b>{operationBusy === 'audit' ? 'RUNNING…' : 'AUDIT'}</b><span>persistence audit + alerts</span></button>
              <button disabled={!canOperate || Boolean(operationBusy)} onClick={() => void runRootJob('all')}><b>{operationBusy === 'all' ? 'RUNNING…' : 'FULL CYCLE'}</b><span>all existing ROOT observation jobs</span></button>
            </div>
            {operationResult && <div className={`csOperationResult ${operationResult.ok ? 'isReady' : 'isBlocked'}`}><b>{operationResult.ok ? 'RETURN RECORDED / READ MODELS REFRESHED' : 'OPERATION DEGRADED'}</b><span>job {short(operationResult.job)} · HTTP {operationResult.status}</span><small>closure {short(operationResult.institutional_cycle?.closureState ?? operationResult.status, 'see result')}</small></div>}
          </section>

          <section>
            <small>META ORCHESTRATOR · PLAN ONLY</small>
            <h3>PLAN QUESTION</h3>
            <p>Persiste un `SFI_TASK_CREATED` y su task graph. Este control NO ejecuta el grafo ni convierte el plan en evidencia.</p>
            <form className="csPlanForm" onSubmit={planQuestion}>
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="¿Qué debe observar o descomponer SFI?" rows={4}/>
              <button disabled={!canOperate || planBusy || !question.trim()}>{planBusy ? 'PLANNING…' : 'CREATE TASK GRAPH'}</button>
            </form>
            {planResult && <div className={`csOperationResult ${planResult.ok ? 'isReady' : 'isBlocked'}`}><b>{planResult.ok ? 'PLAN PERSISTED · NOT EXECUTED' : 'PLAN DEGRADED'}</b><span>task {short(planResult.taskId)} · cycle {short(planResult.cycleId)}</span><small>logbook {short(planResult.logbookId)}</small></div>}
          </section>
        </>}

        <section className="csBoundary">
          <small>BOUNDARY</small>
          <p>Spine context is not evidence. Registration is not execution. Planning is not execution. Twin learning is not validation. External effects remain governed. ROOT canon remains a separate promotion.</p>
          <p>Latest trace in selected organ: {short(newestTimestamp(selectedZoneEvents), 'none observed')}</p>
          {error && <p className="csError">DEGRADED · {error}</p>}
        </section>
      </aside>
    </div>

    <footer className="csFooter">
      <span>OBSERVE</span><i>→</i><span>CONTEXT</span><i>→</i><span>AGENTS</span><i>→</i><span>EXECUTE</span><i>→</i><span>RETURN</span><i>→</i><strong>OBSERVE AGAIN</strong>
      <small>Decorative motion breathes continuously; status glows only react to observed state.</small>
    </footer>
  </section>, document.body);
}
