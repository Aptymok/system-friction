'use client';

import { useState } from 'react';
import './studio-secondary-instruments.css';

type ReconstructionResult = {
  summary?: string;
  relations?: unknown[];
  contradictions?: string[];
  missingEvidence?: string[];
  nextAction?: string;
};
type MasterResult = {
  ok?: boolean;
  error?: string;
  details?: string;
  passCount?: number;
  maxPasses?: number;
  convergence?: string;
  final?: {
    result?: {
      summary?: string | null;
      production?: { status?: string; reason?: string; blockers?: string[] };
      identity?: { status?: string; confidence?: number };
    };
    agents?: { executed?: string[] };
    llm?: { provider?: string | null; model?: string | null };
  };
};

export function StudioSecondaryInstruments({
  sessionId,
  activeObjectId,
  objectCount,
  objectTitle,
  objectType,
  analysisStatus,
}: {
  sessionId: string | null;
  activeObjectId: string | null;
  objectCount: number;
  objectTitle: string;
  objectType: string;
  analysisStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'reconstruct'|'master'|null>(null);
  const [reconstruction, setReconstruction] = useState<ReconstructionResult | null>(null);
  const [master, setMaster] = useState<MasterResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const masterEligible = Boolean(activeObjectId) && objectType === 'music' && analysisStatus === 'COMPLETE';

  async function reconstruct() {
    if (!sessionId || !activeObjectId) return;
    setBusy('reconstruct'); setError(null);
    try {
      const response = await fetch('/api/studio/session/reconstruct', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, activeObjectId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false) throw new Error(String(body?.details ?? body?.error ?? `HTTP ${response.status}`));
      setReconstruction(body.result ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(null); }
  }

  async function runMaster() {
    if (!activeObjectId || !masterEligible) return;
    setBusy('master'); setError(null);
    try {
      const response = await fetch(`/api/studio/objects/${encodeURIComponent(activeObjectId)}/master-analysis`, { method:'POST', credentials:'include' });
      const body = await response.json().catch(() => ({})) as MasterResult;
      if (!response.ok || body.ok === false) throw new Error(String(body.details ?? body.error ?? `HTTP ${response.status}`));
      setMaster(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(null); }
  }

  return (
    <div className="studio-secondary-instruments" data-open={open}>
      <button type="button" className="studio-secondary-instruments__launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>INSTRUMENTS</span><strong>{open ? 'CLOSE' : 'RECONSTRUCT / MASTER'}</strong>
      </button>
      {open ? (
        <div className="studio-secondary-instruments__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <aside className="studio-secondary-instruments__panel" aria-label="Studio secondary analysis instruments">
            <header><div><span>STUDIO / SECONDARY INSTRUMENTS</span><strong>Bounded reconstruction + finite master analysis</strong></div><button type="button" onClick={() => setOpen(false)}>×</button></header>
            <div className="studio-secondary-instruments__scroll">
              <section className="studio-secondary-instruments__instrument">
                <span>RELATIONAL RECONSTRUCTION</span>
                <h2>Reconstruct the selected field</h2>
                <p>{objectCount} persisted objects are available under the current owner. The runtime may reconstruct relations, contradictions and missing evidence; it cannot import another account or manufacture lineage.</p>
                <button type="button" onClick={() => void reconstruct()} disabled={!sessionId || !activeObjectId || Boolean(busy)}>{busy === 'reconstruct' ? 'RECONSTRUCTING…' : 'RECONSTRUCT FIELD'}</button>
                {reconstruction ? <div className="studio-secondary-instruments__result"><strong>{reconstruction.summary ?? 'RECONSTRUCTION COMPLETE'}</strong><div><span>RELATIONS {reconstruction.relations?.length ?? 0}</span><span>CONTRADICTIONS {reconstruction.contradictions?.length ?? 0}</span><span>MISSING {reconstruction.missingEvidence?.length ?? 0}</span></div>{reconstruction.nextAction ? <p>NEXT · {reconstruction.nextAction}</p> : null}</div> : null}
              </section>

              <section className="studio-secondary-instruments__instrument">
                <span>FINITE MASTER ANALYSIS</span>
                <h2>{objectTitle || 'NO OBJECT'}</h2>
                <p>For analyzed music objects only. Executes a bounded 2–3 pass cognitive analysis and closes when structural state stabilizes or the pass budget is exhausted. No open autonomous loop.</p>
                <button type="button" onClick={() => void runMaster()} disabled={!masterEligible || Boolean(busy)}>{busy === 'master' ? 'ANALYZING…' : masterEligible ? 'RUN 2–3 PASS ANALYSIS' : `BLOCKED · ${analysisStatus}`}</button>
                {master?.ok ? <div className="studio-secondary-instruments__result"><strong>{master.final?.result?.summary ?? 'MASTER ANALYSIS COMPLETE'}</strong><div><span>PASSES {master.passCount ?? '—'}/{master.maxPasses ?? 3}</span><span>CLOSURE {master.convergence ?? '—'}</span><span>PRODUCTION {master.final?.result?.production?.status ?? '—'}</span><span>IDENTITY {master.final?.result?.identity?.status ?? '—'}</span><span>AGENTS {master.final?.agents?.executed?.length ?? 0}</span></div>{master.final?.result?.production?.reason ? <p>{master.final.result.production.reason}</p> : null}</div> : null}
              </section>
              {error ? <div className="studio-secondary-instruments__error">{error}</div> : null}
            </div>
            <footer>SECONDARY INSTRUMENT ≠ STUDIO ENTRY · FINITE EXECUTION · OWNER-SCOPED</footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
