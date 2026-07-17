import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import { HOMEOSTATIC_SYMBOL_LABEL } from '@/lib/mihm/instrumentContract';

export async function worldVectorToInstrumentState(): Promise<MihmInstrumentState> {
  const snapshot = await getLatestWorldSpectSnapshot();
  const symbol = 'PHI_WORLD';

  if (!snapshot) {
    return {
      instrument: 'WORLD_VECTOR',
      instrumentType: 'WORLD',
      objectId: 'worldspect:none',
      variables: [],
      homeostaticState: null,
      confidence: null,
      trajectory: null,
      prediction: null,
      observedAt: new Date().toISOString(),
      warnings: ['worldspect_snapshot_unavailable'],
    };
  }

  return {
    instrument: 'WORLD_VECTOR',
    instrumentType: 'WORLD',
    objectId: snapshot.id,
    variables: [
      { key: 'WSI', value: snapshot.wsi, scale: '0-1' },
      { key: 'NTI', value: snapshot.nti, scale: '0-1' },
    ],
    homeostaticState: {
      symbol,
      label: HOMEOSTATIC_SYMBOL_LABEL[symbol],
      value: snapshot.wsi,
      formulaRef: 'src/lib/worldspect/vector-aggregator.ts#aggregateWorldSpect',
    },
    confidence: snapshot.confidence,
    trajectory: null,
    prediction: null,
    observedAt: snapshot.observed_at,
    warnings: snapshot.degraded_sources.map((source) => `degraded_source:${source}`),
  };
}
