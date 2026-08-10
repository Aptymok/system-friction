import { NextResponse } from 'next/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

function compactError(value: unknown) {
  if (!value) return 'unknown_error';
  if (typeof value === 'string') return value.slice(0, 500);
  try { return JSON.stringify(value).slice(0, 500); } catch { return 'unserializable_error'; }
}

export async function GET() {
  const gate = await requireRootActor('llm.groq.health');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const configured = getLlmProviderStatus().find((provider) => provider.id === 'groq') ?? null;
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? configured?.model ?? 'openai/gpt-oss-20b';
  const started = Date.now();

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      configuredModel: model,
      executedProvider: null,
      executedModel: null,
      result: 'GROQ_API_KEY_MISSING',
      finishReason: null,
      usage: null,
      warnings: ['groq_key_missing'],
      latencyMs: Date.now() - started,
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Return exactly GROQ_OK. No additional text.' },
          { role: 'user', content: 'health probe' },
        ],
        temperature: 0,
        max_completion_tokens: 128,
        ...(model.startsWith('openai/gpt-oss-') ? { include_reasoning: false, reasoning_effort: 'low' } : {}),
      }),
      cache: 'no-store',
    });

    const body = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      const error = body && typeof body === 'object' ? body.error : null;
      return NextResponse.json({
        ok: false,
        configured: true,
        configuredModel: model,
        executedProvider: 'groq',
        executedModel: model,
        result: 'GROQ_REQUEST_FAILED',
        finishReason: null,
        usage: null,
        httpStatus: response.status,
        warnings: [`groq_failed:${compactError(error ?? body ?? `http_${response.status}`)}`],
        latencyMs: Date.now() - started,
      }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }

    const choices = Array.isArray(body?.choices) ? body.choices as Array<Record<string, unknown>> : [];
    const message = choices[0]?.message as Record<string, unknown> | undefined;
    const content = typeof message?.content === 'string' ? message.content.trim() : '';
    const finishReason = typeof choices[0]?.finish_reason === 'string' ? choices[0].finish_reason : null;
    const ok = content === 'GROQ_OK';

    return NextResponse.json({
      ok,
      configured: true,
      configuredModel: model,
      executedProvider: 'groq',
      executedModel: typeof body?.model === 'string' ? body.model : model,
      result: content || 'GROQ_EMPTY_CONTENT',
      finishReason,
      usage: body?.usage ?? null,
      warnings: ok ? [] : [content ? 'groq_unexpected_probe_result' : 'groq_empty_content'],
      latencyMs: Date.now() - started,
    }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      configured: true,
      configuredModel: model,
      executedProvider: 'groq',
      executedModel: model,
      result: 'GROQ_FETCH_FAILED',
      finishReason: null,
      usage: null,
      warnings: [`groq_fetch_failed:${error instanceof Error ? error.message : 'unknown'}`],
      latencyMs: Date.now() - started,
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
