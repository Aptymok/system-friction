import type { MihmInstrumentType } from './instrumentContract';
import type { MihmPhiSymbol } from './phiContract';
import type { MihmMethodId, MihmObservationSubject, MihmTemporalScope } from './methodSelectionContract';

export type MihmMethodDefinition = {
  id: MihmMethodId;
  label: string;
  instrument: string;
  instrumentType: MihmInstrumentType;
  homeostaticSymbol: MihmPhiSymbol;
  dimension: string;
  purpose: string;
  validSubjects: MihmObservationSubject[];
  validTemporalScopes: MihmTemporalScope[];
  primaryInputs: string[];
  outputs: string[];
  exclusions: string[];
  answers: string[];
  assumptions: string[];
  failureModes: string[];
  falsificationOrContrast: string[];
  computationalCost: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTERNAL';
  epistemicOutput: 'OBSERVED' | 'DERIVED' | 'INFERRED' | 'SIMULATED';
  formulaAuthority: string;
  formulaVersion: string;
};

export const MIHM_METHOD_REGISTRY: Record<MihmMethodId, MihmMethodDefinition> = {
  MOP_H: {
    id: 'MOP_H',
    label: 'MOP-H',
    instrument: 'MOP-H',
    instrumentType: 'PERSONAL',
    homeostaticSymbol: 'PHI_H',
    dimension: 'human_session',
    purpose: 'Observar el estado de una persona dentro de una sesión identificada y permitir contraste antes/después.',
    validSubjects: ['PERSON', 'SESSION'],
    validTemporalScopes: ['SESSION', 'POINT_IN_TIME', 'BOUNDED_WINDOW'],
    primaryInputs: ['sessionId', 'IHG', 'NTI', 'LDI', 'GO', 'EPSILON'],
    outputs: ['PHI_H', 'personal_session_state', 'before_after_comparison'],
    exclusions: [
      'No representa el estado institucional, mundial, organizacional ni de un artefacto.',
      'PHI_H no se promedia con otros índices Phi.',
    ],
    answers: ['What changed within an identified human session under the declared MOP-H measurements?'],
    assumptions: ['A session identity is stable enough for within-session comparison.', 'Required MOP-H inputs are observed or explicitly declared rather than imputed.'],
    failureModes: ['Missing session identity.', 'Pre/post measurements are not comparable.', 'Inputs are inferred or imputed without provenance.'],
    falsificationOrContrast: ['Compare the bounded before/after session observations; preserve disagreement instead of averaging it away.'],
    computationalCost: 'LOW',
    epistemicOutput: 'DERIVED',
    formulaAuthority: 'src/lib/moph/moph-math.ts#calculateMophPhi',
    formulaVersion: '2026-08-06.phi-h.v1',
  },
  SCOREFRICTION: {
    id: 'SCOREFRICTION',
    label: 'ScoreFriction',
    instrument: 'SCOREFRICTION',
    instrumentType: 'SYSTEMIC',
    homeostaticSymbol: 'PHI_S',
    dimension: 'bounded_system_or_object',
    purpose: 'Medir continuidad y fricción formal, estructural, semántica, memética o longitudinal en un objeto delimitado.',
    validSubjects: ['OBJECT', 'SIGNAL', 'ARTIFACT'],
    validTemporalScopes: ['POINT_IN_TIME', 'BOUNDED_WINDOW'],
    primaryInputs: ['subjectId', 'evidenceModalities', 'feature_vectors'],
    outputs: ['IHG', 'NTI', 'LDI', 'XI', 'PHI_S', 'F_S', 'object_vector'],
    exclusions: [
      'No sustituye un caso longitudinal ni describe por sí solo una organización completa.',
      'PHI_S no representa el estado institucional de SFI.',
    ],
    answers: ['What bounded formal, structural, semantic, memetic or longitudinal friction is measurable in this identified object?'],
    assumptions: ['The object boundary and feature provenance are explicit.', 'Compared feature vectors are commensurable at the declared resolution.'],
    failureModes: ['Object identity drift.', 'Feature vectors come from incompatible resolutions.', 'Missing provenance for compared measurements.'],
    falsificationOrContrast: ['Recompute from the same bounded evidence under the declared formula and compare against an independently observed object state.'],
    computationalCost: 'MEDIUM',
    epistemicOutput: 'DERIVED',
    formulaAuthority: 'src/lib/sfi/math.ts#evaluateSfi',
    formulaVersion: '2026-08-06.phi-s.v2',
  },
  WORLD_VECTOR: {
    id: 'WORLD_VECTOR',
    label: 'World Vector / WorldSpect',
    instrument: 'WORLD_VECTOR',
    instrumentType: 'WORLD',
    homeostaticSymbol: 'PHI_W',
    dimension: 'world_context',
    purpose: 'Observar el contexto exterior multidominio y su presión sobre casos, fenómenos y decisiones.',
    validSubjects: ['WORLD_CONTEXT'],
    validTemporalScopes: ['CURRENT_WORLD_STATE', 'BOUNDED_WINDOW', 'LONGITUDINAL'],
    primaryInputs: ['worldspect_sources', 'domain_breakdown', 'observed_at', 'source_freshness'],
    outputs: ['WSI', 'NTI', 'PHI_W', 'dominant_signal', 'source_health', 'world_trajectory'],
    exclusions: [
      'No atribuye causalidad a una persona u organización y no resuelve una hipótesis de caso.',
      'PHI_W es contexto mundial y no se promedia con PHI_SFI.',
    ],
    answers: ['What externally observed multidomain state and pressure are present at the declared observation time?'],
    assumptions: ['Sources are time-bounded and their provenance/freshness is available.', 'Domain aggregation does not imply causal attribution.'],
    failureModes: ['Stale or missing source observations.', 'Cross-domain aggregation hides incompatible temporal windows.', 'Context is mistaken for case causality.'],
    falsificationOrContrast: ['Reobserve the same declared domains at a later comparable window and contrast the vector without backdating knowledge.'],
    computationalCost: 'MEDIUM',
    epistemicOutput: 'DERIVED',
    formulaAuthority: 'src/lib/worldspect/vector-aggregator.ts#aggregateWorldSpect',
    formulaVersion: '2026-08-06.phi-w.wsi-alias.v1',
  },
  PPOI: {
    id: 'PPOI',
    label: 'PPOI',
    instrument: 'PPOI',
    instrumentType: 'PHENOMENOLOGICAL',
    homeostaticSymbol: 'PHI_F',
    dimension: 'longitudinal_phenomenon',
    purpose: 'Mantener y recalibrar un fenómeno o caso longitudinal con evidencia acumulada, trayectoria e hipótesis rival.',
    validSubjects: ['PHENOMENON', 'CASE', 'ORGANIZATION'],
    validTemporalScopes: ['LONGITUDINAL', 'BOUNDED_WINDOW'],
    primaryInputs: ['phenomenonId_or_creation', 'evidence', 'observed_at', 'ownerId'],
    outputs: ['PPOI_COMPOSITE_0_5', 'PHI_F', 'trajectory', 'current_hypothesis', 'rival_hypothesis', 'evidence_span'],
    exclusions: [
      'No debe abrirse para una lectura puntual que puede resolverse con MOP-H o ScoreFriction.',
      'El compuesto PPOI 0-5 debe normalizarse antes de representarse como PHI_F.',
    ],
    answers: ['How does a bounded phenomenon or case change longitudinally under accumulated evidence and rival hypotheses?'],
    assumptions: ['Phenomenon/case identity is reconstructable across observations.', 'Observation times and evidence lineage are preserved.'],
    failureModes: ['Identity drift across the longitudinal record.', 'Later knowledge overwrites what was known earlier.', 'A repeated pattern is promoted to attractor or cause without contrast.'],
    falsificationOrContrast: ['Freeze primary/rival hypotheses and acquire an independent discriminating observation or RETURN before recalibration.'],
    computationalCost: 'MEDIUM',
    epistemicOutput: 'INFERRED',
    formulaAuthority: 'src/lib/mihm/phiContract.ts#normalizePpoiComposite',
    formulaVersion: '2026-08-06.phi-f.v1',
  },
  SFI_INSTITUTIONAL: {
    id: 'SFI_INSTITUTIONAL',
    label: 'SFI Institutional State',
    instrument: 'SFI_INSTITUTIONAL',
    instrumentType: 'INSTITUTIONAL',
    homeostaticSymbol: 'PHI_SFI',
    dimension: 'sfi_institution',
    purpose: 'Observar la capacidad de SFI para cerrar longitudinalmente observación, decisión, ejecución, resultado y memoria.',
    validSubjects: ['SFI_SYSTEM'],
    validTemporalScopes: ['POINT_IN_TIME', 'BOUNDED_WINDOW', 'LONGITUDINAL'],
    primaryInputs: ['institutional_IHG', 'institutional_NTI', 'institutional_LDI', 'institutional_XI'],
    outputs: ['PHI_SFI', 'F_S', 'regime', 'reality_debt', 'execution_closure'],
    exclusions: [
      'No es promedio ni sustitución de PHI_H, PHI_S, PHI_F o PHI_W.',
      'Sólo puede existir para un snapshot institucional identificado y trazable.',
    ],
    answers: ['Can SFI reconstruct and close its own observation-decision-execution-RETURN-memory cycle at the declared institutional snapshot?'],
    assumptions: ['Institutional events, authority and RETURN lineage are persisted.', 'Snapshot boundaries are explicit.'],
    failureModes: ['Execution response is mistaken for persisted state.', 'Closure exists without verified RETURN.', 'Learning is promoted without ROOT governance.'],
    falsificationOrContrast: ['Replay the institutional cycle from persisted events and verify that the same closure/RETURN boundary is reconstructable.'],
    computationalCost: 'MEDIUM',
    epistemicOutput: 'DERIVED',
    formulaAuthority: 'src/lib/sfi/math.ts#evaluateSfi',
    formulaVersion: '2026-08-06.phi-sfi.v1',
  },
};

export function getMihmMethodDefinition(id: MihmMethodId): MihmMethodDefinition {
  return MIHM_METHOD_REGISTRY[id];
}
