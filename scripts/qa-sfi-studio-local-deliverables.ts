import assert from 'node:assert/strict';
import {
  makeStudioDocumentPdf,makeStudioDocumentLatex,makeStudioDocumentMarkdown,
} from '../src/components/studio/localDocumentProduction';
import { makeStudioLocalZip } from '../src/components/studio/localZipPackage';
import { buildSourceReviewScript } from '../src/components/studio/localPodcastResearchScript';
import { podcastFilename, makePodcastManifest, type StudioPodcastAudio } from '../src/components/studio/localPodcastAudio';
import { parseStudioLocalReport } from '../src/components/studio/localReportImport';
import { checkStudioPhotographs } from '../src/components/studio/localPhotographicCovers';
import { studioAttractorProjection } from '../src/components/studio/studioAttractorProjection';
import {
  proposeCampaignVariants, contrastCampaignObservations,
} from '../src/components/studio/localCampaignContrast';

// Synthetic QA material: validates serialization and boundaries, not a scientific result.
async function main() {
const doc = {
  kind:'lab_note' as const,
  title:'Nota de laboratorio: fricción y observación',
  author:'Equipo de ensayo',
  body:('# Objetivo\n\nAnalizar la integridad de la salida documental.\n\n'+
    'Esta oración es material de prueba reproducible y no una observación científica.\n\n').repeat(85),
  sourceLines:'https://example.org/source\nAutor de referencia, publicación no verificada',
};
const pdf=await makeStudioDocumentPdf(doc).text();
assert.ok(pdf.startsWith('%PDF-1.4\n'));
assert.ok(pdf.includes('/Type /Pages'));
assert.ok(pdf.includes('/Count '));
assert.ok(pdf.endsWith('%%EOF\n'));
const xrefAt=Number(pdf.match(/startxref\n(\d+)\n%%EOF\n$/)?.[1]);
assert.ok(Number.isFinite(xrefAt));
assert.equal(pdf.slice(xrefAt,xrefAt+5),'xref\n');
const refs=pdf.match(/\n(\d{10}) 00000 n /g)||[];
assert.ok(refs.length>4,'expected multiple PDF objects');
for(let index=1;index<=refs.length;index++){
  const offset=Number(refs[index-1].match(/\d{10}/)?.[0]);
  assert.ok(pdf.startsWith(index+' 0 obj\n',offset),'PDF xref offset for object '+index);
}
const tex=makeStudioDocumentLatex(doc);
assert.ok(tex.includes('\\documentclass'));
assert.ok(tex.includes('\\section*{Objetivo}'));
assert.ok(tex.includes('\\end{document}'));
const markdown=makeStudioDocumentMarkdown(doc);
assert.ok(markdown.includes('BORRADOR')||markdown.includes('borrador'));
assert.ok(markdown.includes('Referencias declaradas'));

const zip=await makeStudioLocalZip([
  {name:'documento.pdf',data:new Blob([pdf],{type:'application/pdf'})},
  {name:'fuente.tex',data:tex},
]);
const bytes=new DataView(await zip.arrayBuffer());
assert.equal(bytes.getUint32(0,true),0x04034b50);
const zipArray=new Uint8Array(bytes.buffer);
const zipText=new TextDecoder().decode(zipArray);
assert.ok(zipText.includes('documento.pdf'));
assert.ok(zipText.includes('fuente.tex'));
const footer=bytes.byteLength-22;
assert.equal(bytes.getUint32(footer,true),0x06054b50);
assert.equal(bytes.getUint16(footer+10,true),2);
const centralOffset=bytes.getUint32(footer+16,true);
assert.equal(bytes.getUint32(centralOffset,true),0x02014b50);
assert.equal(zip.type,'application/zip');

const direction={title:'QA Music',artist:'QA Producer',sector:'unverified',concept:'Declared',
  palette:'signal' as const};
const variants=proposeCampaignVariants(direction);
assert.deepEqual(variants.map(v=>v.id),['A','B']);
assert.equal(contrastCampaignObservations([]).status,'NOT_OBSERVED');
const observations=[
  {variant:'A' as const,url:'https://example.org/post/a',observedAt:'2026-11-15T18:00:00-06:00',
    impressions:100,saves:8,meaningfulInteractions:2,source:'MANUAL_PLATFORM_READBACK' as const},
  {variant:'B' as const,url:'https://example.org/post/b',observedAt:'2026-11-15T18:00:00-06:00',
    impressions:100,saves:5,meaningfulInteractions:1,source:'MANUAL_PLATFORM_READBACK' as const},
];
const comparison=contrastCampaignObservations(observations);
assert.equal(comparison.status,'CONTRASTABLE');
assert.equal(comparison.winnerCertified,false);
// Editorial QA fixtures are synthetic. They are NOT research findings or audio observations.
const indexed = [{
  title:'QA-only indexed title',url:'https://example.org/test',
  publisher:'QA publisher',publishedAt:'2026-11-15',
  retrievedAt:'2026-11-15T00:00:00Z',
  evidenceStatus:'INDEXED_SOURCE_CANDIDATE_NOT_INDEPENDENTLY_VERIFIED',
}];
const script = buildSourceReviewScript('QA-only topic',indexed);
assert.equal(script.status,'EDITORIAL_DRAFT_SOURCE_INDEX_ONLY');
assert.equal(script.sourcesUsed,1);
assert.equal(script.verifiedClaims,0);
assert.equal(script.articlesRead,0);
assert.ok(script.body.includes('QA publisher'));
assert.ok(script.sourceLines.includes('https://example.org/test'));
assert.equal(buildSourceReviewScript('QA-only topic',[]).sourcesUsed,0);
const demoAudio: StudioPodcastAudio = {
  blob:new Blob(['QA_TEST_BYTES'],{type:'audio/webm'}),
  mimeType:'audio/webm',
  source:'USER_MICROPHONE_RECORDING',
  durationSeconds:1,
  voiceName:null,voiceLanguage:null,localVoice:null,
  originalUploaded:false,persistence:'MEMORY_ONLY',
};
const podcastManifest=makePodcastManifest(demoAudio,'QA Podcast','QA operator',script.body);
assert.equal(podcastFilename('QA Podcast','audio/webm'),'QA-Podcast.webm');
assert.equal(podcastManifest.originalStored,false);
assert.equal(podcastManifest.publication,'NOT_AUTHORIZED');
assert.equal(podcastManifest.voiceOrigin,'USER_MICROPHONE_RECORDING');
assert.equal(podcastManifest.scriptCharacters,script.body.length);

// Photography QA validates real source images; no procedural substitute or generated photograph.
const photos = Array.from({length:6},(_,index)=>({
  name:'photo-'+index+'.jpg',size:2048,lastModified:1730000000000+index,type:'image/jpeg',
} as File));
assert.doesNotThrow(()=>checkStudioPhotographs(photos));
assert.throws(()=>checkStudioPhotographs([]),/una y seis/);
assert.throws(()=>checkStudioPhotographs([...photos,photos[0]]),/una y seis|misma fotografía/);
assert.throws(()=>checkStudioPhotographs([{
  name:'procedural.svg',size:100,lastModified:1730000000000,type:'image/svg+xml',
} as File]),/JPEG, PNG o WebP/);
assert.throws(()=>checkStudioPhotographs([{
  name:'oversized.jpeg',size:21*1024*1024,lastModified:1730000000000,type:'image/jpeg',
} as File]),/20 MB/);

// Resuming from a private report must not pretend the original is available.
const reportFixture={
  kind:'audio_analysis',name:'QA-ONLY.wav',sizeBytes:4096,
  analyzedAt:'2026-11-15T19:46:18.875Z',
  sampleRateHz:48000,channels:2,durationSeconds:1,
  originalStored:false,originalTransferred:false,persistence:'NONE',
  features:[{
    key:'lufs_integrated',label:'Integrated LUFS',value:-18.5,unit:'LUFS',
    status:'OBSERVED',source:'QA synthetic report',formulaVersion:'qa-v1',
    explanation:'Synthetic fixture - not a scientific observation.',warnings:[],
  }],
};
const recovered=parseStudioLocalReport(reportFixture);
assert.equal(recovered.name,'QA-ONLY.wav');
assert.equal(recovered.features[0].value,-18.5);
assert.equal(recovered.originalStored,false);
assert.equal(recovered.originalTransferred,false);
assert.throws(()=>parseStudioLocalReport({...reportFixture,originalStored:true}),/STUDIO_REPORT_PRIVACY_STATE_UNSUPPORTED/);
assert.throws(()=>parseStudioLocalReport({...reportFixture,features:[{...reportFixture.features[0],value:Infinity}]}),/STUDIO_REPORT_FEATURE_INVALID/);

// Synthetic read-model QA: explicit relationships only; no invented canonical authority or RETURN.
const nodeProjection=studioAttractorProjection([
  {id:'qa-object-1',title:'QUE NO · Publicación',session_id:'qa-session',
    metadata:{attractorName:'KXTXR',projectName:'QUE NO',passport:{
      t0:{status:'DECLARED',description:'Synthetic prepublication reference'},
      hypotheses:[{id:'H1',status:'PROPOSED'},{id:'H2',status:'PROPOSED'}],
    }}},
  {id:'qa-object-2',title:'Dorian · Instagram',session_id:'qa-session-2',
    metadata:{attractorName:'STUDIO115',projectName:'Dorian'}},
]);
assert.ok(nodeProjection.nodes.some(n=>n.kind==='attractor'&&n.label==='KXTXR'));
assert.ok(nodeProjection.nodes.some(n=>n.kind==='attractor'&&n.label==='STUDIO115'));
assert.ok(nodeProjection.edges.some(e=>e.from==='attractor:kxtxr'&&e.to==='project:kxtxr:que no'));
assert.ok(nodeProjection.edges.every(e=>e.canonical===false));
const kx=nodeProjection.nodes.find(n=>n.sourceObjectId==='qa-object-1');
assert.ok(kx);
const kxPassport=kx!.passport as Record<string,any>;
assert.equal(kxPassport.status,'PARTIAL_RECONSTRUCTION');
assert.equal(kxPassport.stageEvidence.observedReturn,null);
assert.equal(kxPassport.stageEvidence.authority,null);
assert.equal(kxPassport.stageEvidence.winningHypothesis,null);
assert.equal(kxPassport.outcomeVerified,false);
const unrelated=studioAttractorProjection([{id:'qa-object-3',title:'KXTXR - no explicit relation',
  session_id:'qa-unrelated',metadata:{}}]);
assert.equal(unrelated.nodes.some(n=>n.kind==='attractor'&&n.label==='KXTXR'),false);
assert.equal(unrelated.edges[0]?.relation,'SESSION_GROUPING');

console.log('PASS · SFI Studio local deliverables: PDF cross-reference, LaTeX, ZIP container, campaign observations and no empirical certification');

}
main().catch(error => { console.error(error); process.exitCode = 1; });
