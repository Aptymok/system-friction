/**
 * MIHM research: development-only calibration decision (never production).
 * Uses CALIBRATION MAE only; deliberately ignores all held-out test scores.
 * This policy was specified after exposure to first historical evaluation:
 * running it now is diagnostic, NOT an independent confirmation.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const F='docs/research/evidence/MIHM-MANHATTAN-365D-MODEL-CONTRAST-2026-10-25.json';
const MODELS=['M0','M1','M2'];
function decide(report){
  assert.equal(report.contract,'MIHM-MANHATTAN-365D-MODEL-CONTRAST-0.1');
  assert(report.results.length===3,'All targets must be retained');
  const out=[];
  for(const t of report.results){
    assert.equal(t.n.calibration,61);
    const val=Object.fromEntries([...MODELS,'PLACEBO'].map(k=>{
      const v=t.models[k]?.calibrationMAE;
      assert(Number.isFinite(v)&&v>0,'Missing calibration MAE '+k);
      return [k,v];
    }));
    let chosen=MODELS.reduce((a,b)=>val[b]<val[a]?b:a);
    const original=chosen;
    // A proposed "MIHM-like" shock effect must defeat a feature-budget
    // matched older-lag control in calibration, not merely a weak baseline.
    if(chosen==='M2'&&val.M2>=val.PLACEBO){
      chosen=['M0','M1'].reduce((a,b)=>val[b]<val[a]?b:a);
    }
    out.push({
      target:t.target,chosen,initialLowestCalibrationError:original,
      calibrationMAEByModel:val,
      modelPromotionAllowed:false,
      scientificMeaning:chosen==='M0'?
        'No added cross-agency features warranted on calibration dates':
        'Candidate requires new unused future-world test before any claim',
      historicalTestScoresConsultedByDecision:false
    });
  }
  return {
    status:'POST_AUDIT_DIAGNOSTIC_CALIBRATION_RULE',
    policyIntroducedAfterFirst92DayAudit:true,
    sourceEvidence:F,
    independenceClaim:false,productionPromotionAllowed:false,
    selectionBasis:'ONLY 2026-05-01 through 2026-06-30 calibration MAE',
    decisions:out,
    futureGate:'Prospectively freeze selected hypothesis; verify on new source-vintage-safe outcome dates or independent context, not already-consulted July-Sep 2026'
  };
}
function selfTest(){
  const stub={contract:'MIHM-MANHATTAN-365D-MODEL-CONTRAST-0.1',
    results:['service311','fdnyCount','cbdEntries'].map(target=>({
      target,n:{calibration:61},
      models:{
        M0:{calibrationMAE:4,test:{MAE:1000}},
        M1:{calibrationMAE:3,test:{MAE:0}},
        M2:{calibrationMAE:2,test:{MAE:0}},
        PLACEBO:{calibrationMAE:1,test:{MAE:0}}
      }
    }))};
  const a=decide(stub);
  assert(a.decisions.every(t=>t.chosen==='M1'),'M2 not allowed to beat a superior same-size alternative');
  stub.results[0].models.M2.calibrationMAE=0.5;
  assert.equal(decide(stub).decisions[0].chosen,'M2','A specifically useful M2 may remain a candidate');
  const changed=structuredClone(stub);
  for(const r of changed.results)for(const k of [...MODELS,'PLACEBO'])r.models[k].test.MAE=-999999;
  assert.deepEqual(decide(stub),decide(changed),'No test-label leakage into calibration decision');
  console.log(JSON.stringify({status:'SYNTHETIC_CALIBRATION_SELECTION_PASS',
    auditPeriodUsedInSelection:false,actualScientificValidation:false}));
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--decide')){
  const data=JSON.parse(readFileSync(F,'utf8'));
  console.log(JSON.stringify(decide(data),null,2));
}else throw Error('Use --self-test or --decide; decision never promotes or writes externally');
