/**
 * MIHM Foundation P4: read-only prospective-scoring adapter over the EXISTING
 * SFI prediction and verification registries. No table, clock, agent, writer,
 * external observation, canonical Phi or permission is created here.
 *
 * The registry's legacy is_predictive_evidence flag is NOT sufficient proof
 * of source availability, preregistration, or numerical verification.
 */
import type { SfiPredictionEntry, SfiPredictionVerification } from '../sfi/predictions/types';

export const MIHM_P4_CONTRACT='SFI-MIHM-FOUNDATION-P4-FORECAST-CONTRAST-0.1' as const;
const HASH=/^[a-f0-9]{64}$/i;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const stamp=(x:unknown)=>typeof x==='string'&&ISO.test(x)&&
  Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===new Date(Date.parse(x)).toISOString()
    ?Date.parse(x):null;
const rec=(x:unknown):Record<string,unknown>|null=>x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:null;
const nonblank=(x:unknown)=>typeof x==='string'&&x.trim().length>0;
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
type Snapshot={sourceRef:string;sha256:string;observedAt:string;availableAt:string;capturedAt:string};
type Forecast={modelId:string;version:string;value:number;lower90:number;upper90:number;inputSourceRefs:string[]};
export type MihmP4FrozenPacket={
  contract:typeof MIHM_P4_CONTRACT;targetKey:string;unit:string;targetAt:string;
  scope:string;methodVersion:string;metric:'MAE';snapshots:Snapshot[];
  baseline:Forecast;mihm:Forecast;
};
type Outcome={value:number;unit:string;observedAt:string;availableAt:string;capturedAt:string;sha256:string;sourceRef:string};
export type MihmP4EntryVerdict={
  predictionId:string;caseId:string;status:'SCORED_CANDIDATE'|'BLOCKED'|'PENDING_OUTCOME';
  blockers:string[];targetAt:string|null;unit:string|null;
  baselineAbsoluteError:number|null;mihmAbsoluteError:number|null;
  baselineCovered90:boolean|null;mihmCovered90:boolean|null;
};
export type MihmP4Score={
  contract:typeof MIHM_P4_CONTRACT;
  status:'NO_PROSPECTIVE_PAIRS'|'INSUFFICIENT_VERIFIED_PAIRS'|'DESCRIPTIVE_PROSPECTIVE_CANDIDATE';
  registered:number;scored:number;pending:number;blocked:number;
  minPairedSamplesForReview:30;
  baselineMAE:number|null;mihmMAE:number|null;maeGain:number|null;
  baselineCoverage90:number|null;mihmCoverage90:number|null;
  lossDefinition:'PAIRED_ABSOLUTE_ERROR_ON_SAME_TARGET_AND_UNIT';
  evidence: MihmP4EntryVerdict[];
  historicalP3ReclassifiedAsProspective:false;
  independentScientificValidationEstablished:false;
  homeostasisEstablished:false;causalPropagationEstablished:false;
  canonicalPhiModified:false;institutionalReturnIssued:false;productionPromotionAllowed:false;
};
function parsePacket(value:string):MihmP4FrozenPacket|null {
  try{const o=JSON.parse(value) as unknown;const r=rec(o);
    return r?.contract===MIHM_P4_CONTRACT?r as unknown as MihmP4FrozenPacket:null;
  }catch{return null;}
}
const pairs=(a:number[])=>a.reduce((sum,x)=>sum+x,0)/a.length;
const result=(entry:SfiPredictionEntry,status:MihmP4EntryVerdict['status'],
  blockers:string[],packet:MihmP4FrozenPacket|null,
  errors?:{a:number;b:number;ac:boolean;bc:boolean}):MihmP4EntryVerdict=>({
    predictionId:entry.id,caseId:entry.case_id,status,blockers,
    targetAt:packet?.targetAt??null,unit:packet?.unit??null,
    baselineAbsoluteError:errors?.a??null,mihmAbsoluteError:errors?.b??null,
    baselineCovered90:errors?.ac??null,mihmCovered90:errors?.bc??null,
  });
function checkForecast(f:Forecast,snapshots:Snapshot[]):boolean {
  if(!f||!nonblank(f.modelId)||!nonblank(f.version)||
    !finite(f.value)||f.value<0||!finite(f.lower90)||!finite(f.upper90)||
    f.lower90<0||f.lower90>f.value||f.value>f.upper90||
    !Array.isArray(f.inputSourceRefs)||!f.inputSourceRefs.length)return false;
  const ids=f.inputSourceRefs;
  return ids.every(x=>nonblank(x)&&snapshots.some(s=>s.sourceRef===x)) &&
    new Set(ids).size===ids.length;
}
function scoreOne(entry:SfiPredictionEntry,verifications:SfiPredictionVerification[]):MihmP4EntryVerdict {
  const packet=parsePacket(entry.prediccion_explicita);
  if(!packet)return result(entry,'BLOCKED',['P4_NUMERIC_PREREGISTRATION_NOT_PRESENT'],null);
  const reasons:string[]=[];
  const issued=stamp(entry.prediction_registered_at),target=stamp(packet.targetAt);
  if(issued===null||target===null||issued>=target)reasons.push('ISSUED_TIME_NOT_BEFORE_TARGET');
  if(!nonblank(entry.id)||!nonblank(entry.case_id)||!nonblank(entry.hypothesis_id)||
    !nonblank(packet.targetKey)||!nonblank(packet.unit)||!nonblank(packet.scope)||
    !nonblank(packet.methodVersion)||packet.metric!=='MAE')
    reasons.push('PROTOCOL_OR_IDENTITY_INCOMPLETE');
  const snaps=Array.isArray(packet.snapshots)?packet.snapshots:[];
  if(!snaps.length||snaps.some(s=>{
    const ob=stamp(s?.observedAt),av=stamp(s?.availableAt),cap=stamp(s?.capturedAt);
    return !nonblank(s?.sourceRef)||!HASH.test(s?.sha256??'')||
      ob===null||av===null||cap===null||issued===null||
      ob>av||av>cap||cap>issued;
  })||new Set(snaps.map(s=>s.sourceRef)).size!==snaps.length)
    reasons.push('T0_SOURCE_VINTAGE_OR_SNAPSHOT_NOT_ADMISSIBLE');
  if(!checkForecast(packet.baseline,snaps)||!checkForecast(packet.mihm,snaps))
    reasons.push('MODEL_OR_INTERVAL_NOT_VALID');
  if(packet.baseline?.modelId===packet.mihm?.modelId &&
    packet.baseline?.version===packet.mihm?.version)
    reasons.push('COMPETING_MODELS_ARE_IDENTICAL');
  const baseIds=packet.baseline?.inputSourceRefs??[];
  const mihmIds=packet.mihm?.inputSourceRefs??[];
  if(!Array.isArray(baseIds)||!Array.isArray(mihmIds)||
    baseIds.length!==mihmIds.length||
    [...baseIds].sort().join('|')!==[...mihmIds].sort().join('|'))
    reasons.push('UNEQUAL_SOURCE_BUDGET__COMPARISON_NOT_FAIR');
  // Only an existing persisted registry entry may serve as the issued receipt.
  // Legacy predictive flags alone cannot bypass timestamp and provenance tests.
  if(entry.is_predictive_evidence!==true||
    entry.estado_observacion!=='registrada_pre_perturbacion')
    reasons.push('REGISTRY_PREDICTIVE_CLASSIFICATION_MISSING');
  if(reasons.length)return result(entry,'BLOCKED',reasons,packet);
  const linked=verifications.filter(v=>v.prediction_entry_id===entry.id &&
    v.hypothesis_id===entry.hypothesis_id &&
    v.verification_state!=='SUPERSEDED');
  if(linked.length===0)return result(entry,'PENDING_OUTCOME',['NO_VERIFICATION_RECEIPT'],packet);
  if(linked.length!==1)return result(entry,'BLOCKED',['CONFLICTING_OR_MULTIPLE_VERIFICATIONS'],packet);
  const v=linked[0],raw=rec(v.source_value);
  if(v.verification_state==='OPEN'||v.verification_state==='DUE'||v.verification_state==='OVERDUE')
    return result(entry,'PENDING_OUTCOME',['VERIFICATION_NOT_CLOSED'],packet);
  if(v.verification_state==='DISPUTED')return result(entry,'BLOCKED',['GROUND_TRUTH_DISPUTED'],packet);
  if(v.verification_state!=='CLOSED'||!['TRUE','FALSE','PARTIAL'].includes(v.evaluation_result)||
    !nonblank(v.verified_by)||!nonblank(v.source_snapshot_hash)||!HASH.test(v.source_snapshot_hash??'')||
    !nonblank(v.ground_truth_source_type)||v.source_quality_tier>2)
    return result(entry,'BLOCKED',['UNADMITTED_VERIFICATION_RECEIPT'],packet);
  const observation=raw as Outcome|null;
  const obs=stamp(observation?.observedAt),available=stamp(observation?.availableAt),
    captured=stamp(observation?.capturedAt),checked=stamp(v.source_checked_at);
  if(!observation||!finite(observation.value)||observation.value<0||
    observation.unit!==packet.unit||!nonblank(observation.sourceRef)||
    !HASH.test(observation.sha256??'')||observation.sha256!==v.source_snapshot_hash||
    issued===null||target===null||obs===null||available===null||captured===null||
    checked===null||obs<target||available<obs||captured<available||checked<captured||
    issued>=available||stamp(v.created_at)===null||stamp(v.created_at)!>=target)
    return result(entry,'BLOCKED',['GROUND_TRUTH_VALUE_OR_CHRONOLOGY_UNVERIFIED'],packet);
  // Rule must have been preregistered before outcome. A closed row alone
  // does not prove institutional authority or independence.
  const rule=rec(v.verification_rule);
  if(!rule||!nonblank(rule.observable)||rule.observable!==packet.targetKey||
    !nonblank(rule.entity)||!nonblank(rule.source_query))
    return result(entry,'BLOCKED',['PREREGISTERED_VERIFICATION_RULE_MISSING'],packet);
  const y=observation.value;
  return result(entry,'SCORED_CANDIDATE',[],packet,{
    a:Math.abs(packet.baseline.value-y),b:Math.abs(packet.mihm.value-y),
    ac:y>=packet.baseline.lower90&&y<=packet.baseline.upper90,
    bc:y>=packet.mihm.lower90&&y<=packet.mihm.upper90,
  });
}
export function evaluateMihmP4ExistingRegistry(entries:SfiPredictionEntry[],
  verifications:SfiPredictionVerification[]):MihmP4Score {
  const evidence=entries.map(e=>scoreOne(e,verifications));
  const scored=evidence.filter(e=>e.status==='SCORED_CANDIDATE');
  const baselineMAE=scored.length?pairs(scored.map(e=>e.baselineAbsoluteError!)):null;
  const mihmMAE=scored.length?pairs(scored.map(e=>e.mihmAbsoluteError!)):null;
  return {
    contract:MIHM_P4_CONTRACT,
    status:!scored.length?'NO_PROSPECTIVE_PAIRS':
      scored.length<30?'INSUFFICIENT_VERIFIED_PAIRS':'DESCRIPTIVE_PROSPECTIVE_CANDIDATE',
    registered:entries.length,scored:scored.length,
    pending:evidence.filter(e=>e.status==='PENDING_OUTCOME').length,
    blocked:evidence.filter(e=>e.status==='BLOCKED').length,
    minPairedSamplesForReview:30,
    baselineMAE,mihmMAE,
    maeGain:baselineMAE!==null&&mihmMAE!==null?baselineMAE-mihmMAE:null,
    baselineCoverage90:scored.length?pairs(scored.map(e=>e.baselineCovered90?1:0)):null,
    mihmCoverage90:scored.length?pairs(scored.map(e=>e.mihmCovered90?1:0)):null,
    lossDefinition:'PAIRED_ABSOLUTE_ERROR_ON_SAME_TARGET_AND_UNIT',
    evidence,
    historicalP3ReclassifiedAsProspective:false,
    independentScientificValidationEstablished:false,homeostasisEstablished:false,
    causalPropagationEstablished:false,canonicalPhiModified:false,
    institutionalReturnIssued:false,productionPromotionAllowed:false,
  };
}
