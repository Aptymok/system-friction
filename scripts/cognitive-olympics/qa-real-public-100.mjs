#!/usr/bin/env node
// Independent post-run QA for REAL World Bank source rows and existing SFI_CL runner.
// A historical replay is not a client, strict historical vintage, or institutional certification.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const dataDir=path.resolve(process.env.SFI_CL_DATA_DIR||'.sfi-cl/data/world-bank');
const runDir=path.resolve(process.env.SFI_CL_RUN_DIR||'.sfi-cl/runs/public-real-100');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const datasetBytes=await fs.readFile(path.join(dataDir,'world-bank.jsonl'));
const dataset=datasetBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const manifest=JSON.parse(await fs.readFile(path.join(dataDir,'manifest.json'),'utf8'));
assert.ok(manifest.records>=100 && dataset.length===manifest.records,'at least 100 actual source rows');
assert.equal(manifest.strictReplayEligible,false,'revised historical series must not be vintage-certified');
assert.ok(manifest.countries>=10,'source diversity required');
for(const row of dataset){
 assert.equal(row.source,'WORLD_BANK_API');
 assert.match(row.sourceUrl,/^https:\/\/api\.worldbank\.org\/v2\/country\/all\/indicator\/[A-Z0-9.]+$/);
 assert.match(row.country?.iso3||'',/^[A-Z]{3}$/);
 assert.ok(Number.isFinite(row.value)&&Number.isInteger(row.year));
 assert.equal(row.temporalIntegrity,'REFERENCE_ONLY');
 assert.ok(Number.isFinite(Date.parse(row.acquiredAt)));
}
const ledgerText=await fs.readFile(path.join(runDir,'ledger.jsonl'),'utf8');
const ledger=ledgerText.split(/\r?\n/).filter(Boolean).map(JSON.parse);
assert.ok(ledger.some(x=>x.event==='RUN_FINISHED'),'runner must complete');
const bridge=ledger.filter(x=>x.event==='SFI_AGENT_BRIDGE_COMPLETED');
assert.equal(bridge.length,1,'exactly one real registered-agent bridge execution for the chosen year');
assert.equal(bridge[0].ok,true,'SFI agent bridge must really complete');
assert.ok(Array.isArray(bridge[0].executedAgents)&&bridge[0].executedAgents.length>0,'actual registered agents required');
const final=JSON.parse(await fs.readFile(path.join(runDir,'leaderboard.final.json'),'utf8'));
assert.ok(final.length>0,'baseline scores required');
assert.equal(final[0].engine,'stats:persistence','only identified statistical control; no SFI athlete is invented');
const athletes=JSON.parse(await fs.readFile(path.join(runDir,'athletes.json'),'utf8'));
assert.equal(athletes.length,1);
const year=Number(process.env.SFI_CL_CUTOFF_YEAR||2018);
const scores=JSON.parse(await fs.readFile(path.join(runDir,`year-${year}`,`${athletes[0].id}.score.json`),'utf8'));
const sealed=JSON.parse(await fs.readFile(path.join(runDir,`year-${year}`,`${athletes[0].id}.sealed.json`),'utf8'));
assert.ok(scores.score.problems>=100,'100 unique scoreable cases minimum');
assert.equal(scores.score.problems,scores.rows.length);
assert.equal(sealed.answers.length,scores.rows.length);
assert.equal(new Set(scores.rows.map(r=>r.problemId)).size,scores.rows.length,'nonduplicated problem identities required');
assert.equal(sealed.cutoffYear,year);
assert.ok(!('hiddenOutcome' in sealed.answers[0]),'sealed model responses may not contain future outcomes');
assert.ok(scores.rows.every(row=>row.evidenceInvalid===0 && row.temporalViolation===0),'no invented evidence or temporal leakage');
assert.ok(!ledger.some(x=>x.event==='HEAT_FAILED'),'zero failed heats required');
const output={
 contract:'SFI-REAL-PUBLIC-HISTORICAL-100-RETURN-1.0',state:'PASS',
 evidenceClass:'REAL_WORLD_BANK_REVISED_HISTORICAL_REPLAY',
 institutionalCertification:'NOT_EVALUATED',
 clientUse:'NOT_OBSERVED',strictHistoricalVintage:'NOT_ESTABLISHED',
 modelPerformance:'STATISTICAL_CONTROL_ONLY_NOT_SFI_PREDICTIVE_SCORE',
 simulationVsObservation:'HISTORICAL_REPLAY_WITH_REAL_SOURCE_VALUES',
 provenance:{source:'World Bank API',sourceRows:dataset.length,sourceCountries:manifest.countries,
   indicatorCount:manifest.indicatorsRequested,failedIndicators:manifest.failures,
   datasetSha256:sha256(datasetBytes),cutoffYear:year},
 scoredCases:scores.score.problems,uniqueCases:new Set(scores.rows.map(x=>x.problemId)).size,
 registeredSfiAgentsExecuted:bridge[0].executedAgents,
 baseline:{engine:final[0].engine,accuracy:scores.score.accuracy,coverage:scores.score.coverage,
   temporalIntegrity:scores.score.temporalIntegrity},
 githubHead:process.env.GITHUB_SHA||null,runId:process.env.GITHUB_RUN_ID||null,
 observedAt:new Date().toISOString()
};
await fs.mkdir(path.join(runDir,'assurance'),{recursive:true});
await fs.writeFile(path.join(runDir,'assurance','return.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output));
