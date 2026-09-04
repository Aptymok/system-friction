'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CognitiveSpinePark, type SfiParkFocus, type SfiParkState, type SfiParkZone } from '@/components/sfi/CognitiveSpinePark';

export type CognitiveSpineFocus = SfiParkFocus;
type Row = Record<string, any>;
type RootJob = 'daily' | 'reports' | 'audit' | 'all';
type TwinProjection = { spine?: Row | null; runtime?: Row | null; logbook?: Row | null };
type Props = {
  enabled: boolean;
  canOperate: boolean;
  focusOptions: CognitiveSpineFocus[];
  twinOpenCount: number;
  projection?: TwinProjection | null;
  onRefresh?: () => Promise<void> | void;
};

const ACTIVITY_WINDOW_MS = 15 * 60 * 1000;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item && typeof item === 'object')) : [];
}

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function state(value: unknown): SfiParkState {
  const current = String(value ?? '').toLowerCase();
  if (/missing|failed|blocked|critical|degraded|unavailable/.test(current)) return 'DEGRADED';
  if (/gated|queued|waiting|pending/.test(current)) return 'GATED';
  if (/operational|observed|accepted|recorded|connected|available|closed|completed/.test(current)) return 'READY';
  return 'UNOBSERVED';
}

export function CognitiveSpineAnatomy({ enabled, canOperate, focusOptions, twinOpenCount, projection, onRefresh }: Props) {
  const [spine, setSpine] = useState<Row | null>(projection?.spine ?? null);
  const [runtime, setRuntime] = useState<Row | null>(projection?.runtime ?? null);
  const [logbook, setLogbook] = useState<Row[]>(rows(projection?.logbook?.entries));
  const [focusId, setFocusId] = useState('');
  const [busy, setBusy] = useState<RootJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!focusOptions.length) {
      setFocusId('');
      return;
    }
    if (!focusOptions.some((item) => item.id === focusId)) setFocusId(focusOptions[0].id);
  }, [focusOptions, focusId]);

  const focus = focusOptions.find((item) => item.id === focusId) ?? focusOptions[0] ?? null;

  useEffect(() => {
    if (!projection) return;
    setSpine(projection.spine?.ok ? projection.spine : null);
    setRuntime(projection.runtime?.ok ? projection.runtime : null);
    setLogbook(projection.logbook?.ok ? rows(projection.logbook.entries) : []);
    setError(null);
  }, [projection]);

  // Compatibility fallback for older owners that have not yet supplied the shared
  // projection. The canonical SfiOperatingWorkspace/TWIN path always supplies it,
  // so this branch is never part of the zero-duplicate interactive read path.
  const pull = useCallback(async () => {
    if (!enabled || projection) return;
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/root/cognitive-spine/status', { cache: 'no-store' }),
        fetch('/api/root/cognitive-runtime', { cache: 'no-store' }),
      ];
      if (canOperate) requests.push(fetch('/api/logbook/visible?role=root', { cache: 'no-store' }));
      const responses = await Promise.all(requests);
      const json = await Promise.all(responses.map((response) => response.json().catch(() => null)));
      setSpine(responses[0].ok && json[0]?.ok ? json[0] : null);
      setRuntime(responses[1].ok && json[1]?.ok ? json[1] : null);
      setLogbook(canOperate && responses[2]?.ok && json[2]?.ok ? rows(json[2].entries) : []);
      const failures = responses.map((response, index) => !response.ok ? `${response.status}:${json[index]?.error ?? 'read_failed'}` : null).filter(Boolean);
      setError(failures.length ? failures.join(' · ') : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [enabled, canOperate, projection]);

  useEffect(() => {
    if (projection) return;
    void pull();
    const timer = window.setInterval(() => void pull(), 30000);
    return () => window.clearInterval(timer);
  }, [pull, projection]);

  const runtimeState = runtime?.runtime ?? null;
  const agents = rows(runtimeState?.agents);
  const events = rows(runtimeState?.eventGraph?.recentEvents);
  const spineStatus = spine?.status ?? null;
  const spineState = spineStatus?.state ?? {};
  const surfaces = rows(spineStatus?.surfaces);

  const recentAgentIds = useMemo(() => {
    const cutoff = Date.now() - ACTIVITY_WINDOW_MS;
    return new Set(events
      .filter((event) => event.eventName === 'SFI_AGENT_EXECUTED' && typeof event.occurredAt === 'string' && new Date(event.occurredAt).getTime() >= cutoff)
      .map((event) => String(event.sourceId ?? '')));
  }, [events]);

  const agentsFor = (ids: string[], layerIds: string[] = []) => agents.filter((agent) => ids.includes(String(agent.id)) || layerIds.includes(String(agent.layer)));

  const makeZone = (
    id: string,
    label: string,
    detail: string,
    x: number,
    y: number,
    assigned: Row[],
    fallback: SfiParkState = 'UNOBSERVED',
    count?: number,
  ): SfiParkZone => {
    const live = assigned.some((agent) => recentAgentIds.has(String(agent.id)));
    const states = assigned.map((agent) => state(agent.status));
    const resolved: SfiParkState = live ? 'LIVE' : states.includes('DEGRADED') ? 'DEGRADED' : states.includes('GATED') ? 'GATED' : states.includes('READY') ? 'READY' : fallback;
    return { id, label, detail, x, y, state: resolved, live, count: count ?? assigned.length };
  };

  const verificationDebt = Number(spineState?.verificationDebt ?? 0);
  const worldspect = surfaces.find((surface) => surface.surface === 'WORLDSPECT');

  const zones: SfiParkZone[] = [
    makeZone('observer', 'OBSERVER GATE', 'Observation + reconstruction. LIVE means a persisted SFI_AGENT_EXECUTED in the recent window.', 18, 19, agentsFor([], ['observe', 'reconstruct'])),
    {
      ...makeZone('memory', 'MEMORY BASIN', 'Sealed Spine context: memory, decisions, contradictions and verification debt. Context is not evidence.', 22, 43, agentsFor(['historical_scout', 'context_builder', 'reality_calibration'])),
      state: !spine ? 'UNOBSERVED' : !spineStatus?.available ? 'DEGRADED' : verificationDebt > 0 ? 'ATTENTION' : 'READY',
      count: verificationDebt,
    },
    makeZone('affective', 'AFFECTIVE LOOP', 'Maps the actual psychological simulator only. It does not claim emotion or phenomenal consciousness.', 78, 18, agentsFor(['psychological_simulator'])),
    {
      ...makeZone('signal', 'SIGNAL MARSH', 'World/context posture after observation. Prior context never upgrades a new signal to evidence.', 80, 43, agentsFor(['field_observer', 'cultural_simulator'])),
      state: worldspect?.operationalCtConsumed === true ? 'READY' : worldspect ? 'GATED' : 'UNOBSERVED',
    },
    makeZone('fragment', 'FRAGMENT DOCK', 'Governance, risk/opportunity and execution handoffs that still need integration or authority.', 80, 69, agentsFor([], ['decide', 'act']), twinOpenCount > 0 ? 'ATTENTION' : 'READY', twinOpenCount),
    {
      ...makeZone('core', 'COGNITIVE SPINE', 'Institutional sealed context + observed cognitive runtime. The Spine has no truth or canon authority.', 50, 49, agents, runtimeState ? state(runtimeState.status) : 'UNOBSERVED', agents.length),
      state: runtimeState ? state(runtimeState.status) : 'UNOBSERVED',
    },
    makeZone('return', 'EXECUTION / RETURN', 'Project execution and reality calibration. Execution is not complete until an observed RETURN exists.', 51, 78, agentsFor([], ['act', 'learn'])),
  ];

  const counts = {
    total: agents.length,
    operational: agents.filter((agent) => agent.status === 'operational').length,
    gated: agents.filter((agent) => agent.status === 'gated').length,
    degraded: agents.filter((agent) => agent.status === 'degraded').length,
    missing: agents.filter((agent) => agent.status === 'missing').length,
  };

  const run = async (job: RootJob) => {
    if (!canOperate || busy) return;
    setBusy(job);
    setNotice(null);
    try {
      const response = await fetch(`/api/root/operational/trigger-observation?job=${job}`, { method: 'POST' });
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.ok === false) throw new Error(`${response.status}: ${json?.error ?? 'root_operation_failed'}`);
      setNotice(`${job.toUpperCase()} · RETURNED`);
      if (onRefresh) await onRefresh();
      else await pull();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  };

  const inspector = (selected: SfiParkZone) => {
    const selectedAgents = selected.id === 'observer' ? agentsFor([], ['observe', 'reconstruct'])
      : selected.id === 'memory' ? agentsFor(['historical_scout', 'context_builder', 'reality_calibration'])
      : selected.id === 'affective' ? agentsFor(['psychological_simulator'])
      : selected.id === 'signal' ? agentsFor(['field_observer', 'cultural_simulator'])
      : selected.id === 'fragment' ? agentsFor([], ['decide', 'act'])
      : selected.id === 'return' ? agentsFor([], ['act', 'learn'])
      : agents;

    return <>
      <section>
        <small>OBSERVED AGENTS</small>
        <div className="sfiParkList">
          {selectedAgents.map((agent) => <article key={agent.id}>
            <b>{text(agent.name, text(agent.id))}</b>
            <span>{text(agent.status)} · {text(agent.layer)} · authority {text(agent.authorityLevel)}</span>
            <small>{recentAgentIds.has(String(agent.id)) ? 'RECENT SFI_AGENT_EXECUTED' : 'NO RECENT EXECUTION OBSERVED'}</small>
          </article>)}
          {!selectedAgents.length && <p>No observed/registered agents mapped to this organ.</p>}
        </div>
      </section>
      {selected.id === 'memory' && <section>
        <small>SPINE SNAPSHOT</small>
        <dl>
          <div><dt>HASH</dt><dd>{text(spineStatus?.snapshot?.hash)}</dd></div>
          <div><dt>CUTOFF</dt><dd>{text(spineStatus?.snapshot?.sourceCutoff)}</dd></div>
          <div><dt>SOURCES</dt><dd>{spineState?.sources ?? '—'}</dd></div>
          <div><dt>EVIDENCE</dt><dd>{spineState?.evidence ?? '—'}</dd></div>
          <div><dt>MEMORY</dt><dd>{spineState?.memory ?? '—'}</dd></div>
          <div><dt>DECISIONS</dt><dd>{spineState?.decisions ?? '—'}</dd></div>
          <div><dt>CONTRADICTIONS</dt><dd>{spineState?.contradictions ?? '—'}</dd></div>
          <div><dt>VERIFICATION DEBT</dt><dd>{verificationDebt}</dd></div>
        </dl>
      </section>}
      {selected.id === 'fragment' && canOperate && <section>
        <small>ROOT LOGBOOK</small>
        <div className="sfiParkList">
          {logbook.slice(0, 8).map((entry) => <article key={entry.id ?? `${entry.event_type}:${entry.created_at}`}>
            <b>{text(entry.title, text(entry.event_type, 'LOG'))}</b>
            <span>{text(entry.event_type)} · {text(entry.created_at)}</span>
            <small>{text(entry.summary)}</small>
          </article>)}
          {!logbook.length && <p>No visible log entries returned.</p>}
        </div>
      </section>}
    </>;
  };

  const toolbar = canOperate ? <>
    <button disabled={Boolean(busy)} onClick={() => void run('daily')}>OBSERVE + INSTITUTIONAL CYCLE</button>
    <button disabled={Boolean(busy)} onClick={() => void run('reports')}>GENERATE INSTITUTIONAL REPORTS</button>
    <button disabled={Boolean(busy)} onClick={() => void run('audit')}>PERSISTENCE AUDIT</button>
    <button disabled={Boolean(busy)} onClick={() => void run('all')}>FULL INTERNAL CYCLE</button>
    {notice && <p className="sfiParkNotice">{notice}</p>}
    {error && <p className="sfiParkNotice sfiParkError">DEGRADED · {error}</p>}
  </> : <p className="sfiParkNotice">OBSERVATIONAL AUTHORITY ONLY · no sovereign operation controls.</p>;

  return <CognitiveSpinePark
    enabled={enabled}
    mode="institutional"
    title="COGNITIVE SPINE / TWIN"
    subtitle="SFI institutional operating observatory · ROOT canon remains separate"
    focus={focus}
    focusOptions={focusOptions}
    onFocusChange={setFocusId}
    zones={zones}
    stats={[
      { label: 'AGENTS', value: runtimeState ? `${counts.operational}/${counts.total}` : 'UNOBSERVED', state: runtimeState ? 'READY' : 'UNOBSERVED' },
      { label: 'GATED', value: counts.gated, state: counts.gated ? 'ATTENTION' : 'READY' },
      { label: 'DEGRADED', value: counts.degraded + counts.missing, state: counts.degraded + counts.missing ? 'DEGRADED' : 'READY' },
      { label: 'TWIN/CYCLES', value: twinOpenCount, state: twinOpenCount ? 'ATTENTION' : 'READY' },
    ]}
    toolbar={toolbar}
    inspector={inspector}
    footer={<>OBSERVE <i>→</i> DIAGNOSE <i>→</i> PROPOSE <i>→</i> ROOT WHEN REQUIRED <i>→</i> EXECUTE <i>→</i> RETURN <i>→</i> CALIBRATE <i>→</i> <b>CANON ONLY BY ROOT</b></>}
  />;
}
