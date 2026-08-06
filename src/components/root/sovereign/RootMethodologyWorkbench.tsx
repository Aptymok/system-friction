'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import { resolveRootCaseMethodology } from '@/lib/mihm/rootCaseMethodology';
import type { RootActionRequest } from './sovereignTypes';
import './root-methodology-workbench.css';

type CommercialPayload = { opportunities?: RootRow[]; proposals?: RootRow[] };

function uniqueRows(rows: RootRow[]) {
  const seen = new Set<string>();
  return rows.filter((row, index) => {
    const id = String(row.id ?? row.case_id ?? row.opportunity_id ?? row.proposal_id ?? `row-${index}`);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function RootMethodologyWorkbench({ state, onAction }: {
  state: RootSovereignState;
  onAction: (action: RootActionRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [commercial, setCommercial] = useState<CommercialPayload>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/root/commercial', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
        if (active) setCommercial(body.data ?? {});
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'commercial_cases_unavailable');
      });
    return () => { active = false; };
  }, [state.generatedAt]);

  const cases = useMemo(() => uniqueRows([
    ...state.governance.data.proposals,
    ...(commercial.opportunities ?? []),
    ...(commercial.proposals ?? []),
  ]).map((row, index) => ({ row, methodology: resolveRootCaseMethodology(row, index) })), [commercial, state.governance.data.proposals]);

  const blocked = cases.filter((entry) => entry.methodology.resolution.status !== 'READY').length;
  const ppoi = cases.filter((entry) => entry.methodology.resolution.primary?.methodId === 'PPOI').length;

  return (
    <>
      <button className="rmw-trigger" type="button" onClick={() => setOpen(true)}>
        <span>MIHM</span>
        <strong>{cases.length}</strong>
        <small>{blocked ? `${blocked} bloqueados` : `${ppoi} PPOI`}</small>
      </button>

      {open ? (
        <div className="rmw-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="rmw-window" role="dialog" aria-modal="true" aria-labelledby="rmw-title">
            <header>
              <div>
                <span>SYSTEM FRICTION INSTITUTE · OPERACIONAL</span>
                <h2 id="rmw-title">Selección metodológica de casos</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}>CERRAR</button>
            </header>

            <div className="rmw-summary">
              <div><strong>{cases.length}</strong><span>casos observables</span></div>
              <div><strong>{ppoi}</strong><span>requieren PPOI</span></div>
              <div><strong>{blocked}</strong><span>con bloqueos</span></div>
            </div>

            {error ? <p className="rmw-error">Fuente comercial degradada: {error}</p> : null}

            <div className="rmw-list">
              {cases.length ? cases.map(({ row, methodology }) => {
                const resolution = methodology.resolution;
                const primary = resolution.primary?.methodId ?? 'NO DETERMINADO';
                return (
                  <article key={methodology.caseId} data-status={resolution.status.toLowerCase()}>
                    <div className="rmw-case-head">
                      <div>
                        <span>{methodology.caseId}</span>
                        <h3>{methodology.title}</h3>
                      </div>
                      <b>{resolution.status}</b>
                    </div>
                    <dl>
                      <div><dt>Método primario</dt><dd>{primary}</dd></div>
                      <div><dt>Instrumentos de apoyo</dt><dd>{resolution.supporting.map((item) => item.methodId).join(', ') || 'Ninguno'}</dd></div>
                      <div><dt>Confianza de selección</dt><dd>{Math.round(resolution.confidence * 100)}%</dd></div>
                      <div><dt>Próxima acción</dt><dd>{methodology.nextAction}</dd></div>
                    </dl>
                    <p>{resolution.rationale[0]}</p>
                    {resolution.blockers.length ? (
                      <ul>{resolution.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}</ul>
                    ) : null}
                    {primary === 'PPOI' && resolution.status === 'READY' ? (
                      <button type="button" onClick={() => onAction({
                        id: `ensure-ppoi-${methodology.caseId}-${Date.now()}`,
                        label: `Crear o enlazar PPOI · ${methodology.title}`,
                        effect: 'Busca un fenómeno PPOI equivalente y lo enlaza; si no existe, crea uno trazable y registra auditoría ROOT.',
                        target: methodology.caseId,
                        endpoint: '/api/root/methodology',
                        method: 'POST',
                        body: { intent: 'ensure_ppoi', case: row },
                      })}>CREAR O ENLAZAR PPOI</button>
                    ) : null}
                  </article>
                );
              }) : <p className="rmw-empty">No existen casos o propuestas persistidas para resolver.</p>}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
