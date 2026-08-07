import { NextRequest, NextResponse } from 'next/server';
import { planCognitiveQuestion } from '@/lib/sfi/cognitive-runtime/planning';
import { evaluateAmvEvidence } from '@/lib/amv/agents/evidenceAgent';
import { wrapEvidenceReading } from '@/lib/sfi/cognitive-runtime/amvReading';
import { relayPhenomenonReading } from '@/lib/sfi/cognitive-runtime/PhenomenonRelay';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import type { AmvEvidenceRecord } from '@/lib/amv/core/evidenceTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cronSecret() {
  return process.env.SFI_CRON_SECRET || process.env.CRON_SECRET || '';
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function authorizeCron(request: NextRequest) {
  const secret = cronSecret();
  const token = bearerToken(request);
  const production = process.env.NODE_ENV === 'production';

  if (!secret && production) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: 'sfi_cron_secret_missing', message: 'SFI_CRON_SECRET or CRON_SECRET must be configured in production.' },
        { status: 503 },
      ),
    };
  }

  if (!secret && !production) return { ok: true as const, warnings: ['sfi_cron_secret_missing_local_dev_allowed'] };
  if (!token || token !== secret) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) };
  return { ok: true as const, warnings: [] as string[] };
}

export async function POST(request: NextRequest) {
  const gate = authorizeCron(request);
  if (!gate.ok) return gate.response;

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const question = typeof body.question === 'string' && body.question.trim().length > 0
    ? body.question.trim()
    : 'SFI Cognitive Runtime smoke test -- first full cycle';

  const planned = await planCognitiveQuestion(question, 'SFI_SMOKETEST');
  if (!planned.ok) {
    return NextResponse.json({ ok: false, step: 'planCognitiveQuestion', error: planned.error, details: planned.details }, { status: 500 });
  }

  const testEvidence: AmvEvidenceRecord = {
    id: `smoketest:${planned.logbookId}`,
    trust: 'declared',
    sourceId: 'sfi-cognitive-cycle-smoketest',
    sourceLabel: 'SFI Cognitive Runtime smoke test',
    observedAt: new Date().toISOString(),
    operator: 'SFI_SMOKETEST',
    summary: 'Synthetic evidence generated only to validate the first full cycle end to end.',
    lineage: ['smoketest', planned.logbookId],
    confidence: 0.5,
    payloadHash: 'smoketest',
    changesRoute: false,
    changesRisk: false,
    closesLoop: false,
  };

  const evidenceResult = evaluateAmvEvidence(testEvidence);
  const reading = wrapEvidenceReading('smoketest', evidenceResult);
  const cognitiveEvent = relayPhenomenonReading(reading, planned.logbookId);
  const appended = await appendEpistemicEvent(cognitiveEvent);
  if (!appended.ok) {
    return NextResponse.json({ ok: false, step: 'appendEpistemicEvent', error: appended.error, details: appended.details }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    warnings: gate.warnings,
    logbookId: planned.logbookId,
    taskGraph: planned.taskGraph,
    relayedEvent: appended.data,
    verify: `/api/events/stream?logbookId=${encodeURIComponent(planned.logbookId)}`,
  });
}
