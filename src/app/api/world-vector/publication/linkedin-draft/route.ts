import { NextResponse } from 'next/server';
import { requireWorldVectorAgentActor } from '@/lib/world-vector/auth';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';
import { buildWorldVectorPublicReport } from '@/lib/world-vector/reportBuilder';
import { persistWorldVectorReport } from '@/lib/world-vector/persistence';
import { buildLinkedInDraft } from '@/lib/world-vector/publication/linkedinDraft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shouldPersist = url.searchParams.get('persist') === 'true';

  if (shouldPersist) {
    const gate = await requireWorldVectorAgentActor('publication.linkedin_draft');
    if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  }

  const draft = await buildLinkedInDraft();
  const today = await getWorldVectorToday();
  const report = buildWorldVectorPublicReport({ observation: today.observation, cycleRange: today.cycle_range });
  const persistence = shouldPersist
    ? await persistWorldVectorReport({ report, cycleRange: today.cycle_range, observation: today.observation })
    : { enabled: false as const, reason: 'read_only_default' };

  return NextResponse.json({
    ok: true,
    mode: 'read_only',
    draft,
    persistence,
  });
}
