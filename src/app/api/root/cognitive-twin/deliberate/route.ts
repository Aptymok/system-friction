import { NextResponse } from 'next/server';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { createCognitiveTwinEnvelope, evaluateCognitiveTwinAuthority } from '@/core/cognitive-twin/contract';
import { syncSfiInstitutionalStateToCognitiveTwin } from '@/core/cognitive-twin/institutionalIntegration';
import { materializeRootCognitiveSpineContext } from '@/lib/root/cognitiveSpineRootContext';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function str(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const gate = await requireRootActor('cognitive_twin.deliberate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Row;
  const question = str(body.question);
  if (!question) return NextResponse.json({ ok: false, error: 'question_required' }, { status: 400 });

  const startedAt = new Date().toISOString();
  const taskId = `cognitive-twin:deliberate:${Date.now()}:${crypto.randomUUID()}`;

  // Preserve the existing institutional intake step, then seal a single
  // governance-context snapshot. No cognitive output from this deliberation
  // exists yet, so the cutoff cannot contain the answer it is about to create.
  const institutionalSync = await syncSfiInstitutionalStateToCognitiveTwin();
  const snapshotCutoff = new Date().toISOString();
  const cognitiveSpine = await materializeRootCognitiveSpineContext({
    executionId: taskId,
    sourceCutoff: snapshotCutoff,
    createdAt: snapshotCutoff,
  });

  const approvedDecisions = cognitiveSpine.twinContext.decisions;
  const institutionalMemory = cognitiveSpine.twinContext.memory;
  const snapshotState = cognitiveSpine.snapshot.semanticPayload;
  const evidencePresent = snapshotState.derivedState.sourceCount > 0;

  const warnings = [
    ...cognitiveSpine.warnings,
    ...institutionalSync.sources.filter((item) => item.warning).map((item) => `${item.source}:${item.warning}`),
  ].filter((item): item is string => Boolean(item));

  const fallback = [
    'Cognitive Twin deliberation unavailable through an LLM provider.',
    `Question: ${question}`,
    `Sealed Cognitive Spine snapshot: ${cognitiveSpine.snapshot.snapshotId}.`,
    `Snapshot sources available: ${snapshotState.derivedState.sourceCount}.`,
    `Approved institutional decisions visible: ${approvedDecisions.length}.`,
    `Institutional memory records visible: ${institutionalMemory.length}.`,
    `SFI organs connected: ${institutionalSync.integration.summary.connected}/${institutionalSync.integration.summary.total}.`,
    `SFI organs exercised: ${institutionalSync.integration.summary.exercised}/${institutionalSync.integration.summary.total}.`,
    'No cognitive execution is declared. Review the sealed source refs manually.',
  ].join('\n');

  const llm = await runLlmTask({
    task: 'deep_report',
    system: [
      'You are the replaceable model execution layer of the System Friction Institute Cognitive Twin.',
      'Institutional memory, evidence, authority and the persistent subject exist outside you.',
      'Use only the supplied sealed Cognitive Spine context and SFI organ integration state.',
      'The Cognitive Spine snapshot is a projection of institutionally admissible state, not a source of truth.',
      'ROOT has governance authority over actions; ROOT and the model do not have authority to upgrade epistemic class, independence or truth.',
      'Treat ROOT Evidence, Observatory, Studio, Method Lab, Field and Governance as distinct organs with distinct epistemic classes.',
      'A Field observed return is experience, not automatically general causal proof.',
      'A Method Lab hypothesis remains a hypothesis; a SIMULATED record remains SIMULATED.',
      'Separate OBSERVED, DECLARED, DERIVED, INFERRED, PROPOSED, SIMULATED and MISSING.',
      'Do not claim that a proposal is approved, verified, canonical, executed or published unless supplied evidence says so.',
      'When the corpus is insufficient, say exactly what source, organ or verification is missing.',
      'Return a concise answer with: institutional reading, organ/evidence basis, contradictions, missing evidence, one proposed next action, and what remains ROOT-reserved.',
    ].join(' '),
    prompt: JSON.stringify({
      question,
      cognitiveSpine: {
        snapshotId: cognitiveSpine.snapshot.snapshotId,
        snapshotHash: cognitiveSpine.snapshot.snapshotHash,
        sourceCutoff: snapshotState.sourceCutoff,
        projectionProfile: cognitiveSpine.trace.projectionProfile,
        profileVersion: cognitiveSpine.trace.profileVersion,
        consumed: cognitiveSpine.trace.ctSnapshotConsumed,
        derivedState: snapshotState.derivedState,
        evidenceRefs: snapshotState.evidenceRefs,
        hypothesisRefs: snapshotState.hypothesisRefs,
        contradictionRefs: snapshotState.contradictionRefs,
        freezeRefs: snapshotState.freezeRefs,
        questionRefs: snapshotState.questionRefs,
        epistemicStateRefs: snapshotState.epistemicStateRefs,
        sourcePlane: cognitiveSpine.sourcePlane,
      },
      sfiIntegration: institutionalSync.integration,
      syncSummary: institutionalSync.sources,
      approvedInstitutionalDecisions: approvedDecisions,
      institutionalMemory,
      warnings,
    }),
    fallbackResult: fallback,
    maxTokens: 1600,
  });

  const authority = evaluateCognitiveTwinAuthority({
    action: 'propose',
    founderAbsent: false,
    evidencePresent,
  });
  const finishedAt = new Date().toISOString();
  const evidenceRefs = Array.from(new Set([
    ...snapshotState.evidenceRefs,
    ...approvedDecisions.flatMap((row) => row.evidenceRefs),
    ...institutionalMemory.flatMap((row) => row.evidenceRefs),
  ])).slice(0, 160);

  const envelope = createCognitiveTwinEnvelope({
    status: llm.ok ? 'PROPOSED' : 'REJECTED',
    taskId,
    modelId: `${llm.provider}:${llm.model}`,
    result: {
      question,
      answer: llm.result,
      authority,
      cognitiveSpine: {
        snapshotId: cognitiveSpine.snapshot.snapshotId,
        snapshotHash: cognitiveSpine.snapshot.snapshotHash,
        sourceCutoff: snapshotState.sourceCutoff,
        projectionProfile: cognitiveSpine.trace.projectionProfile,
        profileVersion: cognitiveSpine.trace.profileVersion,
        consumed: cognitiveSpine.trace.ctSnapshotConsumed,
        sourceCount: snapshotState.derivedState.sourceCount,
        evidenceCount: snapshotState.evidenceRefs.length,
        hypothesisCount: snapshotState.hypothesisRefs.length,
        contradictionCount: snapshotState.contradictionRefs.length,
        verificationDebt: snapshotState.verificationDebt.absolute,
      },
      corpus: {
        approvedDecisions: approvedDecisions.length,
        memoryRecords: institutionalMemory.length,
        sfiOrgansConnected: institutionalSync.integration.summary.connected,
        sfiOrgansExercised: institutionalSync.integration.summary.exercised,
      },
      institutionalIntegration: institutionalSync.integration,
      provider: llm.provider,
      model: llm.model,
      providerExecutionSucceeded: llm.ok,
      latencyMs: llm.latency_ms,
    },
    limitations: [
      ...warnings,
      ...llm.warnings,
      institutionalSync.integration.truthBoundary,
      'ROOT governance authority does not upgrade evidence, independence, epistemic class or truth.',
      'The consumed Cognitive Spine state is sealed at the declared cutoff and is not refreshed during this deliberation.',
    ],
    missingEvidence: [
      ...(!evidencePresent ? ['sealed_institutional_cognitive_state_empty'] : []),
      ...institutionalSync.integration.organs.filter((item) => !item.connected).map((item) => `organ_disconnected:${item.organ}`),
      ...institutionalSync.integration.organs.filter((item) => item.connected && (item.observedRecords ?? 0) === 0).map((item) => `organ_unexercised:${item.organ}`),
    ],
    actionsExecuted: [
      'sync_sfi_institutional_state',
      `consume_cognitive_spine:${cognitiveSpine.snapshot.snapshotId}`,
      llm.ok ? 'llm_deliberation' : 'llm_deliberation_failed',
    ],
    recommendedTransition: !llm.ok ? 'BLOCKED' : evidencePresent ? 'VERIFYING' : 'EVIDENCE_PENDING',
  });

  const runStatus = !llm.ok ? 'BLOCKED' : evidencePresent ? 'READY' : 'EVIDENCE_PENDING';
  const persisted = await gate.ctx.service
    .from('sfi_cognitive_twin_runs')
    .insert({
      task_id: taskId,
      contract_version: envelope.contractVersion,
      provider: llm.provider,
      model: llm.model,
      role: 'cognitive_twin_deliberation',
      status: runStatus,
      objective: question,
      input_snapshot: {
        question,
        cognitiveSpine: {
          snapshot: cognitiveSpine.snapshot,
          consumptionTrace: cognitiveSpine.trace,
        },
        sfiIntegration: institutionalSync.integration.summary,
        requestedBy: gate.ctx.user.id,
        providerExecutionSucceeded: llm.ok,
      },
      output_envelope: envelope,
      evidence_refs: evidenceRefs,
      limitations: envelope.limitations,
      started_at: startedAt,
      finished_at: finishedAt,
    })
    .select('id,task_id,status,provider,model,role,objective,input_snapshot,output_envelope,evidence_refs,limitations,created_at')
    .single();

  if (persisted.error) {
    return NextResponse.json({ ok: false, error: 'cognitive_twin_run_persistence_failed', details: persisted.error.message, envelope }, { status: 500 });
  }

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'cognitive_twin.deliberate',
    target: taskId,
    payload: {
      runId: persisted.data.id,
      runStatus,
      provider: llm.provider,
      model: llm.model,
      providerExecutionSucceeded: llm.ok,
      authorityDecision: authority.decision,
      evidenceRefs: evidenceRefs.length,
      cognitiveSpineSnapshotId: cognitiveSpine.snapshot.snapshotId,
      cognitiveSpineSnapshotHash: cognitiveSpine.snapshot.snapshotHash,
      cognitiveSpineProfile: cognitiveSpine.trace.projectionProfile,
      cognitiveSpineConsumed: cognitiveSpine.trace.ctSnapshotConsumed,
      sfiOrgansConnected: institutionalSync.integration.summary.connected,
      sfiOrgansExercised: institutionalSync.integration.summary.exercised,
    },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({
    ok: llm.ok,
    cognitiveExecution: llm.ok ? 'EXECUTED' : 'DEGRADED',
    institutionalSync,
    cognitiveSpine: {
      snapshotId: cognitiveSpine.snapshot.snapshotId,
      snapshotHash: cognitiveSpine.snapshot.snapshotHash,
      sourceCutoff: snapshotState.sourceCutoff,
      projectionProfile: cognitiveSpine.trace.projectionProfile,
      profileVersion: cognitiveSpine.trace.profileVersion,
      consumed: cognitiveSpine.trace.ctSnapshotConsumed,
    },
    run: persisted.data,
    envelope,
    audit,
  }, { status: llm.ok ? 200 : 503 });
}
