/**
 * SFI Reality Chain — self-contained, account-local PDF export.
 * This produces a derived reading of the already authorized Case Platform data.
 * It NEVER creates a governance receipt, admits evidence or promotes learning.
 * All PDF content is converted to printable WinAnsi-compatible ASCII; the exact
 * source records remain available through the companion JSON trace export.
 */
export type CasePdfSection={title:string;lines:string[]};

function printable(text:string):string{
 return text
  .replaceAll('→',' -> ').replaceAll('≠',' != ').replaceAll('·',' / ')
  .replaceAll('—',' - ').replaceAll('–',' - ')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^\x20-\x7E]/g,'?');
}
function wrap(input:string,width=95):string[]{
 const clean=printable(input).replace(/\s+/g,' ').trim();
 if(!clean)return [' '];
 const out:string[]=[];
 let remainder=clean;
 while(remainder.length>width){
   let n=remainder.lastIndexOf(' ',width);
   if(n<Math.round(width/2))n=width;
   out.push(remainder.slice(0,n).trim());
   remainder=remainder.slice(n).trim();
 }
 out.push(remainder);
 return out;
}
function escapePdf(line:string):string{return line.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}

/** Downloadable A4 multi-page PDF with traceable object references and limitations. */
export function createRealityChainPdf(sections:readonly CasePdfSection[]):Blob{
 const output:string[]=[];
 for(const section of sections){
  output.push('');
  output.push(...wrap(section.title.toUpperCase(),85));
  output.push('-'.repeat(67));
  for(const line of section.lines)output.push(...wrap(line));
 }
 const PAGE_LINES=47;
 const pages:string[][]=[];
 for(let i=0;i<output.length;i+=PAGE_LINES)pages.push(output.slice(i,i+PAGE_LINES));
 if(!pages.length)pages.push(['NO INSPECTION RECORDS']);
 const obj:string[]=[''];
 const pageRefs:number[]=[];
 // 1 = catalog; 2 = pages parent; 3 = font; remaining pairs page+content.
 obj[1]='<< /Type /Catalog /Pages 2 0 R >>';
 obj[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 for(let n=0;n<pages.length;n++){
  const pageId=4+n*2,contentId=pageId+1;
  pageRefs.push(pageId);
  const header='SFI / REALITY CHAIN / ACCOUNT-SCOPED INSPECTION';
  const body=[
    'BT /F1 9 Tf 43 790 Td 13.8 TL',
    '0.75 0.61 0.38 rg ('+escapePdf(header)+') Tj T*',
    '0.12 0.12 0.12 rg',
    ...pages[n].map(line=>'('+escapePdf(line)+') Tj T*'),
    'ET',
    'BT /F1 8 Tf 43 28 Td (PAGE '+(n+1)+' / '+pages.length+' - DERIVED DRAFT / NOT AN AUTHORITY) Tj ET',
  ].join('\n');
  obj[pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentId+' 0 R >>';
  obj[contentId]='<< /Length '+new TextEncoder().encode(body).byteLength+' >>\nstream\n'+body+'\nendstream';
 }
 obj[2]='<< /Type /Pages /Kids ['+pageRefs.map(id=>id+' 0 R').join(' ')+'] /Count '+pageRefs.length+' >>';
 let bytes='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
 // ASCII-safe offsets: the 4 binary-marker chars above have one byte each in PDF.
 // Emit a pure ASCII header to keep TextEncoder byte positions exact.
 bytes='%PDF-1.4\n%SFI\n';
 const positions:number[]=[0];
 for(let i=1;i<obj.length;i++){
  positions[i]=new TextEncoder().encode(bytes).byteLength;
  bytes+=i+' 0 obj\n'+obj[i]+'\nendobj\n';
 }
 const xref=new TextEncoder().encode(bytes).byteLength;
 bytes+='xref\n0 '+obj.length+'\n0000000000 65535 f \n';
 for(let i=1;i<obj.length;i++)bytes+=String(positions[i]).padStart(10,'0')+' 00000 n \n';
 bytes+='trailer\n<< /Size '+obj.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return new Blob([new TextEncoder().encode(bytes)],{type:'application/pdf'});
}
