#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildTransparency } from './lib/programRequirementTransparency.mjs';
const source = 'docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion';
const report={
  repository:'Aptymok/system-friction',
  head:'0123456789abcdef',
  contract:'SFI-PROGRAM-COMPLETION-CONTROLLER-1.4',
  requirements:Array.from({length:205},(_,i)=>({
    id:'MASTER-'+String(i+1).padStart(2,'0'),
    source, owner:'SFI-00', class:'PROGRAM_CRITERION',
    status:i===0?'SATISFIED':'PARTIAL',
    requirement:'Verify exact requirement '+(i+1)+' against a reproducible observed RETURN.',
    evidence:[],trajectoryRef:'#405',
    nextAction:'Verify the requirement.',
    returnCondition:'Observed RETURN.',
    completionReceipt:{state:i===0?'VALID':'ABSENT',error:null},
  }))
};
const before=JSON.stringify(report);
const output=buildTransparency(report);
assert.equal(JSON.stringify(report),before,'read-only projection must not mutate canonical controller');
assert.equal(output.json.requirementCount,205);
assert.equal(output.json.countDrift,false);
assert.equal(output.json.programIndex.P01.deliverables.length,4);
assert.equal(Object.keys(output.json.programIndex).length,25);
assert.equal(output.json.mappingAuthority,'CANDIDATE_NOT_VERIFIED');
assert.equal(output.json.programIndex.P01.certificationPercent,null);
assert.equal(output.json.requirements[0].completionReceiptState,'VALID');
assert.equal(output.json.requirements[0].objectiveLiteral,report.requirements[0].requirement);
assert.equal(output.json.requirements[0].objectiveMeaningES,null,'source drift must suppress stale Spanish text');
const matchingReport={...report,requirements:[{...report.requirements[0],requirement:'a systemic question can enter through a domain-neutral signal contract;'}]};
const translated=buildTransparency(matchingReport);
assert.ok(translated.json.requirements[0].objectiveMeaningES?.includes('pregunta sistémica'),'exact original must resolve Spanish meaning');
assert.equal(translated.json.requirements[0].spanishMeaningStatus,'PROPOSED_TRANSLATION_SOURCE_MATCH');

assert.deepEqual(output.json.requirements[0].candidatePrograms,['P05','P17']);
assert.equal(output.json.requirements[204].candidatePrograms.length,0);
assert.equal(output.json.unmappedRequirementIds.includes('MASTER-205'),true);
assert.equal(output.markdown.includes('### MASTER-205'),true);
assert.equal(output.markdown.includes('**Objetivo literal (de la fuente):**'),true);
assert.equal(output.markdown.includes('**RETURN**:'),true);
assert.equal(output.json.terms.WS.includes('docs/program/workstreams/'),true);
const changed={...report,requirements:report.requirements.slice(0,204)};
assert.equal(buildTransparency(changed).json.countDrift,true);
console.log(JSON.stringify({ok:true,requirements:205,programs:25,checklistDeliverables:100,mutableCanonicalState:false}));
