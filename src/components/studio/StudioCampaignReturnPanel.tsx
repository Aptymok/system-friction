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
  const [contrastEventId,setContrastEventId]=useState<string|null>(null);
  const [disposition,setDisposition]=useState('INCONCLUSIVE');
  const [rationale,setRationale]=useState('');
  const [proposedChange,setProposedChange]=useState('');
  const [learningBusy,setLearningBusy]=useState(false);
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
      setContrastEventId(out.eventId??null);
      setMessage('Contraste descriptivo almacenado y releído: '+out.eventId+
        '. Los números proceden de lectura manual, no de una API de plataforma.');
    }catch(error){
      setMessage('No se guardó el contraste: '+(error instanceof Error?error.message:String(error)));
    }finally{setBusy(false);}
  }
  async function saveLearning(){
    if(!contrastEventId||learningBusy||!sessionId)return;
    setLearningBusy(true);
    try{
      const response=await fetch('/api/studio/campaign/learning',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({sessionId,contrastEventId,disposition,rationale,proposedChange}),
      });
      const data=await response.json() as {ok:boolean;persisted?:boolean;learningEventId?:string;error?:string};
      if(!response.ok||!data.ok||!data.persisted)throw new Error(data.error??'LEARNING_NOT_PERSISTED');
      setMessage('Decisión editorial atribuida y persistida: '+data.learningEventId+
        '. La nueva estrategia aún requiere ejecución y contraste propio.');
    }catch(error){
      setMessage('Aprendizaje no registrado: '+(error instanceof Error?error.message:String(error)));
    }finally{setLearningBusy(false);}
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
    {contrastEventId&&<div style={{display:'grid',gap:8,
      border:'1px solid rgba(140,208,186,.3)',padding:12}}>
      <strong>Decidir qué aprender y qué modificar</strong>
      <p style={{margin:0,fontSize:11,color:'#acc7bd'}}>
        La tasa mayor observada puede informar una decisión editorial.
        No identifica causalidad ni certifica una hipótesis científica.
      </p>
      <select value={disposition} onChange={e=>setDisposition(e.target.value)} style={ctrl}>
        <option value="INCONCLUSIVE">Sin ganador: contraste inconcluso</option>
        {result.relativeOutcome==='A_HIGHER_OBSERVED'&&<option value="A_DESCRIPTIVELY_HIGHER">
          A · mayor tasa observada, no efecto causal
        </option>}
        {result.relativeOutcome==='B_HIGHER_OBSERVED'&&<option value="B_DESCRIPTIVELY_HIGHER">
          B · mayor tasa observada, no efecto causal
        </option>}
      </select>
      <textarea value={rationale} onChange={e=>setRationale(e.target.value)}
        rows={3} maxLength={1800} style={ctrl}
        placeholder="Qué aprendimos de lo observado y qué lo limita (mínimo 30 caracteres)"/>
      <textarea value={proposedChange} onChange={e=>setProposedChange(e.target.value)}
        rows={3} maxLength={1800} style={ctrl}
        placeholder="Qué cambiará en la siguiente campaña (mínimo 20 caracteres)"/>
      <button type="button" disabled={learningBusy||rationale.trim().length<30||
        proposedChange.trim().length<20}
        onClick={saveLearning} style={{background:'#265f51',padding:'9px 12px',
          border:'1px solid #79ad99',color:'#effff8',cursor:'pointer',justifySelf:'start'}}>
        {learningBusy?'REGISTRANDO…':'REGISTRAR DECISIÓN Y SIGUIENTE CAMBIO'}
      </button>
    </div>}
    {!planEventId&&<span style={{fontSize:11,color:'#d6b99b'}}>
      Guarda primero la propuesta en Studio para disponer de un expediente trazable.
    </span>}
    {message&&<p role="status" style={{margin:0,fontSize:12,color:'#a5dbc4'}}>{message}</p>}
  </div>;
}
