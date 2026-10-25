/**
 * C18 — projected contrast / learning-candidate ledger for an authorized
 * Reality Chain case snapshot. READ ONLY: no decisions, writes or promotions.
 *
 * A contradicted prediction can be useful. It is not automatically proof
 * that an alternative hypothesis is true, a goal is achieved, or that
 * institutional learning has occurred.
 */
import type { SfiRealityChain } from '@/core/case-platform/reportAssembler';

export const SFI_CASE_RETURN_LEARNING_CONTRACT='SFI-CASE-RETURN-LEARNING-READ-1.0' as const;

type CanonicalChain=Pick<SfiRealityChain,
  'caseId'|'returns'|'executions'|'gaps'|'interpreter'|'closure'>;
type ReturnRecord=CanonicalChain['returns'][number];

function statusOf(record:ReturnRecord, executionVerified:boolean){
  if(!record.verified || !executionVerified) return 'UNVERIFIED_RETURN';
  if(record.contrast==='PREDICTION_MISSING') return 'PREDICTION_MISSING';
  if(record.contrast==='NOT_COMPARABLE') return 'NOT_COMPARABLE';
  if(record.contrast==='CONTRADICTED') return 'CONTRADICTED_CANDIDATE_FOR_REVIEW';
  if(record.contrast==='SUPPORTED') return 'SUPPORTED_EXPECTATION_NOT_CAUSAL_PROOF';
  return 'UNDETERMINED';
}
/** Projection only. All flags are evidence-limited and cannot mutate CANON. */
export function projectCaseReturnLearning(chain:CanonicalChain,maxRows=60){
  const cap=Number.isFinite(maxRows)?Math.max(1,Math.min(250,Math.trunc(maxRows))):60;
  const executions=new Map(chain.executions.map(e=>[e.ref.id,e]));
  const rows=chain.returns.map(r=>{
    const execution=r.executionRef?executions.get(r.executionRef.id):undefined;
    const executionVerified=Boolean(execution?.verified);
    const status=statusOf(r,executionVerified);
    const candidate=status==='CONTRADICTED_CANDIDATE_FOR_REVIEW';
    return {
      returnRef:r.ref.id,
      executionRef:r.executionRef?.id??null,
      // Only metric and bounded numeric comparison survive this projection.
      // Narrative fields inside action details are not published by default.
      metric:typeof r.expected?.metric==='string'?r.expected.metric.slice(0,120):null,
      expectedValue:typeof r.expected?.expected==='number'
        && Number.isFinite(r.expected.expected)?r.expected.expected:null,
      tolerance:typeof r.expected?.tolerance==='number'
        && Number.isFinite(r.expected.tolerance)?r.expected.tolerance:null,
      observedValue:typeof r.observed==='number'&&Number.isFinite(r.observed)?r.observed:null,
      canonicalContrast:r.contrast,
      returnVerified:r.verified,
      executionVerified,
      state:status,
      // A contradiction is a question to investigate, never an automatic
      // promotion of a different hypothesis.
      learningCandidate:candidate
        ?'REQUIRES_INDEPENDENT_CONTRAST_AND_ROOT_GOVERNANCE'
        :'NOT_PROPOSED',
      causalEffectEstablished:false as const,
      promotedToLearning:false as const,
      promotedToCanon:false as const,
    };
  });
  const integrityGaps=chain.gaps.filter(g=>
    /^(READ_INCOMPLETE|FOREIGN_OBJECT_EXCLUDED|PROVENANCE_CYCLE|UNRESOLVED_REFERENCE)/.test(g));
  const counts={
    recordedReturns:chain.returns.length,
    verifiedReturns:rows.filter(x=>x.returnVerified && x.executionVerified).length,
    supportedExpectations:rows.filter(x=>x.state==='SUPPORTED_EXPECTATION_NOT_CAUSAL_PROOF').length,
    contradictedCandidates:rows.filter(x=>x.state==='CONTRADICTED_CANDIDATE_FOR_REVIEW').length,
    unverifiedReturns:rows.filter(x=>x.state==='UNVERIFIED_RETURN').length,
    nonComparable:rows.filter(x=>x.state==='NOT_COMPARABLE'||x.state==='PREDICTION_MISSING').length,
  };
  const readScope=integrityGaps.length
    ?'PROVIDER_OR_PROVENANCE_INCOMPLETE'
    :'AUTHORIZED_CASE_SNAPSHOT_ONLY';
  return {
    contract:SFI_CASE_RETURN_LEARNING_CONTRACT,
    caseId:chain.caseId,
    counts,
    records:rows.slice(0,cap),
    truncated:rows.length>cap,
    integrityGaps:integrityGaps.slice(0,cap),
    readScope,
    interpreter:chain.interpreter.mode,
    certifiedDocumentaryClosure:chain.closure.certified,
    learningStatus:'NO_GOVERNED_LEARNING_PROMOTION_OBSERVED',
    nextDiscriminator:counts.contradictedCandidates>0
      ?'RECONSTRUCT_RIVAL_HYPOTHESIS_PREREGISTER_METRIC_AND_OBSERVE_INDEPENDENT_RETURN'
      :'REQUIRE_AUTHORIZED_EXECUTION_PREREGISTERED_EXPECTATION_AND_DATED_EXTERNAL_RETURN',
    boundary:'CONTRADICTION_IS_A_REVIEW_CANDIDATE_NOT_ALTERNATIVE_TRUTH; EXECUTION_RECEIPT_IS_NOT_CAUSAL_RETURN; DOCUMENTARY_CLOSURE_IS_NOT_LEARNING_PROMOTION.',
  };
}
