'use client';

import { useMemo, useState } from 'react';
import { decisionTraceCommitmentMaterial } from '@/core/cognitive-twin/reentry/decisionCommitment';
import type { DecisionTrace } from '@/core/cognitive-twin/reentry/decisionTransfer';

type Arm = 'B0_BASE' | 'B1_RAW_HISTORY' | 'B2_MEMORY' | 'B3_CDT' | 'B4_PATTERNS' | 'B5_RULE_STRUCTURE' | 'CT_FULL';
type ContextMode = 'CANONICAL_MATERIALIZED' | 'MANUAL_CONTEXT_POOL';

type ContextReceipt = {
  protocol?: string;
  receiptHash?: string;
  cutoffAt?: string;
  contextPoolHash?: string;
  sourceCounts?: Record<string, number>;
  excludedExactTargetMatches?: number;
};

type BlindRunResult = {
  ok?: boolean;
  runId?: string;
  taskId?: string;
  experimentId?: string;
  arm?: Arm;
  provider?: string;
  model?: string;
  targetTraceId?: string;
  targetCommitmentSha256?: string;
  selectedContextHash?: string;
  predictionHash?: string;
  prediction?: Record<string, unknown>;
  contextMaterialization?: ContextReceipt | null;
  details?: string;
  error?: string;
};

type RevealResult = {
  ok?: boolean;
  status?: string;
  blindRunId?: string;
  predictionHash?: string;
  evaluation?: {
    outcome?: string;
    evaluationId?: string;
    runId?: string;
    evaluation?: {
      holdout?: { validatedDecisionAccuracy?: number; validatedMeanStructuralFidelity?: number };
      counterfactual?: { validatedTargetDispositionAccuracy?: number };
      promotion?: { maturity?: string };
    };
  };
  details?: string;
  error?: string;
};

const ARMS: Array<{ id: Arm; label: string }> = [
  { id: 'B0_BASE', label: 'B0 · BASE' },
  { id: 'B1_RAW_HISTORY', label: 'B1 · + RAW HISTORY' },
  { id: 'B2_MEMORY', label: 'B2 · + MEMORY' },
  { id: 'B3_CDT', label: 'B3 · + CDT' },
  { id: 'B4_PATTERNS', label: 'B4 · + PATTERNS' },
  { id: 'B5_RULE_STRUCTURE', label: 'B5 · + RULE STRUCTURE' },
  { id: 'CT_FULL', label: 'CT · FULL GOVERNED CONTEXT' },
];

function randomSalt() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function splitTokens(value: string) {
  return [...new Set(value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean))];
}
function splitLines(value: string) {
  return [...new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
}
function pct(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
}

export function BlindDecisionExperiment() {
  const [experimentId, setExperimentId] = useState('');
  const [arm, setArm] = useState<Arm>('B0_BASE');
  const [provider, setProvider] = useState('');
  const [contextMode, setContextMode] = useState<ContextMode>('CANONICAL_MATERIALIZED');
  const [cutoffAt, setCutoffAt] = useState('');
  const [caseSituation, setCaseSituation] = useState('');
  const [casePriorState, setCasePriorState] = useState('');
  const [caseEvidenceRefs, setCaseEvidenceRefs] = useState('');
  const [caseConstraints, setCaseConstraints] = useState('');
  const [targetJson, setTargetJson] = useState('');
  const [contextJson, setContextJson] = useState('');
  const [salt, setSalt] = useState('');
  const [commitment, setCommitment] = useState('');
  const [blind, setBlind] = useState<BlindRunResult | null>(null);
  const [operationKey, setOperationKey] = useState('');
  const [revealExtrasJson, setRevealExtrasJson] = useState('');
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [busy, setBusy] = useState<'commit' | 'blind' | 'reveal' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const target = useMemo(() => {
    if (!targetJson.trim()) return null;
    try { return JSON.parse(targetJson) as DecisionTrace; } catch { return null; }
  }, [targetJson]);

  const canonicalContextReady = Boolean(cutoffAt.trim() && caseSituation.trim() && splitTokens(caseEvidenceRefs).length);
  const blindContextReady = contextMode === 'CANONICAL_MATERIALIZED' ? canonicalContextReady : Boolean(contextJson.trim());

  async function commitTarget() {
    setBusy('commit');
    setError(null);
    setBlind(null);
    setReveal(null);
    try {
      if (!target) throw new Error('La traza objetivo no es JSON válido.');
      const nextSalt = randomSalt();
      const nextCommitment = await sha256(decisionTraceCommitmentMaterial(target, nextSalt));
      setSalt(nextSalt);
      setCommitment(nextCommitment);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'TARGET_COMMITMENT_FAILED');
    } finally {
      setBusy(null);
    }
  }

  async function runBlind() {
    setBusy('blind');
    setError(null);
    setReveal(null);
    try {
      if (!target || !commitment || !salt) throw new Error('Primero comprometa localmente la traza objetivo.');
      if (!experimentId.trim()) throw new Error('EXPERIMENT ID requerido.');

      let payload: Record<string, unknown>;
      if (contextMode === 'CANONICAL_MATERIALIZED') {
        if (!canonicalContextReady) throw new Error('CUTOFF, situación y EVIDENCE IDS persistidos son requeridos.');
        const cutoff = new Date(cutoffAt);
        if (!Number.isFinite(cutoff.getTime())) throw new Error('CUTOFF inválido.');
        payload = {
          contextSource: 'CANONICAL_MATERIALIZED',
          experimentId: experimentId.trim(),
          targetTraceId: target.traceId,
          targetDomain: target.domain,
          targetCommitmentSha256: commitment,
          arm,
          cutoffAt: cutoff.toISOString(),
          currentCase: {
            situation: caseSituation.trim(),
            ...(casePriorState.trim() ? { priorState: casePriorState.trim() } : {}),
            evidenceRefs: splitTokens(caseEvidenceRefs),
            constraints: splitLines(caseConstraints),
          },
          ...(provider ? { preferredProvider: provider, strictProvider: true } : {}),
          maxTokens: 1000,
        };
      } else {
        let contextPool: unknown;
        try { contextPool = JSON.parse(contextJson); } catch { throw new Error('CONTEXT POOL no es JSON válido.'); }
        payload = {
          experimentId: experimentId.trim(),
          targetTraceId: target.traceId,
          targetDomain: target.domain,
          targetCommitmentSha256: commitment,
          arm,
          contextPool,
          ...(provider ? { preferredProvider: provider, strictProvider: true } : {}),
          maxTokens: 1000,
        };
      }

      const response = await fetch('/api/root/method-lab/decision-transfer/blind', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null) as BlindRunResult | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setBlind(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'BLIND_RECONSTRUCTION_FAILED');
    } finally {
      setBusy(null);
    }
  }

  async function revealTarget() {
    setBusy('reveal');
    setError(null);
    try {
      if (!blind?.runId || !target || !salt) throw new Error('No existe una reconstrucción ciega sellada para revelar.');
      if (!operationKey.trim()) throw new Error('OPERATION KEY requerido para el contraste.');
      let extras: Record<string, unknown>;
      try { extras = JSON.parse(revealExtrasJson) as Record<string, unknown>; } catch { throw new Error('REVEAL EXTRAS no es JSON válido.'); }
      const response = await fetch('/api/root/method-lab/decision-transfer/reveal', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blindRunId: blind.runId,
          target,
          commitmentSalt: salt,
          operationKey: operationKey.trim(),
          occurrences: Array.isArray(extras.occurrences) ? extras.occurrences : [],
          counterfactualProbes: Array.isArray(extras.counterfactualProbes) ? extras.counterfactualProbes : [],
          boundaryProbeCount: typeof extras.boundaryProbeCount === 'number' ? extras.boundaryProbeCount : 0,
          ...(extras.thresholds && typeof extras.thresholds === 'object' ? { thresholds: extras.thresholds } : {}),
        }),
      });
      const body = await response.json().catch(() => null) as RevealResult | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setReveal(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'BLIND_REVEAL_FAILED');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bde-root" aria-labelledby="bde-title">
      <header>
        <div>
          <span>PHASE II · SEALED HOLDOUT</span>
          <h2 id="bde-title">Reconstrucción ciega antes del reveal.</h2>
          <p>El target se compromete localmente. Por defecto el servidor materializa el historial desde stores canónicos con un corte temporal explícito, congela el contexto exacto y persiste la predicción antes del reveal.</p>
        </div>
        <b>{blind ? 'EVIDENCE_PENDING' : 'UNSEALED'}</b>
      </header>

      <div className="bde-grid">
        <article>
          <h3>01 · TARGET COMMITMENT</h3>
          <label>EXPERIMENT ID<input value={experimentId} onChange={(event) => setExperimentId(event.target.value)} placeholder="DT-EXP-..." /></label>
          <label>OBSERVED TARGET TRACE · LOCAL ONLY<textarea value={targetJson} onChange={(event) => { setTargetJson(event.target.value); setCommitment(''); setSalt(''); setBlind(null); setReveal(null); }} placeholder="Pegue la DecisionTrace observada. No se enviará durante la reconstrucción ciega." /></label>
          <button type="button" disabled={busy !== null || !targetJson.trim()} onClick={() => void commitTarget()}>{busy === 'commit' ? 'SELLANDO…' : 'COMMIT TARGET LOCALLY'}</button>
          {commitment ? <div className="bde-seal"><small>SHA-256</small><code>{commitment}</code><small>SALT LOCAL · reservado hasta reveal</small></div> : null}
        </article>

        <article>
          <h3>02 · BLIND RUN</h3>
          <div className="bde-two">
            <label>ARM<select value={arm} onChange={(event) => setArm(event.target.value as Arm)}>{ARMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>STRICT PROVIDER<select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">ROUTER / RECORD ACTUAL</option><option value="openai">OPENAI</option><option value="anthropic">ANTHROPIC</option><option value="gemini">GEMINI</option><option value="groq">GROQ</option><option value="ollama">OLLAMA</option><option value="huggingface">HUGGING FACE</option></select></label>
          </div>
          <label>CONTEXT SOURCE<select value={contextMode} onChange={(event) => setContextMode(event.target.value as ContextMode)}><option value="CANONICAL_MATERIALIZED">CANONICAL · TEMPORALLY BOUNDED</option><option value="MANUAL_CONTEXT_POOL">MANUAL · ADVANCED / LEGACY</option></select></label>

          {contextMode === 'CANONICAL_MATERIALIZED' ? <div className="bde-context">
            <label>CUTOFF · BEFORE TARGET<input type="datetime-local" value={cutoffAt} onChange={(event) => setCutoffAt(event.target.value)} /></label>
            <label>CURRENT CASE · SITUATION<textarea value={caseSituation} onChange={(event) => setCaseSituation(event.target.value)} placeholder="Situación conocida antes de la decisión objetivo." /></label>
            <label>PRIOR STATE · OPTIONAL<textarea value={casePriorState} onChange={(event) => setCasePriorState(event.target.value)} placeholder="Estado inmediatamente anterior, sin resultado ni decisión objetivo." /></label>
            <label>PERSISTED ROOT EVIDENCE IDS<textarea value={caseEvidenceRefs} onChange={(event) => setCaseEvidenceRefs(event.target.value)} placeholder="UUID-1, UUID-2…" /></label>
            <label>CONSTRAINTS · ONE PER LINE<textarea value={caseConstraints} onChange={(event) => setCaseConstraints(event.target.value)} placeholder="Restricción observable 1\nRestricción observable 2" /></label>
            <p>El servidor recupera B1–B5/CT desde historia anterior al cutoff; no se acepta historial manual en este modo.</p>
          </div> : <label>CONTEXT POOL · JSON<textarea value={contextJson} onChange={(event) => setContextJson(event.target.value)} placeholder={'{"currentCase":{"situation":"...","evidence":[],"constraints":[]},"rawHistory":[],"memory":[],"decisionTraces":[],"patterns":[],"rules":[]}'}/></label>}

          <button type="button" disabled={busy !== null || !commitment || !blindContextReady} onClick={() => void runBlind()}>{busy === 'blind' ? 'RECONSTRUYENDO…' : 'RUN BLIND RECONSTRUCTION'}</button>
          {blind?.ok ? <div className="bde-result">
            <strong>{blind.arm} · {blind.provider}/{blind.model}</strong>
            <small>run {blind.runId}</small><small>context {blind.selectedContextHash}</small><small>prediction {blind.predictionHash}</small>
            {blind.contextMaterialization ? <><small>receipt {blind.contextMaterialization.receiptHash}</small><small>cutoff {blind.contextMaterialization.cutoffAt}</small><small>sources {JSON.stringify(blind.contextMaterialization.sourceCounts)}</small><small>excluded exact target matches {blind.contextMaterialization.excludedExactTargetMatches ?? 0}</small></> : <small>manual context · no canonical materialization receipt</small>}
            <pre>{JSON.stringify(blind.prediction, null, 2)}</pre>
          </div> : null}
        </article>

        <article>
          <h3>03 · COMMITMENT-VERIFIED REVEAL</h3>
          <label>OPERATION KEY<input value={operationKey} onChange={(event) => setOperationKey(event.target.value)} placeholder="EVIDENCE_BEFORE_INFERENCE" /></label>
          <label>REVEAL EXTRAS · JSON<textarea value={revealExtrasJson} onChange={(event) => setRevealExtrasJson(event.target.value)} placeholder={'{"occurrences":[],"counterfactualProbes":[],"boundaryProbeCount":0}'}/></label>
          <button type="button" disabled={busy !== null || !blind?.runId || !operationKey.trim()} onClick={() => void revealTarget()}>{busy === 'reveal' ? 'VERIFICANDO…' : 'VERIFY COMMITMENT + REVEAL'}</button>
          {reveal?.ok ? <div className="bde-result"><strong>{reveal.evaluation?.outcome ?? reveal.status}</strong><small>evaluation {reveal.evaluation?.evaluationId}</small><small>decision {pct(reveal.evaluation?.evaluation?.holdout?.validatedDecisionAccuracy)}</small><small>structure {pct(reveal.evaluation?.evaluation?.holdout?.validatedMeanStructuralFidelity)}</small><small>counterfactual {pct(reveal.evaluation?.evaluation?.counterfactual?.validatedTargetDispositionAccuracy)}</small><small>maturity {reveal.evaluation?.evaluation?.promotion?.maturity ?? '—'}</small></div> : null}
        </article>
      </div>

      <div className="bde-boundary"><strong>INTEGRITY BOUNDARY</strong><span>El commitment fija el target; el receipt fija el contexto materializado y su cutoff. El materializador excluye IDs exactos del target y estado posterior al cutoff, pero la contaminación semántica todavía se audita sobre el contexto congelado. El cutoff declarado no prueba por sí solo la fecha del target revelado.</span></div>
      {error ? <div className="bde-error">{error}</div> : null}

      <style jsx>{`
        .bde-root{background:#071018;color:#e8edf0;border-bottom:1px solid #33495c;padding:28px 30px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.bde-root>header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.bde-root header>div{max-width:920px}.bde-root header span{font-size:8px;letter-spacing:.16em;color:#c8aa6d}.bde-root h2{font:400 clamp(27px,3vw,40px)/1 Georgia,serif;margin:8px 0 11px;color:#f4f6f7}.bde-root header p{font:13px/1.6 Georgia,serif;color:#91a0ac;margin:0}.bde-root header>b{border:1px solid #425a6d;padding:9px 11px;font-size:8px;color:#d8c38e}.bde-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px}.bde-grid>article{border:1px solid #2c4253;background:#0b161f;padding:15px;display:flex;flex-direction:column;gap:10px}.bde-grid h3{font-size:9px;letter-spacing:.08em;color:#d8c38e;margin:0}.bde-grid label{display:grid;gap:5px;color:#8195a3;font-size:7px;letter-spacing:.1em}.bde-grid input,.bde-grid select,.bde-grid textarea{box-sizing:border-box;width:100%;border:1px solid #3a5265;background:#081119;color:#e7ecef;padding:9px;font:9px/1.5 ui-monospace,monospace}.bde-grid textarea{min-height:120px;resize:vertical}.bde-grid button{border:1px solid #b69759;background:#c2a464;color:#081119;padding:10px;font:700 8px ui-monospace,monospace;letter-spacing:.08em;cursor:pointer}.bde-grid button:disabled{opacity:.4}.bde-two{display:grid;grid-template-columns:1fr 1fr;gap:7px}.bde-context{display:grid;gap:8px;border:1px solid #263a4a;padding:10px;background:#081119}.bde-context p{font:10px/1.5 Georgia,serif;color:#8193a0;margin:0}.bde-seal,.bde-result{border:1px solid #31495a;background:#081119;padding:10px;display:grid;gap:6px}.bde-seal small,.bde-result small{font-size:7px;color:#8193a0;overflow-wrap:anywhere}.bde-seal code{font-size:7px;color:#a9c5b3;overflow-wrap:anywhere}.bde-result strong{font-size:8px;color:#a9c5b3}.bde-result pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:8px;line-height:1.5;color:#c5d0d6;margin:4px 0 0}.bde-boundary{display:grid;grid-template-columns:160px 1fr;gap:16px;border:1px solid #3a4d5c;background:#0c1720;padding:13px;margin-top:10px}.bde-boundary strong{font-size:8px;color:#c8aa6d}.bde-boundary span{font:11px/1.55 Georgia,serif;color:#91a0ac}.bde-error{border:1px solid #64443f;background:#160f0f;color:#d19380;padding:11px;margin-top:9px;font-size:8px}@media(max-width:1050px){.bde-grid{grid-template-columns:1fr}.bde-root{padding:22px 16px}.bde-root>header{display:grid}.bde-boundary{grid-template-columns:1fr}}`}</style>
    </section>
  );
}
