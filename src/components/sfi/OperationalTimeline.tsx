'use client';

import Link from 'next/link';
import { useMemo,useState } from 'react';
import './OperationalTimeline.css';

export type TimelineItem={
  id:string; at:string; lane:'INSTITUTION'|'WORLD'|'CASE'|'PROJECT';
  title:string; subtitle:string; origin:string; state:string; href:string;
  world?:{wsi:number|null;nti:number|null;confidence:number|null;vectors:Array<{id:string;label:string;value:number|null;sourceCount:number}>};
};
const LANES=[
  {id:'INSTITUTION',title:'INSTITUTION',subtitle:'PUBLIC CANONICAL RECORDS'},
  {id:'WORLD',title:'WORLD',subtitle:'DATED WORLDSPECT SNAPSHOTS'},
  {id:'CASE',title:'CASE',subtitle:'AUTHORITY-BOUND CASE RECORDS'},
  {id:'PROJECT',title:'PROJECT',subtitle:'PROJECT RECORDS'},
] as const;
const fmt=(value:string)=>{
  const t=new Date(value);
  return Number.isFinite(t.valueOf())?new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',year:'numeric',timeZone:'UTC'}).format(t):'INVALID DATE';
};

export function OperationalTimeline({items,worldReadPlane}:{items:readonly TimelineItem[];worldReadPlane:string}){
  const [windowDays,setWindowDays]=useState<30|365|0>(0);
  const [laneFilter,setLaneFilter]=useState<string>('ALL');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const temporal=useMemo(()=>items.filter(event=>Number.isFinite(Date.parse(event.at))).slice().sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)),[items]);
  const latest=temporal.length?Date.parse(temporal[temporal.length-1].at):Date.now();
  const visible=useMemo(()=>temporal.filter(event=>(!windowDays||Date.parse(event.at)>=latest-windowDays*86400000)&&(laneFilter==='ALL'||event.lane===laneFilter)),[temporal,latest,windowDays,laneFilter]);
  const dates=visible.map(e=>Date.parse(e.at)),minimum=Math.min(...dates,latest),maximum=Math.max(...dates,latest),span=Math.max(1,maximum-minimum);
  const selected=visible.find(e=>e.id===selectedId)??visible[visible.length-1]??null;
  const byLane=(id:string)=>visible.filter(e=>e.lane===id);
  const pos=(at:string)=>4+92*(Date.parse(at)-minimum)/span;
  const years=Array.from(new Set(visible.map(e=>new Date(e.at).getUTCFullYear()))).sort();
  return <main className="sfiTemporalShell" data-sfi-instrument="TIMELINE-RECORDED-1.0">
    <div className="sfiTemporalAtmosphere" aria-hidden="true"/>
    <header className="sfiTemporalHeader">
      <Link href="/" className="sfiTemporalBrand">S F I <span>——</span> <small>SYSTEM FRICTION INSTITUTE</small></Link>
      <nav aria-label="Institutional operational navigation"><Link href="/root">ROOT</Link><Link href="/observatory">OBSERVATORY</Link><Link href="/reality-chain">REALITY CHAIN</Link><Link href="/method-lab">METHOD LAB</Link><Link href="/repository">REPOSITORY</Link><Link href="/timeline" aria-current="page">TIMELINE</Link><Link href="/root/access">ACCESS</Link></nav>
    </header>
    <section className="sfiTemporalMain">
      <aside className="sfiTemporalIndex">
        <h1>TIMELINE</h1><p>INSTITUTIONAL MEMORY IN TEMPORAL CONTEXT</p>
        <div className="sfiTemporalCounters">{LANES.map(lane=><button key={lane.id} type="button" onClick={()=>setLaneFilter(laneFilter===lane.id?'ALL':lane.id)} aria-pressed={laneFilter===lane.id}><i data-lane={lane.id}/><span>{lane.title}</span><b>{byLane(lane.id).length}</b></button>)}</div>
        <div className="sfiTemporalBoundary"><strong>SOURCE BOUNDARY</strong><p>Published institutional records are not evidence of their external effects. World snapshots are dated readings, not causal outcomes. Private cases and projects are not synthesized.</p></div>
        <Link href="/reality-chain">AUTHORIZED CASE PLATFORM ↗</Link>
      </aside>
      <div className="sfiTemporalField">
        <div className="sfiTemporalFieldHead"><span>OBSERVED / RECORDED TIME</span><small>WORLD READ: {worldReadPlane}</small></div>
        <div className="sfiTemporalYears">{years.map(year=><b key={year}>{year}</b>)}</div>
        {LANES.map(lane=><div className="sfiTemporalLane" key={lane.id} data-lane={lane.id}>
          <div className="sfiTemporalLaneLabel"><strong>{lane.title}</strong><span>{lane.subtitle}</span></div>
          <div className="sfiTemporalLaneTrack">
            {visible.filter(e=>e.lane===lane.id).map(e=><button type="button" key={e.id} onClick={()=>setSelectedId(e.id)} className={selected?.id===e.id?'isSelected':''} style={{left:pos(e.at)+'%'}} title={e.title} aria-label={e.title+' '+fmt(e.at)}><i/><span>{e.title}</span></button>)}
            {!byLane(lane.id).length?<p>{lane.id==='CASE'||lane.id==='PROJECT'?'NOT EXPOSED BY CURRENT PUBLIC READER':'NO RECORDED ENTRIES IN SELECTED WINDOW'}</p>:null}
          </div>
        </div>)}
        <div className="sfiTemporalFieldFooter"><span>{visible.length} DATED RECORDS IN WINDOW</span><span>OBSERVATION ≠ EVIDENCE ≠ RETURN</span></div>
      </div>
      <aside className="sfiTemporalInspector">
        <div className="sfiTemporalInspectorTitle"><small>RECORD INSPECTOR</small><strong>{selected?'RECORDED':'UNAVAILABLE'}</strong></div>
        {selected?<><time>{fmt(selected.at)}</time><h2>{selected.title}</h2><p>{selected.subtitle}</p>
          <dl><div><dt>CLASS</dt><dd>{selected.lane}</dd></div><div><dt>PROVENANCE</dt><dd>{selected.origin}</dd></div><div><dt>STATE</dt><dd>{selected.state}</dd></div><div><dt>RECORD TIME</dt><dd>{selected.at}</dd></div></dl>
          {selected.world?<section><h3>WORLD SNAPSHOT</h3><dl><div><dt>WSI</dt><dd>{selected.world.wsi?.toFixed(3)??'UNKNOWN'}</dd></div><div><dt>NTI</dt><dd>{selected.world.nti?.toFixed(3)??'UNKNOWN'}</dd></div><div><dt>CONFIDENCE</dt><dd>{selected.world.confidence?.toFixed(3)??'UNKNOWN'}</dd></div></dl>
            {selected.world.vectors.filter(x=>x.value!==null).slice(0,5).map(x=><div className="sfiTemporalVector" key={x.id}><span>{x.label}</span><b>{x.value!.toFixed(3)}</b><small>{x.sourceCount} SOURCES</small></div>)}</section>:null}
          <Link href={selected.href} className="sfiTemporalInspectLink">OPEN SOURCE BOUNDARY ↗</Link>
        </>:<p className="sfiTemporalAbsent">No dated record returned for this selection. The interface does not fabricate historical events.</p>}
      </aside>
    </section>
    <footer className="sfiTemporalRail">
      <div>GLOBAL TIMELINE <strong>{visible.length} RECORDS</strong></div>
      <div className="sfiTemporalRailTicks">{visible.slice(-26).map(e=><button key={e.id} type="button" onClick={()=>setSelectedId(e.id)} style={{left:pos(e.at)+'%'}} title={fmt(e.at)+' · '+e.title} data-active={e.id===selected?.id}><i/></button>)}</div>
      <div className="sfiTemporalRanges">{([{value:30,label:'MONTH'},{value:365,label:'YEAR'},{value:0,label:'ALL'}] as const).map(x=><button type="button" key={x.value} className={windowDays===x.value?'active':''} onClick={()=>setWindowDays(x.value)}>{x.label}</button>)}</div>
    </footer>
  </main>;
}
