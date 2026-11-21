import { NextRequest, NextResponse } from 'next/server';
import { runAiTask } from '@/observatory/ai/aiProviderRouter';
import type { AiTask } from '@/observatory/ai/aiProviderTypes';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { checkRateLimit, rateLimitKey } from '@/lib/auth/rateLimit';

const allowedTasks: AiTask[] = ['summarize', 'audit', 'simulate', 'explain', 'route', 'rewrite_blocked'];

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    const context = await requireAuthenticatedUser();
    userId = context.user.id;
  } catch (error) {
    if (error instanceof AccessDeniedError) return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
    return NextResponse.json({ ok: false, error: 'authorization_failed' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const task = body?.task;
  const input = typeof body?.input === 'string' ? body.input : '';

  if (!allowedTasks.includes(task)) {
    return NextResponse.json({ error: 'invalid_task' }, { status: 400 });
  }

  if (!input.trim()) {
    return NextResponse.json({ error: 'missing_input' }, { status: 400 });
  }
  if (input.length > 4_000 || (body?.context && JSON.stringify(body.context).length > 8_000)) {
    return NextResponse.json({ error: 'ai_input_too_large' }, { status: 413 });
  }

  // A local per-user throttle is defense-in-depth, not a distributed spend cap.
  const allowance = checkRateLimit(rateLimitKey('legacy-ai-provider', userId), 6, 60_000);
  if (!allowance.allowed) return NextResponse.json({ error: 'ai_rate_limit_exceeded' }, { status: 429 });

  const result = await runAiTask({
    task,
    input,
    context: body?.context && typeof body.context === 'object' ? body.context : undefined,
    mode: typeof body?.mode === 'string' ? body.mode : undefined,
    providerPreference: body?.providerPreference || body?.preferredProvider,
  });

  return NextResponse.json(result);
}
