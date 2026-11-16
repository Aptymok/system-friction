'use client';

import { useState } from 'react';
import {
  contrastCampaignObservations, type CampaignObserved,
} from './localCampaignContrast';

type Measurement={
  url:string;observedAt:string;impressions:string;saves:string;meaningfulInteractions:string;
};
const blank=():Measurement=>({url:'',observedAt:'',impressions:'',saves:'',meaningfulInteractions:''});
export default function StudioCampaignReturnPanel({
  sessionId,planEventId,
}:{
  sessionId:string;planEventId:string|null;
}){
  const [data,setData]=useState<Record<'A'|'B',Measurement>>({A:blank(),B:blank()});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const observations:CampaignObserved[]=(['A','B'] as const).map(variant=>({
    variant,url:data[variant].url.trim(),
    observedAt:data[variant].observedAt,
    impressions:data[variant].impressions.trim()===''?NaN:Number(data[variant].impressions),
    saves:data[variant].saves.trim()===''?NaN:Number(data[variant].saves),
    meaningfulInteractions:data[variant].meaningfulInteractions.trim()===''?NaN:
      Number(data[variant].meaningfulInteractions),
    source:'MANUAL_PLATFORM_READBACK',
  }));
  const result=contrastCampaignObservations(observations);
  function change(variant:'A'|'B',field:keyof Measurement,value:string){
    setData(old=>({...old,[variant]:{...old[variant],[field]:value}}));
    setMessage('');
  }
  async function persist(){
    if(!planEventId||busy||result.status!=='CONTRASTABLE')return;
    setBusy(true);
    try{
      const response=await fetch('/api/studio/campaign/returns',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({sessionId,planEventId,observations}),
      });
      const out=await response.json() as {ok:boolean;persisted?:boolean;eventId?:string;error?:string;details?:string};
      if(!response.ok||!out.ok||!out.persisted)throw new Error(out.details??out.error??'RETURN_READBACK_UNAVAILABLE');
      setMessage('Contraste descriptivo almacenado y releído: '+out.eventId+
        '. Los números proceden de lectura manual, no de una API de plataforma.');
    }catch(error){
      setMessage('No se guardó el contraste: '+(error instanceof Error?error.message:String(error)));
    }finally{setBusy(false);}
  }
  const ctrl={background:'#142b3a',border:'1px solid #49718a',
    padding:'7px 9px',color:'#eaf7ff',fontSize:12} as const;
  return <div style={{padding:12,border:'1px solid rgba(138,201,233,.27)',display:'grid',gap:10}}>
    <strong>Contraste T1 y RETURN · dos piezas realmente publicadas</strong>
    <p style={{fontSize:11,color:'#a9c1ce',margin:0,lineHeight:1.5}}>
      Después de publicar manualmente dos variantes A/B, registra sus URL y cifras reales.
      Se comparan tasas de guardados. Este formulario no autentica las métricas directamente
      en Instagram, TikTok ni otras plataformas; la comparación es descriptiva, no causal.
    </p>
    {(['A','B'] as const).map(variant=><div key={variant} style={{display:'grid',gap:8,
      border:'1px solid rgba(142,202,224,.13)',padding:10}}>
      <strong>Hipótesis {variant}</strong>
      <input style={ctrl} type="url" value={data[variant].url} placeholder="URL del post publicado"
        onChange={event=>change(variant,'url',event.target.value)}/>
      <label style={{fontSize:11,display:'grid',gap:4}}>Fecha de lectura
        <input style={ctrl} type="datetime-local" value={data[variant].observedAt}
          onChange={event=>change(variant,'observedAt',event.target.value)}/>
      </label>
      <div style={{display:'grid',gap:8,gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))'}}>
        {([
          ['impressions','Impresiones'],['saves','Guardados'],
          ['meaningfulInteractions','Interacciones pertinentes'],
        ] as const).map(([field,label])=><label key={field}
          style={{fontSize:11,display:'grid',gap:4}}>{label}
          <input style={{...ctrl,width:'100%',boxSizing:'border-box'}} type="number" min={0} step={1}
            value={data[variant][field]}
            onChange={event=>change(variant,field,event.target.value)}/>
        </label>)}
      </div>
    </div>)}
    <p style={{margin:0,fontSize:12,color:'#c6d5dd'}}>
      {result.status} · {result.reason}
    </p>
    {result.status==='CONTRASTABLE'&&<div style={{display:'grid',gap:4}}>
      {result.rates.map(rate=><span key={rate.variant} style={{fontSize:11}}>
        Variante {rate.variant}: {(rate.saveRate*100).toFixed(3)} % guardados / impresiones
      </span>)}
      <strong style={{fontSize:11}}>Mayor tasa observada: {result.relativeOutcome} ·
        ganador científicamente certificado: NO</strong>
    </div>}
    <button type="button" disabled={!planEventId||busy||result.status!=='CONTRASTABLE'}
      onClick={persist} style={{background:'#285b49',padding:'9px 12px',
        border:'1px solid #73a28c',color:'#eafff8',cursor:'pointer',justifySelf:'start'}}>
      {busy?'REGISTRANDO…':'REGISTRAR CONTRASTE ASOCIADO A LA CAMPAÑA'}
    </button>
    {!planEventId&&<span style={{fontSize:11,color:'#d6b99b'}}>
      Guarda primero la propuesta en Studio para disponer de un expediente trazable.
    </span>}
    {message&&<p role="status" style={{margin:0,fontSize:12,color:'#a5dbc4'}}>{message}</p>}
  </div>;
}
