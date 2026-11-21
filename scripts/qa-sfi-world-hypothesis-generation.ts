import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareWorldHypothesisPrompt,diagnoseWorldHypothesisResponse,selectWorldHypothesisSeeds} from '../src/lib/world-observatory/hypothesisGenerationBoundary';
const original=readFileSync('src/lib/world-observatory/hypothesisCycle.ts','utf8');
assert(original.includes('prepareWorldHypothesisPrompt({'));
assert(!original.includes('}).slice(0, 30000)'), 'The model input must never be truncated into invalid JSON');
assert(original.includes('diagnoseWorldHypothesisResponse(llm.result)'));
assert(original.includes("state: inferred.warning ? 'GENERATION_BLOCKED' : 'NO_HYPOTHESIS'"));
const crowded = [
 ...Array.from({length:20}, (_,i)=>({observation:{id:'news-'+i,source_family:'NEWS'}})),
 ...Array.from({length:4}, (_,i)=>({observation:{id:'government-'+i,source_family:'GOVERNMENT'}})),
 ...Array.from({length:4}, (_,i)=>({observation:{id:'science-'+i,source_family:'SCIENCE'}})),
];
const diverseSeeds = selectWorldHypothesisSeeds(crowded, 12);
assert.equal(diverseSeeds.length, 12);
assert.deepEqual([...new Set(diverseSeeds.map(x=>x.observation.source_family))], ['NEWS', 'GOVERNMENT', 'SCIENCE']);
assert.equal(diverseSeeds.filter(x=>x.observation.source_family==='NEWS').length, 4);
assert.equal(diverseSeeds[0].observation.id, 'news-0', 'original recency order within family preserved');
assert.equal(selectWorldHypothesisSeeds(crowded, 0).length, 0);
assert.equal(selectWorldHypothesisSeeds(crowded, 100).length, 12, 'cost cap stays fixed');
assert.equal(selectWorldHypothesisSeeds(crowded.concat(crowded[0]), 12).length, 12, 'duplicate source observations excluded');
assert(original.includes('selectWorldHypothesisSeeds(items, 12)'), 'runtime must consume source-diverse seed selection');
assert(original.includes('abstentionReason:'), 'valid scientific abstentions must retain explanations');
assert(original.includes('sourceFamilies:'), 'candidate source-family coverage must remain visible');

const evidence=Array.from({length:8},(_,i)=>({
 id:'observed-'+i,sourceFamily:i%2?'NEWS':'GOVERNMENT',
 title:'Short source '+i,summary:'x'.repeat(40000),payload:'y'.repeat(90000),
 observedAt:'2026-11-10T00:00:00Z',
 metrics:{systemicFriction:.3},sourceUrl:'https://example.org/'+i
}));
const out=prepareWorldHypothesisPrompt({methodology:'v1',testContract:'SFI-HYPOTHESIS-TEST-1.0',
 learningProfile:{sampleSize:120,tightenDiscrimination:true},observations:evidence,
 derivedRelations:Array.from({length:200},()=>({from:'observed-1',to:'observed-2',relation:'STRUCTURAL_COINCIDENCE'}))});
const p=JSON.parse(out.prompt);
assert.equal(p.observations.length,8);assert.equal(p.derivedRelations.length,24);
assert.equal(p.observations[0].id,'observed-0');
assert(!out.prompt.includes('yyyyyyyyyy'));
assert(out.prompt.length<16000,'LLM prompt remains bounded without cutting JSON');
assert.equal(diagnoseWorldHypothesisResponse('not json').code,'MALFORMED_JSON');
assert.equal(diagnoseWorldHypothesisResponse('{"decision":"BAD"}').code,'INVALID_DECISION');
assert.equal(diagnoseWorldHypothesisResponse('{"decision":"PROPOSE","testContract":null}').code,'MISSING_OR_INVALID_TEST_CONTRACT');
assert.equal(diagnoseWorldHypothesisResponse('{"decision":"NO_HYPOTHESIS","testContract":null}').code,'VALID_NO_HYPOTHESIS');
const strict={
 decision:'PROPOSE',testContract:{
 contract:'SFI-HYPOTHESIS-TEST-1.0',horizonHours:48,horizonBasis:'Published daily observation window',
 minimumEvidenceCount:2,minimumSourceFamilies:2,
 expectedCriteria:[{id:'expect',signal:'daily records with a documented status',operator:'COUNT_GTE',threshold:2,required:true,minimumObservations:2,sourceFamilies:['NEWS','GOVERNMENT']}],
 contradictionCriteria:[{id:'refute',signal:'continued absence after the period',operator:'ABSENCE',threshold:null,required:true,minimumObservations:2,sourceFamilies:['NEWS','GOVERNMENT']}],
 passRule:'Only if independently measured',failRule:'If contradictory evidence observed',inconclusiveRule:'Insufficient coverage'
 }};
assert.equal(diagnoseWorldHypothesisResponse(JSON.stringify(strict)).code,'VALID_PROPOSE');
strict.testContract.horizonHours=0;
assert.equal(diagnoseWorldHypothesisResponse(JSON.stringify(strict)).code,'MISSING_OR_INVALID_TEST_CONTRACT');

import {summarizeWorldHypothesisAttempt} from '../src/lib/world-observatory/hypothesisAttemptDiagnostics';
assert.equal(summarizeWorldHypothesisAttempt(null).state,'NOT_OBSERVED');
const diagnostic=summarizeWorldHypothesisAttempt({
 event_id:'receipt-1',event_name:'external.world.daily_cycle.completed',
 occurred_at:'2026-11-21T07:00:00Z',
 payload:{hypothesis:{ok:true,created:0,considered:16,clusters:3,
 warnings:['hypothesis_generation_malformed_json','governed_model_unavailable'],
 results:[
  {state:'NO_HYPOTHESIS',evidenceCount:2,sourceFamilies:['NEWS','SCIENCE'],abstentionReason:'Evidence does not support a falsifiable threshold.'},
  {state:'GENERATION_BLOCKED',warning:'hypothesis_generation_invalid_decision',evidenceCount:3},
 ]}}
});
assert.equal(diagnostic.state,'RECORDED');
if (!('resultStateCounts' in diagnostic)) throw new Error('expected_recorded_diagnostic');
assert.equal(diagnostic.created,0);
assert.equal(diagnostic.resultStateCounts.NO_HYPOTHESIS,1);
assert.equal(diagnostic.resultStateCounts.GENERATION_BLOCKED,1);
assert.equal(diagnostic.resultsSample[0].abstentionReason,'Evidence does not support a falsifiable threshold.');
assert.deepEqual(diagnostic.warningClasses,['HYPOTHESIS_GENERATION_MALFORMED_JSON','MODEL_OR_PROVIDER_UNAVAILABLE']);
assert.equal(summarizeWorldHypothesisAttempt({payload:{}}).state,'STAGE_NOT_RECORDED');
const projected=summarizeWorldHypothesisAttempt({event_id:'receipt-2',stageOk:true,created:0,considered:4,clusters:1,warnings:[],results:[{state:'NO_HYPOTHESIS',abstentionReason:'Valid scientific abstention'}]});
if (!('resultStateCounts' in projected)) throw new Error('expected_narrow_projection');
assert.equal(projected.resultStateCounts.NO_HYPOTHESIS,1);
assert.equal(projected.created,0);
const exposedRoute=readFileSync('src/app/api/external/v1/world/route.ts','utf8');
assert(exposedRoute.includes('body.includeHypothesisDiagnostics !== true'), 'Diagnostic payload requires explicit opt-in');
assert(exposedRoute.includes('stageOk:payload->hypothesis->ok'), 'Diagnostic query must use narrow JSONB projection');
assert(!exposedRoute.includes("select('event_id,event_name,occurred_at,payload')"), 'Diagnostic route cannot fetch whole receipt payload');
assert(exposedRoute.includes('summarizeWorldHypothesisAttempt(recentAttempt.data)'), 'Read-only diagnostic owner must be wired');

console.log('PASS · World hypothesis prompt preserves source identity, bounded valid JSON, explicit diagnostic and strict prospective testing');
