import type { SfiCanonicalRef, SfiEpistemicClass } from './epistemic';

export const SFI_INSTRUMENT_CONTRACT = 'SFI-INSTRUMENT-CONTRACT-1.0' as const;

export type SfiInstrumentKind =
  | 'METHOD'
  | 'AI_MODEL'
  | 'LLM'
  | 'SIMULATION'
  | 'FORECAST'
  | 'GRAPH'
  | 'MULTIAGENT'
  | 'COGNITIVE_TWIN'
  | 'ORGANIZATIONAL_TWIN'
  | 'ASSURANCE_ENGINE'
  | 'HUMAN_REVIEW';

export type SfiInstrumentRunV1 = {
  id: string;
  instrumentId: string;
  instrumentKind: SfiInstrumentKind;
  instrumentVersion: string;
  caseId: string | null;
  inputRefs: SfiCanonicalRef[];
  contextRefs: SfiCanonicalRef[];
  outputRefs: SfiCanonicalRef[];
  outputEpistemicClass: SfiEpistemicClass;
  startedAt: string;
  completedAt: string | null;
  deterministic: boolean;
  reproducibilityRef?: SfiCanonicalRef | null;
  outputsBecomeEvidenceByInheritance: false;
  truthAuthority: false;
  executionAuthority: false;
};

export const SFI_INSTRUMENT_INVARIANTS = {
  aiIsInstrument: true,
  cognitiveTwinIsSpecializedInstrument: true,
  mihmIsGeneralSystemicFormalism: true,
  outputsBecomeEvidenceByInheritance: false,
  outputsBecomeTruthByInheritance: false,
  instrumentHasTruthAuthority: false,
  instrumentHasGovernanceAuthority: false,
  statement:
    'Methods, AI, LLMs, simulations, forecasts, graphs, multiagent systems, Cognitive Twins and assurance engines are instruments. Their outputs retain their own epistemic class until separately assessed.',
} as const;
