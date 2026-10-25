import assert from 'node:assert/strict';
import test from 'node:test';
import {projectCaseLabel,summarizeCaseScope} from './caseDisplayName';

test('generic subject is not shown as a case title',()=>{
 const row=projectCaseLabel({id:'case-1',subject:'SYSTEM',scope:'Objeto: Diagnóstico WorldSpect del instituto. Verificar registros.'});
 assert.equal(row.title,'Diagnóstico WorldSpect del instituto');
});
test('a missing description is not replaced with an opaque ID',()=>{
 const row=projectCaseLabel({id:'case-2',subject:'AI_SYSTEM'});
 assert.equal(row.title,'Expediente sin nombre descriptivo');
 assert.equal(row.lacksDescription,true);
});
test('short scope respects readable width',()=>{
 const label=summarizeCaseScope('Analyze the observed state of a case with documented sources and unresolved gaps.',65);
 assert.ok(label&&label.length<=66);
});
