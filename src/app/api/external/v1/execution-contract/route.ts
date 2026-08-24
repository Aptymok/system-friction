import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { buildClarifyingQuestions, describeUniversalSignalContract, normalizeUniversalSignal, type UniversalCycleInput } from '@/lib/sfi/universalSignalCycle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
const record=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const text=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;

function measurements(kind:string, declaredFunction:string){
  const common=['object identity','representation type','acquisition timestamp','provenance','content hash/fingerprint when available','observable structure','missing variables','confidence by measurement'];
  const k=kind.toLowerCase();
  const f=declaredFunction.toLowerCase();
  if(k==='audio'||/song|music|canci|audio|sonor/.test(f))return [...common,'duration','sample rate/codec when available','BPM/tempo','rhythmic/onset structure','section boundaries','dynamic profile/LUFS when available','spectral profile','stereo/spatial profile','voice/instrumental structure','FAD variables'];
  if(k==='video')return [...common,'duration','shot/scene structure','temporal transitions','visual composition','visible text','audio track structure when present','entities/events','cross-media coherence'];
  if(k==='image')return [...common,'dimensions','composition','visible text','entities/objects','spatial relations','visual identity/coherence'];
  if(k==='document'||k==='text'||k==='web_page'||k==='url')return [...common,'author/publisher when available','date/cutoff','claims','entities','relations','citations/links','document structure','contradictions','missing evidence'];
  if(k==='dataset'||k==='csv'||k==='json')return [...common,'schema','row/record count','variables','missingness','distributions','outliers','time coverage','entity keys','measurement limitations'];
  if(k==='conversation'||/conversation|relaci|human/.test(f))return [...common,'participants/roles as declared','temporal sequence','turn structure','observable actions','explicit statements','reciprocity/asymmetry measures','unresolved questions','MOP-H variables'];
  if(k==='organization'||/company|empresa|organization/.test(f))return [...common,'declared objective','time horizon','actors/nodes','resources/capacities','constraints','operational signals','market/field signals','history','cross-risks','decision variables'];
  return common;
}

export async function POST(req:Request){
  const auth=authorizeExternalRequest(req,'observe');
  if(!auth.credential)return NextResponse.json(externalAuthError(auth,'observe'),{status:401});
  const body=await req.json().catch(()=>({})) as Row;
  const input=record(body.input) as unknown as UniversalCycleInput;
  if(!input.signal||typeof input.signal!=='object'||Array.isArray(input.signal))return NextResponse.json({ok:false,error:'input.signal_required'},{status:400});

  const safeSignal={...input.signal,content:undefined};
  const safeInput={...input,signal:safeSignal};
  const signal=normalizeUniversalSignal(safeSignal);
  const contract=describeUniversalSignalContract(safeInput);
  const questions=buildClarifyingQuestions(safeInput);
  const declaredFunction=typeof input.declaredFunction==='string'?input.declaredFunction:'';
  const extracted=record(input.signal.extracted);
  const metadata=record(input.signal.metadata);
  const provenance=record(input.signal.provenance);
  const suppliedContentHash=text((input.signal as unknown as Row).objectHash)??text(extracted.objectHash)??text(extracted.contentHash)??text(metadata.objectHash)??text(provenance.objectHash);

  return NextResponse.json({
    ok:true,
    actor:externalActor(auth.credential),
    contractVersion:'SFI-EXECUTION-CONTRACT-1.1',
    storagePolicy:{default:'REFERENCE_ONLY',rawObjectAccepted:false,rawObjectPersisted:false,exception:'PRESERVE_EVIDENCE only through a separate governed evidence workflow'},
    object:{
      kind:signal.kind,
      objectKey:signal.objectKey,
      objectHash:suppliedContentHash,
      referenceHash:signal.objectHash,
      hashBasis:suppliedContentHash?'CLIENT_CONTENT_FINGERPRINT':'REFERENCE_ONLY_NO_CONTENT_HASH',
      name:signal.name,
      mimeType:signal.mimeType,
      sourceUrl:signal.sourceUrl,
      assetRef:signal.assetRef,
    },
    identityRule:'objectHash is reserved for a client-computed content fingerprint. referenceHash identifies the metadata/reference envelope and must not be compared as a content hash.',
    clarifyingQuestions:questions,
    ready:questions.length===0,
    methodPlan:contract.methodPlan,
    agentPlan:contract.agentPlan,
    requiredMeasurements:measurements(signal.kind,declaredFunction),
    executionOrder:['individuate object','resolve question/objective','extract only required measurements','separate observed/declared/derived/inferred/simulated/missing','reconstruct relevant history','load only relevant SFI world/field context','generate primary and rival hypotheses','cross-impact and risk analysis','identify dynamic attractors/ejectors separately from declared targets/exclusions','preserve invariants and constraints','design minimal perturbation','register expected and contradiction signals','return structured result to SFI'],
    resultContract:{endpoint:'/api/external/v1/result',required:['object with content fingerprint when available','question/objective','measurements','epistemic partition','hypotheses+rivals','risks','invariants','perturbation/prediction when applicable'],forbidden:['raw binary','base64 object','complete private file unless explicitly required by governed evidence preservation']},
  });
}
