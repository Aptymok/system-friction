import test from 'node:test';
import assert from 'node:assert/strict';
import { mihmAgent } from './mihmAgent';
import { buildScoreFrictionOperationalReading } from '../../../scorefriction/python/pythonMihmToOperational';
const archaeology={symbolicStructures:[],narratives:[],emotionalStructures:[],archetypes:[],contradictions:[],socialTensions:[]};
test('text length cannot fabricate MIHM measurements',async()=>{
 await assert.rejects(()=>mihmAgent({kind:'song',title:'test',text:'x'.repeat(3000)},archaeology),/MIHM_MEASUREMENTS_REQUIRED/);
});
test('provided bounded measurements preserve values and provenance',async()=>{
 const input:any={kind:'song',title:'test',mihmMeasurement:{sourceRef:'analysis:1',caseId:'case:1',methodVersion:'audio:1',observedAt:'2026-10-28T00:00:00Z',scale:'0-1',values:{ihg:.2,nti:.4,ldi:.6}}};
 const result=await mihmAgent(input,archaeology);
 assert.deepEqual(result.map(x=>x.score),[.2,.4,.6]);
 assert.deepEqual(result[0].evidence,['analysis:1']);
 assert.equal(result[0].measurementProvenance?.caseId,'case:1');
 assert.equal(result[0].measurementProvenance?.observedAt,'2026-10-28T00:00:00Z');
 assert.equal(result[0].measurementProvenance?.independentlyVerified,false);
 input.mihmMeasurement.values.ihg=null;
 await assert.rejects(()=>mihmAgent(input,archaeology),/MIHM_MEASUREMENTS_INVALID/);
});
test('null acoustic and semantic values remain insufficient rather than low measured signal',()=>{
 const r=buildScoreFrictionOperationalReading({mihmVector:{F_s:null,R_sem:null,C_sem:null},ihgFinal:null});
 assert.equal(r.ihgLevel,'insuficiente');assert.match(r.friction,/insuficiente/);assert.match(r.semanticField,/insuficiente/);assert.match(r.invisibilityRisk,/insuficiente/);
});
