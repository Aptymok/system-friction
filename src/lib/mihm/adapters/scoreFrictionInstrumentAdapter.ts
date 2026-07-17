import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import { HOMEOSTATIC_SYMBOL_LABEL } from '@/lib/mihm/instrumentContract';

export async function scoreFrictionToInstrumentState(
  precomputedRuntime?: Awaited<ReturnType<typeof buildDerivedMihmRuntime>>,
): Promise<MihmInstrumentState> {
  const runtime = precomputedRuntime ?? (await buildDerivedMihmRuntime());
  const hasReading = runtime.sourceState === 'derived';
  const symbol = 'PHI_SYSTEMIC';

  return {
    instrument: 'SCOREFRICTION',
    instrumentType: 'SYSTEMIC',
    objectId: runtime.contributingEvidence[0] ?? 'scorefriction:aggregate',
    variables: [
      { key: 'IHG', value: hasReading ? runtime.ihg : null, scale: '0-1' },
      { key: 'NTI', value: hasReading ? runtime.nti : null, scale: '0-1' },
      { key: 'LDI', value: hasReading ? runtime.ldi : null, scale: '0-1' },
      { key: 'Fs', value: hasReading ? runtime.fs : null, scale: '0-1' },
    ],
    homeostaticState: hasReading
      ? {
          symbol,
          label: HOMEOSTATIC_SYMBOL_LABEL[symbol],
          value: runtime.phi,
          formulaRef: 'src/lib/evaluator/derivedMihmRuntime.ts#deriveOne',
        }
      : null,
    confidence: typeof runtime.derivationConfidence === 'number' ? runtime.derivationConfidence : null,
    trajectory: null,
    prediction: null,
    observedAt: new Date().toISOString(),
    warnings: Array.isArray(runtime.warnings) ? runtime.warnings : [],
  };
}
