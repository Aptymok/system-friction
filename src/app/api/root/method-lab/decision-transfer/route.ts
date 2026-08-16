import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import {
  executeDecisionTransferEvaluation,
  parseDecisionTransferRunInput,
} from '@/core/cognitive-twin/reentry/decisionTransferRun';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const gate = await requireRootActor('root.method-lab.decision-transfer.evaluate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const raw = await request.json();
    const input = parseDecisionTransferRunInput(raw);
    const { evaluationEvidence: _ignoredEvidenceLineage, ...diagnosticInput } = input;
    const result = await executeDecisionTransferEvaluation({
      ...diagnosticInput,
      experimentalMode: 'NON_CONFIRMATORY_DIAGNOSTIC',
    }, gate.ctx.user.id);
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'method_lab.decision_transfer.evaluated',
      target: result.evaluationId,
      payload: {
        taskId: result.taskId,
        runId: result.runId,
        evaluationId: result.evaluationId,
        labAnalysisId: result.labAnalysisId,
        operationKey: result.operationKey,
        provider: result.provider,
        model: result.model,
        outcome: result.outcome,
        evidenceRefs: result.evidenceRefs,
        epistemicClass: 'DERIVED',
        promotionAllowed: false,
        experimentalMode: 'NON_CONFIRMATORY_DIAGNOSTIC',
        scientificQualificationAllowed: false,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({
      ...result,
      experimentalMode: 'NON_CONFIRMATORY_DIAGNOSTIC',
      scientificQualificationAllowed: false,
      boundary: 'Manual occurrences, probes, boundary counts or thresholds submitted to this legacy evaluator are diagnostic only and cannot constitute SFI-DT-1.0 confirmatory evidence.',
      audit,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidInput = error instanceof ZodError;
    const details = invalidInput
      ? error.issues.map((issue) => `${issue.path.join('.') || 'root'}:${issue.message}`).join('; ')
      : error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      error: invalidInput ? 'decision_transfer_input_invalid' : 'decision_transfer_evaluation_failed',
      details,
    }, { status: invalidInput ? 400 : 503 });
  }
}
