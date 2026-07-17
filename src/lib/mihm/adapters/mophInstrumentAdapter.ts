import { normalizeMophMetrics } from '@/lib/moph/moph-math';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import { HOMEOSTATIC_SYMBOL_LABEL } from '@/lib/mihm/instrumentContract';

export type MophSessionInput = {
  sessionId: string;
  ihg: number;
  nti: number;
  ldi: number;
  go: number;
  epsilon: number;
  observedAt?: string;
};

export function mophToInstrumentState(input: MophSessionInput): MihmInstrumentState {
  const metrics = normalizeMophMetrics(input);
  const symbol = 'PHI_PERSONAL';

  return {
    instrument: 'MOP-H',
    instrumentType: 'PERSONAL',
    objectId: input.sessionId,
    variables: [
      { key: 'IHG', value: metrics.ihg, scale: '0-1' },
      { key: 'NTI', value: metrics.nti, scale: '0-1' },
      { key: 'LDI', value: metrics.ldi, scale: '0-1' },
      { key: 'GO', value: metrics.go, scale: '0-1' },
      { key: 'EPSILON', value: metrics.epsilon, scale: '0-1' },
    ],
    homeostaticState: {
      symbol,
      label: HOMEOSTATIC_SYMBOL_LABEL[symbol],
      value: metrics.phi,
      formulaRef: 'src/lib/moph/moph-math.ts#calculateMophPhi',
    },
    confidence: null,
    trajectory: null,
    prediction: null,
    observedAt: input.observedAt ?? new Date().toISOString(),
    warnings: [],
  };
}
