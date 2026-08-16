import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import {
  parseDecisionTransferExperimentRegistrationInput,
  registerDecisionTransferExperiment,
} from '@/core/cognitive-twin/reentry/decisionTransferExperimentRegistration';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  const gate = await requireRootActor('root.method-lab.decision-transfer.register');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const input = parseDecisionTransferExperimentRegistrationInput(await request.json());
    const result = await registerDecisionTransferExperiment(input, gate.ctx.user.id);
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'method_lab.decision_transfer.experiment_registered',
      target: result.registrationRunId,
      payload: {
        experimentId: result.receipt.experimentId,
        targetTraceId: result.receipt.targetTraceId,
        targetDomain: result.receipt.targetDomain,
        targetCommitmentSha256: result.receipt.targetCommitmentSha256,
        cutoffAt: result.receipt.cutoffAt,
        arms: result.receipt.arms,
        instrumentSourceHash: result.receipt.instrumentSourceHash,
        registrationHash: result.receipt.registrationHash,
        reused: result.reused,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json({ ok: false, error: 'dt_registration_audit_failed', result, audit }, { status: 500 });
    return NextResponse.json({ ok: true, ...result, audit }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidInput = error instanceof ZodError;
    const details = invalidInput
      ? error.issues.map((issue) => `${issue.path.join('.') || 'root'}:${issue.message}`).join('; ')
      : error instanceof Error ? error.message : String(error);
    const infrastructureFailure = details.includes('_READ_FAILED') || details.includes('_PERSIST_FAILED');
    const status = invalidInput ? 400
      : infrastructureFailure ? 503
        : details.startsWith('DT_REGISTRATION_') || details.startsWith('DT_INSTRUMENT_') ? 409
          : 503;
    return NextResponse.json({
      ok: false,
      error: invalidInput ? 'dt_registration_input_invalid' : 'dt_registration_failed',
      details,
    }, { status });
  }
}
