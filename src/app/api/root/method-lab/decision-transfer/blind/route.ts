import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import {
  executeBlindDecisionReconstruction,
  parseBlindDecisionRunInput,
} from '@/core/cognitive-twin/reentry/blindDecisionReconstruction';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const gate = await requireRootActor('root.method-lab.decision-transfer.blind');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const raw = await request.json();
    const input = parseBlindDecisionRunInput(raw);
    const result = await executeBlindDecisionReconstruction(input);
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
      },
      request,
    });
    if (!audit.ok) return NextResponse.json({ ok: false, error: 'blind_reconstruction_audit_failed', runId: result.runId, audit }, { status: 500 });
    return NextResponse.json({ ...result, audit }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidInput = error instanceof ZodError;
    const details = invalidInput
      ? error.issues.map((issue) => `${issue.path.join('.') || 'root'}:${issue.message}`).join('; ')
      : error instanceof Error ? error.message : String(error);
    const status = invalidInput || details.startsWith('BLIND_CONTEXT_') ? 400
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
