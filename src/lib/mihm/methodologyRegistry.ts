import type { MihmInstrumentType } from './instrumentContract';
import type { MihmMethodId, MihmObservationSubject, MihmTemporalScope } from './methodSelectionContract';

export type MihmMethodDefinition = {
  id: MihmMethodId;
  label: string;
  instrument: string;
  instrumentType: MihmInstrumentType;
  homeostaticSymbol: 'PHI_PERSONAL' | 'PHI_SYSTEMIC' | 'PHI_PHENOMENOLOGICAL' | 'PHI_WORLD';
  purpose: string;
  validSubjects: MihmObservationSubject[];
  validTemporalScopes: MihmTemporalScope[];
  primaryInputs: string[];
  outputs: string[];
  exclusions: string[];
  formulaAuthority: string;
};

export const MIHM_METHOD_REGISTRY: Record<MihmMethodId, MihmMethodDefinition> = {
  MOP_H: {
    id: 'MOP_H',
    label: 'MOP-H',
    instrument: 'MOP-H',
    instrumentType: 'PERSONAL',
    homeostaticSymbol: 'PHI_PERSONAL',
    purpose: 'Observar el estado de una persona dentro de una sesión identificada y permitir contraste antes/después.',
    validSubjects: ['PERSON', 'SESSION'],
    validTemporalScopes: ['SESSION', 'POINT_IN_TIME', 'BOUNDED_WINDOW'],
    primaryInputs: ['sessionId', 'IHG', 'NTI', 'LDI', 'GO', 'EPSILON'],
    outputs: ['PHI_PERSONAL', 'personal_session_state', 'before_after_comparison'],
    exclusions: ['No representa el estado institucional, mundial, organizacional ni de un artefacto.'],
    formulaAuthority: 'src/lib/moph/moph-math.ts#calculateMophPhi',
  },
  SCOREFRICTION: {
    id: 'SCOREFRICTION',
    label: 'ScoreFriction',
    instrument: 'SCOREFRICTION',
    instrumentType: 'SYSTEMIC',
    homeostaticSymbol: 'PHI_SYSTEMIC',
    purpose: 'Medir fricción formal, estructural, semántica, memética o de continuidad en un objeto delimitado.',
    validSubjects: ['OBJECT', 'SIGNAL', 'ARTIFACT'],
    validTemporalScopes: ['POINT_IN_TIME', 'BOUNDED_WINDOW'],
    primaryInputs: ['subjectId', 'evidenceModalities', 'feature_vectors'],
    outputs: ['IHG', 'NTI', 'LDI', 'XI', 'PHI_SYSTEMIC', 'F_S', 'object_vector'],
    exclusions: ['No sustituye un caso longitudinal ni describe por sí solo una organización completa.'],
    formulaAuthority: 'src/lib/sfi/math.ts#evaluateSfi',
  },
  WORLD_VECTOR: {
    id: 'WORLD_VECTOR',
    label: 'World Vector / WorldSpect',
    instrument: 'WORLD_VECTOR',
    instrumentType: 'WORLD',
    homeostaticSymbol: 'PHI_WORLD',
    purpose: 'Observar el contexto exterior multidominio y su presión sobre casos, fenómenos y decisiones.',
    validSubjects: ['WORLD_CONTEXT'],
    validTemporalScopes: ['CURRENT_WORLD_STATE', 'BOUNDED_WINDOW', 'LONGITUDINAL'],
    primaryInputs: ['worldspect_sources', 'domain_breakdown', 'observed_at', 'source_freshness'],
    outputs: ['WSI', 'NTI', 'PHI_WORLD', 'dominant_signal', 'source_health', 'world_trajectory'],
    exclusions: ['No atribuye causalidad a una persona u organización y no resuelve una hipótesis de caso.'],
    formulaAuthority: 'src/lib/worldspect/vector-aggregator.ts#aggregateWorldSpect',
  },
  PPOI: {
    id: 'PPOI',
    label: 'PPOI',
    instrument: 'PPOI',
    instrumentType: 'PHENOMENOLOGICAL',
    homeostaticSymbol: 'PHI_PHENOMENOLOGICAL',
    purpose: 'Mantener y recalibrar un fenómeno o caso longitudinal con evidencia acumulada, trayectoria e hipótesis rival.',
    validSubjects: ['PHENOMENON', 'CASE', 'ORGANIZATION'],
    validTemporalScopes: ['LONGITUDINAL', 'BOUNDED_WINDOW'],
    primaryInputs: ['phenomenonId_or_creation', 'evidence', 'observed_at', 'ownerId'],
    outputs: ['phenomenon_composite', 'trajectory', 'current_hypothesis', 'rival_hypothesis', 'evidence_span'],
    exclusions: ['No debe abrirse para una lectura puntual que puede resolverse con MOP-H o ScoreFriction.'],
    formulaAuthority: 'src/lib/ppoi/calibration.ts#calculatePpoiIndices',
  },
  SFI_INSTITUTIONAL: {
    id: 'SFI_INSTITUTIONAL',
    label: 'SFI Institutional State',
    instrument: 'SFI_MATH_CORE',
    instrumentType: 'SYSTEMIC',
    homeostaticSymbol: 'PHI_SYSTEMIC',
    purpose: 'Observar la capacidad de SFI para cerrar longitudinalmente observación, decisión, ejecución, resultado y memoria.',
    validSubjects: ['SFI_SYSTEM'],
    validTemporalScopes: ['POINT_IN_TIME', 'BOUNDED_WINDOW', 'LONGITUDINAL'],
    primaryInputs: ['institutional_IHG', 'institutional_NTI', 'institutional_LDI', 'institutional_XI'],
    outputs: ['PHI_SF', 'F_S', 'regime', 'reality_debt', 'execution_closure'],
    exclusions: ['No es promedio de PHI_PERSONAL, PHI_WORLD, PHI_SYSTEMIC y PHI_PHENOMENOLOGICAL.'],
    formulaAuthority: 'src/lib/sfi/math.ts#evaluateSfi',
  },
};

export function getMihmMethodDefinition(id: MihmMethodId): MihmMethodDefinition {
  return MIHM_METHOD_REGISTRY[id];
}
