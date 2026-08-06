import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import { HOMEOSTATIC_SYMBOL_LABEL } from '@/lib/mihm/instrumentContract';
import { getMihmPhiDefinition } from '@/lib/mihm/phiContract';

export async function worldVectorToInstrumentState(): Promise<MihmInstrumentState> {
  const snapshot = await getLatestWorldSpectSnapshot();
  const definition = getMihmPhiDefinition('PHI_W');

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
      symbol: definition.symbol,
      label: HOMEOSTATIC_SYMBOL_LABEL[definition.symbol],
      value: snapshot.wsi,
      scale: definition.scale,
      semanticRole: definition.semanticRole,
      formulaRef: definition.formulaAuthority,
      formulaVersion: definition.formulaVersion,
      epistemicStatus: snapshot.degraded_sources.length > 0 ? 'DEGRADED' : 'OBSERVED',
    },
    confidence: snapshot.confidence,
    trajectory: null,
    prediction: null,
    observedAt: snapshot.observed_at,
    warnings: [
      'phi_w_is_typed_wsi_alias',
      ...snapshot.degraded_sources.map((source) => `degraded_source:${source}`),
    ],
  };
}
