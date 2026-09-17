import { NextRequest, NextResponse } from 'next/server';

import { verifyGitHubActionsOidcToken } from '@/lib/continuity/githubActionsOidc';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { dispatchQueuedProposal } from '@/lib/execution/governedExecutionRouter';
import { recordProposalOutcomeFromObservedReturn } from '@/lib/governance/proposalOutcome';
import { latestActionProposals, recordValue, stringValue } from '@/lib/operational/common';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXECUTOR = 'sfi_self_development_v1';
const PROPOSAL_TYPE = 'institutional_mutation_candidate';
const SAFE_PATHS = new Set([
  'src/lib/sfi/cognitive-runtime/registry.ts',
  'src/lib/sfi/cognitive-runtime/convergedRegistry.ts',
  'src/lib/sfi/cognitive-runtime/agentExecutionMap.ts',
  'src/lib/sfi/cognitive-runtime/agentPassports.ts',
  'src/lib/continuity/runtime.ts',
  'src/lib/continuity/operationalAutoAdvance.ts',
  'src/lib/continuity/studioAutonomy.ts',
]);

type Row = Record<string, unknown>;

function bearer(request: NextRequest) {
  const match = (request.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

async function authorized(request: NextRequest) {
  const token = bearer(request);
  if (!token) return false;
  const oidc = await verifyGitHubActionsOidcToken(token, 'self-development');
  return oidc.ok;
}

function strings(value: unknown, limit = 30) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, limit)
    : [];
}

function proposalType(row: Row) {
  const expected = recordValue(row.expected_field_delta);
  return stringValue(row.proposal_type) ?? stringValue(expected.proposalType) ?? stringValue(expected.proposal_type) ?? 'unknown';
}

function candidate(row: Row) {
  const payload = recordValue(recordValue(row.expected_field_delta).payload);
  const patch = recordValue(recordValue(row.outcome).payloadPatch);
  const assignment = recordValue(patch.assignment);
  const scope = strings(payload.developmentScope, 12);
  const proposalKind = proposalType(row);
  const requiredExecutor = stringValue(payload.requiredExecutor);
  const proposalTypeMatches = proposalKind === PROPOSAL_TYPE;
  const scopeSafe = scope.length > 0 && scope.every((path) => SAFE_PATHS.has(path));
  const eligible = proposalTypeMatches
    && requiredExecutor === EXECUTOR
    && payload.developmentExecutionAuthorized === true
    && stringValue(payload.developmentMode) === 'MATERIAL_REPOSITORY'
    && scopeSafe
    && String(row.status ?? '').toLowerCase() === 'queued';
  return {
    eligible,
    proposalType: proposalKind,
    requiredExecutor,
    scope,
    scopeSafe,
    payload,
    assignment,
    id: stringValue(row.id),
    title: stringValue(row.title) ?? 'Bounded institutional repair candidate',
    objective: stringValue(recordValue(row.expected_field_delta).objective) ?? stringValue(row.description) ?? '',
  };
}

async function readCandidates() {
  const read = await latestActionProposals([PROPOSAL_TYPE], 100);
  return {
    error: read.error,
    rows: Array.isArray(read.data) ? (read.data as Row[]) : [],
  };
}

async function readCandidateById(proposalId: string) {
  const read = await readCandidates();
  if (read.error) return { error: read.error, row: null as Row | null };
  return { error: null, row: read.rows.find((row) => stringValue(row.id) === proposalId) ?? null };
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ ok: false, error: 'unauthorized_self_development_executor' }, { status: 401 });
  }

  const read = await readCandidates();
  if (read.error) return NextResponse.json({ ok: false, error: 'candidate_read_failed', details: read.error }, { status: 503 });

  for (const row of [...read.rows].reverse()) {
    const projection = candidate(row);
    if (!projection.eligible || !projection.id) continue;

    const assignmentState = stringValue(projection.assignment.state);
    const assignmentAdapter = stringValue(projection.assignment.adapterId);
    if (assignmentState !== 'ASSIGNED' || assignmentAdapter !== EXECUTOR) {
      const routed = await dispatchQueuedProposal(projection.id);
      if (!routed.ok) continue;
    }

    const refreshed = await readCandidateById(projection.id);
    if (refreshed.error || !refreshed.row) continue;
    const ready = candidate(refreshed.row);
    if (!ready.eligible) continue;
    const readyAssignment = ready.assignment;
    if (stringValue(readyAssignment.state) !== 'ASSIGNED' || stringValue(readyAssignment.adapterId) !== EXECUTOR) continue;

    return NextResponse.json({
      ok: true,
      candidate: {
        proposalId: ready.id,
        proposalType: ready.proposalType,
        title: ready.title,
        objective: ready.objective,
        developmentScope: ready.scope,
        reasons: strings(ready.payload.reasons, 20),
        evidenceRefs: strings(ready.payload.evidenceRefs, 20),
        requiredExecutor: ready.requiredExecutor,
        developmentMode: stringValue(ready.payload.developmentMode),
        developmentStage: stringValue(ready.payload.developmentStage),
        adoptionAuthority: stringValue(ready.payload.adoptionAuthority),
        returnRequiredBeforeAdoption: ready.payload.returnRequiredBeforeAdoption === true,
        canonicalPromotionAllowed: false,
        automaticMergeAllowed: false,
      },
      boundary: 'This endpoint exposes one already-governed bounded repository candidate to the exact SFI Self-Development workflow. It grants no scope expansion, main merge, adoption or canon authority.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json({
    ok: true,
    candidate: null,
    boundary: 'No eligible assigned bounded material candidate is available. Absence does not imply institutional completeness.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ ok: false, error: 'unauthorized_self_development_executor' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as Row | null;
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  const proposalId = stringValue(body.proposalId);
  const status = stringValue(body.status);
  const workflowRunId = stringValue(body.workflowRunId);
  if (!proposalId || !workflowRunId || !/^\d+$/.test(workflowRunId)) {
    return NextResponse.json({ ok: false, error: 'proposal_and_workflow_run_required' }, { status: 400 });
  }

  const current = await readCandidateById(proposalId);
  if (current.error) return NextResponse.json({ ok: false, error: 'candidate_read_failed', details: current.error }, { status: 503 });
  if (!current.row) return NextResponse.json({ ok: false, error: 'candidate_not_found' }, { status: 404 });
  const projection = candidate(current.row);
  if (!projection.eligible || projection.requiredExecutor !== EXECUTOR) {
    return NextResponse.json({ ok: false, error: 'candidate_not_eligible_for_self_development' }, { status: 409 });
  }
  if (stringValue(projection.assignment.adapterId) !== EXECUTOR) {
    return NextResponse.json({ ok: false, error: 'candidate_not_assigned_to_self_development' }, { status: 409 });
  }

  if (status === 'FAILED') {
    const failure = await appendEpistemicEvent({
      eventName: 'SFI_SELF_DEVELOPMENT_EXECUTION_FAILED',
      epistemicClass: 'observed',
      confidence: 1,
      occurredAt: new Date().toISOString(),
      source: { sourceId: EXECUTOR, sourceType: 'github_actions_workflow' },
      logbookId: 'BR',
      lineage: [proposalId],
      payload: {
        proposalId,
        workflowRunId,
        reason: stringValue(body.reason) ?? 'bounded_repair_not_verified',
        changedPaths: strings(body.changedPaths, 20),
        canonicalPromotionAllowed: false,
        automaticMergeAllowed: false,
      },
    });
    return NextResponse.json({ ok: failure.ok, state: 'FAILED_RECORDED_RETRYABLE', proposalId, eventId: failure.ok ? (failure.data.event_id ?? failure.data.id) : null }, { status: failure.ok ? 200 : 503 });
  }

  if (status !== 'VERIFIED_CANDIDATE') {
    return NextResponse.json({ ok: false, error: 'unsupported_self_development_status' }, { status: 400 });
  }

  const branch = stringValue(body.branch);
  const prUrl = stringValue(body.prUrl);
  const commitSha = stringValue(body.commitSha);
  const changedPaths = strings(body.changedPaths, 20);
  const verification = strings(body.verification, 20);
  if (!branch?.startsWith('auto/sfi-self-repair-') || !prUrl?.startsWith('https://github.com/Aptymok/system-friction/pull/') || !commitSha || !/^[0-9a-f]{40}$/i.test(commitSha)) {
    return NextResponse.json({ ok: false, error: 'verified_candidate_identity_invalid' }, { status: 400 });
  }
  if (!changedPaths.length || !changedPaths.every((path) => projection.scope.includes(path))) {
    return NextResponse.json({ ok: false, error: 'changed_paths_escape_declared_scope' }, { status: 400 });
  }
  if (!verification.includes('typecheck:PASS') || !verification.includes('git-diff-check:PASS')) {
    return NextResponse.json({ ok: false, error: 'verification_receipts_incomplete' }, { status: 400 });
  }

  const returned = await appendEpistemicEvent({
    eventName: 'SFI_SELF_DEVELOPMENT_RETURN_RECORDED',
    epistemicClass: 'observed',
    confidence: 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: EXECUTOR, sourceType: 'github_actions_workflow' },
    logbookId: 'BR',
    lineage: [proposalId, `github:commit:${commitSha}`, `github:pr:${prUrl}`],
    payload: {
      proposalId,
      workflowRunId,
      branch,
      prUrl,
      commitSha,
      changedPaths,
      verification,
      outcome: {
        status: 'VERIFIED_BOUNDED_MATERIAL_CANDIDATE',
        executor: EXECUTOR,
        summary: 'A bounded repository mutation candidate was produced on a review branch and passed the declared verification receipts. The mutation is not adopted, merged or canonical.',
      },
      evidenceRefs: [`github:commit:${commitSha}`, `github:pr:${prUrl}`],
      canonicalPromotionAllowed: false,
      automaticMergeAllowed: false,
      institutionalAdoptionRecorded: false,
    },
  });
  if (!returned.ok) return NextResponse.json({ ok: false, error: 'return_persist_failed', details: returned }, { status: 503 });
  const returnEventId = String(returned.data.event_id ?? returned.data.id);

  const outcome = await recordProposalOutcomeFromObservedReturn({
    proposalId,
    actorId: EXECUTOR,
    returnEventId,
    evidenceRefs: [`github:commit:${commitSha}`, `github:pr:${prUrl}`],
    outcomeStatus: 'bounded_material_candidate_verified',
    fieldEffect: {
      executor: EXECUTOR,
      workflowRunId,
      branch,
      prUrl,
      commitSha,
      changedPaths,
      verification,
    },
    notes: 'Verified development RETURN recorded. ROOT may now decide institutional adoption; adoption does not imply canonical promotion and no automatic merge occurred.',
  });
  if (!outcome.ok) return NextResponse.json({ ok: false, error: 'outcome_record_failed', details: outcome }, { status: 503 });

  return NextResponse.json({
    ok: true,
    proposalId,
    returnEventId,
    developmentStage: 'READY_FOR_ADOPTION',
    adoptionAuthority: 'ROOT_ONLY_AFTER_RETURN',
    canonicalPromotionAllowed: false,
    automaticMergeAllowed: false,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
