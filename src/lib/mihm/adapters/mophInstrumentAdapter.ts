import { normalizeMophMetrics } from '@/lib/moph/moph-math';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import { HOMEOSTATIC_SYMBOL_LABEL } from '@/lib/mihm/instrumentContract';
import { getMihmPhiDefinition } from '@/lib/mihm/phiContract';

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
  const definition = getMihmPhiDefinition('PHI_H');

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
      symbol: definition.symbol,
      label: HOMEOSTATIC_SYMBOL_LABEL[definition.symbol],
      value: metrics.phi,
      scale: definition.scale,
      semanticRole: definition.semanticRole,
      formulaRef: definition.formulaAuthority,
      formulaVersion: definition.formulaVersion,
      epistemicStatus: 'DERIVED',
    },
    confidence: null,
    trajectory: null,
    prediction: null,
    observedAt: input.observedAt ?? new Date().toISOString(),
    warnings: [],
  };
}
