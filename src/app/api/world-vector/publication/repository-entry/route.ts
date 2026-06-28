import { NextResponse } from 'next/server';
import { requireWorldVectorAgentActor } from '@/lib/world-vector/auth';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';
import { buildWorldVectorPublicReport } from '@/lib/world-vector/reportBuilder';
import { persistWorldVectorReport } from '@/lib/world-vector/persistence';
import { buildRepositoryArchiveEntry } from '@/lib/world-vector/publication/repositoryArchive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shouldPersist = url.searchParams.get('persist') === 'true';
  const shouldCommit = url.searchParams.get('commit') === 'true';

  if (shouldPersist || shouldCommit) {
    const gate = await requireWorldVectorAgentActor('publication.repository_entry');
    if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  }

  const draft = await buildRepositoryArchiveEntry();
  const today = await getWorldVectorToday();
  const publicReport = buildWorldVectorPublicReport({ observation: today.observation, cycleRange: today.cycle_range });
  const report = {
    ...publicReport,
    title: draft.title,
    body: draft.body,
    target_audience: 'repository' as const,
  };
  const persistence = shouldPersist
    ? await persistWorldVectorReport({ report, cycleRange: today.cycle_range, observation: today.observation })
    : { enabled: false as const, reason: 'read_only_default' };

  return NextResponse.json({
    ok: true,
    mode: 'read_only',
    draft,
    persistence,
    repository_commit: shouldCommit
      ? { ok: false, blocked: true, reason: 'repository_commit_requires_explicit_separate_approval' }
      : { ok: false, blocked: true, reason: 'not_requested' },
  });
}
