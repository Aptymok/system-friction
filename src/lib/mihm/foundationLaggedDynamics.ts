/**
 * MIHM Foundation P2 — documentary lagged-dynamics contrast (research-only).
 *
 * Built on the SAME frozen 365-day P0/P1 archive and existing P1 metrology
 * boundary; no new data plane, historical source versions, model authority,
 * causal inference, canonical Phi, production prediction or RETURN.
 *
 * P2 is a fixed, post-hoc diagnostic. Both the July–September 2026 archive
 * and earlier G2B comparisons have already been inspected; evaluation is
 * NEVER an independent holdout or prospective calibration.
 */
import {
  assessMihmManhattanSourceMetrology,
  type MihmManhattanP1Archive,
} from './foundationSourceMetrology';

export const SFI_MIHM_FOUNDATION_P2_LAGGED = 'SFI-MIHM-FOUNDATION-P2-LAGGED-CONTRAST-0.1' as const;
export type MihmP2Series = 'service311' | 'fdnyCount' | 'cbdEntries' | 'crzEntries';
type MihmP2Mode = 'WEEKLY_NAIVE' | 'OWN_LAG' | 'CROSS_LAG2' | 'AGE_SHIFT_PLACEBO';
type Scored = {mae:number;rmse:number;bias:number;days:number};
type Trained = {meanOutcome:number;means:number[];scales:number[];coefficients:number[]};
export type MihmP2Pair = {
  target:MihmP2Series;
  driver:MihmP2Series;
  declaredRelation:'CROSS_DOMAIN_HYPOTHESIS'|'STRUCTURAL_NESTING_NEGATIVE_CONTROL';
  targetUnit:string;
  driverUnit:string;
  targetBoundary:string;
  driverBoundary:string;
  availabilityAtOriginalT0:'NOT_VERIFIED';
};
export const MIHM_P2_DECLARED_PAIRS:readonly MihmP2Pair[]=[
  {target:'service311',driver:'fdnyCount',
    declaredRelation:'CROSS_DOMAIN_HYPOTHESIS',
    targetUnit:'service_request_records/day',driverUnit:'fire_incident_dispatch_rows/day',
    targetBoundary:'Manhattan borough',driverBoundary:'Manhattan borough',
    availabilityAtOriginalT0:'NOT_VERIFIED'},
  {target:'fdnyCount',driver:'service311',
    declaredRelation:'CROSS_DOMAIN_HYPOTHESIS',
    targetUnit:'fire_incident_dispatch_rows/day',driverUnit:'service_request_records/day',
    targetBoundary:'Manhattan borough',driverBoundary:'Manhattan borough',
    availabilityAtOriginalT0:'NOT_VERIFIED'},
  {target:'cbdEntries',driver:'service311',
    declaredRelation:'CROSS_DOMAIN_HYPOTHESIS',
    targetUnit:'estimated_vehicle_entries/day',driverUnit:'service_request_records/day',
    targetBoundary:'CBD road entrance zone',driverBoundary:'Manhattan borough',
    availabilityAtOriginalT0:'NOT_VERIFIED'},
  {target:'crzEntries',driver:'cbdEntries',
    declaredRelation:'STRUCTURAL_NESTING_NEGATIVE_CONTROL',
    targetUnit:'estimated_vehicle_entries/day',driverUnit:'estimated_vehicle_entries/day',
    targetBoundary:'nested CRZ toll zone',driverBoundary:'CBD road entrance zone',
    availabilityAtOriginalT0:'NOT_VERIFIED'},
] as const;

const LAG=2; // the last completed daily aggregate must precede the target day
const OWN_LAG=9;
const CONTROL_LAG=16;
const CONTROL_OLDER=23;
const START_INDEX=CONTROL_OLDER;
const RIDGE_ALPHA=25;
const TRAIN_THROUGH='2026-04-30';
const VALIDATION_THROUGH='2026-06-30';
const round=(x:number)=>Number(x.toFixed(6));
const avg=(v:number[])=>v.reduce((s,x)=>s+x,0)/v.length;

function solveRidge(features:number[][],outcomes:number[]):Trained {
  if(features.length!==outcomes.length || features.length<50)throw Error('MIHM_P2_INSUFFICIENT_TRAINING');
  const width=features[0].length;
  if(![1,2].includes(width)||features.some(x=>x.length!==width))throw Error('MIHM_P2_INVALID_DIMENSION');
  const means=Array.from({length:width},(_,j)=>avg(features.map(x=>x[j])));
  const scales=Array.from({length:width},(_,j)=>{
    const variance=avg(features.map(x=>(x[j]-means[j])**2));
    return Math.sqrt(variance)||1;
  });
  const z=features.map(row=>row.map((x,j)=>(x-means[j])/scales[j]));
  const meanOutcome=avg(outcomes);
  const b=Array.from({length:width},(_,j)=>z.reduce((s,row,i)=>s+row[j]*(outcomes[i]-meanOutcome),0));
  const gram=Array.from({length:width},(_,i)=>Array.from({length:width},(_,j)=>
    z.reduce((sum,row)=>sum+row[i]*row[j],0)+(i===j?RIDGE_ALPHA:0)));
  let coefficients:number[];
  if(width===1){
    coefficients=[b[0]/gram[0][0]];
  }else{
    const det=gram[0][0]*gram[1][1]-gram[0][1]*gram[1][0];
    if(!Number.isFinite(det)||det<=1e-10)throw Error('MIHM_P2_SINGULAR_DESIGN');
    coefficients=[(b[0]*gram[1][1]-b[1]*gram[0][1])/det,
      (b[1]*gram[0][0]-b[0]*gram[1][0])/det];
  }
  if(![...means,...scales,...coefficients,meanOutcome].every(Number.isFinite))
    throw Error('MIHM_P2_NONFINITE_PARAMETERS');
  return {meanOutcome,means,scales,coefficients};
}
function features(rows:MihmManhattanP1Archive['rows'],i:number,pair:MihmP2Pair,mode:MihmP2Mode){
  const diff=(metric:MihmP2Series,young:number,old:number)=>
    rows[i-young][metric]-rows[i-old][metric];
  const own=diff(pair.target,LAG,OWN_LAG);
  if(mode==='OWN_LAG')return [own];
  if(mode==='CROSS_LAG2')return [own,diff(pair.driver,LAG,OWN_LAG)];
  if(mode==='AGE_SHIFT_PLACEBO')return [own,diff(pair.driver,CONTROL_LAG,CONTROL_OLDER)];
  return [];
}
function predict(rows:MihmManhattanP1Archive['rows'],i:number,pair:MihmP2Pair,
  mode:MihmP2Mode,trained:Trained|null){
  const baseline=rows[i-7][pair.target];
  if(mode==='WEEKLY_NAIVE')return baseline;
  if(!trained)throw Error('MIHM_P2_MODEL_NOT_FITTED');
  const f=features(rows,i,pair,mode);
  let delta=trained.meanOutcome;
  for(let j=0;j<f.length;j++)delta+=trained.coefficients[j]*(f[j]-trained.means[j])/trained.scales[j];
  const forecast=Math.max(0,baseline+delta);
  if(!Number.isFinite(forecast))throw Error('MIHM_P2_NONFINITE_PREDICTION');
  return forecast;
}
function score(truth:number[],forecast:number[]):Scored {
  if(!truth.length||truth.length!==forecast.length)throw Error('MIHM_P2_INVALID_SCORE');
  const residuals=truth.map((v,i)=>forecast[i]-v);
  const mae=avg(residuals.map(x=>Math.abs(x)));
  const rmse=Math.sqrt(avg(residuals.map(x=>x*x)));
  const bias=avg(residuals);
  if(![mae,rmse,bias].every(Number.isFinite))throw Error('MIHM_P2_SCORE_OVERFLOW');
  return {mae:round(mae),rmse:round(rmse),bias:round(bias),days:truth.length};
}
function gain(rival:Scored,candidate:Scored){return round(rival.mae-candidate.mae);}
type P2EvaluatedPair={
  target:MihmP2Series;driver:MihmP2Series;
  declaredRelation:MihmP2Pair['declaredRelation'];
  targetUnit:string;driverUnit:string;targetBoundary:string;driverBoundary:string;
  samples:{train:number;validation:number;historicalAudit:number};
  models:Record<MihmP2Mode,{
    validation:Scored;historicalAudit:Scored;
    trained:Trained|null;
  }>;
  validationGain:{
    crossMinusOwn:number;crossMinusEqualSizePlacebo:number;
  };
  historicalAuditGain:{
    crossMinusOwn:number;crossMinusEqualSizePlacebo:number;
  };
  placeboIsFeatureMatched:true;
  independentCrossSystemEffectEstablished:false;
  causalPropagationEstablished:false;
  realWorldForecastEligible:false;
};
export type MihmP2Result={
  contract:typeof SFI_MIHM_FOUNDATION_P2_LAGGED;
  status:'RETROSPECTIVE_DIAGNOSTIC__VINTAGE_BLOCKED'|'ABSTAINED_P1_INVALID';
  reasons:string[];pairs:P2EvaluatedPair[];
  chronology:{
    training:['2025-10-24','2026-04-30'];
    validation:['2026-05-01','2026-06-30'];
    historicalAuditAlreadyInspected:['2026-07-01','2026-09-30'];
    featureMinimumLagDays:2;
    datedResponseVintagesVerified:false;
  };
  fixedMethod:{
    historicalWeeklyBaseline:true;
    ridgeAlpha:25;trainedOnlyThrough:'2026-04-30';
    placeboLagDays:16;placeboFeatureCountMatchesCross:true;
    calibrationWasChosenAfterExposureToArchive:true;
  };
  noCanonicalPhi:true;canonicalPhiCalculated:false;
  homeostasisEstablished:false;
  independentProspectiveValidation:false;
  externalReturnRecorded:false;
  productionPromotionAllowed:false;
};
const chronology={
  training:['2025-10-24','2026-04-30'] as ['2025-10-24','2026-04-30'],
  validation:['2026-05-01','2026-06-30'] as ['2026-05-01','2026-06-30'],
  historicalAuditAlreadyInspected:['2026-07-01','2026-09-30'] as ['2026-07-01','2026-09-30'],
  featureMinimumLagDays:2 as const,datedResponseVintagesVerified:false as const,
};
const fixedMethod={
  historicalWeeklyBaseline:true as const,ridgeAlpha:RIDGE_ALPHA as 25,
  trainedOnlyThrough:TRAIN_THROUGH as '2026-04-30',
  placeboLagDays:CONTROL_LAG as 16,
  placeboFeatureCountMatchesCross:true as const,
  calibrationWasChosenAfterExposureToArchive:true as const,
};

/**
 * Reuses P1's strict source / time / count / geography checks. Returns
 * no models if the documentary audit is contradicted. A diagnostic result
 * is never source-vintage admissibility, causal discovery, or homeostasis.
 */
export function assessMihmFoundationLaggedDynamics(archive:MihmManhattanP1Archive):MihmP2Result {
  const p1=assessMihmManhattanSourceMetrology(archive);
  const base={
    contract:SFI_MIHM_FOUNDATION_P2_LAGGED,
    chronology,fixedMethod,noCanonicalPhi:true as const,
    canonicalPhiCalculated:false as const,homeostasisEstablished:false as const,
    independentProspectiveValidation:false as const,externalReturnRecorded:false as const,
    productionPromotionAllowed:false as const,
  };
  if(p1.status!=='DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED'){
    return {...base,status:'ABSTAINED_P1_INVALID',reasons:p1.reasons,pairs:[]} as MihmP2Result;
  }
  const rows=archive.rows;
  const train=rows.map((_,i)=>i).filter(i=>i>=START_INDEX&&rows[i].day<=TRAIN_THROUGH);
  const valid=rows.map((_,i)=>i).filter(i=>i>=START_INDEX&&rows[i].day>TRAIN_THROUGH&&rows[i].day<=VALIDATION_THROUGH);
  const historicalAudit=rows.map((_,i)=>i).filter(i=>rows[i].day>VALIDATION_THROUGH);
  if(train.length<140||valid.length!==61||historicalAudit.length!==92)
    return {...base,status:'ABSTAINED_P1_INVALID',reasons:['P2_CHRONOLOGICAL_SPLIT_INVALID'],pairs:[]} as MihmP2Result;
  try {
    const pairs=MIHM_P2_DECLARED_PAIRS.map(pair=>{
      const outcomes=train.map(i=>rows[i][pair.target]-rows[i-7][pair.target]);
      const models={} as P2EvaluatedPair['models'];
      for(const mode of ['WEEKLY_NAIVE','OWN_LAG','CROSS_LAG2','AGE_SHIFT_PLACEBO'] as const){
        const trained=mode==='WEEKLY_NAIVE'?null:
          solveRidge(train.map(i=>features(rows,i,pair,mode)),outcomes);
        const evaluate=(indices:number[])=>score(
          indices.map(i=>rows[i][pair.target]),
          indices.map(i=>predict(rows,i,pair,mode,trained)));
        models[mode]={validation:evaluate(valid),historicalAudit:evaluate(historicalAudit),trained};
      }
      return {
        target:pair.target,driver:pair.driver,declaredRelation:pair.declaredRelation,
        targetUnit:pair.targetUnit,driverUnit:pair.driverUnit,
        targetBoundary:pair.targetBoundary,driverBoundary:pair.driverBoundary,
        samples:{train:train.length,validation:valid.length,historicalAudit:historicalAudit.length},
        models,
        validationGain:{
          crossMinusOwn:gain(models.OWN_LAG.validation,models.CROSS_LAG2.validation),
          crossMinusEqualSizePlacebo:gain(models.AGE_SHIFT_PLACEBO.validation,models.CROSS_LAG2.validation),
        },
        historicalAuditGain:{
          crossMinusOwn:gain(models.OWN_LAG.historicalAudit,models.CROSS_LAG2.historicalAudit),
          crossMinusEqualSizePlacebo:gain(models.AGE_SHIFT_PLACEBO.historicalAudit,models.CROSS_LAG2.historicalAudit),
        },
        placeboIsFeatureMatched:true as const,
        independentCrossSystemEffectEstablished:false as const,
        causalPropagationEstablished:false as const,
        realWorldForecastEligible:false as const,
      };
    });
    return {...base,status:'RETROSPECTIVE_DIAGNOSTIC__VINTAGE_BLOCKED',reasons:[
      'ALL_SOURCE_VINTAGES_AT_HISTORICAL_T0_UNVERIFIED',
      'FDNY_ANNUAL_PUBLICATION_BLOCKS_DAY_AHEAD_AS_OF_CLAIMS',
      'PREVIOUS_G2B_AND_JULY_SEPTEMBER_HISTORIC_OUTCOMES_ALREADY_INSPECTED',
      'CRZ_CBD_STRUCTURAL_NESTING_IS_A_NEGATIVE_CONTROL_NOT_INDEPENDENT_CAUSAL_EVIDENCE',
      'POSTHOC_RESEARCH_DIAGNOSTIC_NO_PROSPECTIVE_MODEL_PROMOTION',
    ],pairs};
  } catch {
    return {...base,status:'ABSTAINED_P1_INVALID',reasons:['P2_NONFINITE_OR_UNSTABLE_MODEL'],pairs:[]} as MihmP2Result;
  }
}
