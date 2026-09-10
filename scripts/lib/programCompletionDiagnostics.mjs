export const SFI_PROGRAM_COMPLETION_DIAGNOSTICS_CONTRACT = 'SFI-PROGRAM-COMPLETION-DIAGNOSTICS-1.0';

export const COMPLETION_DIAGNOSTIC_STATES = Object.freeze([
  'CERTIFIED',
  'IMPLEMENTATION_INCOMPLETE_OR_UNPROVEN',
  'IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED',
  'PRODUCTION_RETURN_PENDING',
  'EXTERNAL_ACTION_PENDING',
  'SUPERSEDED',
]);

const EXTERNAL_PATTERN = /(external-only|external action|registry submission|directory submission|account ownership|platform acceptance|LinkedIn|Medium|YouTube|Bluesky|Mastodon|Hugging Face|Zenodo|ORCID|ROR|ResearchGate|Postman|OSF)/i;
const PRODUCTION_PATTERN = /(observed[_ -]?in[_ -]?production|production return|production verification|production proof|production observation|required deployment|\bdeployed\b|\bdeployment\b)/i;

function evidenceCount(requirement) {
  return Array.isArray(requirement?.evidence) ? requirement.evidence.filter(Boolean).length : 0;
}

export function completionDiagnosticFor(requirement) {
  const status = String(requirement?.status || '');
  const text = `${requirement?.source ?? ''} ${requirement?.requirement ?? ''} ${requirement?.returnCondition ?? ''}`;
  const repositoryEvidenceCount = evidenceCount(requirement);

  if (status === 'SATISFIED') {
    return {
      state: 'CERTIFIED',
      basis: 'VERIFIED_COMPLETION_RECEIPT',
      repositoryEvidenceCount,
      needsImplementationInspection: false,
      needsCompletionReceipt: false,
      needsProductionReturn: false,
      needsExternalAction: false,
      authoritative: false,
    };
  }

  if (status === 'SUPERSEDED_BY_AUTHORIZED_DECISION') {
    return {
      state: 'SUPERSEDED',
      basis: 'AUTHORIZED_SUPERSESSION',
      repositoryEvidenceCount,
      needsImplementationInspection: false,
      needsCompletionReceipt: false,
      needsProductionReturn: false,
      needsExternalAction: false,
      authoritative: false,
    };
  }

  if (status === 'EXTERNAL_ACTION' || EXTERNAL_PATTERN.test(text)) {
    return {
      state: 'EXTERNAL_ACTION_PENDING',
      basis: status === 'EXTERNAL_ACTION' ? 'CANONICAL_EXTERNAL_ACTION' : 'EXTERNAL_PLATFORM_OR_IDENTITY_REQUIREMENT',
      repositoryEvidenceCount,
      needsImplementationInspection: false,
      needsCompletionReceipt: status !== 'EXTERNAL_ACTION',
      needsProductionReturn: false,
      needsExternalAction: true,
      authoritative: false,
    };
  }

  if (PRODUCTION_PATTERN.test(text) && repositoryEvidenceCount > 0) {
    return {
      state: 'PRODUCTION_RETURN_PENDING',
      basis: 'IMPLEMENTATION_EVIDENCE_PRESENT_AND_PRODUCTION_OR_RETURN_EXPLICIT',
      repositoryEvidenceCount,
      needsImplementationInspection: false,
      needsCompletionReceipt: true,
      needsProductionReturn: true,
      needsExternalAction: false,
      authoritative: false,
    };
  }

  if (repositoryEvidenceCount > 0) {
    return {
      state: 'IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED',
      basis: 'REPOSITORY_EVIDENCE_PRESENT_BUT_NO_VALID_RETURN_PASS_RECEIPT',
      repositoryEvidenceCount,
      needsImplementationInspection: true,
      needsCompletionReceipt: true,
      needsProductionReturn: false,
      needsExternalAction: false,
      authoritative: false,
    };
  }

  return {
    state: 'IMPLEMENTATION_INCOMPLETE_OR_UNPROVEN',
    basis: 'NO_REPOSITORY_IMPLEMENTATION_EVIDENCE_CLASSIFIED_BY_CONTROLLER',
    repositoryEvidenceCount: 0,
    needsImplementationInspection: true,
    needsCompletionReceipt: true,
    needsProductionReturn: false,
    needsExternalAction: false,
    authoritative: false,
  };
}

export function enrichCompletionDiagnostics(report) {
  const requirements = Array.isArray(report?.requirements) ? report.requirements : [];
  for (const requirement of requirements) requirement.diagnostic = completionDiagnosticFor(requirement);

  const counts = Object.fromEntries(COMPLETION_DIAGNOSTIC_STATES.map((state) => [
    state,
    requirements.filter((requirement) => requirement.diagnostic?.state === state).length,
  ]));

  return {
    ...report,
    diagnosticContract: SFI_PROGRAM_COMPLETION_DIAGNOSTICS_CONTRACT,
    diagnosticAuthority: 'NON_AUTHORITATIVE_SEQUENCING_AID',
    diagnosticRule: 'Diagnostic lanes never change canonical disposition and never promote SATISFIED. Repository evidence is a routing clue, not completion proof.',
    diagnosticCounts: counts,
    requirements,
  };
}
