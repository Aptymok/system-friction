import { NextResponse } from 'next/server';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { latestRows } from '@/lib/operational/common';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { buildMihmRuntimeMatrix } from '@/observatory/field/catalog/mihmRuntimeMatrix';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [analyses, kernel, worldspect, graph] = await Promise.all([
    latestRows('mihm_analyses', 20),
    getLatestKernelCycle(),
    getLatestWorldSpectSnapshot(),
    readCanonicalGraphState('sfi'),
  ]);
  const runtime = buildMihmRuntimeMatrix({
    mihmAnalyses: analyses.data,
    kernel,
    worldspect: worldspect ? snapshotRowToApiData(worldspect) : null,
    graph,
  });
  return NextResponse.json({
    ok: true,
    data: {
      analyses: analyses.data,
      runtime,
      warnings: [analyses.error, ...runtime.warnings].filter(Boolean),
    },
  });
}
