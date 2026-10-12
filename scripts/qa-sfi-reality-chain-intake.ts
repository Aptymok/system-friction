import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRealityChainPdf } from '../src/components/sfi/realityChainPdf';
const read=(path:string)=>readFileSync(path,'utf8');
const route=read('src/app/api/reality-chain/extract/route.ts');
const parser=read('src/lib/studio/multimodal/textAnalyzer.ts');
const page=read('src/app/reality-chain/page.tsx');
const ui=read('src/components/sfi/RealityChainWorkbench.tsx');
const publicSurface=read('src/components/sfi/PublicInstrumentSurface.tsx');
assert.match(page,/requireUserProfile/,'Authenticated case surface required');
assert.match(route,/requireAuthenticatedUser/,'Transient extraction requires login');
assert.match(route,/extractDocumentTextTransient/,'Must reuse an existing extractor rather than introduce an untested second parser');
assert.match(parser,/extractPdfTextFallback/,'PDF parser fallback must remain available');
assert.match(route,/sha256/,'Server-calculated original content hash required');
assert.match(route,/no-store, private/,'Response must not cache document excerpts');
assert.match(route,/MAX_BYTES/,'Input byte limit is mandatory');
assert.match(route,/complete:!textLimited/,'Report extraction completeness must exclude truncated text');
assert.doesNotMatch(route,/\.storage\.from\(|\.upload\(|\.writeFile\(/,'Transient extract route cannot persist original bytes');
assert.match(ui,/kind:'RECORD'/,'Quoted passages are records, not promoted evidence');
assert.match(ui,/sourceRefs:\[sourceRef\]/,'Every passage must cite its registered source');
assert.match(ui,/SOURCE:-1,RECORD:-1/,'Sources and records cannot silently be treated as observed signals');
assert.match(ui,/NOT AN AUTHORITY OR SCIENTIFIC VALIDATION/,'Report cannot claim certification');
assert.match(ui,/claims:\[\]/,'Governed receipt cannot invent substantive claims');
assert.match(ui,/persistTraceManifest/,'Source-linked trace manifest must be persistable without source files');
assert.match(ui,/DERIVED_RECORD_NOT_AUTHORIZED_REPORT/,'Trace snapshot is never promoted to institutional authority');
const panorama=ui.match(/className="rcPanoramaImage" src="([^"]+)"/);
assert.ok(panorama,'One photographic panorama must remain in the authenticated operational UI');
assert.equal(panorama?.[1],'/assets/sfi/instruments/RealityChain.png','Use the explicitly requested RealityChain.png');
assert.ok(existsSync('public'+panorama![1]),'The single panorama file must exist in tracked assets');
assert.equal((ui.match(/className="rcPanoramaImage"/g)||[]).length,1,'The background must not be repeated');
// All eight source assets are canonical, not substituted vector lookalikes.
const canonicalStages=['WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN'];
for(let index=1;index<=8;index++){
  const basename='SFI_RCH_'+String(index).padStart(2,'0')+'.png';
  const uri='/assets/sfi/instruments/'+basename;
  assert.ok(existsSync('public'+uri),'Canonical stage icon missing: '+basename);
  assert.ok(ui.includes("'"+uri+"'"),'Canonical stage icon not referenced in the workbench: '+basename);
  assert.ok(ui.includes("name:'"+canonicalStages[index-1]+"'"),'Stage order must stay aligned with icon '+basename);
}
assert.match(ui,/className="rcHubArtwork"/,'Canonical art must render on operational stage hubs');
assert.match(ui,/step<8\?HUB_ARTWORK\[step\]:undefined/,'LEARNING must not invent a ninth canonical stage icon');

assert.equal((ui.match(/className="rcThreeScene"/g)||[]).length,0,'No separate repeated screen images');
const layout=read('src/components/sfi/RealityChainWorkbench.css');
assert.ok(layout.includes('width:var(--rc-canvas-width,3840px)'),'Canvas size must be bounded to image native width');
assert.ok(ui.includes('Math.min(3840,e.currentTarget.naturalWidth)'),'Prevent exceeding source image natural width');
assert.match(layout,/object-fit:cover/,'Original panorama uses one continuous, proportional backdrop');
assert.match(layout,/scroll-snap-type:none/,'Horizontal progression must be continuous');
console.log('PASS · Reality Chain case access, source-only intake, parser reuse, non-promotion, report boundaries and existing assets');


// Direct-PDF smoke test: real binary structure, page tree, source lineage and
// full represented payload, without fake approval or learning adoption.
const pdf=createRealityChainPdf({
  caseId:'QA-CASE-001',subject:'SOURCE LINKED CASE',status:'OPEN',cutoff:'2026-10-12',
  generatedAt:'2026-10-12T00:00:00.000Z',
  stages:[{name:'WORLD',role:'Grounded state',count:1}],
  objects:[{kind:'RECORD',role:'RECORD',observedAt:null,recordedAt:'2026-10-11T23:00:00.000Z',
    id:'qa:record-1',hash:null,sourceIds:['source:qa'],recordIds:['record:qa'],evidenceIds:[],
    description:'Original observation record',locator:'PAGE 1',payloadJson:'{"statement":"Full represented source content"}'}],
  learning:[],reportReceipts:0
});
assert.equal(pdf.type,'application/pdf','Case export must be a native PDF Blob');
assert.ok(pdf.size>500,'Case export must not be an empty file');
pdf.arrayBuffer().then(buffer=>{
  const raw=Buffer.from(buffer).toString('latin1');
  assert.ok(raw.startsWith('%PDF-1.4'),'PDF header missing');
  assert.match(raw,/\/Type \/Page\b/,'At least one A4 page required');
  assert.match(raw,/source:qa/,'Source provenance must remain inspectable');
  assert.match(raw,/Full represented source content/,'Do not drop source payload from PDF');
  const start=raw.lastIndexOf('startxref\n');
  assert.ok(start>0,'Missing PDF cross reference pointer');
  const offset=Number(raw.slice(start+10).split(/\s/)[0]);
  assert.equal(raw.slice(offset,offset+4),'xref','Cross reference must point at the correct byte offset');
  console.log('PASS · downloadable native PDF preserves derived case provenance and cross-reference structure');
}).catch(error=>{console.error(error);process.exitCode=1;});
