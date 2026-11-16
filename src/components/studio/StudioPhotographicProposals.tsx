'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReleaseDirection } from './localReleaseMaterials';
import {
  checkStudioPhotographs, createPhotographicCovers,
  type StudioPhotographicCover,
} from './localPhotographicCovers';
import { makeStudioLocalZip, downloadStudioLocalZip } from './localZipPackage';

export default function StudioPhotographicProposals({direction,onCovers}:{
  direction:ReleaseDirection;
  onCovers:(value:StudioPhotographicCover[])=>void;
}) {
  const [photos,setPhotos]=useState<File[]>([]);
  const [covers,setCovers]=useState<StudioPhotographicCover[]>([]);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [previews,setPreviews]=useState<string[]>([]);
  const urls=useRef<string[]>([]);
  const [lastSignature,setLastSignature]=useState('');
  const signature=[direction.title,direction.artist,photos.map(f=>f.name+':'+f.size+':'+f.lastModified).join('|')].join('|');
  useEffect(()=>()=>{urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current=[];},[]);
  useEffect(()=>{setCovers([]);onCovers([]);setLastSignature('');},[signature,onCovers]);
  function select(files:File[]) {
    setStatus('');
    setPhotos([]);
    setCovers([]);
    onCovers([]);
    urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current=[];
    setPreviews([]);
    try {checkStudioPhotographs(files);setPhotos(files);}
    catch(error){setStatus(error instanceof Error?error.message:String(error));}
  }
  async function generate(){
    if(busy||!photos.length)return;
    setBusy(true);setStatus('Componiendo portadas fotográficas de 3000 × 3000 píxeles localmente…');
    try {
      const next=await createPhotographicCovers(photos,direction);
      const nextUrls=next.map(cover=>URL.createObjectURL(cover.blob));
      urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current=nextUrls;
      setPreviews(nextUrls);setCovers(next);
      setLastSignature(signature);
      onCovers(next);
      setStatus(next.length+' portadas fotográficas independientes listas. No se transfirieron los originales.');
    }catch(error){
      setCovers([]);onCovers([]);
      setStatus('No se produjeron imágenes: '+(error instanceof Error?error.message:String(error)));
    }finally{setBusy(false);}
  }
  function download(blob:Blob,name:string){
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download=name;link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  async function downloadAll(){
    if(busy||!ready)return;
    setBusy(true);
    try {
      const entries=covers.map(cover=>({name:'photographs/'+cover.filename,data:cover.blob}));
      entries.push({name:'photographs/provenance.json',data:new Blob([JSON.stringify({
        type:'SFI_STUDIO_PHOTOGRAPHIC_DERIVATIVES',
        source:'USER_PROVIDED_IMAGES',
        images:covers.map(cover=>({
          filename:cover.filename,sourceFilename:cover.sourceName,
          provenance:cover.provenance,width:cover.width,height:cover.height,
        })),
        originalFilesIncluded:false,serverUpload:false,generativeAICalled:false,
      },null,2)],{type:'application/json'})});
      const zip=await makeStudioLocalZip(entries);
      downloadStudioLocalZip(zip,(direction.title||'studio')+'-photographs');
      setStatus('ZIP fotográfico descargado sin incluir imágenes originales.');
    }catch(error){
      setStatus('Falló el paquete fotográfico: '+(error instanceof Error?error.message:String(error)));
    }finally{setBusy(false);}
  }
  const ready=covers.length>0 && lastSignature===signature;
  return <section style={{display:'grid',gap:12,padding:14,border:'1px solid rgba(123,208,208,.33)'}}>
    <strong>Portadas fotográficas · de una a seis imágenes reales</strong>
    <p style={{fontSize:12,color:'#abc1d1',margin:0,lineHeight:1.5}}>
      Selecciona fotografías distintas. Studio prepara una portada editorial independiente a partir de cada foto,
      sin sustituirlas por figuras geométricas. El material original permanece en tu dispositivo.
      La generación de fotografías nuevas mediante IA necesita un proveedor autorizado; esta ruta no lo invoca.
    </p>
    <input type="file" multiple accept="image/png,image/jpeg,image/webp"
      onChange={event=>select(Array.from(event.target.files??[]))}
      style={{fontSize:12,color:'#d5e9ef'}}/>
    <div style={{display:'flex',gap:9,flexWrap:'wrap'}}>
      <button type="button" disabled={busy||!photos.length||!direction.title.trim()||!direction.artist.trim()}
        onClick={generate} style={{padding:'10px 14px',color:'#eaf7ff',background:'#254d60',border:'1px solid #65899d',cursor:'pointer'}}>
        {busy?'PRODUCIENDO…':'PRODUCIR PORTADAS FOTOGRÁFICAS'}
      </button>
      <button type="button" disabled={!ready||busy} onClick={downloadAll}
        style={{padding:'10px 14px',color:'#eaf7ff',background:'#235347',border:'1px solid #699d87',cursor:'pointer'}}>
        DESCARGAR FOTOGRAFÍAS EN ZIP
      </button>
    </div>
    {covers.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:12}}>
      {covers.map((cover,index)=><div key={cover.id} style={{display:'grid',gap:6,padding:8,border:'1px solid rgba(255,255,255,.15)'}}>
        <img src={previews[index]} alt={'Portada fotográfica basada en '+cover.sourceName}
          style={{width:'100%',aspectRatio:'1',objectFit:'cover'}}/>
        <small style={{color:'#adc4d3',overflowWrap:'anywhere'}}>{cover.sourceName}</small>
        <button type="button" disabled={!ready||busy} onClick={()=>download(cover.blob,cover.filename)}
          style={{padding:'7px 9px',background:'#223d50',color:'#eaf7ff',border:'1px solid #54768a',cursor:'pointer'}}>
          DESCARGAR PNG
        </button>
      </div>)}
    </div>}
    {!ready&&covers.length>0&&<p style={{color:'#d8c39c',fontSize:11}}>
      Cambiaron el título, artista o fotografías. Regenera las portadas antes de descargarlas.
    </p>}
    {status&&<p role="status" style={{fontSize:12,color:'#bdd9dc',margin:0}}>{status}</p>}
  </section>;
}
