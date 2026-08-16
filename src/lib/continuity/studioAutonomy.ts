import 'server-only';

import { runStudioCognitiveRuntime } from '@/lib/studio/cognitive/studioCognitiveRuntime';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { ContinuityMode } from './contracts';
import {
  selectStudioAutonomyTransition,
  type StudioAutonomyAction,
} from './studioAutonomyPolicy';

type Row = Record<string, unknown>;

type ContinuityObservation = {
  capabilityId: string;
  status: string;
  latencyMs: number;
  errorCode?: string | null;
};

type ExperimentTarget = {
  sessionId: string;
  ownerId: string;
  projectId: string;
  projectLabel: string;
  projectCreatedAt: string;
  objectId: string;
  objectTitle: string;
  objectCreatedAt: string;
};

type ExperimentOutcome = {
  objectId: string;
  projectId: string;
  action: StudioAutonomyAction | 'SKIP';
  status: 'EXECUTED' | 'WAITING' | 'CLOSED' | 'BLOCKED' | 'FAILED' | 'SKIPPED';
  reason: string;
  hypothesisId?: string | null;
};

const SOURCE = 'sfi_continuity_autonomy_v1';
const FI_PROJECT_TOKEN = 'FI-001';
const FI_PROJECT_NAME = 'FOUNDER INDEPENDENCE';
const HORIZON_MS = 24 * 60 * 60 * 1000;
const FAILURE_BACKOFF_MS = 2 * 60 * 60 * 1000;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function time(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value: unknown) {
  return (text(value) ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function isFiProject(node: Row) {
  const label = normalize(node.label);
  return node.kind === 'project' && label.includes(FI_PROJECT_TOKEN) && label.includes(FI_PROJECT_NAME);
}

function hypothesisStatus(row: Row) {
  const payload = record(row.payload);
  return normalize(payload.suggestionStatus ?? payload.status);
}

function isActiveHypothesis(row: Row) {
  return ['PROPOSED', 'EVIDENCE_PENDING', 'IN_TEST', 'ACCEPTED'].includes(hypothesisStatus(row));
}

function isCognitiveEvidence(row: Row) {
  return text(row.source) === 'studio_cognitive_runtime_v1';
}

function cognitiveAction(row: Row): 'analyze' | 'generate_hypothesis' | 'verify' | null {
  const action = text(record(row.payload).action);
  return action === 'analyze' || action === 'generate_hypothesis' || action === 'verify' ? action : null;
}

async function discoverFiTargets(): Promise<ExperimentTarget[]> {
  const db = createServiceSupabaseClient();
  const sessionsResult = await db
    .from('studio_sessions')
    .select('id,owner_id,title,status,metadata,created_at,updated_at')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (sessionsResult.error) throw new Error(`fi001_sessions_read_failed:${sessionsResult.error.message}`);

  const targets: ExperimentTarget[] = [];
  for (const session of rows(sessionsResult.data)) {
    const sessionId = text(session.id);
    if (!sessionId) continue;
    const field = record(record(session.metadata).field);
    const projects = rows(field.nodes).filter(isFiProject);
    if (!projects.length) continue;

    const objectsResult = await db
      .from('studio_objects')
      .select('id,session_id,owner_id,title,status,metadata,created_at,updated_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(120);
    if (objectsResult.error) throw new Error(`fi001_objects_read_failed:${objectsResult.error.message}`);

    const objects = rows(objectsResult.data);
    for (const project of projects) {
      const projectId = text(project.id);
      if (!projectId) continue;
      const attached = objects.filter((object) => text(record(object.metadata).fieldNodeId) === projectId);
      const protocol = attached.find((object) => normalize(object.title).includes(FI_PROJECT_TOKEN)) ?? attached[0];
      if (!protocol) continue;
      const objectId = text(protocol.id);
      const ownerId = text(protocol.owner_id) ?? text(session.owner_id);
      if (!objectId || !ownerId) continue;
      targets.push({
        sessionId,
        ownerId,
        projectId,
        projectLabel: text(project.label) ?? 'SFI · Founder Independence · FI-001',
        projectCreatedAt: text(project.createdAt) ?? text(session.created_at) ?? new Date().toISOString(),
        objectId,
        objectTitle: text(protocol.title) ?? 'FI-001 · Founder Independence Protocol',
        objectCreatedAt: text(protocol.created_at) ?? new Date().toISOString(),
      });
    }
  }
  return targets;
}

async function archiveEvent(target: ExperimentTarget, eventType: string, label: string, payload: Row) {
  const db = createServiceSupabaseClient();
  const result = await db.from('studio_archive_events').insert({
    session_id: target.sessionId,
    object_id: target.objectId,
    owner_id: target.ownerId,
    event_type: eventType,
    label,
    source: SOURCE,
    payload,
  });
  if (result.error) throw new Error(`fi001_archive_write_failed:${result.error.message}`);
}

async function persistContinuityObservation(input: {
  target: ExperimentTarget;
  continuityRunId: string;
  mode: ContinuityMode;
  observations: ContinuityObservation[];
}) {
  const db = createServiceSupabaseClient();
  const healthy = input.observations.filter((item) => item.status === 'OPERATIONAL').length;
  const degraded = input.observations.filter((item) => item.status === 'DEGRADED' || item.status === 'BLOCKED').length;
  const failed = input.observations.filter((item) => item.status === 'FAILED').length;
  const result = await db.from('studio_evidence_traces').insert({
    object_id: input.target.objectId,
    owner_id: input.target.ownerId,
    source: 'sfi_continuity_heartbeat',
    label: `FI-001 continuity observation ${input.continuityRunId}`,
    payload: {
      observedAt: new Date().toISOString(),
      epistemicClass: 'OBSERVED',
      continuityRunId: input.continuityRunId,
      mode: input.mode,
      healthy,
      degraded,
      failed,
      capabilities: input.observations,
      rule: 'Capability probe results are observations of system availability; they are not evidence of consciousness or subjective agency.',
    },
  });
  if (result.error) throw new Error(`fi001_continuity_evidence_write_failed:${result.error.message}`);
}

async function readExperimentState(target: ExperimentTarget) {
  const db = createServiceSupabaseClient();
  const [hypothesesResult, evidenceResult, archiveResult] = await Promise.all([
    db.from('studio_hypotheses').select('*').eq('object_id', target.objectId).eq('owner_id', target.ownerId).order('created_at', { ascending: false }).limit(100),
    db.from('studio_evidence_traces').select('*').eq('object_id', target.objectId).eq('owner_id', target.ownerId).order('created_at', { ascending: false }).limit(500),
    db.from('studio_archive_events').select('*').eq('object_id', target.objectId).eq('owner_id', target.ownerId).order('created_at', { ascending: false }).limit(500),
  ]);
  const error = hypothesesResult.error ?? evidenceResult.error ?? archiveResult.error;
  if (error) throw new Error(`fi001_state_read_failed:${error.message}`);

  const hypotheses = rows(hypothesesResult.data);
  const evidence = rows(evidenceResult.data);
  const archive = rows(archiveResult.data);
  const activeHypothesis = hypotheses.find(isActiveHypothesis) ?? null;
  const terminalHypothesis = hypotheses.find((row) => !isActiveHypothesis(row)) ?? null;
  const cognitive = evidence.find(isCognitiveEvidence) ?? null;
  const terminalAt = terminalHypothesis
    ? time(record(terminalHypothesis.payload).verifiedAt) ?? time(terminalHypothesis.created_at)
    : null;
  const activeAt = activeHypothesis ? time(activeHypothesis.created_at) : null;
  const cognitiveAt = cognitive ? time(cognitive.created_at) : null;
  const independentEvidence = evidence.filter((row) => !isCognitiveEvidence(row));
  const postHypothesisEvidence = activeAt === null
    ? []
    : independentEvidence.filter((row) => (time(row.created_at) ?? 0) > activeAt);
  const postTerminalEvidence = terminalAt === null
    ? []
    : independentEvidence.filter((row) => (time(row.created_at) ?? 0) > terminalAt);
  const lastFailure = archive.find((row) => text(row.source) === SOURCE && text(row.event_type) === 'AUTONOMOUS_CONTINUATION_FAILED') ?? null;
  const lastFailureAt = lastFailure ? time(lastFailure.created_at) : null;
  const closed = archive.some((row) => text(row.source) === SOURCE && text(row.event_type) === 'AUTONOMOUS_EXPERIMENT_RETURN');

  return {
    hypotheses,
    evidence,
    archive,
    activeHypothesis,
    terminalHypothesis,
    latestCognitive: cognitive,
    latestCognitiveAction: cognitive ? cognitiveAction(cognitive) : null,
    cognitiveAfterTerminal: terminalAt !== null && cognitiveAt !== null && cognitiveAt > terminalAt,
    postHypothesisEvidenceCount: postHypothesisEvidence.length,
    postTerminalEvidenceCount: postTerminalEvidence.length,
    hoursSinceTerminal: terminalAt === null ? null : Math.max(0, (Date.now() - terminalAt) / (60 * 60 * 1000)),
    recentExecutionFailure: lastFailureAt !== null && Date.now() - lastFailureAt < FAILURE_BACKOFF_MS,
    closed,
  };
}

async function closeExperiment(target: ExperimentTarget, state: Awaited<ReturnType<typeof readExperimentState>>, continuityRunId: string) {
  const actionEvents = state.archive.filter((row) => text(row.source) === SOURCE && text(row.event_type) === 'AUTONOMOUS_CONTINUATION_EXECUTED');
  const failedEvents = state.archive.filter((row) => text(row.source) === SOURCE && text(row.event_type) === 'AUTONOMOUS_CONTINUATION_FAILED');
  const decisionEvents = state.archive.filter((row) => text(row.source) === SOURCE && text(row.event_type) === 'AUTONOMOUS_CONTINUATION_DECISION');
  const autonomousOperations = actionEvents.length;
  const dependencies = failedEvents.length;
  const autonomy = autonomousOperations + dependencies > 0 ? autonomousOperations / (autonomousOperations + dependencies) : 0;
  const generatedHypotheses = state.hypotheses.filter((row) => (time(row.created_at) ?? 0) >= (time(target.projectCreatedAt) ?? 0)).length;

  await archiveEvent(target, 'AUTONOMOUS_EXPERIMENT_RETURN', 'FI-001 · 24h autonomous return', {
    observedAt: new Date().toISOString(),
    continuityRunId,
    projectId: target.projectId,
    projectLabel: target.projectLabel,
    horizonHours: 24,
    N_O: autonomousOperations,
    N_D: dependencies,
    N_E: 0,
    N_N: generatedHypotheses,
    A_SFI: autonomy,
    decisionCount: decisionEvents.length,
    activeHypothesisRemaining: Boolean(state.activeHypothesis),
    lastHypothesisStatus: state.hypotheses[0] ? hypothesisStatus(state.hypotheses[0]) : null,
    epistemicNote: 'A_SFI is experimental instrumentation, not a canonical SFI metric. N_N counts autonomously persisted hypotheses, not consciousness or subjective initiative.',
  });
}

async function executeDecision(input: {
  target: ExperimentTarget;
  action: StudioAutonomyAction;
  reason: string;
  continuityRunId: string;
  mode: ContinuityMode;
  state: Awaited<ReturnType<typeof readExperimentState>>;
}): Promise<ExperimentOutcome> {
  await archiveEvent(input.target, 'AUTONOMOUS_CONTINUATION_DECISION', `FI-001 autonomous decision: ${input.action}`, {
    observedAt: new Date().toISOString(),
    continuityRunId: input.continuityRunId,
    mode: input.mode,
    action: input.action,
    reason: input.reason,
    authorityBoundary: 'No canon mutation, publication, irreversible external action, or governance approval is permitted.',
  });

  if (input.action === 'WAIT') {
    return { objectId: input.target.objectId, projectId: input.target.projectId, action: 'WAIT', status: 'WAITING', reason: input.reason };
  }

  if (input.action === 'CLOSE') {
    await closeExperiment(input.target, input.state, input.continuityRunId);
    return { objectId: input.target.objectId, projectId: input.target.projectId, action: 'CLOSE', status: 'CLOSED', reason: input.reason };
  }

  const cognitiveAction = input.action === 'ANALYZE'
    ? 'analyze'
    : input.action === 'HYPOTHESIZE'
      ? 'generate_hypothesis'
      : 'verify';

  const result = await runStudioCognitiveRuntime({
    ownerId: input.target.ownerId,
    objectId: input.target.objectId,
    action: cognitiveAction,
  });

  if (!result.ok) {
    const detail = `${result.error}${'details' in result && result.details ? `:${String(result.details)}` : ''}`;
    await archiveEvent(input.target, 'AUTONOMOUS_CONTINUATION_FAILED', `FI-001 autonomous ${input.action} failed`, {
      observedAt: new Date().toISOString(),
      continuityRunId: input.continuityRunId,
      action: input.action,
      error: detail,
      requiresFounder: false,
    });
    return { objectId: input.target.objectId, projectId: input.target.projectId, action: input.action, status: 'FAILED', reason: detail };
  }

  await archiveEvent(input.target, 'AUTONOMOUS_CONTINUATION_EXECUTED', `FI-001 autonomous ${input.action} executed`, {
    observedAt: new Date().toISOString(),
    continuityRunId: input.continuityRunId,
    action: input.action,
    cognitiveAction,
    twinRunId: result.twin.runId,
    evidenceId: result.twin.evidenceId,
    hypothesisId: result.hypothesisId,
    productionStatus: result.result.production.status,
    requiresFounder: false,
  });

  if (input.action === 'HYPOTHESIZE' && !result.hypothesisId) {
    await archiveEvent(input.target, 'AUTONOMY_DEPENDENCY_FOUND', 'FI-001 dependency: no defensible hypothesis produced', {
      observedAt: new Date().toISOString(),
      continuityRunId: input.continuityRunId,
      code: 'DECISION_CAPABILITY_MISSING',
      dependency: 'HYPOTHESIS_FORMATION_RETURNED_NULL',
      requiresFounder: false,
      rule: 'The system must wait for new evidence rather than asking the founder to supply the missing hypothesis.',
    });
    return { objectId: input.target.objectId, projectId: input.target.projectId, action: input.action, status: 'BLOCKED', reason: 'Hypothesis generation completed without a persisted defensible hypothesis.', hypothesisId: null };
  }

  return {
    objectId: input.target.objectId,
    projectId: input.target.projectId,
    action: input.action,
    status: 'EXECUTED',
    reason: input.reason,
    hypothesisId: result.hypothesisId,
  };
}

export async function runStudioAutonomyContinuation(input: {
  mode: ContinuityMode;
  continuityRunId: string;
  observations: ContinuityObservation[];
}) {
  if (input.mode === 'EMERGENCY_HALT') {
    return { status: 'SKIPPED' as const, reason: 'EMERGENCY_HALT', targets: 0, outcomes: [] as ExperimentOutcome[] };
  }

  const targets = await discoverFiTargets();
  const outcomes: ExperimentOutcome[] = [];

  for (const target of targets) {
    try {
      const before = await readExperimentState(target);
      if (before.closed) {
        outcomes.push({ objectId: target.objectId, projectId: target.projectId, action: 'SKIP', status: 'SKIPPED', reason: 'FI-001 already has an autonomous return.' });
        continue;
      }

      await persistContinuityObservation({ target, continuityRunId: input.continuityRunId, mode: input.mode, observations: input.observations });
      const state = await readExperimentState(target);
      const experimentStart = time(target.projectCreatedAt) ?? time(target.objectCreatedAt) ?? Date.now();
      const decision = selectStudioAutonomyTransition({
        mode: input.mode,
        horizonReached: Date.now() - experimentStart >= HORIZON_MS,
        cognitiveTraceExists: Boolean(state.latestCognitive),
        latestCognitiveAction: state.latestCognitiveAction,
        activeHypothesis: Boolean(state.activeHypothesis),
        terminalHypothesis: Boolean(state.terminalHypothesis),
        postHypothesisEvidenceCount: state.postHypothesisEvidenceCount,
        postTerminalEvidenceCount: state.postTerminalEvidenceCount,
        cognitiveAfterTerminal: state.cognitiveAfterTerminal,
        hoursSinceTerminal: state.hoursSinceTerminal,
        recentExecutionFailure: state.recentExecutionFailure,
      });
      outcomes.push(await executeDecision({ target, action: decision.action, reason: decision.reason, continuityRunId: input.continuityRunId, mode: input.mode, state }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      try {
        await archiveEvent(target, 'AUTONOMOUS_CONTINUATION_FAILED', 'FI-001 autonomous continuation failed', {
          observedAt: new Date().toISOString(),
          continuityRunId: input.continuityRunId,
          error: reason,
          requiresFounder: false,
        });
      } catch {
        // The continuity heartbeat must survive a Studio-local persistence failure.
      }
      outcomes.push({ objectId: target.objectId, projectId: target.projectId, action: 'SKIP', status: 'FAILED', reason });
    }
  }

  return {
    status: outcomes.some((item) => item.status === 'FAILED') ? 'DEGRADED' as const : 'COMPLETED' as const,
    reason: targets.length ? 'FI-001 targets evaluated under bounded autonomous continuation.' : 'No FI-001 project target is currently registered.',
    targets: targets.length,
    outcomes,
  };
}
