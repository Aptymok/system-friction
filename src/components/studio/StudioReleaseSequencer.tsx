'use client';

import { useMemo,useState } from 'react';
import { studioAttractorProjection } from './studioAttractorProjection';
import {
  sequenceStudioReleases,type ReleaseSequenceItem,type ReleaseSequenceResult,
} from './localAlbumReleaseSequencer';
type Row=Record<string,unknown>;
const rec=(v:unknown):Row=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const str=(v:unknown)=>typeof v==='string'?v:'';
function dateToday(){
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function saveDownload(filename:string,body:string){
  const url=URL.createObjectURL(new Blob([body],{type:'application/json'}));
  const a=document.createElement('a');a.download=filename;a.href=url;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
type Measured={objectId:string;energyProxy:number;observedAt:string|null};
export default function StudioReleaseSequencer({objects,sessions}:{objects:Row[];sessions:Row[]}){
  const usable=sessions.filter(session=>Boolean(str(rec(rec(session.metadata).field).attractor&&rec(rec(rec(session.metadata).field).attractor).id)));
  const [selectedSession,setSelectedSession]=useState('');
  const sessionId=usable.some(s=>s.id===selectedSession)?selectedSession:str(usable[0]?.id);
  const graph=useMemo(()=>{
    const session=sessions.find(s=>s.id===sessionId);
    return studioAttractorProjection(objects.filter(o=>o.session_id===sessionId),session?[session]:[]);
  },[objects,sessions,sessionId]);
  const candidates=graph.nodes.filter(n=>n.kind==='project'||n.kind==='node'||n.kind==='object');
  const [orderedIds,setOrderedIds]=useState<string[]>([]);
  const validSelected=orderedIds.filter(id=>candidates.some(n=>n.id===id));
  const [earliest,setEarliest]=useState(dateToday);
  const [spacing,setSpacing]=useState(3);
  const [scenario,setScenario]=useState<'DECLARED'|'ENERGY_RAMP'|'ENERGY_CONTRAST'>('DECLARED');
  const [features,setFeatures]=useState<Measured[]>([]);
  const [measurementStatus,setMeasurementStatus]=useState('');
  const [result,setResult]=useState<ReleaseSequenceResult|null>(null);
  const [resultInputs,setResultInputs]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [archiveBusy,setArchiveBusy]=useState(false);
  const inputsKey=JSON.stringify([sessionId,validSelected,earliest,spacing,scenario,features]);
  const ready=Boolean(result&&resultInputs===inputsKey);
  function toggle(id:string){
    setOrderedIds(ids=>ids.includes(id)?ids.filter(item=>item!==id):[...ids,id]);
    setResult(null);
  }
  function move(index:number,delta:number){
    const destination=index+delta;if(destination<0||destination>=validSelected.length)return;
    setOrderedIds(existing=>{
      const next=existing.filter(id=>candidates.some(node=>node.id===id));
      [next[index],next[destination]]=[next[destination],next[index]];
      return next;
    });
    setResult(null);
  }
  async function readFeatures(){
    if(!sessionId||busy)return;
    setBusy(true);
    try{
      const response=await fetch('/api/studio/campaign/release-features?sessionId='+encodeURIComponent(sessionId),
        {cache:'no-store'});
      const body=await response.json() as {ok:boolean;features?:Measured[];dataStatus?:string;error?:string};
      if(!response.ok||!body.ok)throw new Error(body.error||'NOT_AVAILABLE');
      setFeatures(body.features??[]);
      setMeasurementStatus(body.dataStatus||'READ');
      setMessage('Mediciones recuperadas: '+(body.features?.length??0)+'. RMS es indicador físico, no preferencia del público.');
    }catch(error){
      setFeatures([]);setMeasurementStatus('UNAVAILABLE');
      setMessage('No fue posible recuperar mediciones: '+(error instanceof Error?error.message:String(error)));
    }finally{setBusy(false);}
  }
  const items:ReleaseSequenceItem[]=validSelected.map((id,index)=>{
    const n=candidates.find(node=>node.id===id)!;
    const own=n.sourceObjectId;
    const descendants=graph.nodes.filter(other=>other.parentId===n.id&&other.sourceObjectId);
    const audioSources=own?[own]:descendants.map(other=>other.sourceObjectId!);
    const relevant=features.filter(feature=>audioSources.includes(feature.objectId));
    const proxy=relevant.length===1?relevant[0].energyProxy:null;
    return {
      id:n.id,title:n.label,narrative:typeof n.passport.description==='string'?n.passport.description:null,
      originalOrder:index,acousticEnergyProxy:proxy,
      proxySource:proxy===null?'UNAVAILABLE':'RECORDED_STUDIO_FEATURE',
      priorReleaseDate:null,
    };
  });
  function generate(){
    try{
      const output=sequenceStudioReleases({
        items,earliestDate:earliest,spacingWeeks:spacing,scenarioId:scenario,
      });
      setResult(output);setResultInputs(inputsKey);
      setMessage('Fechas propuestas con regla de distribución documentada. Sin predicción calibrada de éxito.');
    }catch(error){setResult(null);setMessage('No se pudo secuenciar: '+(error instanceof Error?error.message:String(error)));}
  }
  async function archive(){
    if(!ready||!result||archiveBusy)return;
    setArchiveBusy(true);
    try{
      const response=await fetch('/api/studio/campaign/release-sequence',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({sessionId,selectedNodeIds:validSelected,earliestDate:earliest,
          spacingWeeks:spacing,scenarioId:scenario}),
      });
      const body=await response.json() as {ok:boolean;error?:string;persisted?:boolean;eventId?:string};
      if(!response.ok||!body.ok||!body.persisted)throw new Error(body.error||'SEQUENCE_PERSISTENCE_UNVERIFIED');
      setMessage('Calendario propuesto persistido y releído: '+body.eventId+'. No se ha programado publicación.');
    }catch(error){setMessage('No se confirmó persistencia: '+(error instanceof Error?error.message:String(error)));}
    finally{setArchiveBusy(false);}
  }
  const ctrl={background:'#132a3a',border:'1px solid #4b7389',color:'#eaf8ff',
    padding:'8px 10px',fontSize:12} as const;
  const btn={background:'#225266',border:'1px solid #629db1',color:'#eaf8ff',
    padding:'8px 10px',fontSize:12,cursor:'pointer'} as const;
  return <section style={{border:'1px solid rgba(140,208,229,.30)',padding:16,
    display:'grid',gap:12,background:'rgba(16,37,49,.35)'}}>
    <strong style={{fontSize:18}}>Secuenciador de singles y fechas de estreno</strong>
    <p style={{fontSize:12,color:'#aebfca',margin:0,lineHeight:1.6}}>
      Selecciona las obras existentes y ordénalas. El calendario compara tres hipótesis:
      continuidad elegida, progresión acústica y contraste acústico. Las últimas dos sólo
      se habilitan cuando hay mediciones persistidas para todas las obras.
      Ninguna se presenta como óptimo social validado.
    </p>
    {usable.length===0?<p style={{fontSize:12,color:'#d4bca2'}}>
      No hay atractores con proyectos registrados en Studio Field.
    </p>:<>
      <label style={{display:'grid',gap:6}}>Atractor / sesión
        <select style={ctrl} value={sessionId} onChange={e=>{
          setSelectedSession(e.target.value);setOrderedIds([]);setFeatures([]);
          setResult(null);setMeasurementStatus('');
        }}>
          {usable.map(s=><option value={str(s.id)} key={str(s.id)}>{str(s.title)||str(s.id)}</option>)}
        </select>
      </label>
      <div style={{display:'grid',gap:6}}>
        <strong style={{fontSize:12}}>Obras y proyectos declarados</strong>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:7}}>
          {candidates.map(node=><label key={node.id} style={{fontSize:12,color:'#dfedf6'}}>
            <input type="checkbox" checked={validSelected.includes(node.id)} onChange={()=>toggle(node.id)}/>
            {' '+node.label} <small style={{color:'#96acbb'}}>({node.kind})</small>
          </label>)}
        </div>
      </div>
      {validSelected.length>0&&<div style={{display:'grid',gap:5}}>
        <strong style={{fontSize:12}}>Orden de obras elegido por el operador</strong>
        {validSelected.map((id,index)=>{
          const node=candidates.find(n=>n.id===id)!;
          return <div key={id} style={{display:'flex',gap:8,alignItems:'center',
            borderBottom:'1px solid rgba(255,255,255,.1)',padding:5}}>
            <span style={{flex:1,fontSize:12}}>{index+1}. {node.label}</span>
            <button type="button" disabled={index===0} onClick={()=>move(index,-1)} style={btn}>SUBIR</button>
            <button type="button" disabled={index===validSelected.length-1} onClick={()=>move(index,1)} style={btn}>BAJAR</button>
          </div>;
        })}
      </div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
        <label style={{display:'grid',gap:5}}>Fecha de planificación
          <input type="date" style={ctrl} value={earliest} onChange={e=>setEarliest(e.target.value)}/>
        </label>
        <label style={{display:'grid',gap:5}}>Separación entre singles (semanas)
          <input type="number" min={1} max={16} style={ctrl} value={spacing}
            onChange={e=>setSpacing(Number(e.target.value))}/>
        </label>
        <label style={{display:'grid',gap:5}}>Hipótesis de secuencia
          <select style={ctrl} value={scenario} onChange={e=>
            setScenario(e.target.value as 'DECLARED'|'ENERGY_RAMP'|'ENERGY_CONTRAST')}>
            <option value="DECLARED">Orden declarado</option>
            <option value="ENERGY_RAMP">Progresión de energía medida</option>
            <option value="ENERGY_CONTRAST">Contraste de energía medida</option>
          </select>
        </label>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button type="button" disabled={busy} onClick={readFeatures} style={btn}>
          {busy?'RECUPERANDO…':'RECUPERAR MEDICIONES REALES'}
        </button>
        <button type="button" disabled={!validSelected.length} onClick={generate}
          style={{...btn,background:'#25634f'}}>PROPONER SECUENCIA Y FECHAS</button>
      </div>
      {measurementStatus&&<span style={{fontSize:11,color:'#a8ccde'}}>
        Estado de mediciones: {measurementStatus}. Su disponibilidad no demuestra calibración cultural.
      </span>}
      {ready&&result&&<>
        <table style={{fontSize:11,borderCollapse:'collapse'}}>
          <thead><tr>{['Orden','Single','Fecha tentativa','Último día para pitch Spotify','T1 / contraste'].map(t=>
            <th key={t} style={{padding:8,textAlign:'left',borderBottom:'1px solid #547a8e'}}>{t}</th>)}</tr></thead>
          <tbody>{result.schedule.map((item,index)=><tr key={item.itemId}>
            <td style={{padding:8}}>{index+1}</td><td style={{padding:8}}>{item.title}</td>
            <td style={{padding:8}}>{item.date}</td><td style={{padding:8}}>{item.spotifyPitchDeadline}</td>
            <td style={{padding:8}}>{item.campaign.t1}</td>
          </tr>)}</tbody>
        </table>
        <p style={{fontSize:11,color:'#d4b99e',margin:0}}>
          Convención industrial de viernes y plazo mínimo de pitch: fuente Spotify for Artists
          y New Music Fridays. Los viernes no garantizan atención, listas editoriales ni rendimiento.
          La optimización cultural permanece sin contraste empírico.
        </p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button type="button" style={btn} onClick={()=>saveDownload(
            'studio-release-sequence.json',JSON.stringify(result,null,2))}>
            DESCARGAR SECUENCIA CON FUENTES
          </button>
          <button type="button" disabled={archiveBusy} style={btn} onClick={archive}>
            {archiveBusy?'PERSISTIENDO…':'GUARDAR SECUENCIA EN STUDIO'}
          </button>
        </div>
      </>}
      {message&&<p role="status" style={{margin:0,color:'#b8d7cd',fontSize:12}}>{message}</p>}
    </>}
  </section>;
}
