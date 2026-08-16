import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { executeBlindDecisionReveal } from '@/core/cognitive-twin/reentry/blindDecisionReconstruction';
import { verifyBlindDecisionContextIntegrity } from '@/core/cognitive-twin/reentry/blindDecisionIntegrity';
import {
  materializeDecisionTransferEvaluationEvidence,
  parseDecisionTransferConfirmatoryRevealInput,
  verifyFrozenDecisionTransferEvaluationEvidence,
} from '@/core/cognitive-twin/reentry/decisionTransferEvaluationEvidence';
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
    const input = parseDecisionTransferConfirmatoryRevealInput(withoutTimingExtension(raw));
    const contextIntegrity = await verifyBlindDecisionContextIntegrity(input.blindRunId);
    const targetTiming = await verifyRevealedTargetAfterContextCutoff({
      blindRunId: input.blindRunId,
      target: input.target,
      targetObservationEvidenceIds,
    });
    if (!targetTiming.required || !targetTiming.verified) {
      throw new Error('DT_EVIDENCE_CONFIRMATORY_TARGET_TIMING_REQUIRED');
    }

    const materialized = await materializeDecisionTransferEvaluationEvidence({
      blindRunId: input.blindRunId,
      target: input.target,
      operationKey: input.operationKey,
      targetTimingProofHash: targetTiming.proofHash,
    });
    const frozen = await verifyFrozenDecisionTransferEvaluationEvidence({
      materializationRunId: materialized.materializationRunId,
      expectedReceiptHash: materialized.receipt.receiptHash,
    });

    const inputForScoring = {
      ...input,
      occurrences: frozen.receipt.occurrences,
      counterfactualProbes: [
        ...frozen.receipt.empiricalBoundaryProbes,
        ...frozen.receipt.diagnosticCounterfactuals,
      ],
      boundaryProbeCount: frozen.receipt.qualifyingBoundaryProbeCount,
    };
    const result = await executeBlindDecisionReveal(inputForScoring, gate.ctx.user.id);

    const verifiedTargetEvidenceIds = targetTiming.evidence.map((item) => item.evidenceId);
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
        targetTimingProofHash: targetTiming.proofHash,
        contextCutoffAt: targetTiming.cutoffAt,
        earliestObservedTargetAt: targetTiming.earliestObservedTargetAt,
        verifiedTargetObservationEvidenceIds: verifiedTargetEvidenceIds,
        evaluationEvidenceProtocol: frozen.receipt.protocol,
        evaluationEvidenceMaterializationRunId: frozen.materializationRunId,
        evaluationEvidenceReceiptHash: frozen.receipt.receiptHash,
        evaluationEvidencePoolHash: frozen.receipt.evidencePoolHash,
        evaluationEvidenceValidationStatus: frozen.receipt.validationStatus,
        boundaryValidationStatus: frozen.receipt.boundaryValidationStatus,
        qualifyingOccurrenceCount: frozen.receipt.qualifyingOccurrenceCount,
        qualifyingBoundaryProbeCount: frozen.receipt.qualifyingBoundaryProbeCount,
        manualValidatingOccurrences: 0,
        manualValidatingProbes: 0,
        manualBoundaryCount: 0,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json({ ok: false, error: 'blind_reveal_audit_failed', result, audit }, { status: 500 });
    return NextResponse.json({
      ...result,
      contextIntegrity,
      targetTiming,
      evaluationEvidence: {
        materializationRunId: frozen.materializationRunId,
        receipt: frozen.receipt,
        reused: materialized.reused,
      },
      audit,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidInput = error instanceof ZodError;
    const details = invalidInput
      ? error.issues.map((issue) => `${issue.path.join('.') || 'root'}:${issue.message}`).join('; ')
      : error instanceof Error ? error.message : String(error);
    const infrastructureFailure = details.includes('DT_TARGET_TIMING_EVIDENCE_READ_FAILED')
      || details.includes('DT_TARGET_TIMING_EVENT_READ_FAILED')
      || details.includes('DT_EVIDENCE_ROOT_READ_FAILED')
      || details.includes('DT_EVIDENCE_EVENT_READ_FAILED')
      || details.includes('DT_EVIDENCE_HISTORY_READ_FAILED')
      || details.includes('DT_EVIDENCE_RECEIPT_PERSIST_FAILED');
    const status = invalidInput ? 400
      : infrastructureFailure ? 503
        : details.startsWith('DT_TARGET_TIMING_') || details.startsWith('DT_EVIDENCE_') ? 409
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
