import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRealityChainPdf } from '../src/components/sfi/realityChainPdf';

const ui=readFileSync('src/components/sfi/RealityChainWorkbench.tsx','utf8');
const css=readFileSync('src/components/sfi/RealityChainWorkbench.css','utf8');
const route=readFileSync('src/app/api/cases/[caseId]/objects/route.ts','utf8');
const icon=readFileSync('public/assets/sfi/instruments/RealityChain.png');
assert.equal(icon.length>1000,true,'Use the existing cinematic panorama, not a mock');
for(let i=1;i<=8;i++){
 const filename='public/assets/sfi/instruments/SFI_RCH_'+String(i).padStart(2,'0')+'.png';
 assert.ok(existsSync(filename),'Canonical stage icon '+filename+' must exist');
}
assert.ok(ui.includes('rcInspectionShell')&&ui.includes('CASE INSPECTION'),'Independent Case Inspection must exist');
assert.ok(ui.includes("index===8?'LEARNING & REPORT':stage.name"),'Ninth hub is an instrumental report/learning access, not the ninth reality stage');
assert.ok(ui.includes('NO GOVERNED LEARNING RECORDED'),'Case must admit that no governed learning was observed');
assert.ok(ui.includes("kind:'RECORD',canonicalRef:{id:candidateId"),'Learning proposal persists only as a record');
assert.ok(ui.includes("promotionState:'NOT_PROMOTED'"),'Never promote candidate to governed learning');
assert.ok(ui.includes('RETURN_REFERENCE_DOES_NOT_ESTABLISH_CAUSALITY'),'Candidate must retain causal boundary');
assert.ok(ui.includes('PERSIST LEARNING CANDIDATE · NOT CANON'),'Visible learning action must disclose epistemic status');
assert.ok(ui.includes('UPLOAD REPORT AS SOURCE'),'Reports may enter only through governed private source workflow');
assert.ok(ui.includes('src="/assets/sfi/instruments/RealityChain.png"'),'Only the real original panorama is used');
assert.ok(!ui.includes('className="rcHorizon rcThreeHorizon"'),'Do not impose compressed dashboard panels over panoramic artwork');
assert.ok(css.includes('.rcInspectionStages')&&css.includes('.rcInspectionModules'),'Independent hub has readable navigation and work area');
assert.ok(route.includes("z.enum(['RECORD','OBSERVATION'])"),'User write endpoint must not mint evidence, execution or RETURN authority');

async function verifyPdf(){
 const pdf=createRealityChainPdf({
  caseId:'QA-CASE-REPORT',subject:'QA Case — temporal reconstruction',status:'OBSERVATION_ONLY',
  cutoff:'2026-10-12',generatedAt:'2026-10-12T00:00:00Z',
  stages:[
   'WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN'
  ].map(name=>({name,role:'Epistemic boundary for '+name,count:1})),
  objects:Array.from({length:135},(_,i)=>({
   kind:i%2?'RECORD':'RETURN',role:'RECORD',observedAt:'2026-10-11T00:00:00Z',
   recordedAt:'2026-10-12T00:00:00Z',id:'QA-OBJECT-'+i,hash:null,sourceIds:['QA-SOURCE'],
   description:'Evidence-limited documentary trace '+i+'. No causal claim or external authority.',
   locator:'PAGE '+i
  })),
  learning:[{state:'NOT_PROMOTED',statement:'Candidate learning is not adopted learning.',id:'QA-CANDIDATE',returnRefs:['QA-RETURN']}],
  reportReceipts:0
 });
 assert.equal(pdf.type,'application/pdf');
 const bytes=Buffer.from(await pdf.arrayBuffer());
 const document=bytes.toString('latin1');
 assert.ok(document.startsWith('%PDF-1.4\n'),'Direct download must be a real PDF, not printable HTML renamed');
 assert.ok(document.includes('CASE INSPECTION REPORT')&&document.includes('QA-CANDIDATE'));
 assert.ok(document.includes('NOT INSTITUTIONAL CERTIFICATION'),'Report must disclose limits of authority');
 const end=/startxref\n(\d+)\n%%EOF/.exec(document);
 assert.ok(end,'Complete PDF trailer required');
 assert.equal(document.slice(Number(end[1]),Number(end[1])+5),'xref\n','PDF xref offset must be correct');
 const count=Number(/\/Type \/Pages \/Count (\d+)/.exec(document)?.[1]??0);
 assert.ok(count>1,'Large case exports must paginate');
 console.log('PASS · Case Inspection independent from 8-stage artwork, bounded learning record and direct paginated PDF');
}
void verifyPdf().catch(error=>{console.error(error);process.exitCode=1;});
