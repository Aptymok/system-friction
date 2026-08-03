'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import { RootActionStrip } from './RootActionStrip';
import { RootInspector } from './RootInspector';
import { RootMigratedWorkspace } from './RootMigratedWorkspace';
import { RootAgentsView } from './views/RootAgentsView';
import { RootAmvView } from './views/RootAmvView';
import { RootCognitiveRuntimeView } from './views/RootCognitiveRuntimeView';
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
import './root-cognitive-runtime.css';
import PpoiPhenomenonWizard from '@/components/root/PpoiPhenomenonWizard';

const VIEWS = new Set<RootViewId>(['overview', 'cognitive-runtime', 'governance', 'agents', 'predictions', 'amv', 'evidence', 'execution', 'telemetry']);
type EmbeddedView = Exclude<RootViewId, 'overview'>;

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
  const [embeddedView, setEmbeddedView] = useState<EmbeddedView | null>(null);
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
    const onPop = () => {
      setView(viewFromUrl());
      setEmbeddedView(null);
    };
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

  function changeView(next: RootViewId) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', next);
    window.history.pushState({}, '', url);
    setView(next);
    setEmbeddedView(null);
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

  function renderTool(target: EmbeddedView) {
    if (target === 'cognitive-runtime') return <RootCognitiveRuntimeView state={state} onSelect={setSelection} />;
    if (target === 'governance') return <RootGovernanceView {...props} />;
    if (target === 'agents') return <RootAgentsView {...props} />;
    if (target === 'predictions') return <RootPredictionsView {...props} />;
    if (target === 'amv') return <RootAmvView {...props} />;
    if (target === 'evidence') return <RootEvidenceAtlasView {...props} />;
    if (target === 'telemetry') return <RootPhenomenologicalObservatory onRefresh={() => void refresh()} />;
    return <RootExecutionView {...props} />;
  }

  const activeView = view === 'overview'
    ? (
      <RootOverviewView
        state={state}
        onSelect={setSelection}
        embeddedView={embeddedView}
        embeddedPanel={embeddedView ? renderTool(embeddedView) : null}
        onOpenPanel={setEmbeddedView}
        onClosePanel={() => setEmbeddedView(null)}
      />
    )
    : renderTool(view as EmbeddedView);

  return (
    <main className="rs-console is-migrated">
      <RootMigratedWorkspace
        view={view}
        state={state}
        refreshing={refreshing}
        warning={refreshWarning}
        onChange={changeView}
        onRefresh={() => void refresh()}
      >
        {activeView}
      </RootMigratedWorkspace>

      <RootInspector selection={selection} />
      <RootActionStrip events={events} stale={stale} warning={refreshWarning} />

      {showPpoiWizard ? (
        <PpoiPhenomenonWizard
          initialName={initialPpoiName}
          onCreated={(phenomenon) => {
            setShowPpoiWizard(false);
            window.location.href = `/root/phenomena/${phenomenon.id}`;
          }}
          onCancel={() => setShowPpoiWizard(false)}
        />
      ) : null}

      {showPpoiCandidates ? (
        <div className="rs-dialog-backdrop">
          <section className="rs-dialog">
            <h2>EXPEDIENTES SIMILARES</h2>
            {ppoiCandidates.map((candidate: any) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => { window.location.href = `/root/phenomena/${candidate.id}`; }}
              >
                {candidate.fp_code} - {candidate.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setShowPpoiCandidates(false);
                setShowPpoiWizard(true);
              }}
            >
              CREAR NUEVO EXPEDIENTE
            </button>
          </section>
        </div>
      ) : null}

      {pending ? (
        <div className="rs-dialog-backdrop" role="presentation">
          <section className="rs-dialog" role="dialog" aria-modal="true" aria-labelledby="rs-dialog-title">
            <span>CONFIRMACIÓN DE ACCIÓN</span>
            <h2 id="rs-dialog-title">{pending.label}</h2>
            <dl>
              <div><dt>QUÉ CAMBIARÁ</dt><dd>{pending.effect}</dd></div>
              <div><dt>SOBRE QUÉ</dt><dd>{pending.target}</dd></div>
              <div><dt>REGISTRO TÉCNICO</dt><dd>{pending.method} {pending.endpoint}</dd></div>
            </dl>
            <label className="rs-confirm">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              Confirmo esta acción y comprendo su objetivo.
            </label>
            <div className="rs-dialog-actions">
              <button type="button" onClick={() => { setPending(null); setConfirmed(false); }} disabled={running}>CANCELAR</button>
              <button type="button" onClick={() => void execute()} disabled={!confirmed || running}>{running ? 'EJECUTANDO' : 'CONFIRMAR Y EJECUTAR'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
