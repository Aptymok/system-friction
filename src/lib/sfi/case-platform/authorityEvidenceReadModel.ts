/**
 * C15-C16: human-readable, bounded projection of the canonical
 * Reality Chain adjudicator and authority ledger. READ MODEL ONLY.
 * The canonical chain, not an object payload flag, owns all decisions.
 */
import type { SfiRealityChain } from '@/core/case-platform/reportAssembler';

export const SFI_CASE_AUTHORITY_EVIDENCE_CONTRACT =
  'SFI-CASE-AUTHORITY-EVIDENCE-READ-1.0' as const;

export function projectCaseAuthorityEvidence(
  chain: Pick<SfiRealityChain, 'caseId'|'provenance'|'authority'|'executions'|'gaps'>,
  maxRows=60,
) {
  const cap=Number.isFinite(maxRows)?Math.max(1,Math.min(300,Math.trunc(maxRows))):60;
  const evidence=chain.provenance.adjudications;
  const decisions=chain.authority;
  const counts={
    evidenceItems:evidence.length,
    accepted:evidence.filter(x=>x.state==='ACCEPTED').length,
    rejected:evidence.filter(x=>x.state==='REJECTED').length,
    pending:evidence.filter(x=>x.state==='PENDING').length,
    authorityDecisions:decisions.length,
    authorityRecordsComplete:decisions.filter(x=>Boolean(
      x.id&&x.proposalId&&x.decision&&x.authorityRole&&x.decidedBy&&x.createdAt
    )).length,
    executionRecords:chain.executions.length,
    verifiedExecutions:chain.executions.filter(x=>x.verified===true).length,
  };
  const integrityGaps=chain.gaps.filter(x=>
    /^(READ_INCOMPLETE|FOREIGN_OBJECT_EXCLUDED|PROVENANCE_CYCLE|UNRESOLVED_REFERENCE)/.test(x));
  return {
    contract:SFI_CASE_AUTHORITY_EVIDENCE_CONTRACT,
    caseId:chain.caseId,
    counts,
    // A missing item in an incomplete snapshot must NEVER mean no item exists.
    snapshotIntegrity:integrityGaps.length ? 'LIMITED_BY_READ_OR_PROVENANCE' : 'CHAIN_READ_SCOPE_ONLY',
    integrityGaps:integrityGaps.slice(0,cap),
    evidence:evidence.slice(0,cap).map(x=>({
      evidenceRef:x.evidenceRef.id,
      state:x.state,
      rootSources:x.sourceRoots.map(r=>r.id),
      assessments:x.assessmentRefs.map(r=>r.id),
      assessmentCount:x.assessmentRefs.length,
      // A source is not an adjudication, and a recorded assessment alone
      // is not proof of an authorized real-world execution.
      meaning:x.state==='ACCEPTED'?'CHAIN_ADJUDICATION_ACCEPTED_ONLY'
        :x.state==='REJECTED'?'CHAIN_ADJUDICATION_REJECTED'
        :'UNADJUDICATED_OR_INSUFFICIENT',
    })),
    authority:decisions.slice(0,cap).map(d=>({
      decisionId:d.id,proposalId:d.proposalId,decision:d.decision,
      authorityRole:d.authorityRole||null,
      decidedBy:d.decidedBy||null,
      recordedAt:d.createdAt,
      recordIntegrity:Boolean(d.id&&d.proposalId&&d.decision&&d.authorityRole&&d.decidedBy&&d.createdAt)
        ?'FIELDS_RECORDED':'FIELDS_INCOMPLETE',
      meaning:'CASE_DECISION_RECORD_NOT_UNIVERSAL_EXECUTION_PERMISSION',
    })),
    truncated:evidence.length>cap||decisions.length>cap||integrityGaps.length>cap,
    boundary:'READ_ONLY_NO_EVIDENCE_PROMOTION_NO_AUTHORITY_GRANT_NO_EXTERNAL_RETURN',
  };
}
