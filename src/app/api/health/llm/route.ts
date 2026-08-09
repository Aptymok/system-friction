import { NextResponse } from 'next/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = getLlmProviderStatus().map((provider) => ({
    id: provider.id,
    available: provider.available,
    model: provider.model,
    role: provider.role,
  }));
  const available = providers.filter((provider) => provider.available);
  return NextResponse.json({
    ok: available.length > 0,
    status: available.length > 0 ? 'CONFIGURED' : 'NO_PROVIDER_CONFIGURED',
    preferred: available.find((provider) => provider.id === 'groq')?.id ?? available[0]?.id ?? null,
    availableProviders: available.map((provider) => provider.id),
    providers,
    note: 'This endpoint reports configuration presence only. It never exposes credentials and does not claim live provider reachability.',
    checkedAt: new Date().toISOString(),
  }, { status: available.length > 0 ? 200 : 503 });
}
