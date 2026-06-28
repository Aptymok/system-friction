import { NextResponse } from 'next/server';
import { requireWorldVectorAgentActor } from '@/lib/world-vector/auth';
import { buildMediumSeed } from '@/lib/world-vector/publication/mediumSeed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shouldPersist = url.searchParams.get('persist') === 'true';

  if (shouldPersist) {
    const gate = await requireWorldVectorAgentActor('publication.medium_seed');
    if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  }

  const draft = await buildMediumSeed();

  return NextResponse.json({
    ok: true,
    mode: 'read_only',
    draft,
    persistence: shouldPersist
      ? { ok: false, blocked: true, reason: 'medium_seed_persistence_not_supported_by_world_vector_reports' }
      : { enabled: false, reason: 'read_only_default' },
  });
}
