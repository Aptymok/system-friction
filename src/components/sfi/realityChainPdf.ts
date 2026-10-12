/**
 * Bounded, dependency-free PDF renderer for an authenticated case's represented
 * records. This is a DERIVED inspection report, never an institutional approval.
 * JSON remains the lossless format for source text and non-Latin Unicode.
 */
export type RealityPdfRecord={
 kind:string;role:string;observedAt:string|null;recordedAt:string;
 id:string;hash:string|null;sourceIds:string[];recordIds?:string[];evidenceIds?:string[];description:string;locator:string;payloadJson?:string;
};
export type RealityPdfInput={
 caseId:string;subject:string;status:string;cutoff:string;generatedAt:string;
 stages:{name:string;role:string;count:number}[];
 objects:RealityPdfRecord[];
 learning:{state:string;statement:string;returnRefs:string[];id:string}[];
 reportReceipts:number;
};
const PAGE_WIDTH=595,PAGE_HEIGHT=842,MAX_CHARS=104,PAGE_LINES=54;
const unicodeMap:Record<string,string>={'—':'-','–':'-','→':' -> ','≠':' != ','≤':' <= ','≥':' >= ','•':'*','…':'...','‘':"'",'’':"'",'“':'"','”':'"','×':'x'};
function latin(text:string):string{
 return [...text].map(ch=>{
  if(unicodeMap[ch])return unicodeMap[ch];
  const num=ch.charCodeAt(0);
  if(num===10)return '\n';
  if(num>=32&&num<=255&&num!==127)return ch;
  return ch==='\t'?'    ':'?';
 }).join('');
}
function wrap(text:string,width=MAX_CHARS):string[]{
 const out:string[]=[];
 for(const segment of latin(text).split(/\r?\n/)){
  if(!segment.trim()){out.push('');continue;}
  let rest=segment.replace(/\s+/g,' ').trim();
  while(rest.length>width){
   let at=rest.lastIndexOf(' ',width);
   if(at<width/3)at=width;
   out.push(rest.slice(0,at));rest=rest.slice(at).trimStart();
  }
  out.push(rest);
 }
 return out;
}
function escapePdf(text:string):string{
 return text.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
}
function pdfBytes(text:string):Uint8Array{
 const out=new Uint8Array(text.length);
 for(let i=0;i<text.length;i++)out[i]=text.charCodeAt(i)&255;
 return out;
}
export function createRealityChainPdf(input:RealityPdfInput):Blob{
 const lines:string[]=[];
 const add=(s:string)=>{lines.push(...wrap(s));};
 add('SFI  /  SYSTEM FRICTION INSTITUTE');
 add('REALITY CHAIN  /  CASE INSPECTION REPORT');
 add('DERIVED READ MODEL - NOT INSTITUTIONAL CERTIFICATION');
 lines.push('');
 add('CASE: '+input.subject);
 add('CASE ID: '+input.caseId);
 add('STATE: '+input.status+'  |  CUTOFF: '+input.cutoff);
 add('GENERATED (UTC): '+input.generatedAt);
 add('GOVERNED REPORT RECEIPTS: '+input.reportReceipts);
 lines.push('');
 add('METHODOLOGICAL BOUNDARIES');
 add('A source is not evidence. Approval is not authority. Execution is not observed RETURN.');
 add('This report only reconstructs the recorded case; missing data remains unknown.');
 lines.push('');
 add('EIGHT CANONICAL STAGES');
 for(const [i,stage] of input.stages.entries()){
  add(String(i+1).padStart(2,'0')+' / '+stage.name+'  /  '+stage.count+' RECORDED OBJECTS');
  add(stage.role);
 }
 lines.push('');
 add('CASE-SCOPED LEARNING / NOT AUTOMATICALLY PROMOTED');
 if(!input.learning.some(o=>o.state==='ADOPTED'))add('NO GOVERNED LEARNING RECORDED UNLESS AN AUTHORIZED ADOPTION IS PRESENT BELOW.');
 if(input.learning.length===0)add('NO GOVERNED LEARNING RECORDED. No learning candidate was found in this case snapshot.');
 for(const item of input.learning){
  add('STATE: '+item.state+'  /  ID: '+item.id);
  add('STATEMENT: '+item.statement);
  add('RETURN REFERENCES: '+(item.returnRefs.join(', ')||'NONE'));
 }
 lines.push('');
 add('DOCUMENTARY AND TEMPORAL LEDGER / '+input.objects.length+' OBJECTS');
 for(const [i,o] of input.objects.entries()){
  lines.push('');
  add('OBJECT '+(i+1)+' / '+o.kind+' / '+o.role);
  add('ID: '+o.id+'  /  HASH: '+(o.hash||'NOT RECORDED'));
  add('OBSERVED: '+(o.observedAt||'NOT DATED')+'  /  RECORDED: '+o.recordedAt);
  add('SOURCES: '+(o.sourceIds.join(', ')||'NOT REPRESENTED'));
  add('RECORD REFS: '+((o.recordIds??[]).join(', ')||'NOT REPRESENTED'));
  add('EVIDENCE REFS: '+((o.evidenceIds??[]).join(', ')||'NOT REPRESENTED'));
  add('PAYLOAD (AS REPRESENTED): '+(o.payloadJson??'NOT PROVIDED BY THIS RECORD'));
  add('LOCATOR: '+o.locator);
  add('CONTENT: '+o.description);
 }
 lines.push('');
 add('LIMITATIONS / Source hashes do not prove custody. Source copies are not independent corroboration.');
 add('Learning candidates are not adopted learning without a separate governed authorization.');
 add('Source file bytes are not embedded. This account-scoped export creates no persistent mutation.');
 const pages:string[][]=[];
 for(let i=0;i<lines.length;i+=PAGE_LINES)pages.push(lines.slice(i,i+PAGE_LINES));
 if(!pages.length)pages.push(['NO RECORDS']);
 const objects:string[]=[''];
 const set=(index:number,value:string)=>{objects[index]=value;};
 const catalog=1,rootPages=2,font=3;
 set(catalog,'<< /Type /Catalog /Pages 2 0 R >>');
 set(font,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 const pageIds:number[]=[];
 for(const [idx,linesOnPage] of pages.entries()){
  const pid=objects.length,cid=pid+1;
  pageIds.push(pid);
  const contentLines=[...linesOnPage,'','PAGE '+(idx+1)+' / '+pages.length].map(line=>'('+escapePdf(line)+') Tj T*').join('\n');
  const stream='BT /F1 9 Tf 42 797 Td 13 TL\n'+contentLines+'\nET';
  set(pid,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PAGE_WIDTH+' '+PAGE_HEIGHT+'] /Resources << /Font << /F1 3 0 R >> >> /Contents '+cid+' 0 R >>');
  set(cid,'<< /Length '+pdfBytes(stream).length+' >>\nstream\n'+stream+'\nendstream');
 }
 set(rootPages,'<< /Type /Pages /Count '+pages.length+' /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] >>');
 let text='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
 const offsets=[0];
 for(let id=1;id<objects.length;id++){
  offsets[id]=pdfBytes(text).length;
  text+=id+' 0 obj\n'+objects[id]+'\nendobj\n';
 }
 const xref=pdfBytes(text).length;
 text+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
 for(let id=1;id<objects.length;id++)text+=String(offsets[id]).padStart(10,'0')+' 00000 n \n';
 text+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 const bytes=pdfBytes(text);
 const buffer=new ArrayBuffer(bytes.byteLength);
 new Uint8Array(buffer).set(bytes);
 return new Blob([buffer],{type:'application/pdf'});
}
