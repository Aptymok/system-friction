'use client';

import { useEffect, useState } from 'react';
import { RootCycleAnalysisDock } from './RootCycleAnalysisDock';
import './root-cycle-analysis-dock.css';

type Cycle=Record<string,any>;

export function RootCycleAnalysisDockAuto(){
  const [cycles,setCycles]=useState<Cycle[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [error,setError]=useState('');

  async function reload(preferredId?:string){
    const response=await fetch('/api/pipeline/cycles',{cache:'no-store',credentials:'include'});
    const body=await response.json().catch(()=>null);
    if(!response.ok||!body?.ok){setError(body?.details??body?.error??'No fue posible leer los ciclos.');return;}
    const next=Array.isArray(body.cycles)?body.cycles:[];
    setCycles(next);
    setSelectedId(current=>{
      const target=preferredId||current;
      return next.some((item:Cycle)=>String(item.id)===target)?target:String(next[0]?.id??'');
    });
    setError('');
  }
  useEffect(()=>{void reload()},[]);
  const active=cycles.find(item=>String(item.id)===selectedId)??cycles[0]??null;
  if(error)return <section className="analysis-dock analysis-dock--empty"><b>ANÁLISIS DEL CICLO</b><p>{error}</p></section>;
  if(!active)return <section className="analysis-dock analysis-dock--empty"><b>ANÁLISIS DEL CICLO</b><p>Inicia un ciclo arriba. En cuanto exista, aquí aparecerán inferencias y trayectoria del objeto.</p></section>;
  return <div className="analysis-dock-shell">
    {cycles.length>1?<label className="analysis-dock-selector">CICLO<select value={String(active.id)} onChange={e=>setSelectedId(e.target.value)}>{cycles.slice(0,20).map(cycle=><option key={cycle.id} value={cycle.id}>{cycle.title} · {cycle.status}</option>)}</select></label>:null}
    <RootCycleAnalysisDock cycle={active} onChanged={()=>reload(String(active.id))}/>
  </div>;
}