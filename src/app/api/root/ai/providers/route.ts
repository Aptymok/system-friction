import { NextResponse } from 'next/server';

import { getLlmProviderStatus, probeLlmProviders, type LlmProviderId } from '@/lib/ai/providerRouter';
import { requireRootActor, requireRootViewer } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const PROVIDERS = new Set<Exclude<LlmProviderId, 'degraded'>>(['openai', 'anthropic', 'gemini', 'groq', 'ollama', 'huggingface']);

export async function GET() {
  const gate = await requireRootViewer('root.ai.providers.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    providers: getLlmProviderStatus(),
    healthBoundary: 'CONFIGURED means credentials/config are present. HEALTHY requires an observed successful call in the active runtime process. UNTESTED is not failure. available is retained only for backward compatibility and is not a canary result.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.ai.providers.canary');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const requested = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : '';
  if (requested && !PROVIDERS.has(requested as Exclude<LlmProviderId, 'degraded'>)) {
    return NextResponse.json({ ok: false, error: 'unsupported_provider', supported: [...PROVIDERS] }, { status: 400 });
  }
  const result = await probeLlmProviders({
    provider: requested ? requested as Exclude<LlmProviderId, 'degraded'> : undefined,
    includeAllModels: body.include_all_models === true,
  });
  return NextResponse.json({
    ...result,
    authority: 'ROOT',
    sideEffects: 'Provider canary only; no proposal authorization, external business action or canonical promotion.',
  }, { status: result.ok ? 200 : 207 });
}
