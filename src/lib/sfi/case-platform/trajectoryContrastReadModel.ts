/**
 * C17 — bounded trajectory/attractor read model. No autonomous intervention,
 * calibration, external RETURN, independent verification or knowledge promotion.
 * The authorized Case Platform caller supplies ONE tenant-scoped case snapshot.
 */
export const SFI_CASE_TRAJECTORY_CONTRAST_CONTRACT =
  'SFI-CASE-TRAJECTORY-CONTRAST-READ-1.0' as const;

type Dict=Record<string,unknown>;
type Ref={id:string};
type Item={
  kind:string;canonicalRef:Ref;payload:Dict;createdAt:string;
  observedAt?:string|null;sourceRefs?:readonly Ref[];
};
type Case={
  id:string;subject:string;scope:string;
  temporalWindow:{start?:string|null;end?:string|null;cutoff:string;horizon?:string|null};
};
type Adjudication={state:string};
type Chain={
  provenance:{adjudications:readonly Adjudication[]};
  executions:readonly {verified:boolean}[];
  gaps:readonly string[];
};

const dict=(value:unknown):Dict=>value!==null&&typeof value==='object'&&!Array.isArray(value)
  ? value as Dict:{};
const word=(value:unknown)=>typeof value==='string'?value.trim():'';
const safe=(value:unknown,n=180)=>word(value).slice(0,n);
const validTime=(value:unknown)=>{
  const text=word(value);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(text))return null;
  const epoch=Date.parse(text);
  return Number.isFinite(epoch)?new Date(epoch).toISOString():null;
};

/**
 * A plan, observation and RETURN are different epistemic events; none of their
 * counts, separately or combined, establishes goal attainment.
 */
export function projectCaseTrajectoryContrast(
  caseRecord:Case,objects:readonly Item[],chain:Chain,maxRows=60,
) {
  const cap=Number.isFinite(maxRows)?Math.min(250,Math.max(1,Math.trunc(maxRows))):60;
  const select=(kind:string)=>objects.filter(o=>o.kind===kind);
  const attractors=select('ATTRACTOR'),trajectories=select('TRAJECTORY');
  const observations=select('OBSERVATION'),returns=select('RETURN');
  const contradictions=select('CONTRADICTION');
  const adjudicated=chain.provenance.adjudications;
  const acceptedEvidence=adjudicated.filter(x=>x.state==='ACCEPTED').length;
  const datedObservations=observations.filter(o=>Boolean(validTime(o.observedAt))).length;
  const gaps:string[]=[];
  if(!attractors.length)gaps.push('NO_CASE_ATTRACTOR_REGISTERED_IN_SNAPSHOT');
  if(!trajectories.length)gaps.push('NO_CASE_TRAJECTORY_REGISTERED_IN_SNAPSHOT');
  if(!datedObservations)gaps.push('NO_DATED_CASE_OBSERVATION_IN_SNAPSHOT');
  if(!acceptedEvidence)gaps.push('NO_ACCEPTED_CHAIN_EVIDENCE_IN_SNAPSHOT');
  if(!returns.length)gaps.push('NO_CASE_RETURN_REGISTERED_IN_SNAPSHOT');
  if(!chain.executions.some(x=>x.verified===true))gaps.push('NO_VERIFIED_CASE_EXECUTION_IN_CHAIN');
  const integrityLimited=chain.gaps.some(g=>
    /^(READ_INCOMPLETE|FOREIGN_OBJECT_EXCLUDED|PROVENANCE_CYCLE|UNRESOLVED_REFERENCE)/.test(g));
  if(integrityLimited)gaps.push('CURRENT_PROVIDER_READ_OR_PROVENANCE_INCOMPLETE');

  const goals=attractors.slice(0,cap).map(o=>({
    ref:safe(o.canonicalRef.id,190),
    statedGoal:safe(o.payload.objective??o.payload.goal??o.payload.target??o.payload.label)||null,
    status:'DECLARED_ATTRACTOR_NOT_PROOF_OF_CONVERGENCE',
  }));
  const plans=trajectories.slice(0,cap).map(o=>({
    ref:safe(o.canonicalRef.id,190),
    statedDirection:safe(o.payload.direction??o.payload.title??o.payload.label)||null,
    status:'RECORDED_TRAJECTORY_NOT_OBSERVED_EFFECT',
  }));
  const latestObserved=observations
    .map(o=>({ref:safe(o.canonicalRef.id,190),observedAt:validTime(o.observedAt)}))
    .filter((x):x is {ref:string;observedAt:string}=>x.observedAt!==null)
    .sort((a,b)=>b.observedAt.localeCompare(a.observedAt)||a.ref.localeCompare(b.ref));
  return {
    contract:SFI_CASE_TRAJECTORY_CONTRAST_CONTRACT,
    caseId:caseRecord.id,
    declaredCaseObjective:safe(caseRecord.scope,240)||null,
    clock:{
      t0DeclaredStart:caseRecord.temporalWindow.start??null,
      sourceCutoff:caseRecord.temporalWindow.cutoff,
      requestedEnd:caseRecord.temporalWindow.end??null,
      horizon:caseRecord.temporalWindow.horizon??null,
      t1ObservedAndValidated:false,
    },
    counts:{
      attractors:attractors.length,trajectories:trajectories.length,
      caseObservations:observations.length,datedCaseObservations:datedObservations,
      chainAcceptedEvidence:acceptedEvidence,
      caseReturns:returns.length,caseContradictions:contradictions.length,
      verifiedExecutionRecords:chain.executions.filter(x=>x.verified).length,
    },
    attractors:goals,trajectories:plans,latestObservations:latestObserved.slice(0,cap),
    gaps,
    readScope:integrityLimited?'PROVIDER_OR_PROVENANCE_INCOMPLETE':'AUTHORIZED_CASE_SNAPSHOT_ONLY',
    attainment:'NOT_ESTABLISHED',
    contrast:'NOT_CALIBRATED',
    truncated:attractors.length>cap||trajectories.length>cap||latestObserved.length>cap,
    boundary:'A DECLARED ATTRACTOR AND TRAJECTORY ARE NOT OBSERVED ATTAINMENT; RETURNS REQUIRE CAUSAL CONTRAST, EVIDENCE ADJUDICATION AND AUTHORITY.',
  };
}
