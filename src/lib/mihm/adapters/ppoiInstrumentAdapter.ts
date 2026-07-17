import { getPhenomenonState } from '@/lib/ppoi/ppoiService';
import type { MihmInstrumentState, MihmTrajectoryDirection } from '@/lib/mihm/instrumentContract';
import { HOMEOSTATIC_SYMBOL_LABEL } from '@/lib/mihm/instrumentContract';

const KNOWN_DIRECTIONS = new Set<MihmTrajectoryDirection>([
  'DEEPENING',
  'EXPANSION',
  'FRAGMENTATION',
  'CONVERGENCE',
  'INSTITUTIONALIZATION',
  'DEGRADATION',
  'ABSTRACTION',
  'OPERATIONALIZATION',
]);

function asDirection(value: unknown): MihmTrajectoryDirection | null {
  return typeof value === 'string' && KNOWN_DIRECTIONS.has(value as MihmTrajectoryDirection)
    ? (value as MihmTrajectoryDirection)
    : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function ppoiToInstrumentState(ownerId: string, phenomenonId: string): Promise<MihmInstrumentState> {
  const state = await getPhenomenonState(ownerId, phenomenonId);
  const phenomenon = state.phenomenon;
  const indices = record(phenomenon.current_indices);
  const composite = typeof phenomenon.current_composite === 'number' ? phenomenon.current_composite : null;
  const hypothesis = state.currentHypothesis ? record(state.currentHypothesis) : null;
  const symbol = 'PHI_PHENOMENOLOGICAL';

  return {
    instrument: 'PPOI',
    instrumentType: 'PHENOMENOLOGICAL',
    objectId: typeof phenomenon.fp_code === 'string' ? phenomenon.fp_code : String(phenomenon.id ?? phenomenonId),
    variables: Object.entries(indices).map(([key, value]) => ({
      key,
      value: typeof value === 'number' ? value : null,
      scale: '0-5',
    })),
    homeostaticState: composite !== null
      ? {
          symbol,
          label: HOMEOSTATIC_SYMBOL_LABEL[symbol],
          value: composite,
          formulaRef: 'src/lib/ppoi/calibration.ts#calculatePpoiIndices',
        }
      : null,
    confidence: null,
    trajectory: hypothesis ? { direction: asDirection(hypothesis.direction), confidence: null } : null,
    prediction: null,
    observedAt: typeof phenomenon.indices_calculated_at === 'string'
      ? phenomenon.indices_calculated_at
      : new Date().toISOString(),
    warnings: composite === null ? ['ppoi_no_evidence_yet'] : [],
  };
}
