'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';

const EXPERIMENT_TYPES = [
  'SIMULATION',
  'REPLAY',
  'REENTRY',
  'COUNTERFACTUAL',
  'MODEL_COMPARISON',
  'PASSPORT_COMPARISON',
  'TWIN_COMPARISON',
  'INTERVENTION_DESIGN',
  'OBSERVATIONAL',
] as const;

const REENTRY_DIMENSIONS = [
  ['attention', 'Δattention'],
  ['evidenceSelection', 'Δevidence_selection'],
  ['hypothesisGeneration', 'Δhypothesis_generation'],
  ['contradictionDetection', 'Δcontradiction_detection'],
  ['uncertainty', 'Δuncertainty'],
  ['decision', 'Δdecision'],
  ['intervention', 'Δintervention'],
  ['prediction', 'Δprediction'],
  ['outcome', 'Δoutcome'],
] as const;

type ExperimentType = (typeof EXPERIMENT_TYPES)[number];
type Row = Record<string, unknown>;
type Projection = {
  contractVersion: string;
  experimentContractVersion: string;
  experimentTypes: ExperimentType[];
  executableTypes: ExperimentType[];
  ownerScope: string;
  privacyBoundary: string;
  authorityBoundary: string;
  observationBoundary: string;
  cases: Row[];
  evidence: Row[];
  twinStates: Row[];
  preregistrations: Row[];
  runs: Row[];
  warnings: string[];
};

type ApiPayload = {
  ok?: boolean;
  error?: string;
  projection?: Projection;
  persisted?: Row;
  experimentAnalysisId?: string;
  runId?: string;
};

const shell: CSSProperties = { padding: '28px clamp(18px,4vw,56px)', background: '#07090c', color: '#f3f5f7', borderTop: '1px solid rgba(255,255,255,.12)', borderBottom: '1px solid rgba(255,255,255,.12)' };
const panel: CSSProperties = { border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, padding: 16, background: 'rgba(255,255,255,.025)', display: 'grid', gap: 10 };
const input: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid rgba(255,255,255,.18)', borderRadius: 8, padding: '9px 10px', background: '#0d1117', color: 'inherit' };
const button: CSSProperties = { border: '1px solid rgba(255,255,255,.28)', borderRadius: 999, padding: '9px 14px', background: 'rgba(255,255,255,.08)', color: 'inherit', cursor: 'pointer' };
const mono: CSSProperties = { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12, lineHeight: 1.5, overflowWrap: 'anywhere' };

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

async function api(body?: Row) {
  const response = await fetch('/api/interface/method-lab', body ? {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  } : { cache: 'no-store' });
  const payload = await response.json().catch(() => ({})) as ApiPayload;
  if (!response.ok && response.status !== 207) throw new Error(payload.error || `HTTP_${response.status}`);
  return payload;
}

function artifact(runRow: Row, key: string) {
  const run = record(runRow.run);
  return record(record(run.artifacts)[key]);
}

function runExperimentId(runRow: Row) {
  return text(artifact(runRow, 'EXECUTED').experimentId);
}

function runResultHash(runRow: Row) {
  return text(artifact(runRow, 'RESULT').resultHash);
}

function runEpistemicClass(runRow: Row) {
  return text(artifact(runRow, 'RESULT').epistemicClass);
}

function reentryComparison(runRow: Row) {
  const result = artifact(runRow, 'RESULT');
  const payload = record(result.payload);
  return record(payload.comparison);
}

function reentryExecution(runRow: Row) {
  const result = artifact(runRow, 'RESULT');
  const payload = record(result.payload);
  return record(payload.reentryExecution);
}

export function MethodLabExperimentWorkbench() {
  const now = useMemo(() => new Date(), []);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [experimentType, setExperimentType] = useState<ExperimentType>('REENTRY');
  const [experimentId, setExperimentId] = useState(() => `exp-${Date.now()}`);
  const [caseRef, setCaseRef] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState<string[]>([]);
  const [twinStateRef, setTwinStateRef] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [nullHypothesis, setNullHypothesis] = useState('');
  const [t0Cutoff, setT0Cutoff] = useState(localDateTime(now));
  const [methodDescription, setMethodDescription] = useState('Governed Method Lab experiment configured from the owner-scoped UI.');
  const [controlDescription, setControlDescription] = useState('Frozen T0 control using the selected case, evidence and Twin state.');
  const [variantText, setVariantText] = useState('Variant A');
  const [expectedSignal, setExpectedSignal] = useState('A measurable difference appears under the declared experimental variation.');
  const [measureText, setMeasureText] = useState(REENTRY_DIMENSIONS.map(([, label]) => label).join('\n'));
  const [falsification, setFalsification] = useState('The expected signal does not appear under the preregistered comparison.');
  const [stoppingRule, setStoppingRule] = useState('Stop after the preregistered executions are complete.');
  const [maxExecutions, setMaxExecutions] = useState('2');
  const [returnRequired, setReturnRequired] = useState(true);
  const [returnOpensAt, setReturnOpensAt] = useState(localDateTime(now));
  const [returnClosesAt, setReturnClosesAt] = useState(localDateTime(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)));
  const [simulationProtocol, setSimulationProtocol] = useState<'sociotechnical_simulation' | 'economic_simulation'>('sociotechnical_simulation');
  const [leftRunId, setLeftRunId] = useState('');
  const [rightRunId, setRightRunId] = useState('');
  const [inspectRunId, setInspectRunId] = useState('');

  const refresh = useCallback(async () => {
    try {
      const payload = await api();
      const next = payload.projection ?? null;
      setProjection(next);
      if (next && !caseRef && next.cases[0]?.id) setCaseRef(String(next.cases[0].id));
      if (next && !leftRunId && next.runs[0]?.id) setLeftRunId(String(next.runs[0].id));
      if (next && !rightRunId && next.runs[1]?.id) setRightRunId(String(next.runs[1].id));
      if (next && !inspectRunId && next.runs[0]?.id) setInspectRunId(String(next.runs[0].id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [caseRef, inspectRunId, leftRunId, rightRunId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const caseEvidence = useMemo(() => (projection?.evidence ?? []).filter((item) => String(item.case_id ?? '') === caseRef), [caseRef, projection]);
  const caseTwinStates = useMemo(() => (projection?.twinStates ?? []).filter((item) => !caseRef || String(item.case_id ?? '') === caseRef), [caseRef, projection]);
  const preregistered = useMemo(() => (projection?.preregistrations ?? []).find((item) => text(record(item.preregistration).experimentId) === experimentId) ?? null, [experimentId, projection]);
  const leftRun = useMemo(() => (projection?.runs ?? []).find((item) => String(item.id) === leftRunId) ?? null, [leftRunId, projection]);
  const rightRun = useMemo(() => (projection?.runs ?? []).find((item) => String(item.id) === rightRunId) ?? null, [rightRunId, projection]);
  const inspectedRun = useMemo(() => (projection?.runs ?? []).find((item) => String(item.id) === inspectRunId) ?? null, [inspectRunId, projection]);

  function toggleEvidence(id: string) {
    setEvidenceRefs((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function execute(action: () => Promise<ApiPayload>, success: string) {
    setBusy(true);
    setMessage('');
    try {
      const result = await action();
      setMessage(result.ok === false ? `${success} · DEGRADED` : success);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function preregister() {
    await execute(() => api({
      operation: 'preregister',
      experimentId,
      experimentType,
      caseRef,
      evidenceRefs,
      twinStateRef: twinStateRef || null,
      hypothesis,
      nullHypothesis: nullHypothesis || null,
      t0Cutoff: toIso(t0Cutoff),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      methodDescription,
      controlDescription,
      variantDescriptions: variantText.split('\n').map((value) => value.trim()).filter(Boolean),
      expectedSignal,
      expectedMeasures: measureText.split('\n').map((value) => value.trim()).filter(Boolean),
      falsificationCondition: falsification,
      stoppingCondition: stoppingRule,
      maxExecutions: maxExecutions.trim() ? Number(maxExecutions) : null,
      returnWindow: { opensAt: toIso(returnOpensAt), closesAt: toIso(returnClosesAt), required: returnRequired },
    }), 'T0 FROZEN · INTERNAL PREREGISTRATION PERSISTED');
  }

  async function runSimulation() {
    await execute(() => api({
      operation: 'execute_simulation',
      experimentId,
      protocolId: simulationProtocol,
    }), 'SIMULATION EXECUTED · RECEIPT PERSISTED');
  }

  const canPreregister = Boolean(caseRef && hypothesis.trim() && stoppingRule.trim() && variantText.trim() && measureText.trim());
  const canExecute = experimentType === 'SIMULATION' && Boolean(preregistered);
  const comparison = inspectedRun ? reentryComparison(inspectedRun) : {};
  const comparisonDeltas = record(comparison.deltas);
  const execution = inspectedRun ? reentryExecution(inspectedRun) : {};
  const receipt = inspectedRun ? artifact(inspectedRun, 'REPRODUCIBILITY_RECEIPT') : {};

  return (
    <section style={shell} data-sfi-method-lab-ui="SFI-METHOD-LAB-UI-1.0">
      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gap: 18 }}>
        <header style={{ display: 'grid', gap: 6 }}>
          <span style={{ ...mono, opacity: .6 }}>WS-02 · METHOD LAB UI · OWNER-SCOPED</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px,4vw,46px)', fontWeight: 500 }}>Preregister → execute allowed owner → compare → inspect lineage</h2>
          <p style={{ margin: 0, maxWidth: 980, opacity: .72 }}>SIMULATION ≠ OBSERVATION · REENTRY ≠ OBSERVATION · RESULT ≠ CANON · MODEL CONTEXT ≠ TWIN MEMORY · UI ACTION ≠ CANONICAL PROMOTION</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 14 }}>
          <div style={panel}>
            <strong>01 · EXPERIMENT CONFIGURATION</strong>
            <label>Experiment type<select style={input} value={experimentType} onChange={(event) => setExperimentType(event.target.value as ExperimentType)}>{EXPERIMENT_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Experiment ID<input style={input} value={experimentId} onChange={(event) => setExperimentId(event.target.value)} /></label>
            <label>Case<select style={input} value={caseRef} onChange={(event) => { setCaseRef(event.target.value); setEvidenceRefs([]); setTwinStateRef(''); }}><option value="">SELECT OWNER CASE…</option>{(projection?.cases ?? []).map((item) => <option key={String(item.id)} value={String(item.id)}>{text(item.title) || String(item.id)}</option>)}</select></label>
            <label>Twin state<select style={input} value={twinStateRef} onChange={(event) => setTwinStateRef(event.target.value)}><option value="">NO TWIN STATE</option>{caseTwinStates.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.id)} · {text(item.status)} · {text(item.model)}</option>)}</select></label>
            <label>Hypothesis<textarea style={{ ...input, minHeight: 72 }} value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} /></label>
            <label>Null hypothesis<textarea style={{ ...input, minHeight: 56 }} value={nullHypothesis} onChange={(event) => setNullHypothesis(event.target.value)} /></label>
          </div>

          <div style={panel}>
            <strong>02 · FROZEN T0 + EVIDENCE</strong>
            <label>T0 cutoff<input type="datetime-local" style={input} value={t0Cutoff} onChange={(event) => setT0Cutoff(event.target.value)} /></label>
            <div style={{ maxHeight: 240, overflow: 'auto', display: 'grid', gap: 6 }}>
              {caseEvidence.length ? caseEvidence.map((item) => (
                <label key={String(item.id)} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'start' }}>
                  <input type="checkbox" checked={evidenceRefs.includes(String(item.id))} onChange={() => toggleEvidence(String(item.id))} />
                  <span><b>{text(item.label) || String(item.id)}</b><small style={{ display: 'block', opacity: .58 }}>{text(item.evidence_type)} · {text(item.observed_at) || text(item.created_at)}</small></span>
                </label>
              )) : <span style={{ opacity: .55 }}>No owner-scoped evidence for selected case.</span>}
            </div>
            <div style={{ ...mono, opacity: .65 }}>Frozen refs on preregistration: case + selected evidence + selected Twin state. Inputs observed after T0 are rejected server-side.</div>
          </div>

          <div style={panel}>
            <strong>03 · METHOD / VARIANTS / SIGNAL</strong>
            <label>Method<textarea style={{ ...input, minHeight: 62 }} value={methodDescription} onChange={(event) => setMethodDescription(event.target.value)} /></label>
            <label>Control<textarea style={{ ...input, minHeight: 56 }} value={controlDescription} onChange={(event) => setControlDescription(event.target.value)} /></label>
            <label>Variants · one per line<textarea style={{ ...input, minHeight: 76 }} value={variantText} onChange={(event) => setVariantText(event.target.value)} /></label>
            <label>Expected signal<textarea style={{ ...input, minHeight: 56 }} value={expectedSignal} onChange={(event) => setExpectedSignal(event.target.value)} /></label>
            <label>Measures · one per line<textarea style={{ ...input, minHeight: 110 }} value={measureText} onChange={(event) => setMeasureText(event.target.value)} /></label>
          </div>

          <div style={panel}>
            <strong>04 · STOPPING + RETURN TERMS</strong>
            <label>Falsification<textarea style={{ ...input, minHeight: 56 }} value={falsification} onChange={(event) => setFalsification(event.target.value)} /></label>
            <label>Stopping rule<textarea style={{ ...input, minHeight: 56 }} value={stoppingRule} onChange={(event) => setStoppingRule(event.target.value)} /></label>
            <label>Max executions<input style={input} inputMode="numeric" value={maxExecutions} onChange={(event) => setMaxExecutions(event.target.value)} /></label>
            <label>RETURN opens<input type="datetime-local" style={input} value={returnOpensAt} onChange={(event) => setReturnOpensAt(event.target.value)} /></label>
            <label>RETURN closes<input type="datetime-local" style={input} value={returnClosesAt} onChange={(event) => setReturnClosesAt(event.target.value)} /></label>
            <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={returnRequired} onChange={(event) => setReturnRequired(event.target.checked)} />RETURN required</label>
          </div>
        </div>

        <div style={{ ...panel, gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', alignItems: 'end' }}>
          <div><strong>05 · INTERNAL PREREGISTRATION</strong><div style={{ ...mono, opacity: .62 }}>No OSF/external registration claim. INSERT-only definition hash freezes T0, hypothesis, method and stopping terms.</div></div>
          <button style={button} disabled={busy || !canPreregister || Boolean(preregistered)} onClick={() => void preregister()}>{preregistered ? 'PREREGISTERED · IMMUTABLE' : busy ? 'WORKING…' : 'FREEZE T0 + PREREGISTER'}</button>
          <div><strong>Allowed execution</strong><div style={{ ...mono, opacity: .62 }}>Slice E exposes execution only where an existing owner exists. Current UI adapter: SIMULATION → runPersonalLab → experimentPersistence.</div></div>
          <div style={{ display: 'grid', gap: 8 }}><select style={input} value={simulationProtocol} onChange={(event) => setSimulationProtocol(event.target.value as typeof simulationProtocol)} disabled={experimentType !== 'SIMULATION'}><option value="sociotechnical_simulation">Sociotechnical simulation</option><option value="economic_simulation">Economic simulation</option></select><button style={button} disabled={busy || !canExecute} onClick={() => void runSimulation()}>EXECUTE ALLOWED SIMULATION</button></div>
        </div>

        <div style={panel}>
          <strong>06 · REENTRY ENGINE DIMENSIONS</strong>
          <p style={{ margin: 0, opacity: .68 }}>Rendered from persisted Reentry comparison receipts when available. Missing dimensions remain NOT_OBSERVABLE; UI does not manufacture deltas.</p>
          <select style={input} value={inspectRunId} onChange={(event) => setInspectRunId(event.target.value)}><option value="">SELECT RUN…</option>{(projection?.runs ?? []).map((item) => <option key={String(item.id)} value={String(item.id)}>{runExperimentId(item) || String(item.id)} · {runEpistemicClass(item)}</option>)}</select>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 8 }}>
            {REENTRY_DIMENSIONS.map(([key, label]) => {
              const delta = record(comparisonDeltas[key]);
              return <article key={key} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: 10 }}><b>{label}</b><div style={mono}>{text(delta.observability) || 'NOT_OBSERVABLE'}</div><div style={mono}>changed: {delta.changed === true ? 'YES' : delta.changed === false ? 'NO' : '—'}</div><div style={mono}>Δ: {typeof delta.numericDelta === 'number' ? delta.numericDelta : '—'}</div></article>;
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 14 }}>
          <div style={panel}>
            <strong>07 · RESULT COMPARISON</strong>
            <label>Control / left<select style={input} value={leftRunId} onChange={(event) => setLeftRunId(event.target.value)}><option value="">SELECT…</option>{(projection?.runs ?? []).map((item) => <option key={String(item.id)} value={String(item.id)}>{runExperimentId(item) || String(item.id)}</option>)}</select></label>
            <label>Variant / right<select style={input} value={rightRunId} onChange={(event) => setRightRunId(event.target.value)}><option value="">SELECT…</option>{(projection?.runs ?? []).map((item) => <option key={String(item.id)} value={String(item.id)}>{runExperimentId(item) || String(item.id)}</option>)}</select></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><pre style={{ ...mono, whiteSpace: 'pre-wrap', margin: 0 }}>{leftRun ? `class=${runEpistemicClass(leftRun)}\nhash=${runResultHash(leftRun)}` : '—'}</pre><pre style={{ ...mono, whiteSpace: 'pre-wrap', margin: 0 }}>{rightRun ? `class=${runEpistemicClass(rightRun)}\nhash=${runResultHash(rightRun)}` : '—'}</pre></div>
            {leftRun && rightRun ? <div style={{ ...mono, opacity: .72 }}>same result hash: {runResultHash(leftRun) === runResultHash(rightRun) ? 'YES' : 'NO'} · comparison is descriptive unless a persisted Reentry comparison provides controlled attribution.</div> : null}
          </div>

          <div style={panel}>
            <strong>08 · LINEAGE + EXECUTION RECEIPT</strong>
            <div style={mono}>experiment: {inspectedRun ? runExperimentId(inspectedRun) : '—'}</div>
            <div style={mono}>lineage: {rows(execution.lineageRefs).length ? JSON.stringify(execution.lineageRefs) : Array.isArray(execution.lineageRefs) ? JSON.stringify(execution.lineageRefs) : '—'}</div>
            <pre style={{ ...mono, whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto', margin: 0 }}>{Object.keys(receipt).length ? JSON.stringify(receipt, null, 2) : 'No reproducibility receipt selected.'}</pre>
            <pre style={{ ...mono, whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto', margin: 0 }}>{Object.keys(record(execution.runtimeReceipt)).length ? JSON.stringify(record(execution.runtimeReceipt), null, 2) : 'No Reentry runtime receipt on this run.'}</pre>
          </div>
        </div>

        <div style={panel}>
          <strong>09 · SLICE F PREREGISTRATION METADATA PREVIEW</strong>
          <p style={{ margin: 0, opacity: .66 }}>Exposes the internal metadata required for later export; it does not claim external registration.</p>
          <pre style={{ ...mono, whiteSpace: 'pre-wrap', maxHeight: 360, overflow: 'auto', margin: 0 }}>{preregistered ? JSON.stringify(record(preregistered.preregistration), null, 2) : JSON.stringify({ HYPOTHESIS: hypothesis || null, T0: { cutoff: t0Cutoff, evidenceRefs, twinStateRef: twinStateRef || null }, METHOD: methodDescription, STOPPING_RULE: stoppingRule, EXPECTED_SIGNAL: expectedSignal, RETURN_WINDOW: { opensAt: returnOpensAt, closesAt: returnClosesAt, required: returnRequired }, externalRegistrationClaim: false }, null, 2)}</pre>
        </div>

        <footer style={{ ...mono, display: 'grid', gap: 4, opacity: .68 }}>
          <span>{projection?.privacyBoundary ?? 'PRIVATE_TWIN_CASE_STATE_REQUIRES_OWNER_ID_MATCH'}</span>
          <span>{projection?.observationBoundary ?? 'SIMULATION_AND_REENTRY_NEVER_INHERIT_OBSERVED'}</span>
          <span>{projection?.authorityBoundary ?? 'UI_ACTION_NEVER_PROMOTES_CANON'}</span>
          <span>{projection?.warnings.length ? projection.warnings.join(' · ') : 'Persistence projection: AVAILABLE'}</span>
          {message ? <b>{message}</b> : null}
        </footer>
      </div>
    </section>
  );
}
