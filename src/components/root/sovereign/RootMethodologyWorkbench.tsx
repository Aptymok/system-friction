'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import './root-methodology-workbench.css';

type MethodologyState = {
  caseId: string;
  title: string;
  disposition: 'LINKED_EXISTING' | 'REGISTERED_AUTOMATICALLY' | 'PENDING_AUTOMATIC' | 'BLOCKED' | 'NOT_REQUIRED';
  referenceCaseId: string | null;
  referenceCaseCode: string | null;
  blocker: string | null;
  methodology: {
    input: { subject: string; temporalScope: string; evidenceCount?: number; evidenceModalities: string[] };
    resolution: {
      status: string;
      primary: { methodId: string; reasonCodes: string[] } | null;
      supporting: Array<{ methodId: string }>;
      blockers: Array<{ code: string; message: string }>;
      rationale: string[];
    };
  };
};

type MethodologyPayload = { cases: MethodologyState[]; warnings: string[] };

function dispositionLabel(value: MethodologyState['disposition']) {
  if (value === 'LINKED_EXISTING') return 'PPOI ENLAZADO';
  if (value === 'REGISTERED_AUTOMATICALLY') return 'PPOI REGISTRADO';
  if (value === 'PENDING_AUTOMATIC') return 'PENDIENTE DE CICLO';
  if (value === 'BLOCKED') return 'BLOQUEADO';
  return 'PPOI NO REQUERIDO';
}

export function RootMethodologyWorkbench({ state, launcher = true }: { state: RootSovereignState; launcher?: boolean }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<MethodologyPayload>({ cases: [], warnings: [] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const openFromRoot = () => setOpen(true);
    window.addEventListener('sfi:open-methodology', openFromRoot);
    return () => window.removeEventListener('sfi:open-methodology', openFromRoot);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/root/methodology', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
        if (active) { setPayload(body.data ?? { cases: [], warnings: [] }); setError(null); }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'methodology_state_unavailable'); });
    return () => { active = false; };
  }, [state.generatedAt]);

  const summary = useMemo(() => ({
    total: payload.cases.length,
    ppoi: payload.cases.filter((entry) => ['LINKED_EXISTING', 'REGISTERED_AUTOMATICALLY'].includes(entry.disposition)).length,
    pending: payload.cases.filter((entry) => entry.disposition === 'PENDING_AUTOMATIC').length,
    blocked: payload.cases.filter((entry) => entry.disposition === 'BLOCKED').length,
  }), [payload.cases]);

  return (
    <>
      {launcher ? <button className="rmw-trigger" type="button" onClick={() => setOpen(true)}>
        <span>MIHM</span><strong>{summary.total}</strong><small>{summary.blocked ? `${summary.blocked} bloqueados` : summary.pending ? `${summary.pending} pendientes de ciclo` : `${summary.ppoi} PPOI persistidos`}</small>
      </button> : null}

      {open ? (
        <div className="rmw-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="rmw-window" role="dialog" aria-modal="true" aria-labelledby="rmw-title">
            <header><div><span>SYSTEM FRICTION INSTITUTE · OPERACIONAL</span><h2 id="rmw-title">Resolución metodológica automática</h2></div><button type="button" onClick={() => setOpen(false)}>CERRAR</button></header>
            <div className="rmw-summary">
              <div><strong>{summary.total}</strong><span>registros evaluados</span></div>
              <div><strong>{summary.ppoi}</strong><span>PPOI persistidos</span></div>
              <div><strong>{summary.blocked}</strong><span>bloqueos reales</span></div>
            </div>
            {summary.pending ? <p className="rmw-error">{summary.pending} selección(es) PPOI están listas para reconciliarse en el siguiente ciclo institucional; todavía no se presentan como persistidas.</p> : null}
            {error ? <p className="rmw-error">Estado metodológico no disponible: {error}</p> : null}
            {payload.warnings.length ? <p className="rmw-error">{payload.warnings.slice(0, 4).join(' · ')}</p> : null}

            <div className="rmw-list">
              {payload.cases.length ? payload.cases.map((entry) => {
                const resolution = entry.methodology.resolution;
                const primary = resolution.primary?.methodId ?? 'NO DETERMINADO';
                return (
                  <article key={entry.caseId} data-status={entry.disposition === 'BLOCKED' ? 'blocked' : 'ready'}>
                    <div className="rmw-case-head"><div><span>{entry.caseId}</span><h3>{entry.title}</h3></div><b>{dispositionLabel(entry.disposition)}</b></div>
                    <dl>
                      <div><dt>Método primario</dt><dd>{primary}</dd></div>
                      <div><dt>Razón contractual</dt><dd>{resolution.primary?.reasonCodes.join(', ') || 'Sin resolución suficiente'}</dd></div>
                      <div><dt>Evidencia declarada</dt><dd>{entry.methodology.input.evidenceCount ?? 0}</dd></div>
                      <div><dt>Instrumentos de apoyo</dt><dd>{resolution.supporting.map((item) => item.methodId).join(', ') || 'Ninguno'}</dd></div>
                      <div><dt>Estado PPOI</dt><dd>{entry.referenceCaseCode ?? dispositionLabel(entry.disposition)}</dd></div>
                    </dl>
                    <p>{entry.blocker ?? resolution.rationale[0] ?? 'Sin explicación persistida.'}</p>
                    {resolution.blockers.length ? <ul>{resolution.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}</ul> : null}
                    <p className="rmw-auto-note">El ciclo institucional resuelve la creación o enlace PPOI. ROOT sólo expone persistencia, espera de ciclo o bloqueo; no delega una decisión rutinaria al fundador.</p>
                  </article>
                );
              }) : <p className="rmw-empty">No existen registros persistidos para resolver metodológicamente en este corte.</p>}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
