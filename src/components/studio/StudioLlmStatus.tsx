'use client';
import { useEffect, useState } from 'react';

type Provider={
  id:string; configured:boolean; state:string; canaryOk:boolean|null;
  model:string;lastSuccessAt:string|null;
};
type Read={
  ok:boolean; providers:Provider[];
  zeroCostStatus:string;billingFreeTierValidated:boolean;
  externalLlmCallsPerformed:number;
  error?:string;
};

export default function StudioLlmStatus() {
  const [status,setStatus]=useState<Read|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function inspect(signal?:AbortSignal){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/studio/llm/status',{cache:'no-store',signal});
      const payload=await response.json() as Read;
      if(!response.ok||!payload.ok)throw new Error(payload.error??'PROVIDER_STATUS_UNAVAILABLE');
      if(!signal?.aborted)setStatus(payload);
    }catch(cause){
      if(!signal?.aborted)setError(cause instanceof Error?cause.message:'PROVIDER_STATUS_UNAVAILABLE');
    }finally{
      if(!signal?.aborted)setBusy(false);
    }
  }
  useEffect(()=>{
    const controller=new AbortController();
    void inspect(controller.signal);
    return ()=>controller.abort();
  },[]);
  return <section style={{padding:14,border:'1px solid rgba(148,202,224,.32)',
    background:'rgba(18,37,49,.33)',display:'grid',gap:10}}>
    <strong style={{fontSize:17}}>Inteligencia compartida de Studio</strong>
    <p style={{margin:0,fontSize:12,color:'#acc3d0',lineHeight:1.6}}>
      Una sola infraestructura de modelos para interpretar el contexto de los atractores,
      construir hipótesis, coordinar campañas y reconstruir expedientes.
      Esta lectura no realiza llamadas a modelos ni consume tokens.
    </p>
    <button type="button" disabled={busy} onClick={()=>void inspect()}
      style={{justifySelf:'start',padding:'8px 10px',fontSize:12,
        color:'#eaf8ff',background:'#245669',border:'1px solid #6294aa'}}>
      {busy?'LEYENDO ESTADO…':'VERIFICAR CONFIGURACIÓN Y SALUD'}
    </button>
    {status&&<div style={{display:'grid',gap:7}}>
      {status.providers.map(provider=><div key={provider.id}
        style={{display:'flex',flexWrap:'wrap',gap:10,fontSize:12,
          padding:8,borderBottom:'1px solid rgba(255,255,255,.1)'}}>
        <strong style={{minWidth:65}}>{provider.id.toUpperCase()}</strong>
        <span>{provider.configured?'Credencial configurada':'Sin credencial'}</span>
        <span>{provider.state}</span>
        <span>{provider.canaryOk===true?'Respuesta registrada':
          provider.canaryOk===false?'Última prueba fallida':'Sin prueba exitosa comprobada'}</span>
        <span>{provider.model}</span>
      </div>)}
      <p style={{margin:0,fontSize:11,color:'#d8bda1'}}>
        Nivel gratuito de la cuenta: NO VERIFICADO. Una clave configurada no prueba
        que una llamada sea gratis. Ningún modelo publica, autoriza gastos ni valida RETURN.
      </p>
    </div>}
    {error&&<p role="alert" style={{fontSize:12,color:'#e5b9aa'}}>{error}</p>}
  </section>;
}
