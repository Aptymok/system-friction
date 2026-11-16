'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReleaseDirection, ReleaseMetrics } from './localReleaseMaterials';
import {
  createAllStudioCoverVariants, studioCoverVariantFilename,
  STUDIO_COVER_VARIANTS, type StudioCoverVariantId,
} from './localCoverVariations';
import { makeStudioLocalZip, downloadStudioLocalZip } from './localZipPackage';

type Cover = {id: StudioCoverVariantId;label:string;blob:Blob;url:string};
export default function StudioVisualProposals({direction,metrics}:{
  direction:ReleaseDirection;metrics:ReleaseMetrics;
}) {
  const [covers,setCovers]=useState<Cover[]>([]);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const urls=useRef<string[]>([]);
  const serial=useRef(0);
  const signature=[direction.title,direction.artist,direction.concept,direction.palette,
    metrics.tempoBpm,metrics.loudnessRangeLu].join('|');
  const [generatedFor,setGeneratedFor]=useState('');
  useEffect(()=>{
    return ()=>{serial.current++;urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current=[];};
  },[]);

  async function generate() {
    if(busy || !direction.title.trim() || !direction.artist.trim())return;
    const seq=++serial.current;
    setBusy(true);setStatus('Generando seis propuestas independientes en el navegador…');
    try {
      const rendered=await createAllStudioCoverVariants(direction,metrics);
      if(seq!==serial.current)return;
      const next=rendered.map(item=>({...item,url:URL.createObjectURL(item.blob)}));
      urls.current.forEach(url=>URL.revokeObjectURL(url));
      urls.current=next.map(item=>item.url);
      setCovers(next);setGeneratedFor(signature);
      setStatus('Seis portadas independientes generadas, cada una de 3000 × 3000 píxeles.');
    }catch(error){
      setStatus('No se generaron las portadas: '+(error instanceof Error?error.message:String(error)));
    }finally{if(seq===serial.current)setBusy(false);}
  }
  function download(blob:Blob,filename:string){
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  async function downloadAll(){
    if(busy || !covers.length || generatedFor!==signature)return;
    setBusy(true);setStatus('Empaquetando seis imágenes sin originales…');
    try{
      const files=covers.map(cover=>({
        name:'03-artwork/'+studioCoverVariantFilename(cover.id),data:cover.blob,
      }));
      files.push({
        name:'03-artwork/variations.json',
        data:new Blob([JSON.stringify({
          source:'SFI_STUDIO_LOCAL_PROCEDURAL',
          createdAt:new Date().toISOString(),
          images:STUDIO_COVER_VARIANTS.map(x=>({
            ...x,file:studioCoverVariantFilename(x.id),width:3000,height:3000,
          })),
          originalMediaUploaded:false,
          publicationAuthorized:false,
          externallyValidated:false,
        },null,2)],{type:'application/json'}),
      });
      const zip=await makeStudioLocalZip(files);
      downloadStudioLocalZip(zip,(direction.title||'studio')+'-six-cover-variants');
      setStatus('Paquete con seis imágenes distintas descargado. Ningún original fue almacenado.');
    }catch(error){
      setStatus('No se produjo el ZIP: '+(error instanceof Error?error.message:String(error)));
    }finally{setBusy(false);}
  }
  const metadataReady=Boolean(direction.title.trim() && direction.artist.trim());
  const ready=metadataReady && covers.length===STUDIO_COVER_VARIANTS.length && generatedFor===signature;
  return <section style={{display:'grid',gap:12,padding:14,border:'1px solid rgba(123,208,208,.33)'}}>
    <strong>Laboratorio visual · seis direcciones diferentes</strong>
    <p style={{fontSize:12,color:'#abc1d1',margin:0,lineHeight:1.5}}>
      No es una única imagen con seis colores. Cada propuesta cambia composición, lenguaje y estructura.
      Son diseños procedurales locales; no fotografías ni imágenes generadas con modelos externos.
    </p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <button type="button" disabled={busy || !metadataReady} onClick={generate}
        style={{padding:'10px 14px',background:'#254d60',color:'#eaf7ff',border:'1px solid #65899d',cursor:busy?'wait':'pointer'}}>
        {busy?'GENERANDO…':'GENERAR SEIS PORTADAS'}
      </button>
      <button type="button" disabled={!ready || busy} onClick={downloadAll}
        style={{padding:'10px 14px',background:'#235347',color:'#eaf7ff',border:'1px solid #699d87',cursor:busy?'wait':'pointer'}}>
        DESCARGAR SEIS PORTADAS EN ZIP
      </button>
    </div>
    {!metadataReady && <p style={{margin:0,color:'#d8c39c',fontSize:11}}>
      Escribe el nombre de la obra y del artista antes de generar las propuestas.
    </p>}
    {covers.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:12}}>
      {covers.map(cover=><div key={cover.id} style={{display:'grid',gap:6,padding:8,
        border:'1px solid rgba(255,255,255,.18)',opacity:ready?1:.65}}>
        <img src={cover.url} alt={'Propuesta visual '+cover.label}
          style={{width:'100%',aspectRatio:'1',objectFit:'cover'}}/>
        <strong style={{fontSize:12}}>{cover.label}</strong>
        <button type="button" disabled={!ready||busy}
          onClick={()=>download(cover.blob,studioCoverVariantFilename(cover.id))}
          style={{padding:'7px 9px',background:'#223d50',color:'#eaf7ff',border:'1px solid #54768a',cursor:'pointer'}}>
          DESCARGAR PNG
        </button>
      </div>)}
    </div>}
    {covers.length>0&&!ready&&<p style={{color:'#d8c39c',margin:0,fontSize:11}}>
      Cambiaron los datos del lanzamiento. Regenera las seis propuestas para reflejarlos.
    </p>}
    {status&&<p role="status" style={{fontSize:12,color:'#bdd9dc',margin:0}}>{status}</p>}
  </section>;
}
