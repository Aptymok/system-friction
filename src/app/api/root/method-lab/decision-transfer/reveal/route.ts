import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import {
  executeBlindDecisionReveal,
  parseBlindDecisionRevealInput,
} from '@/core/cognitive-twin/reentry/blindDecisionReconstruction';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const gate = await requireRootActor('root.method-lab.decision-transfer.reveal');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const raw = await request.json();
    const input = parseBlindDecisionRevealInput(raw);
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
        evaluationId: result.evaluation.evaluationId,
        evaluationRunId: result.evaluation.runId,
        outcome: result.evaluation.outcome,
        commitmentVerified: true,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json({ ok: false, error: 'blind_reveal_audit_failed', result, audit }, { status: 500 });
    return NextResponse.json({ ...result, audit }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidInput = error instanceof ZodError;
    const details = invalidInput
      ? error.issues.map((issue) => `${issue.path.join('.') || 'root'}:${issue.message}`).join('; ')
      : error instanceof Error ? error.message : String(error);
    const status = invalidInput ? 400
      : details.includes('COMMITMENT_MISMATCH') || details.includes('TRACE_ID_MISMATCH') || details.includes('DOMAIN_MISMATCH') ? 409
        : details.includes('NOT_FOUND') ? 404
          : details.includes('NOT_REVEALABLE') || details.includes('LOCK_FAILED') ? 409
            : 503;
    return NextResponse.json({
      ok: false,
      error: invalidInput ? 'blind_reveal_input_invalid' : 'blind_decision_reveal_failed',
      details,
    }, { status });
  }
}
