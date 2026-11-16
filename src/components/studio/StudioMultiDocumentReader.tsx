'use client';

import { useState, type ChangeEvent } from 'react';
import StudioMeasuredContext from './StudioMeasuredContext';

type Fragment = { paragraph: number; page: number | null; text: string; start: number | null; end: number | null };
type ExtractedDocument = {
  source: { filename: string; size: number; sha256: string };
  extraction: { parser: string; pageCount: number | null; fragmentCount: number; complete: boolean; warnings: string[]; fragments: Fragment[] };
};
type DocumentRecord = { key: string; source: ExtractedDocument['source']; extraction: ExtractedDocument['extraction'] };
const AXES = [
  { id: 'IHG', description: 'Homeostasis: requiere definición operacional, ventana y entradas medidas' },
  { id: 'NTI', description: 'Tensión nodal: requiere nodos, interacciones y regla de agregación' },
  { id: 'LDI', description: 'Degradación: requiere trayectoria temporal, línea de base y contraste' },
  { id: 'WDV', description: 'Vector de mundo: requiere origen, componentes, instante y versión' },
] as const;
type AxisId = typeof AXES[number]['id'];
type AxisReading = { id: AxisId; matches: Array<{ document: DocumentRecord; fragment: Fragment }> };
function axisMatches(documents: readonly DocumentRecord[], axis: AxisId) {
  const exact = new RegExp('\\b' + axis + '\\b', 'i');
  return documents.flatMap(document => document.extraction.fragments
    .filter(fragment => exact.test(fragment.text))
    .map(fragment => ({ document, fragment })));
}
function downloadJson(value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'sfi-studio-document-reading-draft.json'; anchor.click(); }
  finally { window.setTimeout(() => URL.revokeObjectURL(url), 1500); }
}
function short(text: string, length = 480) { return text.length <= length ? text : text.slice(0,length).trimEnd() + '…'; }

export default function StudioMultiDocumentReader() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [selectedAxis, setSelectedAxis] = useState<AxisId>('IHG');
  const [search, setSearch] = useState('');
  const readings: AxisReading[] = AXES.map(axis => ({ id: axis.id, matches: axisMatches(documents, axis.id) }));
  const matches = readings.find(reading => reading.id === selectedAxis)?.matches ?? [];
  const found = documents.flatMap(doc => doc.extraction.fragments.map(fragment => ({doc,fragment})))
    .filter(({fragment}) => !search.trim() || fragment.text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .slice(0, 25);

  async function importFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (!files.length || busy) return;
    setBusy(true); setMessages([]);
    const next: DocumentRecord[] = [...documents];
    const notes: string[] = [];
    for (const file of files.slice(0, 12)) {
      if (!/\\.(pdf|docx|txt|md|csv|tsv|json)$/i.test(file.name) || file.size <= 0 || file.size > 6*1024*1024) {
        notes.push(file.name + ': formato no admitido o más de 6 MB; no fue leído.');
        continue;
      }
      try {
        const form = new FormData(); form.set('file',file);
        const response = await fetch('/api/reality-chain/extract',{method:'POST',body:form,cache:'no-store'});
        const payload = await response.json() as {ok?:boolean;error?:string}&Partial<ExtractedDocument>;
        if (!response.ok || !payload.ok || !payload.source || !payload.extraction) {
          notes.push(file.name + ': lectura fallida (' + (payload.error ?? response.status) + ').');
          continue;
        }
        const record: DocumentRecord = {key:payload.source.sha256,source:payload.source,extraction:payload.extraction};
        const index = next.findIndex(item=>item.key===record.key);
        if(index >= 0) notes.push(file.name + ': mismo contenido ya incorporado; no se duplicó.');
        else next.push(record);
      } catch (error) {
        notes.push(file.name + ': lectura fallida (' + (error instanceof Error ? error.message : 'error desconocido') + ').');
      }
    }
    if (files.length>12) notes.push('Se procesaron como máximo los primeros 12 archivos seleccionados.');
    setDocuments(next); setMessages(notes); setBusy(false);
  }
  const panel = {background:'rgba(7,20,31,.9)',border:'1px solid rgba(125,180,216,.25)',padding:16} as const;
  return <section aria-label="Mesa de lectura documental SFI" style={{...panel,marginTop:26,display:'grid',gap:16,color:'#e4eff5',fontFamily:'var(--sfi-screen, sans-serif)'}}>
    <header style={{display:'grid',gap:6}}>
      <small style={{letterSpacing:'.12em',color:'#9ccce8'}}>SFI STUDIO · LECTURA INTEGRADA · MULTIDOCUMENTO</small>
      <h2 style={{margin:0,fontFamily:'var(--sfi-display, Georgia, serif)',fontSize:29,fontWeight:400}}>Leer documentos, examinar relaciones</h2>
      <p style={{margin:0,color:'#b2c3cf',lineHeight:1.6,fontSize:13}}>
        Carga varios documentos para extraer texto, conservar sus referencias y examinar dónde mencionan variables MIHM. La extracción es transitoria:
        no archiva los originales ni mide por sí misma el estado del mundo.
      </p>
    </header>
    <label style={{display:'grid',gap:7,fontSize:13}}>Seleccionar archivos (PDF, DOCX, TXT, MD, CSV, TSV o JSON; hasta 6 MB por archivo)
      <input type="file" multiple accept=".pdf,.docx,.txt,.md,.csv,.tsv,.json" disabled={busy}
        onChange={event=>{void importFiles(event);}} aria-label="Cargar documentos para lectura integrada"/>
    </label>
    {busy ? <p role="status">Extrayendo texto con el analizador existente…</p> : null}
    {messages.map((message,i)=><p key={i} role="status" style={{color:'#ebc99e',margin:0,fontSize:12}}>{message}</p>)}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:9}}>
      {documents.map(document=><article key={document.key} style={{...panel,padding:11}}>
        <strong style={{fontSize:13,overflowWrap:'anywhere'}}>{document.source.filename}</strong>
        <p style={{fontSize:11,color:'#a8c2d3',lineHeight:1.55,margin:'8px 0'}}>
          {document.extraction.pageCount ?? 'Páginas no resueltas'} {document.extraction.pageCount===null ? '' : 'páginas'}
          {' · '}{document.extraction.fragments.length} fragmentos disponibles
          {' · '}{document.extraction.complete ? 'Extracción completa según el límite del extractor' : 'Extracción parcial'}
        </p>
        <code style={{fontSize:9,color:'#85a8be',overflowWrap:'anywhere'}}>SHA-256: {document.key}</code>
        {document.extraction.warnings.length>0?<p style={{fontSize:10,color:'#e2b888'}}>Advertencias: {document.extraction.warnings.join(' · ')}</p>:null}
        <button type="button" onClick={()=>setDocuments(old=>old.filter(x=>x.key!==document.key))} style={{display:'block',marginTop:10,background:'transparent',border:'1px solid #6686a0',color:'#cfdfeb',padding:6,cursor:'pointer'}}>Quitar de la lectura</button>
      </article>)}
    </div>
    {documents.length>0 ? <>
      <h3 style={{margin:'4px 0 0',fontFamily:'Georgia,serif',fontWeight:400}}>Mapa documental de variables</h3>
      <p style={{margin:0,fontSize:12,color:'#abbfcc'}}>Cada barra representa cuántos fragmentos extraídos mencionan literalmente el indicador. No representa intensidad, correlación, tensión física ni valor calculado.</p>
      <div style={{display:'grid',gap:9}} role="img" aria-label="Conteos de menciones textuales de IHG, NTI, LDI y WDV">
        {readings.map(reading=><button key={reading.id} type="button" onClick={()=>setSelectedAxis(reading.id)} style={{display:'grid',gridTemplateColumns:'50px minmax(0,1fr) 55px',gap:10,alignItems:'center',background:selectedAxis===reading.id?'rgba(42,99,138,.3)':'rgba(255,255,255,.025)',border:'1px solid rgba(120,170,205,.25)',padding:8,color:'#e2f0f9',cursor:'pointer',textAlign:'left'}}>
          <strong>{reading.id}</strong>
          <span style={{height:11,background:'rgba(255,255,255,.08)',display:'block'}}><span style={{display:'block',height:'100%',width:(readings.some(r=>r.matches.length>0)?100*reading.matches.length/Math.max(...readings.map(r=>r.matches.length)):0)+'%',background:'#76a9c6'}}/></span>
          <span style={{fontSize:11}}>{reading.matches.length} citas</span>
        </button>)}
      </div>
      <StudioMeasuredContext documentCount={documents.length} />
      <div style={panel}>
        <h4 style={{margin:'0 0 8px'}}>{selectedAxis} · {AXES.find(axis=>axis.id===selectedAxis)?.description}</h4>
        <p style={{fontSize:12,color:'#b1c5d1'}}>Valor medido: <strong>NO OBSERVADO</strong>. La mención textual solo constituye un indicio documental; requiere entradas, método calibrado, ventana y fuente temporal verificables.</p>
        {matches.slice(0,12).map(({document,fragment},index)=><blockquote key={document.key+':'+fragment.paragraph+':'+index} style={{margin:'10px 0',borderLeft:'2px solid #6089a4',paddingLeft:12,fontSize:12,lineHeight:1.55,color:'#d4e1ea'}}>
          <span style={{display:'block',fontSize:10,color:'#88abc2'}}>{document.source.filename} · {fragment.page===null?'página no resuelta':'página '+fragment.page} · fragmento {fragment.paragraph}</span>
          {short(fragment.text)}
        </blockquote>)}
        {matches.length===0?<p style={{fontSize:12,color:'#aebbc5'}}>No hay menciones en los fragmentos disponibles. Esto no demuestra que la variable esté ausente del documento completo.</p>:null}
      </div>
      <div style={panel}>
        <h4 style={{margin:'0 0 9px'}}>Inspección de contenido extraído</h4>
        <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar términos en los fragmentos…" aria-label="Buscar texto extraído" style={{width:'100%',padding:9,background:'#091725',color:'#e8f3fa',border:'1px solid #45677b',boxSizing:'border-box'}}/>
        <p style={{fontSize:11,color:'#a4b9c8'}}>Mostrando hasta 25 fragmentos coincidentes de las extracciones disponibles.</p>
        {found.map(({doc,fragment},index)=><details key={doc.key+'-'+fragment.paragraph+'-'+index} style={{borderBottom:'1px solid #284052',padding:'9px 0'}}>
          <summary style={{cursor:'pointer',fontSize:12}}>{doc.source.filename} · {fragment.page===null?'página desconocida':'p. '+fragment.page} · ¶{fragment.paragraph} — {short(fragment.text,100)}</summary>
          <p style={{whiteSpace:'pre-wrap',fontSize:12,lineHeight:1.65}}>{fragment.text}</p>
        </details>)}
      </div>
      <button type="button" onClick={()=>downloadJson({contract:'SFI-STUDIO-MULTIDOCUMENT-READING-0.1',state:'DERIVED_TRANSIENT',sources:documents.map(({source,extraction})=>({source,extraction})),indicators:readings.map(r=>({id:r.id,observedValue:null,measurementState:'NOT_OBSERVED',mentionCount:r.matches.length})),limitations:['Source content is unverified.','Mentions do not calculate MIHM metrics.','The extraction did not persist documents.','Missing citations may result from truncated extraction.'],publicationState:'NOT_AUTHORIZED'})}
        style={{background:'#264c60',color:'#e7f3f9',border:'1px solid #71aac6',padding:'10px 14px',cursor:'pointer',justifySelf:'start'}}>Descargar lectura trazable (JSON · borrador)</button>
    </> : <p style={{fontSize:12,color:'#9db5c3',margin:0}}>Ningún documento cargado. Aquí aparecerán las fuentes, fragmentos y variables al seleccionarlos.</p>}
  </section>;
}
