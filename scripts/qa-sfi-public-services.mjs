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
assert.match(detail,/Precio/);
assert.match(inquiryPage,/ServiceInquiryForm/);
assert.match(inquiryPage,/SFI_PUBLIC_SERVICES\.some/);
assert.match(form,/mailto:/);
assert.match(form,/Preparar solicitud/);
assert.match(form,/Aún no se ha enviado/);
assert.match(form,/No se ha generado un caso ni un cobro/);
assert.match(form,/navigator\.clipboard\.writeText/);
assert.doesNotMatch(form,/fetch\s*\(|supabase|axios|localStorage|sessionStorage|setInterval/);
assert.doesNotMatch(inquiryPage,/fetch\s*\(|createClient|supabase/);
assert.match(home,/href="\/servicios"/);
assert.match(chrome,/key:'services',label:'SERVICIOS'/);
assert.match(chrome,/pathname\.startsWith\('\/servicios'\)/);
assert.match(css,/@media\(max-width:740px\)/);
assert.match(css, /focus-visible/);
console.log('PASS: 10 canonical service profiles, public cards/details, no-account mailto inquiry, boundaries & responsive styling.');
