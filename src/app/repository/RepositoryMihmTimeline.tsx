'use client';

import { useMemo, useState } from 'react';
import { TIMELINE_CLOCKS } from '@/lib/mihm/timelineClocks';
import {
  projectRepositoryMihmTimeline, repositoryAxisAt,
  type RepositoryTemporalAxis,
} from '@/lib/repository/repositoryTemporalProjection';
import type { PublicPassportReading } from '@/lib/repository/publicPassportProjection';
import type { RepositoryObject } from './RepositoryConsole';

/**
 * Repository is still an archive, not ROOT or /timeline. Its temporal dock
 * invokes the SAME MIHM-T seven-clock projector as the dedicated instrument.
 * Publication remains an independent eighth EDITORIAL filter, never a
 * substitute clock and never evidence of event/actor knowledge/RETURN.
 */
export function RepositoryMihmTimeline({
  objects,publicReadings,selectedId,onSelect,onBackward,onForward,
}:{
  objects:readonly RepositoryObject[];
  publicReadings:Readonly<Record<string,PublicPassportReading>>;
  selectedId:string|null;
  onSelect:(id:string)=>void;
  onBackward:()=>void;
  onForward:()=>void;
}){
  const [axis,setAxis]=useState<RepositoryTemporalAxis>('RECORD');
  const [windowDays,setWindowDays]=useState<0|30|365>(0);
  const events=useMemo(()=>{
    const byId:Record<string,PublicPassportReading>={};
    for(const o of objects){
      const read=publicReadings[o.id]??publicReadings[o.slug]??publicReadings[o.objectKey];
      if(read)byId[o.id]=read;
    }
    return projectRepositoryMihmTimeline(objects,byId);
  },[objects,publicReadings]);
  const onAxis=useMemo(()=>events
    .flatMap(e=>{const at=repositoryAxisAt(e,axis);return at?[{...e,at}]:[]})
    .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.id.localeCompare(b.id)),[events,axis]);
  const latest=onAxis.length?Date.parse(onAxis[onAxis.length-1].at):0;
  const visible=onAxis.filter(e=>!windowDays||Date.parse(e.at)>=latest-windowDays*86400000);
  const selected=events.find(e=>e.id===selectedId)??null;
  const current=selected?repositoryAxisAt(selected,axis):null;
  const fmt=(x:string|null)=>x?new Intl.DateTimeFormat('es-MX',{
    year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',
    timeZone:'UTC',hour12:false,
  }).format(new Date(x))+' UTC':'UNKNOWN';
  const start=visible.length?Date.parse(visible[0].at):0;
  const end=visible.length?Date.parse(visible[visible.length-1].at):0;
  const span=Math.max(1,end-start);
  const selectedProfile=selected?.profile??null;
  return <nav className="repoTimeline repoMihmTimeline" aria-label="MIHM-T · cronología con relojes independientes" data-instrument="SFI-MIHM-T-TIMELINE-CLOCKS-0.1">
    <div className="repoMihmIdentity">
      <span>MIHM-T · RELOJES</span>
      <b>{axis==='PUBLICATION'?'FECHA EDITORIAL':axis}</b>
      <small>{visible.length} registros con fecha acreditada</small>
      <div><button onClick={onBackward} type="button" title="Retroceder en el campo horizontal">←</button><button onClick={onForward} type="button" title="Avanzar en el campo horizontal">→</button></div>
    </div>
    <section className="repoMihmTemporalField" aria-label="Selecciona el reloj y recorre sus registros">
      <div className="repoMihmAxes" role="group" aria-label="MIHM-T · bases temporales distintas">
        <button type="button" data-active={axis==='PUBLICATION'} aria-pressed={axis==='PUBLICATION'} onClick={()=>setAxis('PUBLICATION')} title="Fecha editorial, fuera de los siete relojes MIHM-T">EDITORIAL</button>
        {TIMELINE_CLOCKS.map(clock=><button type="button" key={clock.id} data-active={axis===clock.id}
          aria-pressed={axis===clock.id} onClick={()=>setAxis(clock.id)} title={clock.description}>{clock.id}</button>)}
      </div>
      <div className="repoMihmTrack" aria-label={'Secuencia fuente-fechada '+axis}>
        <div className="repoMihmLine" aria-hidden="true"/>
        {visible.map(e=><button type="button" key={e.id}
          className="repoMihmPin" style={{left:(visible.length===1?50:5+90*(Date.parse(e.at)-start)/span)+'%'}}
          data-selected={e.id===selectedId} onClick={()=>onSelect(e.id)}
          title={e.title+' · '+fmt(e.at)} aria-label={e.title+' · '+fmt(e.at)}
        ><i/><span>{fmt(e.at).split(' UTC')[0]}</span></button>)}
        {!visible.length?<p className="repoMihmNoData">UNKNOWN · NO HAY FECHAS INDEPENDIENTES PUBLICADAS PARA {axis}</p>:null}
      </div>
      <div className="repoMihmRanges"><span>FECHA EDITORIAL ≠ EVENTO ≠ OBSERVACIÓN ≠ CONOCIMIENTO ≠ RETURN</span>
        {([{days:30,name:'MES'},{days:365,name:'AÑO'},{days:0,name:'TODO'}] as const).map(w=>
          <button type="button" key={w.days} data-active={windowDays===w.days} onClick={()=>setWindowDays(w.days)}>{w.name}</button>)}
      </div>
    </section>
    <aside className="repoMihmClockInspector">
      <span>PASSPORT TEMPORAL · {selected?'OBJETO SELECCIONADO':'SIN SELECCIÓN'}</span>
      <strong>{fmt(current)}</strong>
      <small>{selected?selected.title:'Selecciona un registro del archivo.'}</small>
      <details><summary>7 RELOJES · {selectedProfile?.readings.filter(x=>x.at).length??0}/7 FECHADOS ⌄</summary>
        {selectedProfile?.readings.map(clock=><div className="repoMihmClockRow" key={clock.clock}>
          <span>{clock.clock}</span><b>{fmt(clock.at)}</b>
          <small>{clock.at?clock.sourceRef:'SIN FUENTE TEMPORAL'}</small>
        </div>)??<p>NOT OBSERVED · Selecciona un objeto.</p>}
        {selectedProfile?.documentedIntervals.map((interval,i)=><p key={i} className="repoMihmInterval" data-state={interval.state}>
          {interval.from} → {interval.to}: {(interval.deltaMs/60000).toFixed(1)} min · {interval.state}
        </p>)}
        <p>Orden documentado, no transferencia causal ni MIHM‑T validado.</p>
      </details>
    </aside>
  </nav>;
}
