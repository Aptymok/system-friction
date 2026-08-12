import assert from 'node:assert/strict';
import fs from 'node:fs';

const proof = fs.readFileSync('src/lib/root/closure/totalProof.ts','utf8');
const readiness = fs.readFileSync('src/lib/root/closure/readInstitutionalReadiness.ts','utf8');
const page = fs.readFileSync('src/app/root/readiness/page.tsx','utf8');
const route = fs.readFileSync('src/app/api/root/readiness/route.ts','utf8');

for (const stage of ['STRUCTURAL','AUTHORITY','OBSERVATION','INTERVENTION','RETURN','LAB','LEARNING','REPORTING']) {
  assert.match(proof, new RegExp(`id:'${stage}'`), `missing_total_proof_stage:${stage}`);
}
assert.match(proof,/field_outcomes/,'total_proof_missing_real_outcome_gate');
assert.match(proof,/longitudinalPass = stages\.every/,'longitudinal_proof_not_all_stages');
assert.match(proof,/software build, simulation, proposal or registered fork cannot satisfy/i,'truth_boundary_missing');
assert.match(proof,/institutional\.total_proof\.recorded/,'proof_receipt_event_missing');
assert.match(proof,/requireGovernedActor\('root\.total-proof\.record'\)/,'proof_receipt_not_governed');
assert.match(route,/requireRootViewer/,'proof_read_not_root_guarded');
assert.match(page,/LONGITUDINAL/,'proof_page_missing_longitudinal_state');
assert.match(readiness,/scientificComplete:false/,'software_must_not_claim_scientific_completion');
assert.match(readiness,/externalGates/,'external_gate_separation_missing');

console.log(JSON.stringify({ok:true,contract:'SFI-TOTAL-PROOF-1.0',stages:8},null,2));
