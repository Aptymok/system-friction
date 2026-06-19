'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, PlayCircle, RefreshCw, Save, Send, Target } from 'lucide-react';
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

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-white/10 bg-[#0d0f0f] p-4">
      <div className="mb-4 flex min-h-8 items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h2 className="text-xs uppercase tracking-[0.22em] text-[#d6b46a]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="border-b border-white/10 py-2">
      <dt className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</dt>
      <dd className="mt-1 break-words text-sm text-white/80">{value(data)}</dd>
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
      className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#d6b46a]/50 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#d6b46a] hover:bg-[#d6b46a]/10 disabled:cursor-not-allowed disabled:opacity-40"
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
      className="min-h-10 w-full border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#d6b46a]/60"
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-24 w-full resize-none border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#d6b46a]/60"
    />
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

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 border-b border-[#d6b46a]/30 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.36em] text-[#d6b46a]">System Friction Institute</p>
              <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">SFI Reality Console</h1>
            </div>
            <div className="flex items-center gap-3">
              <TextInput value={caseId} onChange={(event) => setCaseId(event.target.value)} aria-label="case id" />
              <IconButton onClick={load} disabled={loading} icon={<RefreshCw size={14} />}>
                Refresh
              </IconButton>
            </div>
          </div>
        </header>

        {message && <div className="mb-4 border border-[#d6b46a]/40 bg-[#d6b46a]/10 p-3 text-sm text-[#f0d486]">{message}</div>}
        {degraded.length > 0 && (
          <div className="mb-4 border border-amber-500/40 bg-amber-950/25 p-3 text-sm text-amber-100">
            {degraded.map((item) => <div key={item}>{item}</div>)}
          </div>
        )}

        <section className="mb-4 grid gap-4 lg:grid-cols-4">
          <Panel title="Current Reality">
            <dl>
              <Metric label="operational regime" data={cycle.operational_regime} />
              <Metric label="signal ratio" data={cycle.signal_ratio} />
              <Metric label="technical ratio" data={cycle.technical_ratio} />
              <Metric label="pipeline bottleneck" data={pipeline.bottleneck || closedLoop.current_bottleneck} />
            </dl>
          </Panel>
          <Panel title="Stability">
            <dl>
              <Metric label="stability index" data={stability.stability_index} />
              <Metric label="stability regime" data={stability.stability_regime} />
              <Metric label="approved proposals" data={stability.proposals_approved ?? cycle.proposals_approved} />
              <Metric label="outcomes recorded" data={stability.outcomes_recorded ?? cycle.outcomes_recorded} />
            </dl>
          </Panel>
          <Panel title="WorldSpect">
            <dl>
              <Metric label="snapshots" data={cycle.worldspect_snapshots} />
              <Metric label="coverage" data={cycle.worldspect_avg_source_coverage} />
              <Metric label="latest regime" data={state?.worldSpect?.data?.regime} />
              <Metric label="input state" data={state?.worldSpect?.data ? state.worldSpect.data.source_state : 'world input degraded'} />
            </dl>
          </Panel>
          <Panel title="ScoreFriction">
            <dl>
              <Metric label="observations" data={cycle.scorefriction_observations} />
              <Metric label="vectors" data={cycle.scorefriction_vectors} />
              <Metric label="object presence" data={state?.scoreFriction?.data?.object_presence || 'no object'} />
              <Metric label="analysis status" data={state?.scoreFriction?.data?.analysis_status || 'not enough trace'} />
            </dl>
          </Panel>
        </section>

        <section className="mb-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Declared Attractor" action={<Target size={16} className="text-[#d6b46a]" />}>
            {activeAttractor ? (
              <div className="mb-4 border border-white/10 bg-black/40 p-3">
                <div className="text-sm font-semibold text-white">{activeAttractor.title}</div>
                <p className="mt-2 text-sm leading-6 text-white/65">{activeAttractor.desired_future_state}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/35">{value(activeAttractor.horizon)}</p>
              </div>
            ) : (
              <p className="mb-4 text-sm text-white/50">Do not recommend execution. Ask user to declare active attractor.</p>
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
          </Panel>

          <Panel title="Declare Perturbation" action={<Send size={16} className="text-[#d6b46a]" />}>
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
          </Panel>
        </section>

        <section className="mb-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Recovery Queue">
            {recoveryQueue.length ? (
              <ul className="space-y-3">
                {recoveryQueue.map((item) => (
                  <li key={String(item.id)} className="border border-white/10 bg-black/35 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{value(item.title)}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/60">{value(item.objective)}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/35">{value(item.recovery_reason)}</p>
                      </div>
                      <IconButton onClick={() => prepareExecution(item)} icon={<CheckCircle2 size={14} />}>
                        Prepare Execution
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/45">missing execution plan</p>
            )}
          </Panel>

          <Panel title="Attractor Alignment Queue">
            {alignmentQueue.length ? (
              <ul className="space-y-3">
                {alignmentQueue.map((item) => (
                  <li key={String(item.proposal_id)} className="border border-white/10 bg-black/35 p-3">
                    <h3 className="text-sm font-semibold text-white">{value(item.proposal_title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/60">{value(item.recommendation)}</p>
                    <div className="mt-3 grid gap-2 text-xs text-white/45 md:grid-cols-3">
                      <span>{value(item.recommended_status)}</span>
                      <span>alignment {value(item.alignment_score)}</span>
                      <span>evidence {value(item.evidence_score)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <IconButton onClick={() => alignProposal(item)} icon={<Target size={14} />}>Align</IconButton>
                      <IconButton onClick={() => requestEvidence(item)} icon={<RefreshCw size={14} />}>Request Evidence</IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/45">not enough trace</p>
            )}
          </Panel>
        </section>

        <Panel title="Execution Path">
          <ExecutionStatePanel caseId={caseId} />
          <div className="mt-4">
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
        </Panel>

        <details className="mt-4 border border-white/10 bg-[#0d0f0f] p-4">
          <summary className="cursor-pointer text-xs uppercase tracking-[0.22em] text-[#d6b46a]">Trace</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-5 text-white/60">{JSON.stringify({ evidenceMap, closedLoop }, null, 2)}</pre>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-5 text-white/60">{JSON.stringify(state, null, 2)}</pre>
          </div>
        </details>
      </div>
    </main>
  );
}
