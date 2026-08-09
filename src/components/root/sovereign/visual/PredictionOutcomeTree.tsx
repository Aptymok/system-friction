'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection } from '../sovereignTypes';

type BranchState = 'win' | 'loss' | 'pending' | 'inconclusive';
type BranchEvent = { at: string; state: BranchState; label: string; row: RootRow; kind: 'outcome' | 'verification' };
type Branch = { id: string; label: string; createdAt: string | null; prediction: number | null; row: RootRow; events: BranchEvent[] };

function rec(value: unknown): RootRow { return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {}; }
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}
function dateValue(value: unknown) {
  const raw = typeof value === 'string' ? value : '';
  return raw && Number.isFinite(Date.parse(raw)) ? raw : null;
}
function when(value: string | null) {
  if (!value) return 'SIN FECHA';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
function branchStateFromText(value: unknown): BranchState {
  const normalized = text(value).toUpperCase();
  if (/(SUPPORTED|VERIFIED|CORRECT|HIT|SUCCESS|CONFIRMED|WON|TRUE_POSITIVE|TRUE_NEGATIVE)/.test(normalized)) return 'win';
  if (/(FALSIFIED|INCORRECT|MISS|FAILED|REJECTED|LOST|FALSE_POSITIVE|FALSE_NEGATIVE)/.test(normalized)) return 'loss';
  if (/(INCONCLUSIVE|PARTIAL|UNVERIFIABLE|CONFLICTED)/.test(normalized)) return 'inconclusive';
  return 'pending';
}
function governedOutcomeState(run: RootRow, outcome: RootRow): BranchState {
  const payload = rec(outcome.outcome_payload);
  const explicit = branchStateFromText(payload.evaluation_result ?? payload.result ?? payload.verification_state);
  if (explicit !== 'pending') return explicit;
  const predicted = numberValue(run.prediction);
  const actual = numberValue(outcome.actual_value);
  if (predicted === null || actual === null) return branchStateFromText(outcome.evaluation_state);
  return (predicted >= 0.5) === (actual >= 0.5) ? 'win' : 'loss';
}
function branchLabel(run: RootRow, index: number) {
  return text(run.interpretation ?? run.target_key ?? run.subject_id ?? run.prediccion_explicita ?? run.case_label, `Hipótesis ${index + 1}`);
}

export function PredictionOutcomeTree({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
  const branches = useMemo<Branch[]>(() => {
    const governed = state.predictions.data.runs.map((run, index) => {
      const id = text(run.id, `run-${index}`);
      const events = state.predictions.data.outcomes
        .filter((outcome) => text(outcome.run_id) === id)
        .map((outcome): BranchEvent | null => {
          const at = dateValue(outcome.observed_at ?? outcome.created_at);
          if (!at) return null;
          const outcomePayload = rec(outcome.outcome_payload);
          const actual = numberValue(outcome.actual_value);
          return {
            at,
            state: governedOutcomeState(run, outcome),
            label: actual === null ? text(outcome.evaluation_state, 'OUTCOME') : `actual ${actual.toFixed(3)} · ${text(outcome.evaluation_state, 'EVALUATED')}`,
            row: { ...outcome, outcome_payload: outcomePayload },
            kind: 'outcome',
          };
        })
        .filter((item): item is BranchEvent => Boolean(item));
      return {
        id,
        label: branchLabel(run, index),
        createdAt: dateValue(run.created_at ?? run.updated_at),
        prediction: numberValue(run.prediction),
        row: run,
        events: events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
      };
    });

    const legacy = state.predictions.data.legacyEntries.map((entry, index) => {
      const id = text(entry.id, `legacy-${index}`);
      const hypothesisId = text(entry.hypothesis_id);
      const events = state.predictions.data.legacyVerifications
        .filter((verification) => text(verification.prediction_entry_id) === id || (hypothesisId && text(verification.hypothesis_id) === hypothesisId))
        .map((verification): BranchEvent | null => {
          const at = dateValue(verification.source_checked_at ?? verification.updated_at ?? verification.created_at);
          if (!at) return null;
          const stateValue = branchStateFromText(verification.evaluation_result ?? verification.verification_state);
          return { at, state: stateValue, label: text(verification.evaluation_result ?? verification.verification_state, 'VERIFICATION'), row: verification, kind: 'verification' };
        })
        .filter((item): item is BranchEvent => Boolean(item));
      return {
        id,
        label: branchLabel(entry, index),
        createdAt: dateValue(entry.prediction_registered_at ?? entry.created_at),
        prediction: numberValue(entry.probabilidad_estimativa),
        row: entry,
        events: events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
      };
    });

    return [...governed, ...legacy].sort((a, b) => Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? ''));
  }, [state.predictions.data]);

  const timeline = useMemo(() => [...new Set(branches.flatMap((branch) => [branch.createdAt, ...branch.events.map((event) => event.at)]).filter((value): value is string => Boolean(value)))].sort((a, b) => Date.parse(a) - Date.parse(b)), [branches]);
  const [cursor, setCursor] = useState(Math.max(0, timeline.length - 1));
  useEffect(() => setCursor(Math.max(0, timeline.length - 1)), [timeline.length]);
  const cutoff = timeline[Math.min(cursor, Math.max(0, timeline.length - 1))] ?? state.generatedAt;
  const cutoffMs = Date.parse(cutoff);
  const visible = branches.filter((branch) => !branch.createdAt || Date.parse(branch.createdAt) <= cutoffMs);
  const snapshots = visible.map((branch) => {
    const event = [...branch.events].reverse().find((item) => Date.parse(item.at) <= cutoffMs) ?? null;
    return { branch, event, state: event?.state ?? 'pending' as BranchState };
  });
  const wins = snapshots.filter((item) => item.state === 'win').length;
  const losses = snapshots.filter((item) => item.state === 'loss').length;
  const pending = snapshots.filter((item) => item.state === 'pending').length;
  const inconclusive = snapshots.filter((item) => item.state === 'inconclusive').length;

  return <div className="prediction-tree" onClick={(event) => event.stopPropagation()}>
    <div className="prediction-summary">
      <span data-state="win">W {wins}</span><span data-state="loss">L {losses}</span><span data-state="pending">P {pending}</span><span data-state="inconclusive">I {inconclusive}</span>
    </div>
    <div className="prediction-branches">
      {snapshots.length ? snapshots.map(({ branch, event, state: branchState }) => <button key={branch.id} type="button" className="prediction-branch" data-state={branchState} onClick={() => onSelect({
        kind: event ? `prediction-${event.kind}` : 'prediction', id: event ? text(event.row.id, branch.id) : branch.id,
        title: branch.label, source: state.predictions.source, observedAt: event?.at ?? branch.createdAt,
        confidence: branch.prediction, evidenceIds: Array.isArray(branch.row.evidence_refs) ? branch.row.evidence_refs.map(String) : [], warning: null,
        data: { prediction: branch.row, visibleOutcome: event?.row ?? null, stateAtCutoff: branchState, cutoff },
      })}>
        <i className="branch-origin" /><span className="branch-line" />
        <span className="branch-hypothesis"><b>{branch.label}</b><small>{branch.prediction === null ? 'sin score' : `p ${branch.prediction.toFixed(3)}`}</small></span>
        <span className="branch-outcome"><b>{branchState.toUpperCase()}</b><small>{event ? `${when(event.at)} · ${event.label}` : 'todavía sin outcome en este corte'}</small></span>
      </button>) : <p className="prediction-empty">MISSING · no hay hipótesis predictivas persistidas.</p>}
    </div>
    <div className="prediction-timeline">
      <span>ANTES</span><input aria-label="Mover outcomes longitudinalmente" type="range" min={0} max={Math.max(0, timeline.length - 1)} value={Math.min(cursor, Math.max(0, timeline.length - 1))} onChange={(event) => setCursor(Number(event.target.value))} disabled={!timeline.length} /><span>{when(cutoff)}</span>
    </div>
  </div>;
}
