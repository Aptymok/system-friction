/** Browser-only, no-network document production. Sources are user-declared,
 * not independently verified; PDF and LaTeX are derived deliverables.
 */
export type StudioDocumentKind = 'research' | 'lab_note' | 'institutional_statement' | 'podcast_script' | 'long_document';
export type StudioDocumentInput = {
  kind: StudioDocumentKind;
  title: string;
  author: string;
  body: string;
  sourceLines: string;
};
const kindNames:Record<StudioDocumentKind,string>={
  research:'Investigación',
  lab_note:'Nota de laboratorio',
  institutional_statement:'Comunicado institucional',
  podcast_script:'Guion de podcast',
  long_document:'Documento extenso',
};
function safeName(name:string) {
  return name.normalize('NFKD').replace(/[^a-z0-9-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,75)||'studio-document';
}
function texEscape(value:string) {
  return value.replace(/[\\{}$&#%_^~]/g,char=>({
    '\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','&':'\\&',
    '#':'\\#','%':'\\%','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}',
  }[char]||char));
}
function normalized(input:StudioDocumentInput) {
  const title=input.title.trim().slice(0,180);
  const author=input.author.trim().slice(0,160);
  const body=input.body.replace(/\r\n?/g,'\n').trim();
  const references=input.sourceLines.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,80);
  if(!title || !author || body.length<20 || body.length>180000)throw new Error('TITLE_AUTHOR_AND_SUBSTANTIVE_BODY_REQUIRED');
  return {title,author,body,references};
}
export function makeStudioDocumentMarkdown(input:StudioDocumentInput):string {
  const data=normalized(input);
  return [
    '# '+data.title,
    '',
    '**'+kindNames[input.kind]+' · borrador no revisado**',
    '',
    '**Autor:** '+data.author,
    '',
    data.body,
    '',
    '## Referencias declaradas',
    '',
    ...(data.references.length?data.references.map(ref=>'- '+ref):['Sin referencias verificadas o aportadas']),
    '',
    '---',
    'Estado: BORRADOR. Evidencia y citas pendientes de verificación metodológica.',
    'No implica aprobación de Method Lab, ROOT ni publicación institucional.',
  ].join('\n');
}
export function makeStudioDocumentLatex(input:StudioDocumentInput):string {
  const data=normalized(input);
  const paragraphs=data.body.split(/\n{2,}/).map(p=>{
    const lines=p.split('\n').map(line=>{
      const trimmed=line.trim();
      if(trimmed.startsWith('### '))return '\\subsubsection*{'+texEscape(trimmed.slice(4))+'}';
      if(trimmed.startsWith('## '))return '\\subsection*{'+texEscape(trimmed.slice(3))+'}';
      if(trimmed.startsWith('# '))return '\\section*{'+texEscape(trimmed.slice(2))+'}';
      return texEscape(trimmed);
    });
    return lines.join('\n\n');
  }).join('\n\n');
  const references=data.references.length
    ? data.references.map(ref=>'\\item '+texEscape(ref)).join('\n')
    : '\\item Sin referencias verificadas o aportadas.';
  return [
    '% SFI Studio draft, not methodologically reviewed. Compile with XeLaTeX.',
    '\\documentclass[11pt,a4paper]{article}',
    '\\usepackage[spanish]{babel}',
    '\\usepackage{fontspec}',
    '\\usepackage{geometry}',
    '\\usepackage{hyperref}',
    '\\geometry{margin=2.5cm}',
    '\\title{'+texEscape(data.title)+'}',
    '\\author{'+texEscape(data.author)+'}',
    '\\date{Borrador no revisado}',
    '\\begin{document}',
    '\\maketitle',
    '\\noindent\\textit{'+texEscape(kindNames[input.kind])+' — Documento de trabajo; no constituye publicación ni validación científica.}',
    '',
    paragraphs,
    '',
    '\\section*{Referencias declaradas}',
    '\\begin{itemize}',
    references,
    '\\end{itemize}',
    '\\vfill',
    '\\noindent\\footnotesize Estado: BORRADOR. Las afirmaciones y fuentes requieren verificación por Method Lab.\\normalsize',
    '\\end{document}',
    '',
  ].join('\n');
}
const WIN1252:Record<string,number>={
  '€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,
  'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,
  '–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159,
};
function hexString(value:string):string {
  let hex='';
  for(const ch of value) {
    const code=ch.charCodeAt(0);
    const byte=code>=32 && code<=126 || code>=160 && code<=255 ? code : WIN1252[ch]??63;
    hex+=byte.toString(16).padStart(2,'0').toUpperCase();
  }
  return '<'+hex+'>';
}
type PrintLine={text:string;heading:boolean};
function printableLines(input:StudioDocumentInput):PrintLine[] {
  const data=normalized(input);
  const full=[
    ...data.body.split('\n'),
    '', 'REFERENCIAS DECLARADAS',
    ...(data.references.length?data.references:['Sin referencias aportadas']),
    '', 'BORRADOR NO REVISADO: las fuentes y afirmaciones deben verificarse.',
    'La generación de este PDF no constituye aceptación en Method Lab.',
  ];
  const lines:PrintLine[]=[];
  for(const paragraph of full) {
    let text=paragraph.trim();
    const heading=/^#{1,3}\s/.test(text)||text==='REFERENCIAS DECLARADAS';
    text=text.replace(/^#{1,3}\s+/,'');
    if(!text){lines.push({text:'',heading:false});continue;}
    const limit=heading?60:83;
    while(text.length>limit){
      const boundary=text.lastIndexOf(' ',limit);
      const index=boundary>limit/3?boundary:limit;
      lines.push({text:text.slice(0,index).trim(),heading});
      text=text.slice(index).trimStart();
    }
    lines.push({text,heading});
  }
  return lines;
}
export function makeStudioDocumentPdf(input:StudioDocumentInput):Blob {
  const data=normalized(input);
  const lines=printableLines(input);
  const pages:PrintLine[][]=[];
  let page:PrintLine[]=[];
  let used=0;
  for(const line of lines){
    const cost=line.heading?2:1;
    if(page.length && used+cost>45){pages.push(page);page=[];used=0;}
    page.push(line);used+=cost;
  }
  if(page.length)pages.push(page);
  if(pages.length>500)throw new Error('PDF_PAGE_COUNT_EXCEEDS_LOCAL_LIMIT');
  const objects:string[]=[];
  const total=3+pages.length*2;
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  const kids=pages.map((_,i)=>String(4+i*2)+' 0 R').join(' ');
  objects[2]='<< /Type /Pages /Kids ['+kids+'] /Count '+pages.length+' >>';
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  pages.forEach((pageLines,index)=>{
    const pageId=4+index*2;
    const contentId=pageId+1;
    const operations:string[]=['0.15 0.2 0.25 rg'];
    operations.push('BT /F1 16 Tf 1 0 0 1 52 784 Tm '+hexString(data.title.slice(0,74))+' Tj ET');
    operations.push('BT /F1 10 Tf 1 0 0 1 52 761 Tm '+hexString(kindNames[input.kind]+' · '+data.author)+' Tj ET');
    operations.push('0.7 0.75 0.8 RG 52 748 m 543 748 l S');
    let y=733;
    for(const line of pageLines){
      if(line.heading){y-=7;operations.push('0.10 0.30 0.42 rg');}
      else operations.push('0.15 0.20 0.25 rg');
      if(line.text)operations.push('BT /F1 '+(line.heading?12:10.5)+' Tf 1 0 0 1 52 '+y+' Tm '+hexString(line.text)+' Tj ET');
      y-=line.heading?20:13.6;
    }
    operations.push('0.7 0.75 0.8 RG 52 52 m 543 52 l S');
    operations.push('0.3 0.34 0.38 rg BT /F1 9 Tf 1 0 0 1 52 34 Tm '+
      hexString('SFI STUDIO · BORRADOR · '+(index+1)+' / '+pages.length)+' Tj ET');
    const stream=operations.join('\n')+'\n';
    objects[pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentId+' 0 R >>';
    objects[contentId]='<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream';
  });
  let output='%PDF-1.4\n%SFI Studio generated draft\n';
  const offsets:number[]=[0];
  for(let i=1;i<=total;i++){
    offsets[i]=output.length;
    output+=i+' 0 obj\n'+objects[i]+'\nendobj\n';
  }
  const xrefOffset=output.length;
  output+='xref\n0 '+(total+1)+'\n0000000000 65535 f \n';
  for(let i=1;i<=total;i++)output+=offsets[i].toString().padStart(10,'0')+' 00000 n \n';
  output+='trailer\n<< /Size '+(total+1)+' /Root 1 0 R >>\nstartxref\n'+xrefOffset+'\n%%EOF\n';
  // All PDF structural bytes are ASCII; content strings are represented as hexadecimal WinAnsi.
  return new Blob([output],{type:'application/pdf'});
}
export function downloadStudioDocumentBlob(blob:Blob,title:string,extension:'pdf'|'tex'|'md'){
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;
  anchor.download=safeName(title)+'.'+extension;
  anchor.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
