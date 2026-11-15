'use client';

import { useState, type ChangeEvent } from 'react';
import {
  makeStudioDocumentPdf, makeStudioDocumentLatex, makeStudioDocumentMarkdown,
  downloadStudioDocumentBlob, type StudioDocumentInput, type StudioDocumentKind,
} from './localDocumentProduction';
import { makeStudioLocalZip, downloadStudioLocalZip } from './localZipPackage';
import StudioPodcastProduction from './StudioPodcastProduction';

const initial: StudioDocumentInput = {
  kind:'lab_note',
  title:'',
  author:'',
  body:'',
  sourceLines:'',
};
const kinds: Array<{value:StudioDocumentKind;label:string}> = [
  {value:'lab_note',label:'Nota de laboratorio'},
  {value:'research',label:'Investigación / manuscrito'},
  {value:'institutional_statement',label:'Comunicado institucional'},
  {value:'podcast_script',label:'Guion de podcast'},
  {value:'long_document',label:'Documento extenso'},
];
export default function StudioDocumentWorkbench() {
  const [data,setData]=useState<StudioDocumentInput>(initial);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  function update<K extends keyof StudioDocumentInput>(field:K,value:StudioDocumentInput[K]) {
    setData(current=>({...current,[field]:value}));
    setMessage('');
  }
  async function importText(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    if(!file)return;
    if(!/\.(txt|md)$/i.test(file.name) || file.size>1024*1024) {
      setMessage('Solo se admiten .txt y .md de hasta 1 MB en esta mesa de redacción.');
      return;
    }
    try {
      const text=await file.text();
      update('body',text);
      if(!data.title.trim())update('title',file.name.replace(/\.[^.]+$/,''));
      setMessage('Texto leído localmente. El archivo original no se transfirió ni guardó.');
    } catch(error) {
      setMessage('No se pudo leer el texto: '+(error instanceof Error?error.message:String(error)));
    }
  }
  function build(extension:'pdf'|'tex'|'md') {
    try {
      const output=extension==='pdf'
        ?makeStudioDocumentPdf(data)
        :new Blob([
          extension==='tex'?makeStudioDocumentLatex(data):makeStudioDocumentMarkdown(data),
        ],{type:'text/plain;charset=utf-8'});
      downloadStudioDocumentBlob(output,data.title,extension);
      setMessage(extension.toUpperCase()+' generado y descargado. Documento en estado BORRADOR.');
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
  }
  async function packageAll() {
    if(busy)return;
    setBusy(true);setMessage('');
    try {
      const md=makeStudioDocumentMarkdown(data);
      const tex=makeStudioDocumentLatex(data);
      const pdf=makeStudioDocumentPdf(data);
      const files=[
        {name:'documento.pdf',data:pdf},
        {name:'fuente-xelatex.tex',data:tex},
        {name:'fuente-editable.md',data:md},
        {name:'manifest.json',data:JSON.stringify({
          contract:'SFI-STUDIO-LOCAL-DOCUMENT-PACKAGE-1.0',
          createdAt:new Date().toISOString(),
          kind:data.kind,title:data.title,author:data.author,
          sources:'USER_DECLARED_NOT_INDEPENDENTLY_VERIFIED',
          state:'DRAFT_NOT_METHODOLOGICALLY_APPROVED',
          methodLabReview:'PENDING',
          repositoryPublication:'NOT_AUTHORIZED',
          originalUploaded:false,originalPersisted:false,
          pdfSource:'LOCAL_BASIC_PDF_WRITER_WINANSI_A4',
          texCompilation:'NOT_EXECUTED',
          providerApiCosts:0,
        },null,2)},
      ];
      const zip=await makeStudioLocalZip(files);
      downloadStudioLocalZip(zip,data.title);
      setMessage('Paquete PDF + LaTeX + Markdown generado. No se almacenaron materiales en SFI.');
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  }
  const inputStyle={background:'#14232b',border:'1px solid rgba(127,200,245,.27)',
    padding:'10px 11px',color:'#e8f5fb',width:'100%',boxSizing:'border-box' as const};
  const buttonStyle={padding:'9px 12px',background:'#1e4555',color:'#eaf9ff',
    border:'1px solid #507a8e',cursor:'pointer'};
  return <section style={{marginTop:26,padding:20,border:'1px solid rgba(127,200,245,.25)',
    background:'rgba(18,49,67,.2)',display:'grid',gap:12}}>
    <div style={{color:'#7fc8f5',fontSize:11,letterSpacing:'.15em'}}>PRODUCCIÓN DE DOCUMENTOS · PRIVADO</div>
    <h2 style={{margin:0,fontSize:22,fontWeight:450}}>Escribir y producir documentos</h2>
    <p style={{color:'#a7b9c3',fontSize:12,lineHeight:1.6,margin:0}}>
      Redacta o incorpora texto y produce un PDF A4, una fuente LaTeX para XeLaTeX y una versión Markdown.
      El archivo original nunca se envía al servidor. Este editor no inventa resultados científicos
      ni convierte el borrador en una publicación de Method Lab.
    </p>
    <label htmlFor="doc-kind">Tipo de documento</label>
    <select id="doc-kind" value={data.kind}
      onChange={e=>update('kind',e.target.value as StudioDocumentKind)} style={inputStyle}>
      {kinds.map(kind=><option key={kind.value} value={kind.value}>{kind.label}</option>)}
    </select>
    <label htmlFor="doc-title">Título</label>
    <input id="doc-title" maxLength={180} value={data.title}
      placeholder="Título de la investigación, nota o documento"
      onChange={e=>update('title',e.target.value)} style={inputStyle}/>
    <label htmlFor="doc-author">Autoría</label>
    <input id="doc-author" maxLength={160} value={data.author}
      placeholder="Autor o equipo responsable" onChange={e=>update('author',e.target.value)} style={inputStyle}/>
    <label htmlFor="doc-import">Importar material de referencia local (.txt o .md)</label>
    <input id="doc-import" type="file" accept=".txt,.md" onChange={importText}
      style={{color:'#c6d8e2',fontSize:12}}/>
    <label htmlFor="doc-body">Contenido del documento</label>
    <textarea id="doc-body" rows={10} value={data.body} onChange={e=>update('body',e.target.value)}
      placeholder="Escribe el texto completo. Utiliza #, ## o ### para los encabezados. Studio formateará el PDF y la fuente LaTeX."
      style={{...inputStyle,resize:'vertical',lineHeight:1.6}}/>
    <label htmlFor="doc-sources">Referencias declaradas (una por línea)</label>
    <textarea id="doc-sources" rows={3} value={data.sourceLines}
      onChange={e=>update('sourceLines',e.target.value)}
      placeholder="Autor, publicación, DOI o URL. SFI no asume que estas fuentes están verificadas."
      style={{...inputStyle,resize:'vertical'}}/>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <button type="button" onClick={()=>build('pdf')} style={buttonStyle}>DESCARGAR PDF A4</button>
      <button type="button" onClick={()=>build('tex')} style={buttonStyle}>DESCARGAR LATEX</button>
      <button type="button" onClick={()=>build('md')} style={buttonStyle}>DESCARGAR MARKDOWN</button>
      <button type="button" disabled={busy} onClick={packageAll}
        style={{...buttonStyle,background:'#235244'}}>
        {busy?'GENERANDO…':'DESCARGAR PAQUETE DOCUMENTAL'}
      </button>
    </div>
    {data.kind === 'podcast_script' && <StudioPodcastProduction document={data} />}
    {message&&<p role="status" style={{margin:0,color:'#a6d9c7',fontSize:12}}>{message}</p>}
    <p style={{color:'#8fa7b6',fontSize:11,margin:0}}>
      PDF local con tipografía estándar y compatibilidad WinAnsi. Para tipografía Unicode compleja,
      usa la fuente LaTeX con XeLaTeX. Compilación LaTeX y revisión científica no ejecutadas.
    </p>
  </section>;
}
