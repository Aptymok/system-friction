import { NextResponse } from 'next/server';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await readWorldSpectVectorSnapshot();
  const snapshot = result.snapshot;
  const vectors = snapshot.vectors;
  const degraded = new Set(snapshot.degradedSources ?? []);

  return NextResponse.json({
    ok: true,
    status: result.status === 'ACTIVE' ? 'real input' : 'degraded',
    world_regime: snapshot.regime,
    selected_vector: vectors[0]?.domain ?? null,
    direction: snapshot.nti > 0.6 ? 'tension rising' : snapshot.wsi > 0.55 ? 'consolidating' : 'low signal',
    degradation: vectors.reduce((sum, vector) => sum + vector.degradation, 0) / Math.max(1, vectors.length),
    weak_signals: vectors.filter((vector) => vector.persistence > 0 && vector.trust < 0.55),
    persistent_signals: vectors.filter((vector) => vector.persistence >= 0.45),
    source_health: vectors.map((vector) => {
      const health = vector.source_count > 0
        ? 'real input'
        : degraded.has(vector.domain)
          ? 'degraded'
          : result.status === 'ACTIVE'
            ? 'unavailable'
            : 'degraded';

      return {
        vector: vector.domain,
        health,
        source_count: vector.source_count,
        sources: vector.sources ?? [],
        reason: vector.source_count > 0
          ? null
          : degraded.has(vector.domain)
            ? 'domain adapters degraded'
            : 'no active source for domain',
      };
    }),
    snapshot,
    calculated_at: new Date().toISOString(),
  });
}
