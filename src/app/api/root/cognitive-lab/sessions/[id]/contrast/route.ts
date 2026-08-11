import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { runCognitiveLabFounderContrast } from '@/lib/cognitive-lab/service';
import { METHOD_LAB_CONTRACT_VERSION } from '@/lib/method-lab/contracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireRootActor('cognitive_lab.contrast.execute');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const { id } = await Promise.resolve(context.params);
    const sessionId = decodeURIComponent(id);
    const body = record(await request.json().catch(() => null));
    const founderReading = body.founderReading;

    if (typeof founderReading === 'undefined' || founderReading === null) {
      return NextResponse.json({ ok: false, error: 'founderReading_required' }, { status: 400 });
    }

    const result = await runCognitiveLabFounderContrast(gate.ctx.user.id, sessionId, founderReading);
    const resultHash = hash({
      founderAnalysisId: result.founderReading.id,
      divergenceAnalysisId: result.divergence.id,
      learningPersisted: result.learning.persisted === true,
      cognitiveExecution: result.cognitiveExecution,
    });

    const labSummary = await gate.ctx.service.from('sfi_lab_analyses').insert({
      mode: 'cognitive_relational_lab',
      source: `sfi_cognitive_lab_sessions:${sessionId}`,
      data_mode: 'SIMULATED',
      confidence: result.cognitiveExecution === 'EXECUTED' ? 0.5 : 0,
      limitations: [
        'Single relational laboratory session does not validate a Cognitive Twin.',
        'Founder contrast may itself alter future interaction and must remain attributable.',
        'Candidate learning is not canonical promotion.',
      ],
      recommendations: ['Compare against blind holdout and repeated relational sessions before any promotion request.'],
      raw_analysis: {
        contractVersion: METHOD_LAB_CONTRACT_VERSION,
        protocolId: 'cognitive_relational_lab',
        protocolVersion: '2026-08-11.crl.v1',
        epistemicClass: 'SIMULATED',
        validationLevel: 'SIMULATION',
        promotionAllowed: false,
        sessionId,
        founderAnalysisId: result.founderReading.id,
        divergenceAnalysisId: result.divergence.id,
        learningPersisted: result.learning.persisted === true,
        cognitiveExecution: result.cognitiveExecution,
        resultHash,
      },
    }).select('id').single();
    if (labSummary.error) throw new Error(`METHOD_LAB_SUMMARY_PERSIST_FAILED:${labSummary.error.message}`);

    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'cognitive_lab.contrast.executed',
      target: sessionId,
      payload: {
        founderAnalysisId: result.founderReading.id,
        divergenceAnalysisId: result.divergence.id,
        learningPersisted: result.learning.persisted === true,
        cognitiveExecution: result.cognitiveExecution,
        methodLabAnalysisId: labSummary.data.id,
        resultHash,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });

    return NextResponse.json({
      ok: result.cognitiveExecution === 'EXECUTED',
      ...result,
      methodLab: { analysisId: labSummary.data.id, resultHash, epistemicClass: 'SIMULATED', validationLevel: 'SIMULATION' },
      audit,
    }, { status: result.cognitiveExecution === 'EXECUTED' ? 200 : 503 });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes('NOT_FOUND')
      ? 404
      : details.includes('REQUIRED') || details.includes('REQUIRES_EVENTS')
        ? 400
        : 500;
    return NextResponse.json({ ok: false, error: 'COGNITIVE_LAB_CONTRAST_FAILED', details }, { status });
  }
}
