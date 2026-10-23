export const SFI_HYPOTHESIS_TEST_CONTRACT = 'SFI-HYPOTHESIS-TEST-1.0' as const;

export type HypothesisOperator =
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'EQ'
  | 'DELTA_GTE'
  | 'DELTA_LTE'
  | 'COUNT_GTE'
  | 'PRESENCE'
  | 'ABSENCE';

export type HypothesisCriterion = {
  id: string;
  signal: string;
  metric: string | null;
  operator: HypothesisOperator;
  threshold: number | null;
  unit: string | null;
  required: boolean;
  minimumObservations: number;
  sourceFamilies: string[];
};

export type HypothesisTestContract = {
  contract: typeof SFI_HYPOTHESIS_TEST_CONTRACT;
  horizonHours: number;
  horizonBasis: string;
  horizonClass: 'SHORT' | 'MEDIUM' | 'LONG';
  minimumEvidenceCount: number;
  minimumSourceFamilies: number;
  expectedCriteria: HypothesisCriterion[];
  contradictionCriteria: HypothesisCriterion[];
  passRule: string;
  failRule: string;
  inconclusiveRule: string;
};

export type HypothesisCriterionResult = {
  criterionId: string;
  verdict: 'SATISFIED' | 'NOT_SATISFIED' | 'NOT_DETERMINABLE';
  evidenceIds: string[];
  reason: string;
};

export type HypothesisClassification = 'VALIDATED' | 'PARTIALLY_VALIDATED' | 'CONTRADICTED' | 'INCONCLUSIVE';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, max = 2000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function strings(value: unknown, max = 20) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].slice(0, max)
    : [];
}

function positiveInteger(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

const THRESHOLD_OPERATORS = new Set<HypothesisOperator>(['GT','GTE','LT','LTE','EQ','DELTA_GTE','DELTA_LTE','COUNT_GTE']);
const OPERATORS = new Set<HypothesisOperator>([...THRESHOLD_OPERATORS, 'PRESENCE', 'ABSENCE']);

function parseCriterion(value: unknown, fallbackId: string): HypothesisCriterion | null {
  const item = record(value);
  const id = text(item.id, 120) ?? fallbackId;
  const signal = text(item.signal, 1200);
  const operator = text(item.operator, 40)?.toUpperCase() as HypothesisOperator | undefined;
  if (!signal || !operator || !OPERATORS.has(operator)) return null;

  const rawThreshold = item.threshold;
  const threshold = rawThreshold === null || typeof rawThreshold === 'undefined' || rawThreshold === '' ? null : Number(rawThreshold);
  if (THRESHOLD_OPERATORS.has(operator) && !Number.isFinite(threshold)) return null;

  return {
    id,
    signal,
    metric: text(item.metric, 240),
    operator,
    threshold: Number.isFinite(threshold) ? threshold : null,
    unit: text(item.unit, 120),
    required: item.required !== false,
    minimumObservations: positiveInteger(item.minimumObservations, 1, 100),
    sourceFamilies: strings(item.sourceFamilies, 20),
  };
}

export function parseHypothesisTestContract(value: unknown): HypothesisTestContract | null {
  const input = record(value);
  const contract = text(input.contract, 120);
  if (contract !== SFI_HYPOTHESIS_TEST_CONTRACT) return null;

  const horizonHours = Number(input.horizonHours);
  // No silent truncation: an invalid horizon makes the hypothesis contract invalid.
  if (!Number.isFinite(horizonHours) || horizonHours < 1 || horizonHours > 8760) return null;
  const horizonBasis = text(input.horizonBasis, 1200);
  if (!horizonBasis) return null;

  const expectedCriteria = Array.isArray(input.expectedCriteria)
    ? input.expectedCriteria.slice(0, 12).map((item, index) => parseCriterion(item, `expected-${index + 1}`)).filter((item): item is HypothesisCriterion => Boolean(item))
    : [];
  const contradictionCriteria = Array.isArray(input.contradictionCriteria)
    ? input.contradictionCriteria.slice(0, 12).map((item, index) => parseCriterion(item, `contradiction-${index + 1}`)).filter((item): item is HypothesisCriterion => Boolean(item))
    : [];

  if (!expectedCriteria.length || !contradictionCriteria.length) return null;
  // A stable unique name is necessary for each frozen discriminator. The
  // evaluator receives model-authored verdicts keyed by criterion ID.
  const allCriterionIds=[...expectedCriteria,...contradictionCriteria].map(item=>item.id);
  if(new Set(allCriterionIds).size!==allCriterionIds.length) return null;
  if (expectedCriteria.some((criterion) => !criterion.required)) {
    // Expected tests may include optional diagnostics, but at least one required discriminator must remain.
    if (!expectedCriteria.some((criterion) => criterion.required)) return null;
  }

  const horizonClass = horizonHours <= 72 ? 'SHORT' : horizonHours <= 720 ? 'MEDIUM' : 'LONG';
  return {
    contract: SFI_HYPOTHESIS_TEST_CONTRACT,
    horizonHours,
    horizonBasis,
    horizonClass,
    minimumEvidenceCount: positiveInteger(input.minimumEvidenceCount, 1, 100),
    minimumSourceFamilies: positiveInteger(input.minimumSourceFamilies, 1, 20),
    expectedCriteria,
    contradictionCriteria,
    passRule: text(input.passRule, 1200) ?? 'All required expected criteria are SATISFIED and no contradiction criterion is SATISFIED.',
    failRule: text(input.failRule, 1200) ?? 'At least one preregistered contradiction criterion is SATISFIED.',
    inconclusiveRule: text(input.inconclusiveRule, 1200) ?? 'Coverage is insufficient or required criteria remain NOT_DETERMINABLE at the end of the window.',
  };
}

export function parseCriterionResults(value: unknown): HypothesisCriterionResult[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(['SATISFIED','NOT_SATISFIED','NOT_DETERMINABLE']);
  return value.slice(0, 40).flatMap((entry) => {
    const item = record(entry);
    const criterionId = text(item.criterionId, 120);
    const verdict = text(item.verdict, 40)?.toUpperCase();
    if (!criterionId || !verdict || !allowed.has(verdict)) return [];
    return [{
      criterionId,
      verdict: verdict as HypothesisCriterionResult['verdict'],
      evidenceIds: strings(item.evidenceIds, 100),
      reason: text(item.reason, 2000) ?? 'No reason supplied.',
    }];
  });
}

export type HypothesisAdmissibleObservation = {
  id: string;
  sourceFamily: string | null;
};

/**
 * Deterministic verdict for a prospectively frozen test contract.
 * The model may suggest criterion verdicts, but cannot certify their evidence.
 *
 * A verdict has support only when its evidence references belong to the
 * allowed post-T0 observations, satisfy the criterion's sampling minimum,
 * and cover the criterion's explicitly required source families.
 */
export function classifyHypothesisTestContract(input: {
  contract: HypothesisTestContract;
  criterionResults: HypothesisCriterionResult[];
  linkedEvidenceCount: number;
  linkedSourceFamilies: number;
  admissibleObservations: HypothesisAdmissibleObservation[];
}): { classification: HypothesisClassification; reason: string; decisive: boolean } {
  const { contract, criterionResults } = input;
  const inconclusive=(reason:string)=>({classification:'INCONCLUSIVE' as const,reason,decisive:false});
  const frozenCriteria=[...contract.expectedCriteria,...contract.contradictionCriteria];
  const ids=frozenCriteria.map(c=>c.id);
  if(new Set(ids).size!==ids.length) return inconclusive('Duplicated frozen criterion IDs cannot support unambiguous adjudication.');
  const allowedCriterionIds=new Set(ids);
  const results=criterionResults.filter(result=>allowedCriterionIds.has(result.criterionId));
  if(results.length!==criterionResults.length || new Set(results.map(r=>r.criterionId)).size!==results.length){
    return inconclusive('Duplicate or unregistered criterion verdicts cannot modify the frozen evaluation contract.');
  }

  const byId=new Map(results.map(result=>[result.criterionId,result]));
  const eligible=new Map(input.admissibleObservations.filter(row=>row.id.trim()).map(row=>[row.id,row]));
  const allLinked=new Set(results.flatMap(result=>result.evidenceIds).filter(id=>eligible.has(id)));
  const families=new Set([...allLinked].map(id=>eligible.get(id)?.sourceFamily).filter((family):family is string=>Boolean(family)));
  const coverageSatisfied=allLinked.size>=contract.minimumEvidenceCount &&
    families.size>=contract.minimumSourceFamilies &&
    input.linkedEvidenceCount>=contract.minimumEvidenceCount &&
    input.linkedSourceFamilies>=contract.minimumSourceFamilies;
  if(!coverageSatisfied){
    return inconclusive(
      `Insufficient eligible post-T0 evidence: ${allLinked.size}/${contract.minimumEvidenceCount} observations, ${families.size}/${contract.minimumSourceFamilies} source families.`,
    );
  }

  const supported=(criterion:HypothesisCriterion,result:HypothesisCriterionResult | undefined)=>{
    if(!result || result.verdict==='NOT_DETERMINABLE' || !result.evidenceIds.length) return false;
    const refs=new Set(result.evidenceIds);
    // An unrecognized ID cannot silently stand in for a persisted observation.
    if([...refs].some(id=>!eligible.has(id))) return false;
    if(refs.size<criterion.minimumObservations) return false;
    const linkedFamilies=new Set([...refs].map(id=>eligible.get(id)?.sourceFamily).filter((family):family is string=>Boolean(family)));
    return criterion.sourceFamilies.every(family=>linkedFamilies.has(family));
  };
  // A verified counterexample can refute a hypothesis without all other
  // discriminators being determined. A *claimed* counterexample without
  // admissible evidence may not do so, and must not be silently ignored.
  const assertedContradictions=contract.contradictionCriteria.filter(criterion=>
    byId.get(criterion.id)?.verdict==='SATISFIED');
  if(assertedContradictions.some(criterion=>!supported(criterion,byId.get(criterion.id)))){
    return inconclusive('An asserted contradiction lacks its own admissible observations: '+
      assertedContradictions.filter(c=>!supported(c,byId.get(c.id))).map(c=>c.id).join(', ')+'.');
  }
  if(assertedContradictions.length){
    return {
      classification:'CONTRADICTED',
      reason:'At least one admissibly sourced preregistered contradiction criterion was satisfied within the validation window.',
      decisive:true,
    };
  }
  // Positive claims require positive observations and independently assessed
  // non-satisfaction of *every* frozen contradiction, not merely no reported
  // contradiction. Missing/uncertain model output cannot grant validation.
  const unverified=frozenCriteria.filter(criterion=>!supported(criterion,byId.get(criterion.id)));
  if(unverified.length){
    return inconclusive('Frozen criteria are missing admissible, sufficiently sampled determinations: '+
      unverified.map(c=>c.id).join(', ')+'.');
  }

  const required=contract.expectedCriteria.filter(criterion=>criterion.required);
  const satisfied=required.filter(criterion=>byId.get(criterion.id)?.verdict==='SATISFIED');
  if(required.length>0 && satisfied.length===required.length &&
    contract.contradictionCriteria.every(criterion=>byId.get(criterion.id)?.verdict==='NOT_SATISFIED')){
    return {
      classification:'VALIDATED',
      reason:'All required expected criteria have eligible evidence and all contradiction criteria have admissible negative determinations.',
      decisive:true,
    };
  }

  if(required.length>1 && satisfied.length>0 &&
    contract.contradictionCriteria.every(criterion=>byId.get(criterion.id)?.verdict==='NOT_SATISFIED')){
    return {
      classification:'PARTIALLY_VALIDATED',
      reason:`${satisfied.length}/${required.length} required expected criteria have support and no preregistered contradiction is satisfied.`,
      decisive:false,
    };
  }
  return inconclusive('The supported frozen criteria do not discriminate this hypothesis from its rivals.');
}
