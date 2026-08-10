import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { runCognitiveLabInteraction } from '@/lib/cognitive-lab/interaction';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, maximum = 12000) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function history(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(-10).map((item) => record(item)).map((item) => ({
    role: item.role === 'assistant' ? 'assistant' as const : 'user' as const,
    content: text(item.content, 5000),
  })).filter((item) => item.content);
}

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireRootActor('cognitive_lab.interact');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const { id } = await Promise.resolve(context.params);
    const sessionId = decodeURIComponent(id);
    const body = record(await request.json().catch(() => null));
    const prompt = text(body.prompt, 12000);
    if (!prompt) return NextResponse.json({ ok: false, error: 'prompt_required' }, { status: 400 });

    const result = await runCognitiveLabInteraction(gate.ctx.user.id, sessionId, {
      prompt,
      history: history(body.history),
    });

    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'cognitive_lab.interaction.executed',
      target: sessionId,
      payload: {
        condition: result.condition,
        promptEventId: result.promptEvent.id,
        outputEventId: result.outputEvent.id,
        provider: result.provider,
        model: result.model,
        providerExecutionSucceeded: result.ok,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });

    return NextResponse.json({ ...result, audit }, { status: result.ok ? 200 : 503 });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes('NOT_FOUND')
      ? 404
      : details.includes('REQUIRES_MODEL_CONDITION') || details.includes('NOT_OPEN')
        ? 409
        : 500;
    return NextResponse.json({ ok: false, error: 'COGNITIVE_LAB_INTERACTION_FAILED', details }, { status });
  }
}
