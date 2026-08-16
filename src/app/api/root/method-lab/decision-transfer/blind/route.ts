import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
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
import {
  applyDecisionTransferExperimentFreeze,
  assertDecisionTransferModelPreflight,
  bindDecisionTransferModelContract,
} from '@/core/cognitive-twin/reentry/decisionTransferExperimentFreeze';

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
    const raw = await request.json();
    const canonical = isCanonicalMaterializationRequest(raw);
    const frozenRaw = canonical ? applyDecisionTransferExperimentFreeze(raw) : raw;
    const modelPreflight = canonical ? assertDecisionTransferModelPreflight() : null;
    const materialized = canonical
      ? await materializeDecisionTransferContext(parseMaterializedBlindDecisionRequest(frozenRaw))
      : null;
    const input = materialized?.blindInput ?? parseBlindDecisionRunInput(frozenRaw);
    const result = await executeBlindDecisionReconstruction(input);

    let modelContract = null;
    if (materialized) {
      modelContract = await bindDecisionTransferModelContract({
        blindRunId: result.runId,
        actualProvider: result.provider,
        actualModel: result.model,
      });
      await bindDecisionTransferContextReceipt(result.runId, materialized.receipt);
      await verifyDecisionTransferContextReceiptBound(result.runId, materialized.receipt.receiptHash);
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
        confirmatoryMode: Boolean(materialized),
        protocolVersion: modelContract?.protocolVersion ?? null,
        expectedModel: modelContract?.expectedModel ?? null,
        actualModel: result.model,
        promptTemplateHash: modelContract?.promptTemplateHash ?? null,
        systemPromptHash: modelContract?.systemPromptHash ?? null,
        modelContractHash: modelContract?.contractHash ?? null,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json({ ok: false, error: 'blind_reconstruction_audit_failed', runId: result.runId, audit }, { status: 500 });
    return NextResponse.json({
      ...result,
      contextMaterialization: materialized?.receipt ?? null,
      modelPreflight,
      modelContract,
      experimentalMode: materialized ? 'CONFIRMATORY_FROZEN' : 'NON_CONFIRMATORY_DIAGNOSTIC',
      audit,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidInput = error instanceof ZodError;
    const details = invalidInput
      ? error.issues.map((issue) => `${issue.path.join('.') || 'root'}:${issue.message}`).join('; ')
      : error instanceof Error ? error.message : String(error);
    const contextInfrastructureFailure = details.includes('_READ_FAILED')
      || details.startsWith('DT_CONTEXT_BIND_')
      || details.startsWith('DT_CONTEXT_OPERATING_MODE_READ_FAILED')
      || details.startsWith('DT_MODEL_BIND_');
    const status = contextInfrastructureFailure ? 503
      : invalidInput || details.startsWith('BLIND_CONTEXT_') || details.startsWith('DT_CONTEXT_') ? 400
        : details.startsWith('DT_MODEL_') ? 409
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
