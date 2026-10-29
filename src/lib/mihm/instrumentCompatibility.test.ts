import test from 'node:test';
import assert from 'node:assert/strict';
import * as instruments from './instrumentContract';
import { getMihmPhiDefinition } from './phiContract';
function reading(type='SYSTEMIC',symbol='PHI_S',value=.5):any {
 const d=getMihmPhiDefinition(symbol as any);
 return {instrument:d.methodId,instrumentType:type,objectId:'case:1',variables:[],homeostaticState:{symbol,label:d.notation,value,scale:'0-1',semanticRole:d.semanticRole,formulaRef:d.formulaAuthority,formulaVersion:d.formulaVersion,epistemicStatus:'DERIVED'},confidence:null,trajectory:null,prediction:null,observedAt:'2026-10-28T00:00:00Z',warnings:[]};
}
function assess(readings:any[],links:any[]=[]) {
 const fn=(instruments as any).assessMihmInstrumentCompatibility;
 assert.equal(typeof fn,'function');return fn({readings,links,timeCut:'2026-10-29T00:00:00Z'});
}
test('different typed Phi coexist as context but cannot be averaged or substituted',()=>{
 const a=reading(),b=reading('WORLD','PHI_W');
 assert.equal(assess([a,b],[{left:0,right:1,operation:'CONTEXT'}]).readiness,'COMPATIBLE_FOR_REVIEW');
 const o=assess([a,b],[{left:0,right:1,operation:'COMPARE'}]);
 assert.equal(o.readiness,'CONTRADICTED');assert.equal(o.decisionAuthorized,false);
 assert.equal(assess([a,b],[{left:0,right:1,operation:'AVERAGE'}]).readiness,'CONTRADICTED');
});
test('mismatched family, formula and conflicting same-snapshot values block review',()=>{
 const a=reading();
 for(const b of [reading('PERSONAL','PHI_S'),{...a,homeostaticState:{...a.homeostaticState,formulaVersion:'invented'}},reading('SYSTEMIC','PHI_S',.9)]) {
  assert.equal(assess([a,b]).readiness,'CONTRADICTED');
 }
});
test('absent readings, missing metrics and future readings cannot pass decision admission',()=>{
 assert.equal(assess([]).readiness,'INCOMPLETE');
 const a=reading();a.homeostaticState.value=null;
 assert.equal(assess([a]).readiness,'INCOMPLETE');
 assert.equal(assess([{...reading(),observedAt:'2099-01-01T00:00:00Z'}]).readiness,'CONTRADICTED');
});

test('world snapshots retain identity while comparing their declared stable global context',()=>{
 const a=reading('WORLD','PHI_W'),b=reading('WORLD','PHI_W',.6);
 a.objectId='snapshot:a';a.snapshotRef=a.objectId;a.comparisonSubjectId='worldspect:global-context';
 b.objectId='snapshot:b';b.snapshotRef=b.objectId;b.comparisonSubjectId='worldspect:global-context';b.observedAt='2026-10-28T01:00:00Z';
 assert.equal(assess([a,b],[{left:0,right:1,operation:'COMPARE'}]).readiness,'COMPATIBLE_FOR_REVIEW');
 delete b.snapshotRef;
 assert.equal(assess([a,b],[{left:0,right:1,operation:'COMPARE'}]).readiness,'CONTRADICTED');
});
