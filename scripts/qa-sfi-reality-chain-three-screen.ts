import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';

function source(path:string){
  assert(existsSync(path),'missing '+path);
  return readFileSync(path,'utf8');
}
const panel=source('src/components/sfi/RealityChainSurface.tsx');
const css=source('src/components/sfi/RealityChainSurface.css');
const route=source('src/app/api/cases/[caseId]/linked-cases/route.ts');
const publicSurface=source('src/components/sfi/PublicInstrumentSurface.tsx');
const ingress=source('src/components/sfi/NewCaseIngress.tsx');
const root=source('src/components/sfi/RootNeuralGraphView.tsx');

for(const stage of ['WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN','LEARNING']){
  assert(panel.includes("name:'"+stage+"'"),'missing real stage: '+stage);
}
for(const group of ['WORLD / SIGNAL / OBSERVATION','EVIDENCE / INFERENCE / AUTHORITY','EXECUTION / RETURN / LEARNING']){
  assert(panel.includes(group),'missing screen: '+group);
}
assert.equal((panel.match(/number:'0[1-3]', label:/g)||[]).length,3,'exactly three horizontal screens');
assert(panel.includes('scrollIntoView')||panel.includes('scrollTo('),'horizontal scroll must be navigable');
assert(css.includes('scrollbar-width:none')&&css.includes('::-webkit-scrollbar{display:none}'),'no visible native scrolling');
assert(css.includes('SFI_REALITY_CHAIN_HERO_LAYER.png'),'reuse existing institutional background');
assert(panel.includes('function LearningIcon()')&&panel.includes('aria-label="Learning: reviewed knowledge"'),'functional LEARNING icon');
assert(publicSurface.includes("if(surface==='reality-chain')return <RealityChainSurface/>"),'reuse existing /instruments/reality-chain route');
assert(ingress.includes("router.push('/instruments/reality-chain?case='"),'case intake must return to real route');
assert(panel.includes("api('/api/cases')")&&panel.includes("api('/api/cases/'+encodeURIComponent(selectedId))"),'list and selected read from governed case API');
assert(panel.includes('/sources/upload-ticket')&&panel.includes('/sources/finalize-upload'),'no raw upload through Vercel server');
assert(panel.includes('readableDate(object.createdAt)'),'reconstruction must show persisted creation');
assert(panel.includes('created<=cutoff'),'historical reconstruction excludes later rows');
assert(panel.includes("kind==='EVIDENCE'")||panel.includes("counts(objects,'EVIDENCE')"),'evidence must be sourced from recorded case objects');
assert(panel.includes('/linked-cases')&&route.includes("readOperationalCase(referencedCaseId,user.id)"),'both cases must be authenticated');
assert(route.includes('CROSS_TENANT_CASE_REFERENCE_FORBIDDEN'),'tenant segregation');
assert(route.includes('CROSS_CASE_REFERENCE_CYCLE_FORBIDDEN'),'no circular evidence reuse');
assert(route.includes("epistemicRole:'RECORD'")&&route.includes("evidenceQualification:'NOT_ESTABLISHED'"),'cross-case link must NOT become EVIDENCE automatically');
assert(route.includes('readbackVerified:true')&&route.includes('readOperationalCase(caseId,user.id)'),'read-after-write verification');
assert(root.includes("searchParams.get('node')"),'ROOT deep-link to same admitted cognitive object');
assert(panel.includes("'/root?reading=REALITY_CHAIN&node='"),'case-specific ROOT link');
assert(!panel.includes('C-2026-0417')&&!panel.includes('Coastal Resilience Finance Shift'),'no illustrative cases disguised as real');
assert(!panel.includes('CONFIDENCE 87%')&&!panel.includes('RISK 13%'),'no uncalibrated probabilities');

console.log('PASS: Reality Chain three-screen operational frontend and bounded cross-case source lineage.');
