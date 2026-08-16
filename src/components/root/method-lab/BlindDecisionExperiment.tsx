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

type RegistrationReceipt = {
  protocol?: string;
  experimentId?: string;
  targetTraceId?: string;
  targetDomain?: string;
  targetCommitmentSha256?: string;
  cutoffAt?: string;
  instrumentSourceHash?: string;
  registrationHash?: string;
};

type RegistrationResult = {
  ok?: boolean;
  registrationRunId?: string;
  receipt?: RegistrationReceipt;
  reused?: boolean;
  details?: string;
  error?: string;
};

type ModelContract = {
  protocolVersion?: string;
  provider?: string;
  expectedModel?: string;
  actualModel?: string;
  promptTemplateHash?: string;
  systemPromptHash?: string;
  instrumentSourceHash?: string;
  runtimeCommit?: string;
  contractHash?: string;
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
  experimentRegistration?: { registrationRunId?: string; receipt?: RegistrationReceipt } | null;
  contextMaterialization?: ContextReceipt | null;
  modelContract?: ModelContract | null;
  experimentalMode?: string;
  details?: string;
  error?: string;
};

type EvidenceReceipt = {
  protocol?: string;
  receiptHash?: string;
  evidencePoolHash?: string;
  recordsSeen?: number;
  uniqueEvidenceObjects?: number;
  uniqueEvents?: number;
  independentObservationGroups?: number;
  qualifyingOccurrenceCount?: number;
  qualifyingDomainCount?: number;
  qualifyingCounterexampleCount?: number;
  qualifyingContrastCount?: number;
  qualifyingBoundaryProbeCount?: number;
  boundaryValidationStatus?: string;
  validationStatus?: string;
  blockReasons?: string[];
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
      counterfactual?: { validatedTargetDispositionAccuracy?: number | null };
      promotion?: { maturity?: string };
    };
  };
  evaluationEvidence?: {
    materializationRunId?: string;
    reused?: boolean;
    receipt?: EvidenceReceipt;
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

const CONFIRMATORY_PROVIDER = 'groq';
const CONFIRMATORY_MODEL = 'openai/gpt-oss-20b';

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
  const [experimentId, setExperimentId] = useState('EXP-001');
  const [arm, setArm] = useState<Arm>('B0_BASE');
  const [diagnosticProvider, setDiagnosticProvider] = useState('');
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
  const [registration, setRegistration] = useState<RegistrationResult | null>(null);
  const [blind, setBlind] = useState<BlindRunResult | null>(null);
  const [operationKey, setOperationKey] = useState('');
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [busy, setBusy] = useState<'commit' | 'register' | 'blind' | 'reveal' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const target = useMemo(() => {
    if (!targetJson.trim()) return null;
    try { return JSON.parse(targetJson) as DecisionTrace; } catch { return null; }
  }, [targetJson]);

  const canonicalContextReady = Boolean(cutoffAt.trim() && caseSituation.trim() && splitTokens(caseEvidenceRefs).length);
  const blindContextReady = contextMode === 'CANONICAL_MATERIALIZED' ? canonicalContextReady : Boolean(contextJson.trim());
  const canonicalRegistrationReady = Boolean(target && commitment && cutoffAt.trim() && experimentId.trim() === 'EXP-001');

  function invalidateRegistration() {
    setRegistration(null);
    setBlind(null);
    setReveal(null);
  }

  async function commitTarget() {
    setBusy('commit');
    setError(null);
    invalidateRegistration();
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

  async function registerExperiment() {
    setBusy('register');
    setError(null);
    setBlind(null);
    setReveal(null);
    try {
      if (!target || !commitment || !cutoffAt.trim()) throw new Error('Target commitment y cutoff son requeridos.');
      if (experimentId.trim() !== 'EXP-001') throw new Error('SFI-DT-1.0 está congelado para EXP-001.');
      const cutoff = new Date(cutoffAt);
      if (!Number.isFinite(cutoff.getTime())) throw new Error('CUTOFF inválido.');
      const response = await fetch('/api/root/method-lab/decision-transfer/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentId: 'EXP-001',
          targetTraceId: target.traceId,
          targetDomain: target.domain,
          targetCommitmentSha256: commitment,
          cutoffAt: cutoff.toISOString(),
        }),
      });
      const body = await response.json().catch(() => null) as RegistrationResult | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setRegistration(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'DT_REGISTRATION_FAILED');
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
        if (!registration?.receipt?.registrationHash) throw new Error('Primero registre EXP-001 con REGISTER EXP-001.');
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
          preferredProvider: CONFIRMATORY_PROVIDER,
          strictProvider: true,
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
          ...(diagnosticProvider ? { preferredProvider: diagnosticProvider, strictProvider: true } : {}),
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
      if (contextMode !== 'CANONICAL_MATERIALIZED') {
        throw new Error('El reveal científico SFI-DT-1.0 requiere contexto CANONICAL_MATERIALIZED. El contexto manual es sólo diagnóstico.');
      }
      const response = await fetch('/api/root/method-lab/decision-transfer/reveal', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blindRunId: blind.runId,
          target,
          commitmentSalt: salt,
          operationKey: operationKey.trim(),
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

  const evidence = reveal?.evaluationEvidence?.receipt;

  return (
    <section className="bde-root" aria-labelledby="bde-title">
      <header>
        <div>
          <span>SFI-DT-1.0 · SEALED HOLDOUT</span>
          <h2 id="bde-title">Reconstrucción ciega antes del reveal.</h2>
          <p>El target se compromete localmente. EXP-001 se preregistra de forma inmutable antes del primer brazo. En modo confirmatorio, registro, contexto, modelo y evidencia de evaluación quedan materializados y hasheados antes del scorer.</p>
        </div>
        <b>{blind ? 'EVIDENCE_PENDING' : registration?.receipt ? 'REGISTERED' : 'UNREGISTERED'}</b>
      </header>

      <div className="bde-grid">
        <article>
          <h3>01 · TARGET COMMITMENT + REGISTRATION</h3>
          <label>EXPERIMENT ID<input value={experimentId} onChange={(event) => { setExperimentId(event.target.value); invalidateRegistration(); }} placeholder="EXP-001" /></label>
          <label>OBSERVED TARGET TRACE · LOCAL ONLY<textarea value={targetJson} onChange={(event) => { setTargetJson(event.target.value); setCommitment(''); setSalt(''); invalidateRegistration(); }} placeholder="Pegue la DecisionTrace OBSERVED. No se enviará durante la reconstrucción ciega." /></label>
          <button type="button" disabled={busy !== null || !targetJson.trim()} onClick={() => void commitTarget()}>{busy === 'commit' ? 'SELLANDO…' : 'COMMIT TARGET LOCALLY'}</button>
          {commitment ? <div className="bde-seal"><small>SHA-256</small><code>{commitment}</code><small>SALT LOCAL · reservado hasta reveal</small></div> : null}
          <label>CUTOFF · BEFORE TARGET<input type="datetime-local" value={cutoffAt} onChange={(event) => { setCutoffAt(event.target.value); invalidateRegistration(); }} /></label>
          <button type="button" disabled={busy !== null || !canonicalRegistrationReady} onClick={() => void registerExperiment()}>{busy === 'register' ? 'REGISTRANDO…' : 'REGISTER EXP-001'}</button>
          {registration?.receipt ? <div className="bde-result"><strong>EXP-001 · FROZEN</strong><small>registration run {registration.registrationRunId}</small><small>registration {registration.receipt.registrationHash}</small><small>instrument {registration.receipt.instrumentSourceHash}</small><small>cutoff {registration.receipt.cutoffAt}</small></div> : null}
        </article>

        <article>
          <h3>02 · BLIND RUN</h3>
          <div className="bde-two">
            <label>ARM<select value={arm} onChange={(event) => setArm(event.target.value as Arm)}>{ARMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>CONTEXT SOURCE<select value={contextMode} onChange={(event) => { setContextMode(event.target.value as ContextMode); setBlind(null); setReveal(null); }}><option value="CANONICAL_MATERIALIZED">CONFIRMATORY · CANONICAL</option><option value="MANUAL_CONTEXT_POOL">NON-CONFIRMATORY · LEGACY</option></select></label>
          </div>

          {contextMode === 'CANONICAL_MATERIALIZED' ? <div className="bde-context">
            <div className="bde-contract"><small>MODEL CONTRACT</small><strong>{CONFIRMATORY_PROVIDER} · {CONFIRMATORY_MODEL}</strong><small>temperature 0.2 · max_tokens 1000 · strict provider</small></div>
            <label>CURRENT CASE · SITUATION<textarea value={caseSituation} onChange={(event) => setCaseSituation(event.target.value)} placeholder="Situación conocida antes de la decisión objetivo." /></label>
            <label>PRIOR STATE · OPTIONAL<textarea value={casePriorState} onChange={(event) => setCasePriorState(event.target.value)} placeholder="Estado inmediatamente anterior, sin resultado ni decisión objetivo." /></label>
            <label>PERSISTED ROOT EVIDENCE IDS<textarea value={caseEvidenceRefs} onChange={(event) => setCaseEvidenceRefs(event.target.value)} placeholder="UUID-1, UUID-2…" /></label>
            <label>CONSTRAINTS · ONE PER LINE<textarea value={caseConstraints} onChange={(event) => setCaseConstraints(event.target.value)} placeholder={'Restricción observable 1\nRestricción observable 2'} /></label>
            <p>El servidor exige el registro EXP-001, recupera B1–B5/CT desde historia anterior al cutoff y permite una sola predicción confirmatoria por brazo.</p>
          </div> : <div className="bde-context">
            <div className="bde-warning"><strong>NON-CONFIRMATORY / DIAGNOSTIC</strong><span>Este modo puede ejercitar el instrumento, pero no puede producir evidencia SFI-DT-1.0 QUALIFIED.</span></div>
            <label>DIAGNOSTIC PROVIDER<select value={diagnosticProvider} onChange={(event) => setDiagnosticProvider(event.target.value)}><option value="">ROUTER</option><option value="openai">OPENAI</option><option value="anthropic">ANTHROPIC</option><option value="gemini">GEMINI</option><option value="groq">GROQ</option><option value="ollama">OLLAMA</option><option value="huggingface">HUGGING FACE</option></select></label>
            <label>CONTEXT POOL · JSON<textarea value={contextJson} onChange={(event) => setContextJson(event.target.value)} placeholder={'{"currentCase":{"situation":"...","evidence":[],"constraints":[]},"rawHistory":[],"memory":[],"decisionTraces":[],"patterns":[],"rules":[]}'}/></label>
          </div>}

          <button type="button" disabled={busy !== null || !commitment || !blindContextReady || (contextMode === 'CANONICAL_MATERIALIZED' && !registration?.receipt?.registrationHash)} onClick={() => void runBlind()}>{busy === 'blind' ? 'RECONSTRUYENDO…' : 'RUN BLIND RECONSTRUCTION'}</button>
          {blind?.ok ? <div className="bde-result">
            <strong>{blind.arm} · {blind.provider}/{blind.model}</strong>
            <small>{blind.experimentalMode}</small>
            <small>run {blind.runId}</small><small>context {blind.selectedContextHash}</small><small>prediction {blind.predictionHash}</small>
            {blind.experimentRegistration ? <small>registration {blind.experimentRegistration.receipt?.registrationHash}</small> : null}
            {blind.contextMaterialization ? <><small>context receipt {blind.contextMaterialization.receiptHash}</small><small>cutoff {blind.contextMaterialization.cutoffAt}</small><small>sources {JSON.stringify(blind.contextMaterialization.sourceCounts)}</small></> : <small>manual context · NON-CONFIRMATORY</small>}
            {blind.modelContract ? <><small>model contract {blind.modelContract.contractHash}</small><small>instrument {blind.modelContract.instrumentSourceHash}</small><small>runtime {blind.modelContract.runtimeCommit}</small><small>prompt {blind.modelContract.promptTemplateHash}</small><small>system {blind.modelContract.systemPromptHash}</small></> : null}
            <pre>{JSON.stringify(blind.prediction, null, 2)}</pre>
          </div> : null}
        </article>

        <article>
          <h3>03 · COMMITMENT-VERIFIED REVEAL</h3>
          <label>OPERATION KEY<input value={operationKey} onChange={(event) => setOperationKey(event.target.value)} placeholder="EVIDENCE_BEFORE_INFERENCE" /></label>
          <div className="bde-contract"><small>EVALUATION EVIDENCE</small><strong>AUTOMATIC · CANONICAL</strong><small>records → evidence objects → events → independent observation groups</small></div>
          <p className="bde-note">No se aceptan occurrences, probes, boundary counts ni thresholds manuales en el camino confirmatorio.</p>
          <button type="button" disabled={busy !== null || !blind?.runId || !operationKey.trim() || contextMode !== 'CANONICAL_MATERIALIZED'} onClick={() => void revealTarget()}>{busy === 'reveal' ? 'MATERIALIZANDO + VERIFICANDO…' : 'MATERIALIZE EVIDENCE + REVEAL'}</button>
          {reveal?.ok ? <div className="bde-result">
            <strong>{reveal.evaluation?.outcome ?? reveal.status}</strong>
            <small>evaluation {reveal.evaluation?.evaluationId}</small>
            <small>decision {pct(reveal.evaluation?.evaluation?.holdout?.validatedDecisionAccuracy)}</small>
            <small>structure {pct(reveal.evaluation?.evaluation?.holdout?.validatedMeanStructuralFidelity)}</small>
            <small>counterfactual {pct(reveal.evaluation?.evaluation?.counterfactual?.validatedTargetDispositionAccuracy)}</small>
            <small>maturity {reveal.evaluation?.evaluation?.promotion?.maturity ?? '—'}</small>
            <small>evidence receipt {evidence?.receiptHash ?? '—'}</small>
            <small>pool {evidence?.evidencePoolHash ?? '—'}</small>
            <small>records {evidence?.recordsSeen ?? 0} · evidence {evidence?.uniqueEvidenceObjects ?? 0} · events {evidence?.uniqueEvents ?? 0} · independent groups {evidence?.independentObservationGroups ?? 0}</small>
            <small>qualifying occurrences {evidence?.qualifyingOccurrenceCount ?? 0} · domains {evidence?.qualifyingDomainCount ?? 0} · contrasts {evidence?.qualifyingContrastCount ?? 0} · empirical boundary probes {evidence?.qualifyingBoundaryProbeCount ?? 0}</small>
            <small>validation {evidence?.validationStatus ?? '—'} · boundary {evidence?.boundaryValidationStatus ?? '—'}</small>
            {evidence?.blockReasons?.length ? <small>blocked: {evidence.blockReasons.join(' · ')}</small> : null}
          </div> : null}
        </article>
      </div>

      <div className="bde-boundary"><strong>INTEGRITY BOUNDARY</strong><span>EXP-001 fija target/commitment/cutoff/arms e instrumento. El commitment fija el target; el context receipt fija el contexto; el target timing proof demuestra observación posterior al cutoff; el evaluation evidence receipt deduplica registros y congela evidencia canónica antes del scoring. SIMULATED, DERIVED e INFERRED pueden diagnosticar el instrumento, pero no aumentar contadores validantes.</span></div>
      {error ? <div className="bde-error">{error}</div> : null}

      <style jsx>{`
        .bde-root{background:#071018;color:#e8edf0;border-bottom:1px solid #33495c;padding:28px 30px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.bde-root>header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.bde-root header>div{max-width:920px}.bde-root header span{font-size:8px;letter-spacing:.16em;color:#c8aa6d}.bde-root h2{font:400 clamp(27px,3vw,40px)/1 Georgia,serif;margin:8px 0 11px;color:#f4f6f7}.bde-root header p{font:13px/1.6 Georgia,serif;color:#91a0ac;margin:0}.bde-root header>b{border:1px solid #425a6d;padding:9px 11px;font-size:8px;color:#d8c38e}.bde-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px}.bde-grid>article{border:1px solid #2c4253;background:#0b161f;padding:15px;display:flex;flex-direction:column;gap:10px}.bde-grid h3{font-size:9px;letter-spacing:.08em;color:#d8c38e;margin:0}.bde-grid label{display:grid;gap:5px;color:#8195a3;font-size:7px;letter-spacing:.1em}.bde-grid input,.bde-grid select,.bde-grid textarea{box-sizing:border-box;width:100%;border:1px solid #3a5265;background:#081119;color:#e7ecef;padding:9px;font:9px/1.5 ui-monospace,monospace}.bde-grid textarea{min-height:120px;resize:vertical}.bde-grid button{border:1px solid #b69759;background:#c2a464;color:#081119;padding:10px;font:700 8px ui-monospace,monospace;letter-spacing:.08em;cursor:pointer}.bde-grid button:disabled{opacity:.4}.bde-two{display:grid;grid-template-columns:1fr 1fr;gap:7px}.bde-context{display:grid;gap:8px;border:1px solid #263a4a;padding:10px;background:#081119}.bde-context p,.bde-note{font:10px/1.5 Georgia,serif;color:#8193a0;margin:0}.bde-contract{display:grid;gap:4px;border:1px solid #31495a;background:#081119;padding:9px}.bde-contract small{font-size:7px;color:#8193a0}.bde-contract strong{font-size:8px;color:#a9c5b3}.bde-warning{display:grid;gap:5px;border:1px solid #64443f;background:#160f0f;padding:9px}.bde-warning strong{font-size:8px;color:#d19380}.bde-warning span{font:10px/1.4 Georgia,serif;color:#a98980}.bde-seal,.bde-result{border:1px solid #31495a;background:#081119;padding:10px;display:grid;gap:6px}.bde-seal small,.bde-result small{font-size:7px;color:#8193a0;overflow-wrap:anywhere}.bde-seal code{font-size:7px;color:#a9c5b3;overflow-wrap:anywhere}.bde-result strong{font-size:8px;color:#a9c5b3}.bde-result pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:8px;line-height:1.5;color:#c5d0d6;margin:4px 0 0}.bde-boundary{display:grid;grid-template-columns:160px 1fr;gap:16px;border:1px solid #3a4d5c;background:#0c1720;padding:13px;margin-top:10px}.bde-boundary strong{font-size:8px;color:#c8aa6d}.bde-boundary span{font:11px/1.55 Georgia,serif;color:#91a0ac}.bde-error{border:1px solid #64443f;background:#160f0f;color:#d19380;padding:11px;margin-top:9px;font-size:8px}@media(max-width:1050px){.bde-grid{grid-template-columns:1fr}.bde-root{padding:22px 16px}.bde-root>header{display:grid}.bde-boundary{grid-template-columns:1fr}}
      `}</style>
    </section>
  );
}
