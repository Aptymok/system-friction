export const SFI_CONTEXTUAL_RETURN_CONTRACT = 'SFI-CONTEXTUAL-RETURN-1.0' as const;

export type EpistemicState = 'OBSERVED'|'DECLARED'|'DERIVED'|'INFERRED'|'HYPOTHESIZED'|'SIMULATED'|'UNKNOWN'|'NOT_OBSERVED';

export type ContextDimension = Readonly<{
  key:string;
  value:string|number|boolean|null;
  state:EpistemicState;
  evidenceRefs:readonly string[];
}>;

export type InvariantScope = Readonly<{
  invariantId:string;
  statement:string;
  appliesTo:readonly string[];
  contextKeys:readonly string[];
  validFrom:string;
  validUntil:string|null;
  tolerance:string;
  falsifier:string;
  evidenceRefs:readonly string[];
}>;

export type ExpectationWindow = Readonly<{
  opensAt:string;
  closesAt:string;
  observationChannel:string;
  occurrenceCondition:string;
  absenceCondition:string;
  detectabilityCondition:string;
}>;

export type ContextualReturnInput = Readonly<{
  objectRef:string;
  expected:string;
  context:readonly ContextDimension[];
  invariants:readonly InvariantScope[];
  window:ExpectationWindow;
  observedOccurrence:boolean;
  observation:string|null;
  observedAt:string;
  evidenceRefs:readonly string[];
}>;

export type ContextualReturnClass =
  | 'OCCURRENCE_OBSERVED'
  | 'ABSENCE_OBSERVED'
  | 'UNRESOLVED_WINDOW_OPEN'
  | 'UNRESOLVED_DETECTABILITY'
  | 'UNRESOLVED_EVIDENCE';

export type ContextualReturnResult = Readonly<{
  contract:typeof SFI_CONTEXTUAL_RETURN_CONTRACT;
  classification:ContextualReturnClass;
  returnEstablished:boolean;
  contextEquivalence:'ESTABLISHED'|'NOT_ESTABLISHED'|'UNKNOWN';
  challengedInvariantIds:readonly string[];
  rule:string;
}>;

function time(value:string){
  const parsed=Date.parse(value);
  if(!Number.isFinite(parsed)) throw new Error('CONTEXTUAL_RETURN_TIME_INVALID');
  return parsed;
}

function cleanRefs(values:readonly string[]){
  return [...new Set(values.map((v)=>v.trim()).filter(Boolean))];
}

export function assessContextEquivalence(a:readonly ContextDimension[],b:readonly ContextDimension[]){
  const right=new Map(b.map((item)=>[item.key,item]));
  let unknown=false;
  for(const left of a){
    const other=right.get(left.key);
    if(!other) return 'NOT_ESTABLISHED' as const;
    if(left.state==='UNKNOWN'||left.state==='NOT_OBSERVED'||other.state==='UNKNOWN'||other.state==='NOT_OBSERVED') unknown=true;
    else if(left.value!==other.value) return 'NOT_ESTABLISHED' as const;
  }
  if(a.length!==b.length) return 'NOT_ESTABLISHED' as const;
  return unknown?'UNKNOWN' as const:'ESTABLISHED' as const;
}

export function evaluateContextualReturn(input:ContextualReturnInput, comparisonContext?:readonly ContextDimension[]):ContextualReturnResult{
  if(!input.objectRef.trim()) throw new Error('CONTEXTUAL_RETURN_OBJECT_REQUIRED');
  if(!input.expected.trim()) throw new Error('CONTEXTUAL_RETURN_EXPECTATION_REQUIRED');
  const opens=time(input.window.opensAt),closes=time(input.window.closesAt),observed=time(input.observedAt);
  if(closes<=opens) throw new Error('CONTEXTUAL_RETURN_WINDOW_INVALID');
  const evidenceRefs=cleanRefs(input.evidenceRefs);
  const detectabilityDeclared=Boolean(input.window.observationChannel.trim()&&input.window.detectabilityCondition.trim());
  const windowClosed=observed>=closes;
  let classification:ContextualReturnClass;
  if(input.observedOccurrence){
    classification=evidenceRefs.length?'OCCURRENCE_OBSERVED':'UNRESOLVED_EVIDENCE';
  }else if(!windowClosed){
    classification='UNRESOLVED_WINDOW_OPEN';
  }else if(!detectabilityDeclared){
    classification='UNRESOLVED_DETECTABILITY';
  }else if(!evidenceRefs.length){
    classification='UNRESOLVED_EVIDENCE';
  }else{
    classification='ABSENCE_OBSERVED';
  }
  const returnEstablished=classification==='OCCURRENCE_OBSERVED'||classification==='ABSENCE_OBSERVED';
  const contextEquivalence=comparisonContext?assessContextEquivalence(input.context,comparisonContext):'UNKNOWN';
  const challengedInvariantIds=returnEstablished
    ? input.invariants.filter((item)=>item.falsifier.trim()&&input.observation?.trim()&&input.observation.includes(item.falsifier)).map((item)=>item.invariantId)
    : [];
  return {
    contract:SFI_CONTEXTUAL_RETURN_CONTRACT,
    classification,
    returnEstablished,
    contextEquivalence,
    challengedInvariantIds,
    rule:classification==='ABSENCE_OBSERVED'
      ? 'Absence is RETURN only because the declared observation window closed, detectability was declared, and evidence of observation exists. Causal meaning is not inferred.'
      : 'RETURN classification preserves occurrence, unresolved observation, context equivalence and invariant challenge as separate claims.',
  };
}
