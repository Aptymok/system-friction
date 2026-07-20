'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import { RootActionStrip } from './RootActionStrip';
import { RootInspector } from './RootInspector';
import { RootModuleRail } from './RootModuleRail';
import { RootTopBar } from './RootTopBar';
import { RootAgentsView } from './views/RootAgentsView';
import { RootAmvView } from './views/RootAmvView';
import { RootEvidenceAtlasView } from './views/RootEvidenceAtlasView';
import { RootExecutionView } from './views/RootExecutionView';
import { RootGovernanceView } from './views/RootGovernanceView';
import { RootOverviewView } from './views/RootOverviewView';
import { RootPredictionsView } from './views/RootPredictionsView';
import { RootPhenomenologicalObservatory } from './views/RootPhenomenologicalObservatory';
import type { RootActionRequest, RootSelection, RootSessionEvent, RootViewId } from './sovereignTypes';
import './root-sovereign.css';
import './root-action-strip.css';
import './root-prediction.css';
import './root-telemetry.css';
import './root-phenomenological-observatory.css';
import PpoiPhenomenonWizard from '@/components/root/PpoiPhenomenonWizard';


const VIEWS = new Set<RootViewId>(['overview', 'governance', 'agents', 'predictions', 'amv', 'evidence', 'execution', 'telemetry']);

function viewFromUrl(): RootViewId {
  if (typeof window === 'undefined') return 'overview';
  const value = new URLSearchParams(window.location.search).get('view') as RootViewId | null;
  return value && VIEWS.has(value) ? value : 'overview';
}

function auditId(body: Record<string, unknown>) {
  const audit = body.audit && typeof body.audit === 'object' ? body.audit as Record<string, unknown> : null;
  const row = audit?.audit && typeof audit.audit === 'object' ? audit.audit as Record<string, unknown> : audit;
  return typeof row?.id === 'string' ? row.id : null;
}

function abortReason(signal: AbortSignal) {
  return typeof signal.reason === 'string' ? signal.reason : null;
}

export function RootSovereignConsole({ initialState }: { initialState: RootSovereignState }) {
  const [state, setState] = useState(initialState);
  const [view, setView] = useState<RootViewId>('overview');
  const [selection, setSelection] = useState<RootSelection | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [pending, setPending] = useState<RootActionRequest | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<RootSessionEvent[]>([]);
  const [showPpoiWizard, setShowPpoiWizard] = useState(false);
  const [initialPpoiName, setInitialPpoiName] = useState('');
  const [ppoiCandidates, setPpoiCandidates] = useState<any[]>([]);
  const [showPpoiCandidates, setShowPpoiCandidates] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const refreshSequence = useRef(0);

  useEffect(() => {
    setView(viewFromUrl());
    const onPop = () => setView(viewFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const refresh = useCallback(async () => {
    if (document.hidden) return;
    const sequence = ++refreshSequence.current;
    controller.current?.abort('superseded');
    const next = new AbortController();
    controller.current = next;
    const timeout = window.setTimeout(() => next.abort('timeout'), 8000);
    setRefreshing(true);

    try {
      const response = await fetch('/api/root/console', {
        cache: 'no-store',
        credentials: 'include',
        signal: next.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok || !body.state) throw new Error(body?.error ?? `HTTP ${response.status}`);
      if (sequence !== refreshSequence.current) return;
      setState(body.state);
      setRefreshWarning(null);
      setStale(false);
    } catch (error) {
      if (sequence !== refreshSequence.current) return;
      const reason = abortReason(next.signal);
      if (reason === 'superseded' || reason === 'unmount') return;
      setRefreshWarning(reason === 'timeout' ? 'ROOT_CONSOLE_REFRESH_TIMEOUT' : error instanceof Error ? error.message : 'refresh_failed');
      setStale(true);
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === next) {
        controller.current = null;
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', visible);
      refreshSequence.current += 1;
      controller.current?.abort('unmount');
    };
  }, [refresh]);

async function openPpoiCase(name:string) {

  const response =
    await fetch('/api/ppoi/phenomena', {
      method:'POST',
      credentials:'include',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        name,
        resolveOnly:true
      })
    });


  const data =
    await response.json();


  if(data.action === 'OPEN_EXISTING') {

    window.location.href =
      `/root/phenomena/${data.phenomenon.id}`;

    return;
  }


  if(data.action === 'SELECT_EXISTING') {

    setPpoiCandidates(
      data.candidates ?? []
    );

    setShowPpoiCandidates(true);

    return;
  }


  setInitialPpoiName(name);
  setShowPpoiWizard(true);

}

  function changeView(next: RootViewId) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', next);
    window.history.pushState({}, '', url);
    setView(next);
    setSelection(null);
  }

  async function execute() {
    if (!pending || !confirmed || running) return;
    const action = pending;
    setRunning(true);
    const started: RootSessionEvent = {
      id: `${action.id}-${Date.now()}`,
      at: new Date().toISOString(),
      label: action.label,
      status: 'running',
      detail: action.effect,
      auditId: null,
    };
    setEvents((current) => [started, ...current].slice(0, 30));
    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: action.body ? JSON.stringify(action.body) : undefined,
      });
      const body = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (!response.ok || !body || body.ok !== true) throw new Error(String(body?.error ?? `HTTP ${response.status}`));
      const detail = JSON.stringify(body).slice(0, 420);
      setEvents((current) => current.map((event) => event.id === started.id ? { ...event, status: 'done', detail, auditId: auditId(body) } : event));
      setPending(null);
      setConfirmed(false);
      await refresh();
    } catch (error) {
      setEvents((current) => current.map((event) => event.id === started.id ? { ...event, status: 'blocked', detail: error instanceof Error ? error.message : 'action_failed' } : event));
    } finally {
      setRunning(false);
    }
  }

  const props = {
    state,
    onSelect: setSelection,
    onAction: (action: RootActionRequest) => {
      setPending(action);
      setConfirmed(false);
    },
  };

  if (view === 'telemetry') {
    return (
      <RootPhenomenologicalObservatory
        state={state}
        onExit={() => changeView('overview')}
        onRefresh={() => void refresh()}
      />
    );
  }

  return (
    <main className="rs-console">
      <RootTopBar state={state} refreshing={refreshing} onRefresh={() => void refresh()} />
      <RootModuleRail active={view} onChange={changeView} />
      <section className="rs-instrument" aria-live="polite">
        {view === 'overview' ? <RootOverviewView state={state} onSelect={setSelection} />
          : view === 'governance' ? <RootGovernanceView {...props} />
            : view === 'agents' ? <RootAgentsView {...props} />
              : view === 'predictions' ? <RootPredictionsView {...props} />
                : view === 'amv' ? <RootAmvView {...props} />
                  : view === 'evidence' ? <RootEvidenceAtlasView {...props} />
                    : <RootExecutionView {...props} />}
      </section>
      <RootInspector selection={selection} />
      <RootActionStrip events={events} stale={stale} warning={refreshWarning} />
      {
showPpoiWizard && (

<PpoiPhenomenonWizard

initialName={initialPpoiName}

onCreated={(phenomenon)=>{

setShowPpoiWizard(false);

window.location.href =
`/root/phenomena/${phenomenon.id}`;

}}

onCancel={()=>{

setShowPpoiWizard(false);

}}

/>

)
}
{
showPpoiCandidates && (

<div className="rs-dialog-backdrop">

<section className="rs-dialog">

<h2>
EXPEDIENTES SIMILARES
</h2>


{
ppoiCandidates.map(
(candidate:any)=>(

<button
key={candidate.id}
type="button"
onClick={()=>{

window.location.href =
`/root/phenomena/${candidate.id}`;

}}
>

{candidate.fp_code}
-
{candidate.name}

</button>

)
)
}


<button
type="button"
onClick={()=>{

setShowPpoiCandidates(false);

setShowPpoiWizard(true);

}}
>
CREAR NUEVO EXPEDIENTE
</button>


</section>

</div>

)
}

      {pending ? (
        <div className="rs-dialog-backdrop" role="presentation">
          <section className="rs-dialog" role="dialog" aria-modal="true" aria-labelledby="rs-dialog-title">
            <span>MUTATION CONFIRMATION</span>
            <h2 id="rs-dialog-title">{pending.label}</h2>
            <dl>
              <div><dt>EFFECT</dt><dd>{pending.effect}</dd></div>
              <div><dt>TARGET</dt><dd>{pending.target}</dd></div>
              <div><dt>ROUTE</dt><dd>{pending.method} {pending.endpoint}</dd></div>
            </dl>
            <label className="rs-confirm">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              Confirmo explícitamente esta mutación y su objetivo.
            </label>
            <div className="rs-dialog-actions">
              <button type="button" onClick={() => { setPending(null); setConfirmed(false); }} disabled={running}>CANCEL</button>
              <button type="button" onClick={() => void execute()} disabled={!confirmed || running}>{running ? 'EXECUTING' : 'CONFIRM AND EXECUTE'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
