import type { SfiCanonicalRef } from '../contracts/sfi';
import {
  SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,
  type SfiSystemAiCaseObjectInput,
} from './systemAiAssurance';

export const SFI_AI_IMPACT_ASSESSMENT_CONTRACT = 'SFI-AI-IMPACT-ASSESSMENT-1.0' as const;

export type SfiAiImpactApplicability = 'CONTEXTUAL_REVIEW' | 'NOT_INDICATED' | 'UNDETERMINED';
export type SfiAiImpactControlStatus = 'PRESENT' | 'MISSING' | 'NOT_DECLARED';

export type SfiAiImpactAssessmentInput = {
  assessmentId: string;
  intendedPurpose: string;
  targetTypes: string[];
  subjectType: string;
  jurisdiction: string | null;
  dataCategories: string[];
  containsPersonalData: boolean | null;
  containsSensitiveData: boolean | null;
  affectedPersonsOrGroups: string[];
  affectsDecisionAboutPersons: boolean | null;
  decisionConsequence: string | null;
  declaredLegalBasis: string | null;
  declaredOrganizationalBasis: string | null;
  evidenceRefs: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  confidence?: number | null;
};

export const SFI_AI_IMPACT_COMMON_CONTROLS = [
  {
    controlId: 'PURPOSE_SCOPE',
    description: 'Declared intended purpose, target scope and bounded use.',
    isoIec42005: 'impact-assessment scope and intended-use context',
    euAiActFria: 'deployment/use context and affected fundamental-rights scope',
    gdprDpia: 'nature, scope, context and purposes of processing',
  },
  {
    controlId: 'DATA_GOVERNANCE',
    description: 'Declared data categories, sensitivity and provenance boundaries.',
    isoIec42005: 'data-related impact factors and affected stakeholders',
    euAiActFria: 'data/use conditions relevant to rights impact',
    gdprDpia: 'necessity, proportionality and risks arising from processing',
  },
  {
    controlId: 'AFFECTED_PERSONS',
    description: 'Affected persons or groups are explicitly identified where relevant.',
    isoIec42005: 'stakeholder and affected-party impact identification',
    euAiActFria: 'persons or groups potentially affected by deployment',
    gdprDpia: 'risks to rights and freedoms of natural persons',
  },
  {
    controlId: 'DECISION_CONSEQUENCE',
    description: 'Decision consequence and material effect are declared rather than inferred.',
    isoIec42005: 'impact severity and consequence characterization',
    euAiActFria: 'foreseeable impact on fundamental rights',
    gdprDpia: 'severity and likelihood of risks to data subjects',
  },
  {
    controlId: 'HUMAN_OVERSIGHT',
    description: 'Human authority and intervention boundary remain explicit.',
    isoIec42005: 'impact-treatment and governance controls',
    euAiActFria: 'human oversight and risk-mitigation measures',
    gdprDpia: 'measures and safeguards addressing identified risks',
  },
  {
    controlId: 'TRACEABILITY',
    description: 'Execution, evidence, inference, decision and action remain reconstructible.',
    isoIec42005: 'documented assessment inputs, outputs and treatment decisions',
    euAiActFria: 'documented assessment and mitigation trace',
    gdprDpia: 'documented assessment, safeguards and accountability evidence',
  },
  {
    controlId: 'CONTESTABILITY',
    description: 'Affected-party challenge, correction and escalation paths are identified when relevant.',
    isoIec42005: 'stakeholder impact treatment and review considerations',
    euAiActFria: 'rights-oriented mitigation and governance context',
    gdprDpia: 'safeguards and mechanisms protecting data-subject rights',
  },
  {
    controlId: 'MONITORING_RETURN',
    description: 'Observed RETURN and post-deployment effects remain distinct from projections.',
    isoIec42005: 'impact review and reassessment over the lifecycle',
    euAiActFria: 'ongoing deployment-context review where required',
    gdprDpia: 'review when processing risk changes',
  },
] as const;

function requireText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`SFI_AI_IMPACT_INVALID:${field}`);
  return normalized;
}

function ratioOrNull(value: number | null | undefined) {
  if (value === null || typeof value === 'undefined') return null;
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('SFI_AI_IMPACT_INVALID:confidence');
  return value;
}

function controlStatus(present: boolean | null): SfiAiImpactControlStatus {
  if (present === null) return 'NOT_DECLARED';
  return present ? 'PRESENT' : 'MISSING';
}

function contextualApplicability(input: SfiAiImpactAssessmentInput) {
  const subject = input.subjectType.toUpperCase();
  const personOrGroup = subject === 'PERSON' || subject === 'GROUP' || subject === 'MIXED';
  const euAiActFria: SfiAiImpactApplicability = input.affectsDecisionAboutPersons === true || personOrGroup
    ? 'CONTEXTUAL_REVIEW'
    : input.affectsDecisionAboutPersons === false && !personOrGroup
      ? 'NOT_INDICATED'
      : 'UNDETERMINED';
  const gdprDpia: SfiAiImpactApplicability = input.containsPersonalData === true || input.containsSensitiveData === true
    ? 'CONTEXTUAL_REVIEW'
    : input.containsPersonalData === false && input.containsSensitiveData === false
      ? 'NOT_INDICATED'
      : 'UNDETERMINED';
  return { euAiActFria, gdprDpia };
}

export function buildSfiAiImpactAssessment(input: SfiAiImpactAssessmentInput): SfiSystemAiCaseObjectInput {
  if (!input.evidenceRefs.length) throw new Error('SFI_AI_IMPACT_ASSESSMENT_REQUIRES_EVIDENCE');
  const intendedPurpose = requireText(input.intendedPurpose, 'intendedPurpose');
  if (!input.targetTypes.length) throw new Error('SFI_AI_IMPACT_INVALID:targetTypes');

  const applicability = contextualApplicability(input);
  const declaredBasisPresent = Boolean(input.declaredLegalBasis?.trim() || input.declaredOrganizationalBasis?.trim());
  const controlState = {
    PURPOSE_SCOPE: controlStatus(Boolean(intendedPurpose && input.targetTypes.length)),
    DATA_GOVERNANCE: controlStatus(input.containsPersonalData === null && input.containsSensitiveData === null ? null : input.dataCategories.length > 0),
    AFFECTED_PERSONS: controlStatus(input.affectedPersonsOrGroups.length > 0),
    DECISION_CONSEQUENCE: controlStatus(input.affectsDecisionAboutPersons === null ? null : input.affectsDecisionAboutPersons === false || Boolean(input.decisionConsequence?.trim())),
    HUMAN_OVERSIGHT: 'NOT_DECLARED' as const,
    TRACEABILITY: controlStatus(input.recordRefs ? input.recordRefs.length > 0 : null),
    CONTESTABILITY: 'NOT_DECLARED' as const,
    MONITORING_RETURN: 'NOT_DECLARED' as const,
    DECLARED_BASIS: controlStatus(declaredBasisPresent),
  };

  return {
    kind: 'EPISTEMIC_ASSESSMENT',
    epistemicRole: 'EPISTEMIC_ASSESSMENT',
    canonicalRef: {
      id: `ai-impact-assessment:${requireText(input.assessmentId, 'assessmentId')}`,
      version: SFI_AI_IMPACT_ASSESSMENT_CONTRACT,
      hash: null,
    },
    recordRefs: input.recordRefs ?? [],
    evidenceRefs: input.evidenceRefs,
    payload: {
      contract: SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,
      assessmentContract: SFI_AI_IMPACT_ASSESSMENT_CONTRACT,
      assessmentType: 'SFI_AI_IMPACT_ASSESSMENT',
      intendedPurpose,
      targetTypes: [...new Set(input.targetTypes)],
      subjectType: input.subjectType,
      jurisdiction: input.jurisdiction,
      dataCategories: [...new Set(input.dataCategories)],
      containsPersonalData: input.containsPersonalData,
      containsSensitiveData: input.containsSensitiveData,
      affectedPersonsOrGroups: [...new Set(input.affectedPersonsOrGroups)],
      affectsDecisionAboutPersons: input.affectsDecisionAboutPersons,
      decisionConsequence: input.decisionConsequence,
      declaredLegalBasis: input.declaredLegalBasis,
      declaredOrganizationalBasis: input.declaredOrganizationalBasis,
      confidence: ratioOrNull(input.confidence),
      commonControlCrosswalk: SFI_AI_IMPACT_COMMON_CONTROLS,
      controlState,
      frameworkMapping: {
        isoIec42005: {
          reference: 'ISO/IEC 42005:2025',
          role: 'INTERNAL_IMPACT_ASSESSMENT_REFERENCE',
          certificationClaimed: false,
        },
        euAiActFria: {
          reference: 'EU AI Act Article 27 FRIA',
          applicability: applicability.euAiActFria,
          legalApplicabilityClaimed: false,
        },
        gdprDpia: {
          reference: 'GDPR Article 35 DPIA',
          applicability: applicability.gdprDpia,
          legalApplicabilityClaimed: false,
        },
      },
      crosswalkEqualsCompliance: false,
      legalApplicabilityClaimed: false,
      certificationOrAccreditationClaimed: false,
      externalActionAuthorized: false,
    },
  };
}
