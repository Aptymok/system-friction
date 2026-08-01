  import { NextRequest, NextResponse } from 'next/server';
  import { publishCognitiveTaskGraph } from '@/lib/sfi/cognitive-runtime/runtime';
  import { evaluateAmvEvidence } from '@/lib/amv/agents/evidenceAgent';
  import { wrapEvidenceReading } from '@/lib/sfi/cognitive-runtime/amvReading';
  import { relayPhenomenonReading } from '@/lib/sfi/cognitive-runtime/PhenomenonRelay';
  import { appendEpistemicEvent } from '@/lib/events/eventStore';
  import type { AmvEvidenceRecord } from '@/lib/amv/core/evidenceTypes';

  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  /**
   * Same cron-secret pattern already used by src/app/api/cron/worldspect/route.ts
   * and siblings -- reused verbatim, not a new auth mechanism. Exists so the first
   * full SFI Cognitive Runtime cycle can be exercised without an interactive Root
   * browser session (requireRootActor still gates /api/root/cognitive-runtime
   * unchanged -- this route does not touch or bypass it, it is a separate path).
   */
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

    if (!secret && !production) {
      return { ok: true as const, warnings: ['sfi_cron_secret_missing_local_dev_allowed'] };
    }

    if (!token || token !== secret) {
      return {
        ok: false as const,
        response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
      };
    }

    return { ok: true as const, warnings: [] as string[] };
  }

  export async function POST(request: NextRequest) {
    const gate = authorizeCron(request);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const question = typeof body.question === 'string' && body.question.trim().length > 0
      ? body.question.trim()
      : 'SFI Cognitive Runtime smoke test -- first full cycle';

    // Step 1: meta_orchestrator plans and persists the task graph (SFI_TASK_CREATED).
    const published = await publishCognitiveTaskGraph(question);
    if (!published.ok) {
      return NextResponse.json({ ok: false, step: 'publishCognitiveTaskGraph', error: published.error, details: published.details }, { status: 500 });
    }

    // Step 2: a real (not faked) AMV evidence evaluation, using an honest synthetic
    // record clearly marked as a smoke test -- exercises the actual evidenceAgent
    // contract, not a hand-built fake result.
    const testEvidence: AmvEvidenceRecord = {
      id: `smoketest:${published.logbookId}`,
      trust: 'declared',
      sourceId: 'sfi-cognitive-cycle-smoketest',
      sourceLabel: 'SFI Cognitive Runtime smoke test',
      observedAt: new Date().toISOString(),
      operator: 'SFI_SMOKETEST',
      summary: 'Synthetic evidence generated only to validate the first full cycle end to end.',
      lineage: ['smoketest', published.logbookId],
      confidence: 0.5,
      payloadHash: 'smoketest',
      changesRoute: false,
      changesRisk: false,
      closesLoop: false,
    };

    const evidenceResult = evaluateAmvEvidence(testEvidence);
    const reading = wrapEvidenceReading('smoketest', evidenceResult);

    // Step 3: PhenomenonRelay -- pure translation, same function used everywhere else.
    const cognitiveEvent = relayPhenomenonReading(reading, published.logbookId);

    // Step 4: the Runtime -- and only the Runtime -- persists it (ADR-002).
    const appended = await appendEpistemicEvent(cognitiveEvent);
    if (!appended.ok) {
      return NextResponse.json({ ok: false, step: 'appendEpistemicEvent', error: appended.error, details: appended.details }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      warnings: gate.warnings,
      logbookId: published.logbookId,
      taskGraph: published.taskGraph,
      relayedEvent: appended.data,
      verify: `/api/events/stream?logbookId=${encodeURIComponent(published.logbookId)}`,
    });
  }

