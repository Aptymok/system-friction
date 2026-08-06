import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import { HOMEOSTATIC_SYMBOL_LABEL } from '@/lib/mihm/instrumentContract';
import { getMihmPhiDefinition } from '@/lib/mihm/phiContract';

export async function scoreFrictionToInstrumentState(
  precomputedRuntime?: Awaited<ReturnType<typeof buildDerivedMihmRuntime>>,
): Promise<MihmInstrumentState> {
  const runtime = precomputedRuntime ?? (await buildDerivedMihmRuntime());
  const hasReading = runtime.sourceState === 'derived';
  const definition = getMihmPhiDefinition('PHI_S');

  return {
    instrument: 'SCOREFRICTION',
    instrumentType: 'SYSTEMIC',
    objectId: runtime.contributingEvidence[0] ?? 'scorefriction:aggregate',
    variables: [
      { key: 'IHG', value: hasReading ? runtime.ihg : null, scale: '0-1' },
      { key: 'NTI', value: hasReading ? runtime.nti : null, scale: '0-1' },
      { key: 'LDI', value: hasReading ? runtime.ldi : null, scale: '0-1' },
      { key: 'XI', value: hasReading ? runtime.xi : null, scale: '0-1' },
      { key: 'F_S', value: hasReading ? runtime.fs : null, scale: '0-1' },
    ],
    homeostaticState: hasReading
      ? {
          symbol: definition.symbol,
          label: HOMEOSTATIC_SYMBOL_LABEL[definition.symbol],
          value: runtime.phi,
          scale: definition.scale,
          semanticRole: definition.semanticRole,
          formulaRef: definition.formulaAuthority,
          formulaVersion: runtime.formulaVersion,
          epistemicStatus: runtime.warnings.length > 1 ? 'DEGRADED' : 'DERIVED',
        }
      : null,
    confidence: typeof runtime.derivationConfidence === 'number' ? runtime.derivationConfidence : null,
    trajectory: null,
    prediction: null,
    observedAt: new Date().toISOString(),
    warnings: Array.isArray(runtime.warnings) ? runtime.warnings : [],
  };
}
