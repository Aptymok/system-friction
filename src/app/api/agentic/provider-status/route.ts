import { NextResponse } from 'next/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    providers: getLlmProviderStatus(),
    rule: 'Keys are detected server-side only and never returned.',
  });
}
