import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import {
  executeBlindDecisionReveal,
  parseBlindDecisionRevealInput,
} from '@/core/cognitive-twin/reentry/blindDecisionReconstruction';
import { verifyBlindDecisionContextIntegrity } from '@/core/cognitive-twin/reentry/blindDecisionIntegrity';
import {
  parseTargetObservationEvidenceIds,
  verifyRevealedTargetAfterContextCutoff,
} from '@/core/cognitive-twin/reentry/decisionTransferTargetTiming';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function withoutTimingExtension(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const { targetObservationEvidenceIds: _targetObservationEvidenceIds, ...reveal } = value as Record<string, unknown>;
  return reveal;
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.method-lab.decision-transfer.reveal');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const raw = await request.json();
    const targetObservationEvidenceIds = parseTargetObservationEvidenceIds(raw);
    const input = parseBlindDecisionRevealInput(withoutTimingExtension(raw));
    const contextIntegrity = await verifyBlindDecisionContextIntegrity(input.blindRunId);
    const targetTiming = await verifyRevealedTargetAfterContextCutoff({
      blindRunId: input.blindRunId,
      target: input.target,
      targetObservationEvidenceIds,
    });
    const result = await executeBlindDecisionReveal(input, gate.ctx.user.id);
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'method_lab.decision_transfer.blind_target_revealed',
      target: result.blindRunId,
      payload: {
        blindTaskId: result.blindTaskId,
        experimentId: result.experimentId,
        arm: result.arm,
        predictionHash: result.predictionHash,
        targetCommitmentSha256: result.targetCommitmentSha256,
        selectedContextHash: contextIntegrity.selectedContextHash,
        evaluationId: result.evaluation.evaluationId,
        evaluationRunId: result.evaluation.runId,
        outcome: result.evaluation.outcome,
        commitmentVerified: true,
        contextIntegrityVerified: true,
        targetTimingRequired: targetTiming.required,
        targetTimingVerified: targetTiming.verified,
        targetTimingStatus: targetTiming.status,
        targetTimingProofHash: targetTiming.required ? targetTiming.proofHash : null,
        targetObservedAfter: targetTiming.required ? targetTiming.cutoffAt : null,
        earliestObservedTargetAt: targetTiming.required ? targetTiming.earliestObservedTargetAt : null,
        targetObservationEvidenceIds,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json({ ok: false, error: 'blind_reveal_audit_failed', result, audit }, { status: 500 });
    return NextResponse.json({ ...result, contextIntegrity, targetTiming, audit }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidInput = error instanceof ZodError;
    const details = invalidInput
      ? error.issues.map((issue) => `${issue.path.join('.') || 'root'}:${issue.message}`).join('; ')
      : error instanceof Error ? error.message : String(error);
    const timingInfrastructureFailure = details.includes('DT_TARGET_TIMING_EVIDENCE_READ_FAILED')
      || details.includes('DT_TARGET_TIMING_EVENT_READ_FAILED');
    const status = invalidInput ? 400
      : timingInfrastructureFailure ? 503
        : details.startsWith('DT_TARGET_TIMING_') ? 409
          : details.includes('COMMITMENT_MISMATCH') || details.includes('TRACE_ID_MISMATCH') || details.includes('DOMAIN_MISMATCH') || details.includes('INTEGRITY_MISMATCH') ? 409
            : details.includes('NOT_FOUND') ? 404
              : details.includes('NOT_REVEALABLE') || details.includes('LOCK_FAILED') || details.includes('CONTRACT_MISMATCH') || details.includes('ROLE_MISMATCH') ? 409
                : 503;
    return NextResponse.json({
      ok: false,
      error: invalidInput ? 'blind_reveal_input_invalid' : 'blind_decision_reveal_failed',
      details,
    }, { status });
  }
}
