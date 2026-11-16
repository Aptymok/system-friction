import { NextResponse } from 'next/server';
import { AccessDeniedError, requireSfiMember } from '@/lib/system/access/server';
import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = {'Cache-Control': 'no-store, private'};
function finite01(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

/** Authenticated, read-only SFI Studio context. No simulation, model calls or mutation. */
export async function GET() {
  try {
    const ctx = await requireSfiMember();
    const access = ctx.profile.module_access as Record<string, unknown> | null;
    if (access?.studio !== true) return NextResponse.json({ok:false,error:'STUDIO_ACCESS_REQUIRED'}, {status:403,headers});
    const [systemRead, worldRead] = await Promise.allSettled([
      buildDerivedMihmRuntime(),
      getWorldVectorToday(),
    ]);
    const system = systemRead.status === 'fulfilled' ? systemRead.value : null;
    const world = worldRead.status === 'fulfilled' ? worldRead.value : null;
    const systemUsable = system?.sourceState === 'derived';
    const observation = world?.observation ?? null;
    const domains = observation?.domain_values
      .filter(value => finite01(value.value) !== null)
      .map(value => ({
        domain: value.domain, value: finite01(value.value),
        confidence: finite01(value.confidence), sourceCount: value.source_count,
      })) ?? [];
    return NextResponse.json({
      ok: true, contextType: 'INDEPENDENT_INSTRUMENT_READINGS',
      measuredAt: new Date().toISOString(),
      system: {
        status: systemUsable ? 'DERIVED_FROM_PERSISTED_VECTORS' : 'NOT_OBSERVED',
        instrument: 'SCOREFRICTION',
        sourceOrigin: system?.sourceOrigin ?? null,
        formulaVersion: system?.formulaVersion ?? null,
        evidenceRefs: system?.contributingEvidence ?? [],
        values: {
          IHG: systemUsable ? finite01(system?.ihg) : null,
          NTI: systemUsable ? finite01(system?.nti) : null,
          LDI: systemUsable ? finite01(system?.ldi) : null,
          XI: systemUsable ? finite01(system?.xi) : null,
          PHI_S: systemUsable ? finite01(system?.phi) : null,
        },
        warnings: system?.warnings ?? ['SYSTEMIC_RUNTIME_UNAVAILABLE'],
      },
      world: {
        status: observation?.status ?? 'failed',
        sourceSnapshotId: observation?.source_snapshot_id ?? null,
        observedAt: observation?.observed_at ?? null,
        sector: observation?.sector ?? null,
        confidence: finite01(observation?.confidence),
        domains,
        interpretation: observation?.interpretation ?? 'Sin lectura del vector del mundo.',
        warnings: observation?.warnings ?? ['WORLD_VECTOR_UNAVAILABLE'],
        readProvenance: world?.read_provenance ?? null,
      },
      boundaries: [
        'Systemic metrics and world-domain values are separate instruments; their numeric scale does not establish commensurability.',
        'A document mentioning an indicator does not supply its measured value.',
        'A current world snapshot is contextual and not proof of an effect or causal link to uploaded documents.',
        'No file, observation, or model output is persisted or published by this read.',
      ],
    }, {headers});
  } catch (error) {
    if (error instanceof AccessDeniedError) return NextResponse.json({ok:false,error:error.code},{status:error.status,headers});
    return NextResponse.json({ok:false,error:'RESEARCH_CONTEXT_READ_FAILED'},{status:503,headers});
  }
}
