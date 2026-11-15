'use client';

import { useState } from 'react';
import type { ReleaseDirection } from './localReleaseMaterials';

type DiscoverySource = {
  title:string; url:string; publisher:string|null; publishedAt:string|null;
  retrievedAt:string; epistemicClass:string;
};
type DiscoveryResult = {
  ok:boolean; error?:string; details?:string; scope?:string;
  marketEvidence?:{
    status:string; provider:string; query:string; sources:DiscoverySource[];
    warnings:string[]; audienceSize:null; listenerDemographics:null;
  };
  targetSector?:{name:string|null;epistemicClass:string};
  methodologicalRouting?:{
    state:string;status:string;primary:string|null;supporting:string[];
    FAD:string;MIHM:string;blockers:Array<{message:string}>;
  };
  publication?:{status:string};
};
export default function StudioReleaseResearch({direction}:{direction:ReleaseDirection}) {
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<DiscoveryResult|null>(null);
  const [error,setError]=useState('');
  async function research() {
    if(busy)return;
    setBusy(true);setError('');setResult(null);
    try {
      const response=await fetch('/api/studio/release/discovery',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({
          title:direction.title.trim(),artist:direction.artist.trim(),
          sector:direction.sector.trim(),
        }),
      });
      const payload=await response.json().catch(()=>null) as DiscoveryResult|null;
      if(!response.ok || !payload?.ok){
        throw new Error(payload?.details||payload?.error||'La investigación no pudo ejecutarse.');
      }
      setResult(payload);
    }catch(cause){
      setError(cause instanceof Error?cause.message:'La investigación no está disponible.');
    }finally{setBusy(false);}
  }
  function download() {
    if(!result)return;
    const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download='studio-release-public-discovery.json';anchor.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const sources=result?.marketEvidence?.sources??[];
  return <section style={{display:'grid',gap:9,padding:12,border:'1px solid rgba(127,200,245,.25)'}}>
    <strong>Investigación pública sin costo de API</strong>
    <p style={{fontSize:11,color:'#a1b5c5',margin:0,lineHeight:1.5}}>
      Busca noticias indexadas sobre el sector propuesto. Sólo se envían título, artista y sector escritos en el formulario.
      El audio y las mediciones permanecen en tu dispositivo. No guarda resultados automáticamente.
    </p>
    <button type="button" disabled={busy||!direction.title.trim()||!direction.artist.trim()} onClick={research}
      style={{justifySelf:'start',padding:'9px 12px',color:'#e6f6ff',background:'#21475e',border:'1px solid #648ca5',cursor:'pointer'}}>
      {busy?'CONSULTANDO FUENTES…':'INVESTIGAR SECTOR Y SELECCIONAR MÉTODO'}
    </button>
    {error&&<p role="alert" style={{color:'#f3b3a4',margin:0}}>{error}</p>}
    {result&&<div aria-live="polite" style={{display:'grid',gap:8}}>
      <strong>Resultado de observación externa</strong>
      <p style={{margin:0}}>Fuentes indexadas recuperadas: {sources.length}. Público cuantificado: NO OBSERVADO.</p>
      <p style={{margin:0}}>Método sugerido por el selector existente: {result.methodologicalRouting?.primary??'NO SELECCIONADO'}.
        FAD: {result.methodologicalRouting?.FAD}. MIHM: {result.methodologicalRouting?.MIHM}.</p>
      <p style={{fontSize:11,color:'#bacad3',margin:0}}>
        La selección metodológica no ejecuta una evaluación. Las fuentes son pistas de investigación,
        no prueba de que esas personas escuchen la obra.
      </p>
      {sources.length? <ul style={{paddingLeft:18,margin:0,display:'grid',gap:5}}>
        {sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer"
          style={{color:'#9dd4f5'}}>{s.title}</a>
          <span style={{fontSize:10,color:'#9ab2bf'}}> · {s.publisher??'Fuente no identificada'}</span>
        </li>)}
      </ul>:<p style={{margin:0,color:'#d8bd91'}}>
        No hay fuentes elegibles en esta consulta. Eso no significa que no exista público.
      </p>}
      <button type="button" onClick={download} style={{justifySelf:'start',padding:'8px 12px',
        color:'#e6f6ff',background:'#1c3d38',border:'1px solid #517c71',cursor:'pointer'}}>
        DESCARGAR HALLAZGOS Y TRAZABILIDAD
      </button>
    </div>}
  </section>;
}
