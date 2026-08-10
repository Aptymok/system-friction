import { NextResponse } from 'next/server';
import { getLlmProviderStatus, runLlmTask } from '@/lib/ai/providerRouter';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  const gate = await requireRootActor('llm.groq.health');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const configured = getLlmProviderStatus().find((provider) => provider.id === 'groq') ?? null;
  const probe = await runLlmTask({
    task: 'fast_classification',
    preferredProvider: 'groq',
    system: 'Return exactly GROQ_OK. No additional text.',
    prompt: 'health probe',
    fallbackResult: 'GROQ_UNAVAILABLE',
    maxTokens: 12,
  });

  const groqExecuted = probe.ok && probe.provider === 'groq';
  return NextResponse.json({
    ok: groqExecuted,
    configured: configured?.available === true,
    configuredModel: configured?.model ?? null,
    executedProvider: probe.provider,
    executedModel: probe.model,
    result: probe.result,
    warnings: probe.warnings,
    latencyMs: probe.latency_ms,
  }, { status: groqExecuted ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
