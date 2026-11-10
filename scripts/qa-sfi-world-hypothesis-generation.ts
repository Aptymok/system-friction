import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareWorldHypothesisPrompt,diagnoseWorldHypothesisResponse} from '../src/lib/world-observatory/hypothesisGenerationBoundary';
const original=readFileSync('src/lib/world-observatory/hypothesisCycle.ts','utf8');
assert(original.includes('prepareWorldHypothesisPrompt({'));
assert(!original.includes('}).slice(0, 30000)'), 'The model input must never be truncated into invalid JSON');
assert(original.includes('diagnoseWorldHypothesisResponse(llm.result)'));
assert(original.includes("state: inferred.warning ? 'GENERATION_BLOCKED' : 'NO_HYPOTHESIS'"));
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
console.log('PASS · World hypothesis prompt preserves source identity, bounded valid JSON, explicit diagnostic and strict prospective testing');
