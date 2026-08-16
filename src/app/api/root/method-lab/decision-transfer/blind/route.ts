import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { materializeDecisionTransferOperationalSpineBoundary } from '@/lib/lab/decisionTransferCognitiveSpineBoundary';
import {
  executeBlindDecisionReconstruction,
  parseBlindDecisionRunInput,
} from '@/core/cognitive-twin/reentry/blindDecisionReconstruction';
import {
  bindDecisionTransferContextReceipt,
  materializeDecisionTransferContext,
  parseMaterializedBlindDecisionRequest,
} from '@/core/cognitive-twin/reentry/decisionTransferContext';
import { verifyDecisionTransferContextReceiptBound } from '@/core/cognitive-twin/reentry/decisionTransferContextIntegrity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function isCanonicalMaterializationRequest(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && (value as Record<string, unknown>).contextSource === 'CANONICAL_MATERIALIZED';
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.method-lab.decision-transfer.blind');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const runStartedAt = new Date().toISOString();
    const raw = await request.json();
    const materialized = isCanonicalMaterializationRequest(raw)
      ? await materializeDecisionTransferContext(parseMaterializedBlindDecisionRequest(raw))
      : null;
    const input = materialized?.blindInput ?? parseBlindDecisionRunInput(raw);

    // The experimental execution happens before observing the operational
    // institutional Cognitive Spine boundary. This guarantees the live SFI-CT
    // cannot influence model input, provider selection, or experiment success.
    const result = await executeBlindDecisionReconstruction(input);
    if (materialized) {
      await bindDecisionTransferContextReceipt(result.runId, materialized.receipt);
      await verifyDecisionTransferContextReceiptBound(result.runId, materialized.receipt.receiptHash);
    }

    let operationalCognitiveSpine: Awaited<ReturnType<typeof materializeDecisionTransferOperationalSpineBoundary>> | null = null;
    let operationalCognitiveSpineWarning: string | null = null;
    try {
      operationalCognitiveSpine = await materializeDecisionTransferOperationalSpineBoundary({
        executionId: result.runId,
        runStartCutoff: runStartedAt,
        recordedAt: new Date().toISOString(),
      });
    } catch (error) {
      operationalCognitiveSpineWarning = `operational_sfi_ct_boundary_unavailable:${error instanceof Error ? error.message : String(error)}`;
    }

    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'method_lab.decision_transfer.blind_reconstruction_created',
      target: result.runId,
      payload: {
        taskId: result.taskId,
        experimentId: result.experimentId,
        arm: result.arm,
        provider: result.provider,
        model: result.model,
        targetTraceId: result.targetTraceId,
        targetCommitmentSha256: result.targetCommitmentSha256,
        selectedContextHash: result.selectedContextHash,
        predictionHash: result.predictionHash,
        epistemicClass: 'INFERRED',
        targetRevealed: false,
        contextSource: materialized ? 'CANONICAL_MATERIALIZED' : 'MANUAL_CONTEXT_POOL',
        contextMaterializationReceiptHash: materialized?.receipt.receiptHash ?? null,
        contextMaterializationVerified: Boolean(materialized),
        cutoffAt: materialized?.receipt.cutoffAt ?? null,
        operationalCognitiveSpine: operationalCognitiveSpine ? {
          available: operationalCognitiveSpine.operationalSfiCtAvailable,
          consumed: operationalCognitiveSpine.operationalSfiCtConsumed,
          profile: operationalCognitiveSpine.profile,
          profileVersion: operationalCognitiveSpine.profileVersion,
          sourceCutoff: operationalCognitiveSpine.sourceCutoff,
          snapshotId: operationalCognitiveSpine.snapshotId,
          snapshotHash: operationalCognitiveSpine.snapshotHash,
          visibleRecordCount: operationalCognitiveSpine.visibleRecordCount,
        } : {
          available: false,
          consumed: false,
          profile: 'LAB_BLINDED_V1',
          warning: operationalCognitiveSpineWarning,
        },
      },
      request,
    });
    if (!audit.ok) return NextResponse.json({ ok: false, error: 'blind_reconstruction_audit_failed', runId: result.runId, audit }, { status: 500 });
    return NextResponse.json({
      ...result,
      contextMaterialization: materialized?.receipt ?? null,
      operationalCognitiveSpineBoundary: operationalCognitiveSpine ?? {
        contractVersion: 'SFI-DT-OPERATIONAL-SPINE-BOUNDARY-1.0',
        operationalSfiCtAvailable: false,
        operationalSfiCtConsumed: false,
        profile: 'LAB_BLINDED_V1',
        warning: operationalCognitiveSpineWarning,
        rule: 'Decision Transfer execution is not blocked by operational SFI-CT availability because operational SFI-CT is not an experimental input.',
      },
      audit,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidInput = error instanceof ZodError;
    const details = invalidInput
      ? error.issues.map((issue) => `${issue.path.join('.') || 'root'}:${issue.message}`).join('; ')
      : error instanceof Error ? error.message : String(error);
    const contextInfrastructureFailure = details.includes('_READ_FAILED')
      || details.startsWith('DT_CONTEXT_BIND_')
      || details.startsWith('DT_CONTEXT_OPERATING_MODE_READ_FAILED');
    const status = contextInfrastructureFailure ? 503
      : invalidInput || details.startsWith('BLIND_CONTEXT_') || details.startsWith('DT_CONTEXT_') ? 400
        : details.startsWith('BLIND_PROVIDER_') || details.startsWith('BLIND_LLM_') ? 503
          : details.startsWith('BLIND_PREDICTION_') ? 502
            : 503;
    return NextResponse.json({
      ok: false,
      error: invalidInput ? 'blind_decision_input_invalid' : 'blind_decision_reconstruction_failed',
      details,
    }, { status });
  }
}
