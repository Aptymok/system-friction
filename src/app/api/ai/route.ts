import { NextRequest, NextResponse } from 'next/server';
import { runAiTask } from '@/observatory/ai/aiProviderRouter';
import type { AiTask } from '@/observatory/ai/aiProviderTypes';

const allowedTasks: AiTask[] = ['audit', 'simulate', 'explain', 'route', 'summarize'];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const task = body?.task;
  const input = typeof body?.input === 'string' ? body.input : '';

  if (!allowedTasks.includes(task)) {
    return NextResponse.json({ error: 'invalid_task' }, { status: 400 });
  }

  if (!input.trim()) {
    return NextResponse.json({ error: 'missing_input' }, { status: 400 });
  }

  const result = await runAiTask({
    task,
    input,
    context: body?.context && typeof body.context === 'object' ? body.context : undefined,
    preferredProvider: body?.preferredProvider,
  });

  return NextResponse.json(result);
}
