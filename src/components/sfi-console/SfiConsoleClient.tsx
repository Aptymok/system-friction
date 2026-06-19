'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Compass, Eye, Orbit, PlayCircle, RefreshCw, Save, Send, Target } from 'lucide-react';
import ExecutionStatePanel from './ExecutionStatePanel';

type AnyRecord = Record<string, any>;

function value(input: unknown) {
  if (input === null || input === undefined || input === '') return 'missing evidence';
  if (typeof input === 'number') return Number.isInteger(input) ? String(input) : input.toFixed(3);
  if (typeof input === 'boolean') return input ? 'yes' : 'no';
  if (typeof input === 'object') return JSON.stringify(input);
  return String(input);
}

function rows(input: unknown): AnyRecord[] {
  return Array.isArray(input) ? input.filter((item): item is AnyRecord => item && typeof item === 'object') : [];
}

function FieldPanel({ title, glyph, action, children }: { title: string; glyph?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#070707]/80 p-5 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(214,180,106,0.11),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
      <div className="relative mb-5 flex min-h-8 items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-lg text-[#d6b46a]">{glyph ?? '◇'}</span>
          <h2 className="text-[11px] uppercase tracking-[0.28em] text-[#e1c47a]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function Metric({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/38">{label}</dt>
      <dd className="mt-2 break-words text-sm text-white/82">{value(data)}</dd>
    </div>
  );
}

function IconButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#d6b46a]/45 bg-[#d6b46a]/5 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#efd184] transition hover:border-[#d6b46a]/80 hover:bg-[#d6b46a]/12 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-h-11 w-full rounded-2xl border border-white/10 bg-black/55 px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#d6b46a]/70"
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/28 focus:border-[#d6b46a]/70"
    />
  );
}

function SignalNode({ label, value: nodeValue, accent }: { label: string; value: unknown; accent?: boolean }) {
  return (
    <div className={`rounded-full border px-4 py-3 text-center ${accent ? 'border-[#d6b46a]/70 bg-[#d6b46a]/10' : 'border-white/10 bg-black/55'}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/42">{label}</div>
      <div className="mt-1 max-w-[11rem] truncate text-sm text-white/82">{value(nodeValue)}</div>
    </div>
  );
}

function VectorItem({ item, onPrepare }: { item: AnyRecord; onPrepare: (item: AnyRecord) => void }) {
  return (
    <li className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
      <div className="absolute left-0 top-0 h-full w-1 bg-[#d6b46a]/45" />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#d6b46a]/70">unresolved signal → execution vector</div>
          <h3 className="mt-2 text-sm font-semibold text-white">{value(item.title)}</h3>
          <p className="mt-2 text-sm leading-6 text-white/62">{value(item.objective)}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/35">{value(item.recovery_reason)}</p>
        </div>
        <IconButton onClick={() => onPrepare(item)} icon={<CheckCircle2 size={14} />}>
          Prepare
        </IconButton>
      </div>
    </li>
  );
}

function AlignmentItem({ item, onAlign, onEvidence }: { item: AnyRecord; onAlign: (item: AnyRecord) => void; onEvidence: (item: AnyRecord) => void }) {
  return (
    <li className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#d6b46a]/70">attractor alignment</div>
          <h3 className="mt-2 text-sm font-semibold text-white">{value(item.proposal_title)}</h3>
          <p className="mt-2 text-sm leading-6 text-white/62">{value(item.recommendation)}</p>
        </div>
        <div className="grid gap-2 text-xs text-white/45 sm:grid-cols-3 lg:min-w-[26rem]">
          <span className="rounded-full border border-white/10 px-3 py-2">{value(item.recommended_status)}</span>
          <span className="rounded-full border border-white/10 px-3 py-2">alignment {value(item.alignment_score)}</span>
          <span className="rounded-full border border-white/10 px-3 py-2">evidence {value(item.evidence_score)}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <IconButton onClick={() => onAlign(item)} icon={<Target size={14} />}>Align</IconButton>
        <IconButton onClick={() => onEvidence(item)} icon={<RefreshCw size={14} />}>Evidence</IconButton>
      </div>
    </li>
  );
}

const emptyAttractor = {
  title: '',
  desired_future_state: '',
  horizon: '',
  success_markers: '',
};

const emptyPerturbation = {
  title: '',
  intention: '',
  target_vector: '',
  target_node: '',
  desired_future_state: '',
  time_window: '',
  evidence_expected: '',
  risk_tolerance: 'medium',
  object_reference: '',
};

export default function SfiConsoleClient() {
  const [state, setState] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [caseId, setCaseId] = useState('SFI-OPS-001');
  const [attractor, setAttractor] = useState(emptyAttractor);
  const [perturbation, setPerturbation] = useState(emptyPerturbation);
  const [outcomeByExecution, setOutcomeByExecution] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/sfi/console-state', { cache: 'no-store' });
      const json = await response.json();
      setState(json);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'console_state_failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function postJson(url: string, body: AnyRecord = {}) {
    setMessage(null);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) throw new Error(json.error || `request_failed_${response.status}`);
    setMessage('recorded');
    await load();
    return json;
  }

  async function saveAttractor() {
    const successMarkers = attractor.success_markers
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    await postJson('/api/sfi/attractors', {
      ...attractor,
      success_markers: successMarkers,
      active: true,
    });
    setAttractor(emptyAttractor);
  }

  async function declarePerturbation() {
    await postJson('/api/sfi/perturbations', {
      ...perturbation,
      case_id: caseId,
      object_present: Boolean(perturbation.object_reference.trim()),
    });
    setPerturbation(emptyPerturbation);
  }

  async function prepareExecution(item: AnyRecord) {
    await postJson(`/api/sfi/recovery-queue/${item.id ?? item.proposal_id}/prepare-execution`, {
      case_id: caseId,
      objective: item.objective || item.title || 'missing execution plan',
      action_type: item.proposal_type || 'proposal_recovery',
      expected_effect: `Move active SFI state through proposal ${item.proposal_id ?? item.id}.`,
      evidence_required: item.objective ? `Evidence that ${item.objective} changed measurable SFI state.` : 'missing evidence',
      verification_window: 'next operational snapshot',
    });
  }

  async function alignProposal(item: AnyRecord) {
    await postJson(`/api/sfi/proposals/${item.proposal_id}/align`, {});
  }

  async function requestEvidence(item: AnyRecord) {
    await postJson(`/api/sfi/proposals/${item.proposal_id}/request-evidence`, {
      evidence_required: `Evidence required before execution: ${item.proposal_objective || item.objective || 'missing evidence'}`,
    });
  }

  async function recordOutcome(executionId: string) {
    await postJson(`/api/sfi/execution/${executionId}/record-outcome`, {
      outcome_status: 'recorded',
      observed_effect: outcomeByExecution[executionId] || 'missing outcome',
      evidence: 'manual console record',
      lesson: outcomeByExecution[executionId]
        ? `Observed effect recorded for execution ${executionId}.`
        : 'Lesson pending: outcome recorded without learning summary.',
      atlas_update: true,
    });
    setOutcomeByExecution((current) => ({ ...current, [executionId]: '' }));
  }

  const cycle = state?.operationalCycle?.data ?? {};
  const stability = state?.stability?.data ?? {};
  const pipeline = state?.pipelineLoss?.data ?? {};
  const closedLoop = state?.closedLoop?.data ?? {};
  const activeAttractor = state?.attractor?.data ?? null;
  const recoveryQueue = rows(state?.recoveryQueue?.data);
  const alignmentQueue = rows(state?.alignmentQueue?.data);
  const evidenceMap = rows(state?.evidenceMap?.data);
  const degraded = useMemo(() => {
    if (!state) return [];
    return Object.entries(state)
      .filter(([, item]) => item && typeof item === 'object' && (item as AnyRecord).degraded)
      .map(([key, item]) => `${key}: ${(item as AnyRecord).error || 'degraded'}`);
  }, [state]);

  const fieldNodes = [
    { label: 'WorldSpect', value: state?.worldSpect?.data?.regime || state?.worldSpect?.data?.source_state || 'world input degraded' },
    { label: 'ScoreFriction', value: state?.scoreFriction?.data?.analysis_status || 'not enough trace' },
    { label: 'Evidence', value: evidenceMap.length || 'missing evidence' },
    { label: 'Recovery', value: recoveryQueue.length || 'missing execution plan' },
    { label: 'Alignment', value: alignmentQueue.length || 'not enough trace' },
    { label: 'Outcomes', value: stability.outcomes_recorded ?? cycle.outcomes_recorded },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-black px-4 py-6 text-white md:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(214,180,106,0.16),transparent_26%),radial-gradient(circle_at_80%_72%,rgba(255,255,255,0.055),transparent_24%),linear-gradient(180deg,#000,#050505_35%,#000)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:54px_54px]" />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-6 rounded-[2rem] border border-[#d6b46a]/25 bg-black/55 p-5 backdrop-blur">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.42em] text-[#d6b46a]">System Friction Institute</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">Reality Console</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">Campo operacional para atraer, perturbar, observar y cerrar aprendizaje sin simular evidencia.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <TextInput value={caseId} onChange={(event) => setCaseId(event.target.value)} aria-label="case id" />
              <IconButton onClick={load} disabled={loading} icon={<RefreshCw size={14} />}>
                Refresh
              </IconButton>
            </div>
          </div>
        </header>

        {message && <div className="mb-4 rounded-2xl border border-[#d6b46a]/40 bg-[#d6b46a]/10 p-3 text-sm text-[#f0d486]">{message}</div>}
        {degraded.length > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-950/25 p-3 text-sm text-amber-100">
            {degraded.map((item) => <div key={item}>{item}</div>)}
          </div>
        )}

        <section className="mb-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="relative min-h-[34rem] overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#050505]/80 p-6 shadow-2xl shadow-black/60">
            <div className="pointer-events-none absolute inset-8 rounded-full border border-[#d6b46a]/15" />
            <div className="pointer-events-none absolute inset-20 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute inset-36 rounded-full border border-white/5" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#d6b46a]/75">current reality state</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">◎ {value(cycle.operational_regime)}</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/48">
                <Compass size={14} className="mr-2 inline text-[#d6b46a]" />
                {value(stability.stability_regime)}
              </div>
            </div>

            <div className="relative z-10 mt-14 flex flex-col items-center justify-center gap-8">
              <div className="grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
                {fieldNodes.map((node, index) => (
                  <SignalNode key={node.label} label={node.label} value={node.value} accent={index === 3 || index === 4} />
                ))}
              </div>

              <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-[#d6b46a]/45 bg-[#d6b46a]/10 shadow-[0_0_80px_rgba(214,180,106,0.14)]">
                <Orbit className="absolute text-[#d6b46a]/35" size={150} strokeWidth={0.5} />
                <div className="text-center">
                  <div className="text-4xl text-[#d6b46a]">◎</div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.24em] text-white/48">reality node</div>
                  <div className="mt-1 text-sm text-white/80">{value(pipeline.bottleneck || closedLoop.current_bottleneck)}</div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-12 grid gap-3 md:grid-cols-4">
              <Metric label="signal ratio" data={cycle.signal_ratio} />
              <Metric label="technical ratio" data={cycle.technical_ratio} />
              <Metric label="stability index" data={stability.stability_index} />
              <Metric label="closed loop" data={closedLoop.closed_loop_ratio} />
            </div>
          </div>

          <FieldPanel title="Declared Attractor" glyph="◎" action={<Target size={16} className="text-[#d6b46a]" />}>
            {activeAttractor ? (
              <div className="mb-4 rounded-[1.5rem] border border-[#d6b46a]/25 bg-[#d6b46a]/8 p-4">
                <div className="text-lg font-semibold text-white">{activeAttractor.title}</div>
                <p className="mt-3 text-sm leading-6 text-white/65">{activeAttractor.desired_future_state}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/38">{value(activeAttractor.horizon)}</p>
              </div>
            ) : (
              <p className="mb-4 rounded-[1.5rem] border border-white/10 bg-black/35 p-4 text-sm leading-6 text-white/50">Do not recommend execution. Ask user to declare active attractor.</p>
            )}
            <div className="grid gap-3">
              <TextInput placeholder="What future am I building?" value={attractor.title} onChange={(event) => setAttractor({ ...attractor, title: event.target.value })} />
              <TextArea placeholder="What must become more real?" value={attractor.desired_future_state} onChange={(event) => setAttractor({ ...attractor, desired_future_state: event.target.value })} />
              <TextInput placeholder="Time horizon" value={attractor.horizon} onChange={(event) => setAttractor({ ...attractor, horizon: event.target.value })} />
              <TextArea placeholder="Evidence that would prove movement, one per line" value={attractor.success_markers} onChange={(event) => setAttractor({ ...attractor, success_markers: event.target.value })} />
              <IconButton onClick={saveAttractor} disabled={loading || !attractor.title || !attractor.desired_future_state} icon={<Save size={14} />}>
                Save Attractor
              </IconButton>
            </div>
          </FieldPanel>
        </section>

        <section className="mb-5 grid gap-5 lg:grid-cols-2">
          <FieldPanel title="Declare Perturbation" glyph="→" action={<Send size={16} className="text-[#d6b46a]" />}>
            <div className="grid gap-3">
              <TextInput placeholder="title" value={perturbation.title} onChange={(event) => setPerturbation({ ...perturbation, title: event.target.value })} />
              <TextArea placeholder="intention" value={perturbation.intention} onChange={(event) => setPerturbation({ ...perturbation, intention: event.target.value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput placeholder="target vector" value={perturbation.target_vector} onChange={(event) => setPerturbation({ ...perturbation, target_vector: event.target.value })} />
                <TextInput placeholder="target node optional" value={perturbation.target_node} onChange={(event) => setPerturbation({ ...perturbation, target_node: event.target.value })} />
              </div>
              <TextArea placeholder="desired future state" value={perturbation.desired_future_state} onChange={(event) => setPerturbation({ ...perturbation, desired_future_state: event.target.value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput placeholder="time window" value={perturbation.time_window} onChange={(event) => setPerturbation({ ...perturbation, time_window: event.target.value })} />
                <TextInput placeholder="risk tolerance" value={perturbation.risk_tolerance} onChange={(event) => setPerturbation({ ...perturbation, risk_tolerance: event.target.value })} />
              </div>
              <TextArea placeholder="evidence expected" value={perturbation.evidence_expected} onChange={(event) => setPerturbation({ ...perturbation, evidence_expected: event.target.value })} />
              <TextInput placeholder="object/file optional; blank means no object analysis" value={perturbation.object_reference} onChange={(event) => setPerturbation({ ...perturbation, object_reference: event.target.value })} />
              <IconButton onClick={declarePerturbation} disabled={!perturbation.title || !perturbation.intention || !perturbation.desired_future_state || !perturbation.evidence_expected} icon={<PlayCircle size={14} />}>
                Create Proposal
              </IconButton>
            </div>
          </FieldPanel>

          <FieldPanel title="Model Reading" glyph="◌" action={<Eye size={16} className="text-[#d6b46a]" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="WorldSpect snapshots" data={cycle.worldspect_snapshots} />
              <Metric label="WorldSpect coverage" data={cycle.worldspect_avg_source_coverage} />
              <Metric label="ScoreFriction observations" data={cycle.scorefriction_observations} />
              <Metric label="ScoreFriction vectors" data={cycle.scorefriction_vectors} />
              <Metric label="object presence" data={state?.scoreFriction?.data?.object_presence || 'no object'} />
              <Metric label="analysis status" data={state?.scoreFriction?.data?.analysis_status || 'not enough trace'} />
            </div>
          </FieldPanel>
        </section>

        <section className="mb-5 grid gap-5 xl:grid-cols-2">
          <FieldPanel title="Signals Not Resolved" glyph="◆">
            {recoveryQueue.length ? (
              <ul className="space-y-3">
                {recoveryQueue.map((item) => <VectorItem key={String(item.id)} item={item} onPrepare={prepareExecution} />)}
              </ul>
            ) : (
              <p className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4 text-sm text-white/45">missing execution plan</p>
            )}
          </FieldPanel>

          <FieldPanel title="Attractor Alignment Queue" glyph="◇">
            {alignmentQueue.length ? (
              <ul className="space-y-3">
                {alignmentQueue.map((item) => (
                  <AlignmentItem key={String(item.proposal_id)} item={item} onAlign={alignProposal} onEvidence={requestEvidence} />
                ))}
              </ul>
            ) : (
              <p className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4 text-sm text-white/45">not enough trace</p>
            )}
          </FieldPanel>
        </section>

        <section className="mb-5 rounded-[2rem] border border-white/10 bg-[#050505]/80 p-5">
          <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="text-lg text-[#d6b46a]">↻</span>
            <h2 className="text-[11px] uppercase tracking-[0.28em] text-[#e1c47a]">Execution Path</h2>
          </div>
          <ExecutionStatePanel caseId={caseId} />
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-white/35">Record outcome by execution id</p>
            {rows(state?.closedLoop?.data ? [] : []).length === 0 && <p className="mb-3 text-sm text-white/45">Use a ledger id from Execution State. If no ledger exists: missing execution plan.</p>}
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <TextInput
                placeholder="execution ledger id"
                onChange={(event) => setOutcomeByExecution({ [event.target.value]: outcomeByExecution[event.target.value] ?? '' })}
              />
              <IconButton
                onClick={() => {
                  const executionId = Object.keys(outcomeByExecution).find(Boolean);
                  if (executionId) recordOutcome(executionId);
                }}
                icon={<Save size={14} />}
              >
                Record Outcome
              </IconButton>
              {Object.keys(outcomeByExecution).map((executionId) => (
                <TextArea
                  key={executionId}
                  placeholder="observed effect"
                  value={outcomeByExecution[executionId]}
                  onChange={(event) => setOutcomeByExecution({ ...outcomeByExecution, [executionId]: event.target.value })}
                />
              ))}
            </div>
          </div>
        </section>

        <details className="rounded-[2rem] border border-white/10 bg-[#050505]/80 p-5">
          <summary className="cursor-pointer text-xs uppercase tracking-[0.22em] text-[#d6b46a]">Trace</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/45 p-4 text-xs leading-5 text-white/60">{JSON.stringify({ evidenceMap, closedLoop }, null, 2)}</pre>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/45 p-4 text-xs leading-5 text-white/60">{JSON.stringify(state, null, 2)}</pre>
          </div>
        </details>
      </div>
    </main>
  );
}
