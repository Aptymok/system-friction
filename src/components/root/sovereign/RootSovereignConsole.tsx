'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection, RootSessionEvent } from './sovereignTypes';
import { RootGovernanceObservatory } from './RootGovernanceObservatory';
import './root-sovereign.css';

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
  const [selection, setSelection] = useState<RootSelection | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [pending, setPending] = useState<RootActionRequest | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<RootSessionEvent[]>([]);
  const controller = useRef<AbortController | null>(null);
  const refreshSequence = useRef(0);

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
    } catch (error) {
      if (sequence !== refreshSequence.current) return;
      const reason = abortReason(next.signal);
      if (reason === 'superseded' || reason === 'unmount') return;
      setRefreshWarning(reason === 'timeout' ? 'No fue posible actualizar a tiempo.' : error instanceof Error ? error.message : 'No fue posible actualizar ROOT.');
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
      const detail = typeof body.body === 'string'
        ? body.body.slice(0, 420)
        : typeof body.user_friendly_explanation === 'string'
          ? body.user_friendly_explanation.slice(0, 420)
          : 'La operación terminó correctamente.';
      setEvents((current) => current.map((event) => event.id === started.id ? { ...event, status: 'done', detail, auditId: auditId(body) } : event));
      setPending(null);
      setConfirmed(false);
      await refresh();
    } catch (error) {
      setEvents((current) => current.map((event) => event.id === started.id ? { ...event, status: 'blocked', detail: error instanceof Error ? error.message : 'La operación no pudo completarse.', auditId: null } : event));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="rs-console is-governance-observatory">
      <RootGovernanceObservatory
        state={state}
        refreshing={refreshing}
        warning={refreshWarning}
        onRefresh={() => void refresh()}
        onSelect={setSelection}
        onAction={(action) => {
          setPending(action);
          setConfirmed(false);
        }}
      />

      {selection ? (
        <div className="rs-selection-announcement" aria-live="polite">
          Punto seleccionado: {selection.title}
        </div>
      ) : null}

      {events.length ? (
        <div className="rs-root-events" aria-live="polite">
          {events.slice(0, 3).map((event) => (
            <div key={event.id} data-status={event.status}>
              <strong>{event.label}</strong>
              <span>{event.detail}</span>
            </div>
          ))}
        </div>
      ) : null}

      {pending ? (
        <div className="rs-dialog-backdrop" role="presentation">
          <section className="rs-dialog" role="dialog" aria-modal="true" aria-labelledby="rs-dialog-title">
            <span>REVISAR ANTES DE EJECUTAR</span>
            <h2 id="rs-dialog-title">{pending.label}</h2>
            <dl>
              <div><dt>QUÉ HARÁ</dt><dd>{pending.effect}</dd></div>
              <div><dt>SOBRE QUÉ</dt><dd>{pending.target}</dd></div>
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
