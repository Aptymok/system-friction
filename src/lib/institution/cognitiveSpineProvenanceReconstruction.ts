import type { CognitiveSpineSnapshot } from '@/core/cognitive-spine/contracts/snapshot';
import type { CognitiveSpineTransition } from '@/core/cognitive-spine/contracts/transition';
import {
  assessCprtBPath,
  type CprtBGovernanceDisposition,
  type CprtBPathInput,
} from '@/core/cognitive-spine/cprt/cprtBPath';
import { semanticSnapshotHash } from '@/core/cognitive-spine/projector/cognitiveStateProjector';
import { canonicalSha256 } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function snapshotFromRun(run: Row): CognitiveSpineSnapshot | null {
  const inputSnapshot = record(run.input_snapshot);
  const spine = record(inputSnapshot.cognitiveSpine);
  const candidate = record(spine.snapshot) as unknown as CognitiveSpineSnapshot;
  if (!candidate.snapshotId || !candidate.snapshotHash || !candidate.semanticPayload) return null;
  return candidate;
}

function snapshotHashValid(snapshot: CognitiveSpineSnapshot | null) {
  if (!snapshot) return false;
  try {
    return semanticSnapshotHash(snapshot.semanticPayload) === snapshot.snapshotHash;
  } catch {
    return false;
  }
}

function proposalSpine(row: Row) {
  const expected = record(row.expected_field_delta);
  const payload = record(expected.payload);
  return record(payload.cognitiveSpine);
}

function governanceDisposition(events: Row[]): {
  disposition: CprtBGovernanceDisposition;
  rootActionRef: string | null;
  event: Row | null;
} {
  let selected: Row | null = null;
  let disposition: CprtBGovernanceDisposition = 'MISSING';

  for (const event of events) {
    const name = text(event.event_name) ?? '';
    if (name.endsWith('.design_approved')) {
      selected = event;
      disposition = 'DESIGN_APPROVED';
    } else if (name.endsWith('.rejected')) {
      selected = event;
      disposition = 'REJECTED';
    } else if (name.endsWith('.frozen')) {
      selected = event;
      disposition = 'FROZEN';
    } else if (name.endsWith('.waiting_evidence')) {
      selected = event;
      disposition = 'WAITING_EVIDENCE';
    }
  }

  return {
    disposition,
    rootActionRef: selected ? text(selected.event_id) : null,
    event: selected,
  };
}

function transitionIntegrity(transition: CognitiveSpineTransition | null) {
  if (!transition?.transitionHash || !transition.semanticPayload) return false;
  try {
    return canonicalSha256(transition.semanticPayload) === transition.transitionHash;
  } catch {
    return false;
  }
}

function entryTransitionFromRun(run: Row): CognitiveSpineTransition | null {
  const inputSnapshot = record(run.input_snapshot);
  const spine = record(inputSnapshot.cognitiveSpine);
  const provenance = record(spine.decisionProvenance);
  const transition = record(provenance.entryTransition) as unknown as CognitiveSpineTransition;
  if (!transition.transitionId || !transition.transitionHash || !transition.semanticPayload) return null;
  return transition;
}

async function findResultingTransition(input: {
  db: ReturnType<typeof createServiceSupabaseClient>;
  memoryRef: string;
  memoryCreatedAt: string;
}) {
  const runs = await input.db.from('sfi_cognitive_twin_runs')
    .select('id,task_id,input_snapshot,started_at')
    .eq('role', 'institutional_cycle')
    .gt('started_at', input.memoryCreatedAt)
    .order('started_at', { ascending: true })
    .limit(128);

  if (runs.error) {
    return {
      run: null,
      transition: null,
      hashValid: false,
      admitsMemory: false,
      warning: `cprt_b_resulting_transition_lookup_failed:${runs.error.message}`,
    };
  }

  for (const row of rows(runs.data)) {
    const snapshot = snapshotFromRun(row);
    if (!snapshot || !snapshotHashValid(snapshot)) continue;
    if (!snapshot.semanticPayload.memoryRefs.includes(input.memoryRef)) continue;

    const transition = entryTransitionFromRun(row);
    const hashValid = transitionIntegrity(transition);
    const admitsMemory = Boolean(transition && (
      transition.semanticPayload.transitionInputs.includes(input.memoryRef)
      || transition.semanticPayload.sourceDelta.addedRefs.includes(input.memoryRef)
      || transition.semanticPayload.cognitiveStateDelta.addedRefs.includes(input.memoryRef)
    ));

    return {
      run: {
        id: text(row.id),
        taskId: text(row.task_id),
        startedAt: text(row.started_at),
        snapshotId: snapshot.snapshotId,
        snapshotHash: snapshot.snapshotHash,
      },
      transition,
      hashValid,
      admitsMemory,
      warning: null,
    };
  }

  return {
    run: null,
    transition: null,
    hashValid: false,
    admitsMemory: false,
    warning: 'cprt_b_resulting_transition_not_yet_materialized',
  };
}

/**
 * Reconstructs a Cognitive Spine decision path from persisted canonical and
 * governed records. Missing stages remain explicit gaps; this function never
 * infers that an intervention occurred merely because a later return exists.
 *
 * This is a Node/server-worker adapter over existing stores. The assessment
 * logic itself remains pure in `src/core/cognitive-spine/cprt/cprtBPath.ts`.
 */
export async function reconstructCognitiveSpineDecisionPath(runId: string) {
  const db = createServiceSupabaseClient();
  const warnings: string[] = [];

  const runResult = await db.from('sfi_cognitive_twin_runs')
    .select('id,task_id,role,status,input_snapshot,output_envelope,evidence_refs,started_at,finished_at')
    .eq('id', runId)
    .maybeSingle();
  if (runResult.error) throw new Error(`CPRT_B_RUN_LOOKUP_FAILED:${runResult.error.message}`);
  if (!runResult.data) throw new Error('CPRT_B_RUN_NOT_FOUND');

  const run = record(runResult.data);
  if (text(run.role) !== 'institutional_cycle') throw new Error('CPRT_B_RUN_ROLE_INVALID');
  const snapshot = snapshotFromRun(run);
  if (!snapshot) throw new Error('CPRT_B_RUN_SNAPSHOT_MISSING');
  const hashValid = snapshotHashValid(snapshot);
  const spineEnvelope = record(record(run.input_snapshot).cognitiveSpine);
  const consumptionTrace = record(spineEnvelope.consumptionTrace);

  const proposalResult = await db.from('action_proposals')
    .select('*')
    .eq('expected_field_delta->payload->cognitiveSpine->>sourceRunId', runId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (proposalResult.error) warnings.push(`cprt_b_proposal_lookup_failed:${proposalResult.error.message}`);
  const proposal = proposalResult.data ? record(proposalResult.data) : null;
  const proposalId = proposal ? text(proposal.id) : null;
  const proposalContext = proposal ? proposalSpine(proposal) : {};

  let governanceEvents: Row[] = [];
  if (proposalId) {
    const governanceResult = await db.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,payload,lineage,occurred_at,hash_self')
      .contains('lineage', [proposalId])
      .order('occurred_at', { ascending: true })
      .limit(64);
    if (governanceResult.error) warnings.push(`cprt_b_governance_lookup_failed:${governanceResult.error.message}`);
    governanceEvents = rows(governanceResult.data);
  }
  const governance = governanceDisposition(governanceEvents);

  let selectedFieldCase: Row | null = null;
  let fieldCandidates: Row[] = [];
  if (proposalId) {
    const fields = await db.from('field_cases')
      .select('id,status,metadata,created_at,updated_at')
      .eq('metadata->cognitiveSpineProposalLink->>proposalId', proposalId)
      .order('created_at', { ascending: true })
      .limit(20);
    if (fields.error) warnings.push(`cprt_b_field_link_lookup_failed:${fields.error.message}`);
    fieldCandidates = rows(fields.data);
  }

  let fieldDetail: {
    caseId: string;
    linkedProposalId: string;
    interventionRef: string | null;
    executionAcknowledgementRef: string | null;
    executionEpistemicClass: string | null;
    returnRef: string | null;
    outcomeRef: string | null;
    returnObserved: boolean;
    returnEvidenceRefs: string[];
    metadata: Row;
  } | null = null;
  let outcomeId: string | null = null;

  for (const fieldCase of fieldCandidates) {
    const caseId = text(fieldCase.id);
    if (!caseId) continue;
    const [interventionResult, returnResult, outcomeResult] = await Promise.all([
      db.from('field_interventions')
        .select('id,status,completed_at,evidence_ids,created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from('field_returns')
        .select('id,status,returned_at,evidence_ids,payload,created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from('field_outcomes')
        .select('id,intervention_id,evidence_ids,recorded_at,verified')
        .eq('case_id', caseId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (interventionResult.error) warnings.push(`cprt_b_intervention_lookup_failed:${interventionResult.error.message}`);
    if (returnResult.error) warnings.push(`cprt_b_return_lookup_failed:${returnResult.error.message}`);
    if (outcomeResult.error) warnings.push(`cprt_b_outcome_lookup_failed:${outcomeResult.error.message}`);

    const metadata = record(fieldCase.metadata);
    const link = record(metadata.cognitiveSpineProposalLink);
    const acknowledgement = record(metadata.interventionExecutionAcknowledgement);
    const returnRow = returnResult.data ? record(returnResult.data) : {};
    const outcomeRow = outcomeResult.data ? record(outcomeResult.data) : {};
    const candidate = {
      caseId,
      linkedProposalId: text(link.proposalId) ?? '',
      interventionRef: text(acknowledgement.interventionId) ?? text(interventionResult.data?.id),
      executionAcknowledgementRef: text(acknowledgement.evidenceId),
      executionEpistemicClass: text(acknowledgement.epistemicClass),
      returnRef: text(returnRow.id),
      outcomeRef: text(outcomeRow.id),
      returnObserved: Boolean(text(returnRow.returned_at) && strings(returnRow.evidence_ids).length > 0),
      returnEvidenceRefs: strings(returnRow.evidence_ids),
      metadata,
    };

    if (!fieldDetail || (candidate.returnObserved && candidate.outcomeRef)) {
      selectedFieldCase = fieldCase;
      fieldDetail = candidate;
      outcomeId = candidate.outcomeRef;
    }
    if (candidate.returnObserved && candidate.outcomeRef) break;
  }

  let returnMemory: {
    id: string;
    ref: string;
    createdAt: string;
  } | null = null;
  let resultingState: Awaited<ReturnType<typeof findResultingTransition>> | null = null;

  if (outcomeId) {
    const memoryResult = await db.from('sfi_amv_memory')
      .select('id,memory_delta,created_at')
      .eq('module', 'institutionalEventPipeline')
      .eq('memory_delta->raw->>sourceKind', 'field_outcomes')
      .eq('memory_delta->raw->>sourceRef', outcomeId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (memoryResult.error) warnings.push(`cprt_b_return_memory_lookup_failed:${memoryResult.error.message}`);
    if (memoryResult.data?.id && memoryResult.data.created_at) {
      returnMemory = {
        id: String(memoryResult.data.id),
        ref: `sfi_amv_memory:${String(memoryResult.data.id)}`,
        createdAt: String(memoryResult.data.created_at),
      };
      resultingState = await findResultingTransition({
        db,
        memoryRef: returnMemory.ref,
        memoryCreatedAt: returnMemory.createdAt,
      });
      if (resultingState.warning) warnings.push(resultingState.warning);
    }
  }

  const assessmentInput: CprtBPathInput = {
    run: {
      runId,
      snapshotId: snapshot.snapshotId,
      snapshotHash: snapshot.snapshotHash,
      snapshotHashValid: hashValid,
      snapshotConsumed: consumptionTrace.ctSnapshotConsumed === true,
    },
    proposal: proposalId ? {
      proposalId,
      sourceRunId: text(proposalContext.sourceRunId) ?? '',
      sourceSnapshotHash: text(proposalContext.snapshotHash) ?? '',
      proposalEventId: proposal ? text(proposal.event_id) : null,
    } : null,
    governance: {
      disposition: governance.disposition,
      rootActionRef: governance.rootActionRef,
    },
    field: fieldDetail ? {
      caseId: fieldDetail.caseId,
      linkedProposalId: fieldDetail.linkedProposalId,
      interventionRef: fieldDetail.interventionRef,
      executionAcknowledgementRef: fieldDetail.executionAcknowledgementRef,
      executionEpistemicClass: fieldDetail.executionEpistemicClass,
      returnRef: fieldDetail.returnRef,
      outcomeRef: fieldDetail.outcomeRef,
      returnObserved: fieldDetail.returnObserved,
    } : null,
    resultingState: returnMemory && resultingState ? {
      memoryRef: returnMemory.ref,
      transitionRef: resultingState.transition?.transitionId ?? null,
      transitionHash: resultingState.transition?.transitionHash ?? null,
      transitionHashValid: resultingState.hashValid,
      transitionAdmitsMemory: resultingState.admitsMemory,
    } : null,
  };

  const assessment = assessCprtBPath(assessmentInput);

  return {
    contractVersion: 'SFI-CT-CPRT-B-RECONSTRUCTION-1.0' as const,
    reconstructedAt: new Date().toISOString(),
    sourceRun: {
      id: runId,
      taskId: text(run.task_id),
      status: text(run.status),
      startedAt: text(run.started_at),
      finishedAt: text(run.finished_at),
    },
    snapshot: {
      id: snapshot.snapshotId,
      hash: snapshot.snapshotHash,
      hashValid,
      consumed: consumptionTrace.ctSnapshotConsumed === true,
      sourceCutoff: snapshot.semanticPayload.sourceCutoff,
      projectorVersion: snapshot.semanticPayload.projectorVersion,
      policyVersion: snapshot.semanticPayload.policyVersion,
      projectionProfile: snapshot.semanticPayload.projectionProfile,
    },
    proposal: proposalId ? {
      id: proposalId,
      status: proposal ? text(proposal.status) : null,
      eventId: proposal ? text(proposal.event_id) : null,
      sourceRunId: text(proposalContext.sourceRunId),
      snapshotHash: text(proposalContext.snapshotHash),
    } : null,
    governance: {
      disposition: governance.disposition,
      rootActionRef: governance.rootActionRef,
      event: governance.event,
      events: governanceEvents,
    },
    field: fieldDetail ? {
      ...fieldDetail,
      candidateCount: fieldCandidates.length,
      selectedCaseCreatedAt: selectedFieldCase ? text(selectedFieldCase.created_at) : null,
    } : null,
    returnMemory,
    resultingState: resultingState ? {
      run: resultingState.run,
      transition: resultingState.transition,
      transitionHashValid: resultingState.hashValid,
      transitionAdmitsReturnMemory: resultingState.admitsMemory,
    } : null,
    assessment,
    warnings: [...new Set(warnings)],
  };
}
