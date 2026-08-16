'use client';

import { useState } from 'react';
import type { MethodLabState } from '@/lib/method-lab/readModel';

type DecisionTransferState = MethodLabState['decisionTransfer'];
type RunResponse = {
  ok?: boolean;
  error?: string;
  details?: string;
  taskId?: string;
  runId?: string;
  evaluationId?: string;
  labAnalysisId?: string;
  operationKey?: string;
  provider?: string;
  model?: string;
  outcome?: string;
  claimBoundary?: string;
  evaluation?: {
    pass?: boolean;
    holdout?: { validatedDecisionAccuracy?: number; validatedMeanStructuralFidelity?: number; validatedTraceCount?: number };
    counterfactual?: { validatedTargetDispositionAccuracy?: number; validatedExpectedSwitchCount?: number };
    promotion?: { maturity?: string; qualifyingSupportCount?: number; qualifyingCounterexampleCount?: number; mayAutoPromoteToRule?: boolean };
  };
};

function pct(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
}

export function DecisionTransferObservatory({ initial }: { initial: DecisionTransferState }) {
  const [state, setState] = useState(initial);
  const [payload, setPayload] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch('/api/root/method-lab', { credentials: 'include', cache: 'no-store' });
    const body = await response.json().catch(() => null) as { ok?: boolean; lab?: MethodLabState } | null;
    if (response.ok && body?.ok && body.lab?.decisionTransfer) setState(body.lab.decisionTransfer);
  }

  async function evaluate() {
    if (!payload.trim() || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch {
        throw new Error('El envelope no es JSON válido.');
      }
      const response = await fetch('/api/root/method-lab/decision-transfer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const body = await response.json().catch(() => null) as RunResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setResult(body);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'DECISION_TRANSFER_EVALUATION_FAILED');
    } finally {
      setRunning(false);
    }
  }

  const latest = state.latest;

  return (
    <section className="dto-root" aria-labelledby="dto-title">
      <header className="dto-header">
        <div>
          <span>PHASE II · DECISION TRANSFER OBSERVATORY</span>
          <h2 id="dto-title">Transferencia decisional observable.</h2>
          <p>Compara una reconstrucción retenida contra la decisión revelada y separa acierto final, fidelidad estructural, frontera contrafactual y madurez operacional. Un PASS sigue siendo una medición derivada; no promueve memoria, regla ni autoridad.</p>
        </div>
        <div className="dto-state" data-status={state.status}>
          <small>ESTADO</small>
          <strong>{state.status}</strong>
        </div>
      </header>

      <div className="dto-metrics">
        <article><small>EVALUACIONES</small><strong>{state.totalEvaluations}</strong></article>
        <article><small>PASS</small><strong>{state.passCount}</strong></article>
        <article><small>FAIL</small><strong>{state.failCount}</strong></article>
        <article><small>BLOCKED</small><strong>{state.blockedCount}</strong></article>
        <article><small>FIDELIDAD ESTRUCTURAL</small><strong>{pct(latest?.structuralFidelity)}</strong></article>
        <article><small>CONTRAFACTUAL</small><strong>{pct(latest?.counterfactualAccuracy)}</strong></article>
      </div>

      <div className="dto-rules">
        <article><span>VALIDACIÓN</span><p>{state.validationRule}</p></article>
        <article><span>AUTORIDAD</span><p>{state.authorityRule}</p></article>
      </div>

      {latest ? (
        <article className="dto-latest">
          <div className="dto-latest-head">
            <div><span>ÚLTIMA EVALUACIÓN</span><h3>{latest.operationKey || 'OPERACIÓN NO DECLARADA'}</h3></div>
            <b data-outcome={latest.outcome}>{latest.outcome}</b>
          </div>
          <div className="dto-latest-grid">
            <div><small>PROVIDER / MODEL</small><strong>{latest.provider} / {latest.model}</strong></div>
            <div><small>DECISIÓN</small><strong>{pct(latest.decisionAccuracy)}</strong></div>
            <div><small>ESTRUCTURA</small><strong>{pct(latest.structuralFidelity)}</strong></div>
            <div><small>OPERACIONES</small><strong>{pct(latest.operationSimilarity)}</strong></div>
            <div><small>VARIABLES</small><strong>{pct(latest.variableSimilarity)}</strong></div>
            <div><small>FRONTERA</small><strong>{pct(latest.counterfactualAccuracy)}</strong></div>
            <div><small>TRAZAS VALIDADAS</small><strong>{latest.validatedTraceCount ?? 0}</strong></div>
            <div><small>SWITCHES VALIDADOS</small><strong>{latest.validatedBoundarySwitchCount ?? 0}</strong></div>
            <div><small>MADUREZ</small><strong>{latest.maturity ?? 'CANDIDATE'}</strong></div>
            <div><small>DOMINIOS</small><strong>{latest.qualifyingDomains.length || 0}</strong></div>
            <div><small>CONTRAEJEMPLOS</small><strong>{latest.counterexampleCount ?? 0}</strong></div>
            <div><small>AUTO-PROMOTION</small><strong>{latest.mayAutoPromoteToRule ? 'INVALID STATE' : 'NO'}</strong></div>
          </div>
        </article>
      ) : (
        <div className="dto-empty">AÚN NO EXISTE UNA EVALUACIÓN DECISION_TRANSFER PERSISTIDA. EL ESTADO VACÍO ES EXPLÍCITO.</div>
      )}

      <div className="dto-run">
        <div>
          <span>ROOT · POST-REVEAL SCORING</span>
          <h3>Evaluar un experimento preparado.</h3>
          <p>El envelope debe contener trazas y referencias reales del experimento. Esta superficie no fabrica ejemplos ni llama a un modelo para conseguir un PASS. La reconstrucción debe haberse producido con la decisión objetivo retenida.</p>
          <details>
            <summary>CONTRATO DE ENTRADA</summary>
            <pre>{`{
  "provider": "...",
  "model": "...",
  "operationKey": "...",
  "expected": [DecisionTrace],
  "predicted": [DecisionReconstruction],
  "occurrences": [OperationOccurrence],
  "counterfactualProbes": [CounterfactualProbe],
  "boundaryProbeCount": 0,
  "thresholds": { ... } // opcional
}`}</pre>
          </details>
        </div>
        <div className="dto-form">
          <label>EXPERIMENT ENVELOPE · JSON
            <textarea value={payload} onChange={(event) => setPayload(event.target.value)} placeholder="Pegue aquí el envelope construido a partir de un experimento real. No se precargan datos ficticios." spellCheck={false} />
          </label>
          <button type="button" disabled={running || !payload.trim()} onClick={() => void evaluate()}>{running ? 'EVALUANDO…' : 'EVALUAR Y PERSISTIR'}</button>
        </div>
      </div>

      {result?.ok ? (
        <div className="dto-result">
          <strong>{result.outcome}</strong>
          <span>{result.operationKey}</span>
          <small>evaluation {result.evaluationId}</small>
          <small>run {result.runId}</small>
          <small>lab {result.labAnalysisId}</small>
          <p>{result.claimBoundary}</p>
        </div>
      ) : null}
      {error ? <div className="dto-error">{error}</div> : null}
      {state.warning ? <div className="dto-error">{state.warning}</div> : null}

      {state.recent.length ? (
        <details className="dto-history">
          <summary>HISTORIAL RECIENTE · {state.recent.length}</summary>
          <div>
            {state.recent.map((item) => (
              <article key={item.id}>
                <b>{item.outcome}</b><span>{item.operationKey}</span><small>{item.provider}/{item.model}</small><small>{item.executedAt ?? 'sin timestamp'}</small><em>{pct(item.structuralFidelity)}</em>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <style jsx>{`
        .dto-root{background:#071018;color:#e8edf0;border-top:1px solid #33495c;border-bottom:1px solid #33495c;padding:28px 30px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.dto-header{display:flex;justify-content:space-between;gap:30px;align-items:flex-start}.dto-header>div:first-child{max-width:920px}.dto-header span,.dto-rules span,.dto-run>div>span,.dto-latest-head span{font-size:8px;letter-spacing:.16em;color:#c8aa6d}.dto-header h2{font:400 clamp(28px,3vw,42px)/1 Georgia,serif;color:#f4f6f7;margin:8px 0 11px}.dto-header p,.dto-run p{font:13px/1.6 Georgia,serif;color:#91a0ac;margin:0}.dto-state{border:1px solid #33495c;background:#0c1822;padding:12px 15px;min-width:130px}.dto-state small,.dto-metrics small,.dto-latest-grid small{display:block;font-size:7px;letter-spacing:.12em;color:#8195a3}.dto-state strong{display:block;margin-top:7px;color:#d8c38e;font-size:10px}.dto-state[data-status=OBSERVED] strong{color:#9fbea9}.dto-state[data-status=DEGRADED] strong{color:#d19380}.dto-metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:1px;background:#2c4253;margin:18px 0}.dto-metrics article{background:#0b161f;padding:12px}.dto-metrics strong{display:block;margin-top:7px;font-size:15px;color:#e7d3a1}.dto-rules{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dto-rules article{border:1px solid #263a4a;background:#0c1720;padding:14px}.dto-rules p{margin:7px 0 0;font:11px/1.55 Georgia,serif;color:#98a6af}.dto-latest{border:1px solid #33495c;background:#0b161f;padding:17px;margin-top:14px}.dto-latest-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.dto-latest-head h3,.dto-run h3{font:400 22px Georgia,serif;color:#f0f3f5;margin:6px 0 0}.dto-latest-head b{border:1px solid #526778;padding:7px 10px;font-size:8px;color:#9aaab5}.dto-latest-head b[data-outcome=PASS]{color:#9fbea9;border-color:#526e5e}.dto-latest-head b[data-outcome=FAIL]{color:#d19380;border-color:#744e47}.dto-latest-head b[data-outcome=BLOCKED]{color:#d4bd83;border-color:#6f6041}.dto-latest-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:15px}.dto-latest-grid>div{border-top:1px solid #263a4a;padding-top:8px;min-width:0}.dto-latest-grid strong{display:block;margin-top:6px;font-size:9px;color:#c5d0d6;overflow-wrap:anywhere}.dto-empty{border:1px dashed #33495c;color:#7f92a1;padding:16px;margin-top:14px;font-size:9px;letter-spacing:.06em}.dto-run{display:grid;grid-template-columns:minmax(300px,.8fr) minmax(420px,1.2fr);gap:22px;border:1px solid #33495c;background:#0c1720;padding:18px;margin-top:14px}.dto-run details{margin-top:13px;border-top:1px solid #2c4253;padding-top:9px}.dto-run summary,.dto-history summary{font-size:8px;color:#c8aa6d;cursor:pointer}.dto-run pre{white-space:pre-wrap;color:#8fa2b0;font-size:8px;line-height:1.55}.dto-form{display:grid;gap:10px}.dto-form label{display:grid;gap:6px;color:#8195a3;font-size:8px;letter-spacing:.1em}.dto-form textarea{min-height:260px;width:100%;box-sizing:border-box;resize:vertical;border:1px solid #3a5265;background:#081119;color:#e7ecef;padding:11px;font:9px/1.55 ui-monospace,monospace}.dto-form button{border:1px solid #b69759;background:#c2a464;color:#081119;padding:10px 12px;font:700 9px ui-monospace,monospace;letter-spacing:.08em;cursor:pointer}.dto-form button:disabled{opacity:.4}.dto-result,.dto-error{border:1px solid #31495a;background:#0b161f;padding:12px 14px;margin-top:10px;font-size:9px}.dto-result{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.dto-result strong{color:#a9c5b3}.dto-result span{color:#e7d3a1}.dto-result small{color:#8193a0}.dto-result p{width:100%;margin:4px 0 0;color:#91a0ac;font:11px/1.5 Georgia,serif}.dto-error{border-color:#64443f;color:#d19380;background:#160f0f}.dto-history{margin-top:13px;border-top:1px solid #2c4253;padding-top:10px}.dto-history>div{display:grid;gap:4px;margin-top:9px}.dto-history article{display:grid;grid-template-columns:70px 1.2fr 1fr 1fr 70px;gap:10px;border-bottom:1px solid #1f303d;padding:7px 0;align-items:center}.dto-history b{font-size:8px;color:#d8c38e}.dto-history span{font-size:8px;color:#c5d0d6}.dto-history small{font-size:7px;color:#788a97;overflow-wrap:anywhere}.dto-history em{font-size:8px;color:#a9c5b3;font-style:normal;text-align:right}@media(max-width:900px){.dto-root{padding:22px 16px}.dto-header{display:grid}.dto-state{width:max-content}.dto-metrics{grid-template-columns:repeat(2,1fr)}.dto-rules,.dto-run{grid-template-columns:1fr}.dto-latest-grid{grid-template-columns:repeat(2,1fr)}.dto-history article{grid-template-columns:60px 1fr}.dto-history article small,.dto-history article em{display:none}}`}</style>
    </section>
  );
}
