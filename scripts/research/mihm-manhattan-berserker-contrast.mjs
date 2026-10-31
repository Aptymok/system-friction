import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Berserker is a challenger reading of the EXISTING fixed benchmark, not an
// independently trained model. Shared inputs and outcome dates are mandatory.
const root='docs/research/evidence/';
const raw=readFileSync(root+'MIHM-MANHATTAN-365D-2025-10-2026-09.json');
const dataset=JSON.parse(raw);
const sha=createHash('sha256').update(raw).digest('hex');
const benchmark=JSON.parse(readFileSync(root+'MIHM-MANHATTAN-365D-MODEL-CONTRAST-2026-10-25.json','utf8'));
assert.equal(benchmark.sourceFixtureSHA256,sha);
assert.equal(dataset.dataAsOfOriginalDates,'NOT_VERIFIED');
assert.equal(benchmark.scientificDisposition.canonicalMihmValidated,false);
const rows=benchmark.results.map(row=>{
  const rivals=Object.entries(row.models).map(([id,m])=>({
    id,calibrationMAE:m.calibrationMAE,mae:m.test.MAE,rmse:m.test.RMSE,
    train:row.n.train,calibration:row.n.calibration,test:row.n.test
  }));
  const selected=[...rivals].sort((a,b)=>a.calibrationMAE-b.calibrationMAE)[0];
  const bestTestDescriptive=[...rivals].sort((a,b)=>a.mae-b.mae)[0];
  const experimental=rivals.find(r=>r.id==='M2');
  const ownHistory=rivals.find(r=>r.id==='M0');
  const placebo=rivals.find(r=>r.id==='PLACEBO');
  assert(selected&&bestTestDescriptive&&experimental&&ownHistory&&placebo);
  return {
    target:row.target,sharedArchiveSha256:sha,sharedEvaluationDates:row.evaluationDates,
    modelResults:rivals,
    selectedByCalibration: selected.id,
    selectedCalibrationMAE:selected.calibrationMAE,
    selectedTestMAE:selected.mae,
    lowestTestErrorPosthocOnly:bestTestDescriptive.id,
    modelSelectionBoundary:'SELECTION_CALIBRATION_ONLY__TEST_RANKING_DESCRIPTIVE_NOT_MODEL_SELECTION',
    exploratoryChallenges:[
      {question:'Does M2 beat its own-history baseline?',answer:experimental.mae<ownHistory.mae?'DESCRIPTIVE_YES':'DESCRIPTIVE_NO'},
      {question:'Does M2 beat the equal-budget placebo?',answer:experimental.mae<placebo.mae?'DESCRIPTIVE_YES':'DESCRIPTIVE_NO'},
    ],
    discoveryStatus:'POSTHOC_REINTERPRETATION_NOT_NEW_MODEL_EXECUTION',
    causalStatus:'NOT_ESTABLISHED'
  };
});
const result={
  contract:'SFI-MIHM-MANHATTAN-BERSERKER-CHALLENGE-0.1',
  method:'CHALLENGER_AUDIT_OF_EXISTING_BENCHMARK',
  academicControlPreserved:true,independentBerserkerModelRun:false,
  originalArchiveSha256:sha,retrospective:true,
  originalT0SourceVintageVerified:false,
  newEmpiricalObservation:false,returnCreated:false,
  targets:rows,scientificDisposition:'EXPLORATORY_RIVAL_AUDIT_ONLY',
  experimentalM2SelectedByCalibration:rows.some(r=>r.selectedByCalibration==='M2'),
  next:'Implement and preregister a distinct Berserker method before claiming new competing predictions. Compare on a future common holdout.'
};
console.log(JSON.stringify(result,null,2));
