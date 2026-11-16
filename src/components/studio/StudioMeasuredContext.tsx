'use client';

import { useCallback, useEffect, useState } from 'react';

type NumberOrNull = number | null;
type ResearchContext = {
  contextType: string;
  measuredAt: string;
  system: {
    status: string; sourceOrigin: string|null; formulaVersion: string|null;
    evidenceRefs: string[]; warnings: string[];
    values: {IHG:NumberOrNull;NTI:NumberOrNull;LDI:NumberOrNull;XI:NumberOrNull;PHI_S:NumberOrNull};
  };
  world: {
    status:string;sourceSnapshotId:string|null;observedAt:string|null;sector:string|null;
    confidence:NumberOrNull;interpretation:string;warnings:string[];
    domains:Array<{domain:string;value:NumberOrNull;confidence:NumberOrNull;sourceCount:number}>;
    readProvenance:unknown;
  };
  boundaries:string[];
};
const panel={background:'rgba(8,22,31,.88)',border:'1px solid rgba(105,158,202,.22)',padding:14} as const;
function metric(value:NumberOrNull):string {return value===null?'NO OBSERVADO':value.toFixed(4);}
function barWidth(value:NumberOrNull) {return value===null?0:Math.max(0,Math.min(100,value*100));}

export default function StudioMeasuredContext({documentCount}:{documentCount:number}) {
  const [context,setContext]=useState<ResearchContext|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/studio/research-context',{cache:'no-store'});
      const payload=await response.json() as {ok?:boolean;error?:string}&Partial<ResearchContext>;
      if(!response.ok||!payload.ok||!payload.system||!payload.world||!payload.measuredAt)throw new Error(payload.error??'READ_UNAVAILABLE');
      setContext(payload as ResearchContext);
    }catch(cause){setContext(null);setError(cause instanceof Error?cause.message:'No se pudo consultar MIHM.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{if(documentCount>0)void refresh();},[documentCount,refresh]);
  if(documentCount===0)return null;
  const systemEntries = context ? (Object.entries(context.system.values) as Array<[string,NumberOrNull]>) : [];
  const availableSystem = systemEntries.filter(([,value])=>value!==null);
  const worldEntries=context?.world.domains.filter(item=>item.value!==null)??[];
  return <section aria-label="MIHM y vector mundial: mediciones independientes" style={{...panel,display:'grid',gap:12}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'start',flexWrap:'wrap'}}>
      <div>
        <h3 style={{margin:'0 0 6px',fontFamily:'Georgia,serif',fontWeight:400,fontSize:22}}>Contexto medido · MIHM y vector del mundo</h3>
        <p style={{margin:0,maxWidth:770,fontSize:12,lineHeight:1.6,color:'#b5c8d4'}}>
          Dos instrumentos diferentes, mostrados sin agregarlos ni asumir que los documentos causaron sus valores. Los valores faltantes permanecen vacíos.
        </p>
      </div>
      <button type="button" disabled={loading} onClick={()=>void refresh()} style={{border:'1px solid #6688a1',padding:'8px 11px',background:'#1b3d51',color:'#eaf4fa',cursor:'pointer'}}>{loading?'Consultando…':'Actualizar contexto real'}</button>
    </div>
    {error?<p role="alert" style={{fontSize:12,color:'#e2b7a2'}}>No se pudo leer el estado real: {error}. No se generarán sustitutos simulados.</p>:null}
    {context?<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:12}}>
        <article style={panel}>
          <h4 style={{margin:'0 0 8px'}}>SCOREFRICTION · estado sistémico</h4>
          <p style={{fontSize:11,color:'#a9c1d0'}}>Estado: {context.system.status} · Fórmula: {context.system.formulaVersion??'desconocida'}</p>
          <div style={{display:'grid',gap:9}}>
            {systemEntries.map(([key,value])=><div key={key} style={{display:'grid',gridTemplateColumns:'55px 1fr 90px',gap:7,alignItems:'center',fontSize:11}}>
              <strong>{key}</strong>
              <span style={{height:10,background:'#172e3d'}}><span style={{display:'block',height:10,width:barWidth(value)+'%',background:'#7fb1d0'}}/></span>
              <code style={{fontSize:10,textAlign:'right'}}>{metric(value)}</code>
            </div>)}
          </div>
          <p style={{fontSize:11,color:'#a7becd',lineHeight:1.55}}>
            {availableSystem.length} de {systemEntries.length} variables disponibles. Referencias persistidas: {context.system.evidenceRefs.length}. Fuente: {context.system.sourceOrigin??'no consta'}.
          </p>
          {context.system.warnings.length>0?<details><summary style={{fontSize:11,cursor:'pointer'}}>Advertencias de instrumento</summary><p style={{fontSize:10,overflowWrap:'anywhere'}}>{context.system.warnings.join(' · ')}</p></details>:null}
        </article>
        <article style={panel}>
          <h4 style={{margin:'0 0 8px'}}>WORLD VECTOR · contexto mundial</h4>
          <p style={{fontSize:11,color:'#a9c1d0'}}>Estado: {context.world.status} · Observado: {context.world.observedAt??'no consta'}</p>
          {worldEntries.length?<div style={{display:'grid',gap:8}}>
            {worldEntries.slice(0,12).map(item=><div key={item.domain} style={{display:'grid',gridTemplateColumns:'110px 1fr 56px',gap:7,alignItems:'center',fontSize:10}}>
              <span style={{overflowWrap:'anywhere'}}>{item.domain}</span>
              <span style={{height:10,background:'#172e3d'}}><span style={{display:'block',height:10,width:barWidth(item.value)+'%',background:'#b2a37b'}}/></span>
              <code style={{fontSize:10,textAlign:'right'}}>{metric(item.value)}</code>
            </div>)}
          </div>:<p style={{fontSize:12,color:'#b2c4ce'}}>Sin dominios del mundo disponibles en este corte.</p>}
          <p style={{fontSize:11,color:'#aec2d0',lineHeight:1.65}}>{context.world.interpretation}</p>
          <p style={{fontSize:10,color:'#98b0bf',overflowWrap:'anywhere'}}>Snapshot: {context.world.sourceSnapshotId??'no observado'} · Sector: {context.world.sector??'desconocido'} · Confianza: {metric(context.world.confidence)}</p>
          {context.world.warnings.length>0?<details><summary style={{fontSize:11,cursor:'pointer'}}>Advertencias del vector mundial</summary><p style={{fontSize:10,overflowWrap:'anywhere'}}>{context.world.warnings.join(' · ')}</p></details>:null}
        </article>
      </div>
      <div role="img" aria-label="Diagrama de procedencia: documentos cargados, estado sistémico derivado y contexto mundial observado, conectados solo para lectura contextual" style={{...panel,display:'flex',alignItems:'stretch',justifyContent:'center',gap:8,flexWrap:'wrap'}}>
        {[
          {title:'DOCUMENTOS',detail:documentCount+' archivos · evidencia textual',state:'DERIVED'},
          {title:'MIHM SISTÉMICO',detail:availableSystem.length+' métricas · ScoreFriction',state:context.system.status},
          {title:'ESTADO DEL MUNDO',detail:worldEntries.length+' dominios · World Vector',state:context.world.status},
        ].map((part,index)=><div key={part.title} style={{display:'flex',alignItems:'center',gap:8,flex:'1 1 190px',minWidth:0}}>
          {index>0?<span aria-hidden="true" style={{fontSize:15,color:'#a6b8c4'}}>⇢</span>:null}
          <div style={{minWidth:0,flex:1,border:'1px solid #456177',padding:12,background:'#0a1824'}}>
            <strong style={{fontSize:12,display:'block'}}>{part.title}</strong>
            <small style={{display:'block',color:'#aec2cf',marginTop:5}}>{part.detail}</small>
            <small style={{display:'block',color:'#85aac2',marginTop:6,overflowWrap:'anywhere'}}>{part.state}</small>
          </div>
        </div>)}
        <p style={{flexBasis:'100%',margin:'5px 0 0',fontSize:10,color:'#a8bcc9'}}>Las flechas indican relación de consulta y contextualización, no causalidad, calibración conjunta o enlace de evidencia demostrado.</p>
      </div>
      <aside style={{...panel,borderLeft:'3px solid #b8a36c'}}>
        <strong style={{fontSize:12}}>Relación documental ↔ sistema ↔ mundo</strong>
        <p style={{fontSize:12,color:'#b6c7d1',lineHeight:1.65,marginBottom:0}}>
          El documento proporciona afirmaciones y referencias; ScoreFriction proporciona un agregado sistémico derivado;
          World Vector proporciona un corte mundial con su propia identidad y fecha. Su comparación aquí es contextual, no una medición de
          tensión causal, ni la aplicación calibrada de MIHM a este documento. Para medir esa tensión hacen falta sujetos compatibles,
          ventanas alineadas y un protocolo contrastable.
        </p>
      </aside>
      <p style={{fontSize:10,color:'#91aabd',margin:0}}>Lectura consultada: {context.measuredAt}. No se almacenó ni publicó una nueva observación. Datos de fuentes existentes.</p>
    </>:null}
  </section>;
}
