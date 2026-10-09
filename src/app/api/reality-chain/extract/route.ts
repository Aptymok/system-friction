import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import { extractDocumentTextTransient } from '@/lib/studio/multimodal/textAnalyzer';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const MAX_BYTES=6*1024*1024;
const MAX_FRAGMENTS=140;
const MAX_FRAGMENT_CHARS=1600;
const headers={'Cache-Control':'no-store, private'};

type Fragment={paragraph:number;page:number|null;pageBasis:'PARSER'|'NOT_RESOLVED';text:string;start:number|null;end:number|null};

function fragmentsFromText(text:string,page:number|null,pageBasis:Fragment['pageBasis']):Fragment[]{
  // Deterministic text blocks are not interpreted as externally observed facts.
  // Offsets refer to the extracted text (not byte offsets in the source).
  const found:Fragment[]=[];
  const splitter=/\n\s*\n/g;
  let last=0,number=0;
  const push=(raw:string,start:number)=>{
    const trimmed=raw.trim();
    if(!trimmed)return;
    number++;
    const offset=raw.indexOf(trimmed);
    found.push({paragraph:number,page,pageBasis,text:trimmed.slice(0,MAX_FRAGMENT_CHARS),
      start:start+offset,end:start+offset+trimmed.length});
  };
  for(const m of text.matchAll(splitter)){push(text.slice(last,m.index),last);last=(m.index??last)+m[0].length;}
  push(text.slice(last),last);
  return found;
}

export async function POST(request:Request){
  try{
    await requireAuthenticatedUser();
    const form=await request.formData();
    const file=form.get('file');
    if(!(file instanceof File)||file.size<=0||file.size>MAX_BYTES)
      return NextResponse.json({ok:false,error:'FILE_REQUIRED_OR_TOO_LARGE',maxBytes:MAX_BYTES},{status:400,headers});
    const extension=file.name.toLowerCase().split('.').at(-1)??'';
    if(!['txt','md','csv','tsv','json','pdf','docx'].includes(extension))
      return NextResponse.json({ok:false,error:'UNSUPPORTED_FORMAT',supported:['txt','md','csv','tsv','json','pdf','docx']},{status:415,headers});
    const bytes=Buffer.from(await file.arrayBuffer());
    const hash=createHash('sha256').update(bytes).digest('hex');
    if(extension==='pdf' && bytes.toString('latin1',0,5)!=='%PDF-')throw new Error('INVALID_PDF_HEADER');
    if(extension==='docx' && (bytes[0]!==0x50||bytes[1]!==0x4b))throw new Error('INVALID_DOCX_HEADER');
    const extracted=await extractDocumentTextTransient(bytes,extension);
    const parser=extracted.parser;
    const warnings=[...extracted.warnings];
    const segments:Array<{page:number|null;text:string}>=extracted.pages?.length
      ? extracted.pages.map(item=>({page:item.page,text:item.text}))
      : [{page:null,text:extracted.text}];
    if(extension==='pdf' && !extracted.pages?.length)warnings.push('PDF_PAGE_LOCATOR_UNRESOLVED');
    const all=segments.flatMap(segment=>fragmentsFromText(segment.text,segment.page,segment.page===null?'NOT_RESOLVED':'PARSER'));
    const excerpts=all.slice(0,MAX_FRAGMENTS);
    if(!all.length)warnings.push('NO_EXTRACTABLE_TEXT');
    if(all.length>MAX_FRAGMENTS)warnings.push('FRAGMENTS_TRUNCATED_REVIEW_REQUIRED');
    if(excerpts.some(part=>part.end!==null && part.start!==null && part.end-part.start>MAX_FRAGMENT_CHARS))warnings.push('LONG_FRAGMENT_EXCERPT_TRUNCATED');
    return NextResponse.json({ok:true,source:{filename:file.name,mime:file.type||'application/octet-stream',size:file.size,sha256:hash,modifiedAt:file.lastModified?new Date(file.lastModified).toISOString():null},
      extraction:{parser,pageCount:segments.filter(p=>p.page!==null).length||null,fragmentCount:all.length,returnedFragments:excerpts.length,complete:all.length<=MAX_FRAGMENTS&&all.every(part=>part.start===null||part.end===null||part.end-part.start<=MAX_FRAGMENT_CHARS),warnings,fragments:excerpts,
      epistemicState:'DERIVED',locatorBasis:'EXTRACTED_TEXT_COORDINATES',rawFilePersisted:false},
      boundary:'Transient parsing only. No file bytes are persisted. Quotes require user selection; page and paragraph must not be inferred when unavailable.'},{headers});
  }catch(error){return sfiCaseApiFailure(error);}
}
