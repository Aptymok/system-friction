import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import {
  createCognitiveLabSession,
  listCognitiveLabSessions,
  type CognitiveLabCondition,
} from '@/lib/cognitive-lab/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

const CONDITIONS = new Set<CognitiveLabCondition>([
  'FOUNDER_SOLO',
  'FOUNDER_MODEL',
  'FOUNDER_TWIN',
  'FOUNDER_HUMAN_TECH',
  'TWIN_ONLY',
  'OTHER',
]);

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, maximum = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

export async function GET() {
  const gate = await requireRootActor('cognitive_lab.sessions.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const sessions = await listCognitiveLabSessions();
    return NextResponse.json({ ok: true, sessions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'COGNITIVE_LAB_SESSION_LIST_FAILED',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireRootActor('cognitive_lab.sessions.create');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const body = record(await request.json().catch(() => null));
    const title = text(body.title, 240);
    const objective = text(body.objective, 5000);
    const condition = text(body.condition, 80) as CognitiveLabCondition;

    if (!title) return NextResponse.json({ ok: false, error: 'title_required' }, { status: 400 });
    if (!objective) return NextResponse.json({ ok: false, error: 'objective_required' }, { status: 400 });
    if (!CONDITIONS.has(condition)) return NextResponse.json({ ok: false, error: 'condition_invalid' }, { status: 400 });

    const session = await createCognitiveLabSession(gate.ctx.user.id, {
      title,
      objective,
      condition,
      technologyNodes: Array.isArray(body.technologyNodes) ? body.technologyNodes : [],
      humanNodes: Array.isArray(body.humanNodes) ? body.humanNodes : [],
      baselineSessionId: text(body.baselineSessionId, 120) || null,
      metadata: record(body.metadata),
    });

    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'cognitive_lab.session.created',
      target: String(session.id),
      payload: {
        sessionKey: session.session_key,
        condition: session.condition,
        objective: session.objective,
      },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });

    return NextResponse.json({
      ok: true,
      activated: true,
      session,
      next: `POST /api/root/cognitive-lab/sessions/${String(session.id)}/events`,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'COGNITIVE_LAB_SESSION_CREATE_FAILED',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
