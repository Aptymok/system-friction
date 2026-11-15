'use client';

import { useState } from 'react';
import type { StudioDocumentInput } from './localDocumentProduction';
import {
  buildSourceReviewScript, type IndexedStudioSource,
} from './localPodcastResearchScript';

type Discovery = {
  ok:boolean;
  error?:string;
  topic?:string;
  provider?:string;
  retrievedAt?:string;
  sources?:IndexedStudioSource[];
  warnings?:string[];
  findingsValidated?:boolean;
  articlesRead?:boolean;
  serverPersistence?:boolean;
};

export default function StudioDocumentResearch({document,onUpdate}:{
  document:StudioDocumentInput;
  onUpdate:(changes:Partial<StudioDocumentInput>)=>void;
}) {
  const [topic,setTopic]=useState('');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<Discovery|null>(null);
  const [status,setStatus]=useState('');
  const currentTopic=topic.trim() || document.title.trim();
  async function research() {
    if(busy||currentTopic.length<3)return;
    setBusy(true);setStatus('Consultando índice público…');setResult(null);
    try {
      const response=await fetch('/api/studio/document/discovery',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({topic:currentTopic}),
      });
      const data=await response.json().catch(()=>null) as Discovery|null;
      if(!response.ok||!data?.ok)throw new Error(data?.error||'La consulta no respondió.');
      setResult(data);
      setStatus('Fuentes candidatas: '+(data.sources?.length??0)+'. No se ha verificado el contenido de los artículos.');
    }catch(error){
      setStatus('Consulta no completada: '+(error instanceof Error?error.message:String(error)));
    }finally{setBusy(false);}
  }

  function appendSources() {
    if(!result?.sources?.length)return;
    const citations=result.sources.map(s=>
      [s.publisher||'Autor no identificado',s.title,s.url,s.publishedAt].filter(Boolean).join(' · ')
    );
    const existing=document.sourceLines.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    const combined=[...new Set([...existing,...citations])];
    onUpdate({sourceLines:combined.join('\n')});
    setStatus('Referencias candidatas incorporadas; requieren revisión de sus textos originales.');
  }

  function createScript() {
    if(!result?.topic || document.kind!=='podcast_script')return;
    const draft=buildSourceReviewScript(result.topic,result.sources||[]);
    onUpdate({
      title:document.title.trim()||result.topic,
      body:draft.body,
      sourceLines:draft.sourceLines,
    });
    setStatus('Guion editorial generado a partir del tema y los titulares atribuidos. '+draft.verifiedClaims+
      ' afirmaciones verificadas; '+draft.articlesRead+' artículos leídos. Puedes editarlo y producir su audio.');
  }

  const eligible=result?.sources?.filter(source=>{
    try{return new URL(source.url).protocol==='https:';}catch{return false;}
  })??[];
  return <section style={{
    padding:14,border:'1px solid rgba(147,201,229,.25)',
    background:'rgba(15,42,60,.22)',display:'grid',gap:10,
  }}>
    <strong>Investigar un tema antes de producir el documento</strong>
    <p style={{color:'#a6bac7',fontSize:11,margin:0,lineHeight:1.5}}>
      Studio puede localizar referencias públicas sin claves de API de pago. Se envía sólo el
      tema escrito aquí, nunca el documento, el guion ni un archivo original. Las noticias
      indexadas son pistas, no artículos leídos ni hechos comprobados.
    </p>
    <label htmlFor="studio-doc-topic">Tema de investigación (opcional si coincide con el título)</label>
    <input id="studio-doc-topic" value={topic} maxLength={180}
      placeholder="Tema para buscar fuentes públicas"
      onChange={event=>{setTopic(event.target.value);setResult(null);setStatus('');}}
      style={{
        padding:9,color:'#eaf6fb',background:'#162836',
        border:'1px solid #4c6775',width:'100%',boxSizing:'border-box',
      }}/>
    <button type="button" onClick={research} disabled={busy || currentTopic.length<3}
      style={{
        justifySelf:'start',padding:'9px 12px',color:'#eaf7ff',
        background:'#1e4b64',border:'1px solid #557e94',cursor:'pointer',
      }}>
      {busy?'INVESTIGANDO…':'BUSCAR FUENTES DEL TEMA'}
    </button>
    {status&&<p role="status" style={{color:'#b1d5c5',fontSize:12,margin:0}}>{status}</p>}
    {result&&<div style={{display:'grid',gap:9}}>
      <p style={{margin:0,color:'#b1d4ea',fontSize:12}}>
        Fuentes indexadas: {eligible.length} · Proveedor: {result.provider??'No informado'} ·
        Verificación de artículos: NO EJECUTADA
      </p>
      {eligible.map(source=><div key={source.url} style={{
        display:'grid',gap:4,padding:'8px 10px',border:'1px solid rgba(147,201,229,.13)',
      }}>
        <a href={source.url} target="_blank" rel="noopener noreferrer"
          style={{color:'#aad9f2',fontSize:12,overflowWrap:'anywhere'}}>{source.title}</a>
        <small style={{color:'#95aab6'}}>
          {source.publisher||'Origen desconocido'} · {source.publishedAt||'Fecha no informada'}
        </small>
      </div>)}
      {!eligible.length&&<p style={{fontSize:12,color:'#a9b8c0',margin:0}}>
        Sin resultados elegibles. Eso no demuestra ausencia de fuentes.
      </p>}
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button type="button" disabled={!eligible.length} onClick={appendSources}
          style={{
            padding:'9px 12px',color:'#e9f7ff',background:'#2b4554',
            border:'1px solid #64899c',cursor:'pointer',
          }}>INCORPORAR REFERENCIAS AL DOCUMENTO</button>
        {document.kind==='podcast_script'&&<button type="button" onClick={createScript}
          style={{
            padding:'9px 12px',color:'#e9f7ff',background:'#274e42',
            border:'1px solid #689786',cursor:'pointer',
          }}>CREAR GUION DE REVISIÓN DE FUENTES</button>}
      </div>
      <p style={{margin:0,color:'#aeb8b4',fontSize:11}}>
        La creación del guion reemplaza el texto del editor. Es una narración editorial
        de preguntas y fuentes atribuidas, no un resumen verificable de artículos no leídos.
      </p>
    </div>}
  </section>;
}
