import {
  SFI_REPORT_CONTRACT,
  type SfiReportClaimV1,
  type SfiRenderedReportClaimV1,
  type SfiReportDeliveryFormat,
  type SfiReportV1,
  type SfiCaseV1,
} from '../contracts/sfi';
import { validateSfiCaseV1 } from './caseEngine';

export type AssembleSfiReportV1Input = {
  id: string;
  version?: string;
  caseRecord: SfiCaseV1;
  generatedAt: string;
  claims?: SfiReportClaimV1[];
  deliveryFormats?: SfiReportDeliveryFormat[];
  limitations?: string[];
};

function renderClaim(claim: SfiReportClaimV1): SfiRenderedReportClaimV1 {
  if (claim.lineage) return { ...claim, lineage: claim.lineage };
  return {
    ...claim,
    lineage: {
      executionRef: null,
      outputRelation: 'NOT_EXECUTED',
      support: claim.determinability === 'UNDETERMINED' ? 'INSUFFICIENT' : 'UNSUPPORTED',
      contradictionRefs: [],
      refutationConditions: [],
    },
  };
}

export function assembleSfiReportV1(input: AssembleSfiReportV1Input): SfiReportV1 {
  const caseViolations = validateSfiCaseV1(input.caseRecord);
  if (caseViolations.length) {
    throw new Error(`SFI_REPORT_INVALID_CASE:${caseViolations.join(',')}`);
  }

  const deliveryFormats = input.deliveryFormats ?? ['JSON'];
  if (deliveryFormats.length === 0) throw new Error('SFI_REPORT_DELIVERY_REQUIRED');

  const sourceClaims = input.claims ?? [];
  const claims = sourceClaims.map(renderClaim);
  const missingExecutionLineage = sourceClaims.some((claim) => !claim.lineage);
  const limitations = [
    ...(input.limitations ?? []),
    ...(missingExecutionLineage
      ? ['Claims without observed execution lineage are rendered UNSUPPORTED or INSUFFICIENT; evidence references alone do not establish execution provenance.']
      : []),
  ];

  return {
    contract: SFI_REPORT_CONTRACT,
    id: input.id,
    version: input.version ?? '1.0',
    caseId: input.caseRecord.id,
    generatedAt: input.generatedAt,
    systemBoundaryRef: input.caseRecord.systemBoundaryRef,
    observationRefs: input.caseRecord.observationRefs,
    systemModelRefs: input.caseRecord.systemModelRefs,
    frictionRefs: input.caseRecord.frictionRefs,
    trajectoryRefs: input.caseRecord.trajectoryRefs,
    hypothesisRefs: input.caseRecord.hypothesisRefs,
    contradictionRefs: input.caseRecord.uncertainty.contradictionRefs,
    recommendationRefs: input.caseRecord.recommendationRefs,
    interventionRefs: input.caseRecord.interventionRefs,
    returnRefs: input.caseRecord.returnRefs,
    claims,
    limitations,
    deliveryFormats,
    executionAuthority: false,
    governanceDecisionRefs: input.caseRecord.governance.governanceDecisionRefs,
  };
}
