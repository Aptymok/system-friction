import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const catalog=read('src/lib/public/sfiServiceCatalog.ts');
const list=read('src/app/servicios/page.tsx');
const detail=read('src/app/servicios/[slug]/page.tsx');
const inquiryPage=read('src/app/servicios/solicitar/page.tsx');
const form=read('src/components/sfi/ServiceInquiryForm.tsx');
const css=read('src/app/servicios/services.css');
const home=read('src/components/sfi/PublicEntryGateway.tsx');
const chrome=read('src/components/public/SfiPublicChrome.tsx');
const profiles=read('src/core/case-platform/serviceProfiles.ts');

const ids=[
'AI_GOVERNANCE_ASSURANCE','AI_IMPLEMENTATION_DIAGNOSTIC',
'AI_ADOPTION_INTEGRATION','SERVICE_OBSERVABILITY',
'CONTRACT_WARRANTY_ASSURANCE','TENDER_ASSURANCE',
'ENTERPRISE_MEMORY','COGNITIVE_RECONSTRUCTION',
'SYSTEM_OBSERVATORY','CUSTOM_RESEARCH'];
for(const id of ids){
  assert.ok(profiles.includes("id: '"+id+"'"),'missing canonical profile '+id);
  assert.ok(catalog.includes('"'+id+'": {'),'public profile missing '+id);
}
const quotedProfiles=[...catalog.matchAll(/^  "[A-Z_]+": \{/gm)];
assert.equal(quotedProfiles.length,10,'exactly 10 public service profiles');
assert.match(catalog,/SFI_SERVICE_PROFILES\.find/);
assert.match(catalog,/Record<SfiServiceProfileId,ServiceCopy>/);
assert.match(list,/id="catalogo"/);
assert.match(list,/SFI_SERVICE_AREAS\.map/);
assert.match(list,/SFI_PUBLIC_SERVICES\.filter/);
assert.match(list,/href="\/servicios\/solicitar"/);
assert.match(detail,/generateStaticParams\(\)/);
assert.match(detail,/serviceBySlug\(slug\)/);
assert.match(detail,/encodeURIComponent\(s\.slug\)/);
assert.match(detail,/\{s\.limits\}/);
assert.match(detail,/Price/);
assert.match(detail,/s\.firstCheck/);
assert.match(detail,/ai-week-nyc-2026/);
assert.match(inquiryPage,/ServiceInquiryForm/);
assert.match(inquiryPage,/SFI_PUBLIC_SERVICES\.some/);
assert.match(form,/mailto:/);
assert.match(form,/Prepare your inquiry/);
assert.match(form,/It has not been sent/);
assert.match(form,/No case or charge has been created/);
assert.match(form,/navigator\.clipboard\.writeText/);
assert.doesNotMatch(form,/fetch\s*\(|supabase|axios|localStorage|sessionStorage|setInterval/);
assert.doesNotMatch(inquiryPage,/fetch\s*\(|createClient|supabase/);
assert.match(home,/href="\/servicios"/);
assert.match(chrome,/key:'services',label:'SERVICES'/);
assert.match(chrome,/pathname\.startsWith\('\/servicios'\)/);
assert.match(css,/@media\(max-width:740px\)/);
assert.match(css, /focus-visible/);
const casePage=read('src/app/servicios/case-study/ai-week-nyc-2026/page.tsx');
const caseWalkthrough=read('src/components/sfi/AiWeekManualWalkthrough.tsx');
const instrument=read('src/components/sfi/PublicInstrumentSurface.tsx');
const instrumentCss=read('src/components/sfi/PublicInstrumentSurface.css');
const homeCss=read('src/components/sfi/PublicEntryGateway.css');
assert.match(list,/SYNTHETIC TRAINING CASE/);
assert.match(list,/What happens when AI says the risk is zero/);
assert.match(home,/EXPLORE SERVICES/);
assert.match(home,/TRY THE AI WEEK NYC CASE/);
assert.match(home,/aria-label="Explore SFI instruments manually"/);
assert.match(homeCss,/sfiHomeServicePrimary/);
assert.match(instrument,/sfiInstrumentManualNav/);
assert.match(instrument,/PREVIOUS/);
assert.match(instrument,/NEXT/);
assert.ok(instrument.includes('href="/servicios"'));
assert.match(instrumentCss,/sfiInstrumentManualNav/);
assert.match(casePage,/RC-CASE-006/);
assert.match(casePage,/SYNTHETIC LEARNING EXERCISE/);
assert.match(casePage,/USD 42,000,000/);
assert.match(casePage,/Participant Casebook, V1.0/);
assert.match(casePage,/not the factual reconstruction of the AI Week conference/);
assert.ok(caseWalkthrough.includes('const STEPS:Step[]'));
for(const x of ['OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN']) assert.match(caseWalkthrough,new RegExp("id:'"+x+"'"));
assert.match(caseWalkthrough,/useState/);
assert.match(caseWalkthrough,/Check my interpretation/);
assert.match(caseWalkthrough,/aria-label="Choose an observation stage"/);
assert.match(caseWalkthrough,/not independent records of a real organization/);
for(const forbidden of ['fetch(', 'supabase', 'localStorage', 'setInterval', 'setTimeout', 'axios']) assert.ok(!caseWalkthrough.includes(forbidden), 'manual case must not call '+forbidden);
for(const forbidden of ['fetch(', 'supabase', 'localStorage', 'setInterval']) assert.ok(!casePage.includes(forbidden), 'public case route must not call '+forbidden);
console.log('PASS: 10 canonical service profiles, public cards/details, no-account mailto inquiry, boundaries & responsive styling.');
