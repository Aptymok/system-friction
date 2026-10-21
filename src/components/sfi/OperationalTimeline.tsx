'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  projectTimelineClockProfile,
  TIMELINE_CLOCKS,
  type TimelineClockInputs,
} from '@/lib/mihm/timelineClocks';
import './OperationalTimeline.css';

export type TimelineItem = {
  id: string; at: string; lane: 'INSTITUTION'|'WORLD'|'CASE'|'PROJECT';
  title: string; subtitle: string; origin: string; state: string; href: string;
  clockAnchorMeaning?: string;
  clockEvidence?: TimelineClockInputs;
  recordCreatedAt?: string | null;
  world?: {wsi:number|null;nti:number|null;confidence:number|null;vectors:Array<{
    id:string;label:string;value:number|null;sourceCount:number
  }>};
};

const LANES = [
  {id:'INSTITUTION',title:'INSTITUTION',subtitle:'CANONICAL PUBLISHED RECORDS'},
  {id:'WORLD',title:'WORLD',subtitle:'PERSISTED WORLDSPECT SNAPSHOTS'},
  {id:'CASE',title:'CASE',subtitle:'GOVERNED CASE RECORDS'},
  {id:'PROJECT',title:'PROJECT',subtitle:'GOVERNED PROJECT RECORDS'},
] as const;
const fmt = (value:string) => {
  const date=new Date(value);
  return Number.isFinite(date.valueOf())
    ?new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',year:'numeric',hour:'2-digit',
      minute:'2-digit',hour12:false,timeZone:'UTC'}).format(date)+' UTC'
    :'INVALID DATE';
};
const elapsed = (ms:number) => {
  const abs=Math.abs(ms),scale=abs>=86400000?86400000:abs>=3600000?3600000:abs>=60000?60000:1000;
  const unit=scale===86400000?'days':scale===3600000?'hours':scale===60000?'minutes':'seconds';
  return (ms<0?'-':'')+(abs/scale).toFixed(abs%scale===0?0:1)+' '+unit;
};

export function OperationalTimeline({items,worldReadPlane}:{
  items:readonly TimelineItem[];worldReadPlane:string
}){
  const [windowDays,setWindowDays]=useState<30|365|0>(0);
  const [laneFilter,setLaneFilter]=useState<string>('ALL');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [lens,setLens]=useState<'CHRONOLOGY'|'CLOCKS'>('CLOCKS');
  const temporal=useMemo(()=>items.filter(event=>Number.isFinite(Date.parse(event.at)))
    .slice().sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)),[items]);
  const latest=temporal.length?Date.parse(temporal[temporal.length-1].at):Date.now();
  const visible=useMemo(()=>temporal.filter(event=>
    (!windowDays||Date.parse(event.at)>=latest-windowDays*86400000)&&
    (laneFilter==='ALL'||event.lane===laneFilter)
  ),[temporal,latest,windowDays,laneFilter]);
  const dates=visible.map(e=>Date.parse(e.at));
  const minimum=Math.min(...dates,latest),maximum=Math.max(...dates,latest),span=Math.max(1,maximum-minimum);
  const selected=visible.find(e=>e.id===selectedId)??visible[visible.length-1]??null;
  const byLane=(id:string)=>visible.filter(e=>e.lane===id);
  const pos=(at:string)=>4+92*(Date.parse(at)-minimum)/span;
  const years=Array.from(new Set(visible.map(e=>new Date(e.at).getUTCFullYear()))).sort();
  const selectedClocks=selected?projectTimelineClockProfile({
    eventId:selected.id,anchorAt:selected.at,
    anchorMeaning:selected.clockAnchorMeaning??'Source calendar anchor; clock kind unknown',
    clocks:selected.clockEvidence,
  }):null;

  return <main className="sfiTemporalShell" data-sfi-instrument="MIHM-T-TIMELINE-CLOCKS-0.1">
    <div className="sfiTemporalAtmosphere" aria-hidden="true"/>
    <header className="sfiTemporalHeader">
      <Link href="/" className="sfiTemporalBrand">S F I <span>——</span> <small>SYSTEM FRICTION INSTITUTE</small></Link>
    </header>
    <section className="sfiTemporalMain">
      <aside className="sfiTemporalIndex">
        <span className="sfiTemporalKicker">MIHM-T / OBSERVATION INSTRUMENT</span>
        <h1>TIMELINE</h1>
        <p>THE WORLD DOESN&apos;T HAVE THE SAME CLOCK.</p>
        <div className="sfiTemporalCounters">{LANES.map(lane=>
          <button key={lane.id} type="button" onClick={()=>setLaneFilter(laneFilter===lane.id?'ALL':lane.id)}
            aria-pressed={laneFilter===lane.id}>
            <i data-lane={lane.id}/><span>{lane.title}</span><b>{byLane(lane.id).length}</b>
          </button>
        )}</div>
        <div className="sfiTemporalBoundary">
          <strong>SOURCE BOUNDARY</strong>
          <p>Clock readings are individually sourced. A record date does not prove event, knowledge, authority, execution or RETURN time. Missing timestamps stay UNKNOWN. MIHM-T temporal transfers remain experimental.</p>
        </div>
        <Link href="/reality-chain">AUTHORIZED CASE PLATFORM ↗</Link>
      </aside>
      <div className="sfiTemporalField">
        <div className="sfiTemporalFieldHead">
          <span>TIME REVEALS WHAT WE MISTOOK FOR TRUTH.</span>
          <small>WORLD READ: {worldReadPlane}</small>
        </div>
        <div className="sfiTemporalLens" role="group" aria-label="Timeline visualization mode">
          <button type="button" className={lens==='CLOCKS'?'active':''} aria-pressed={lens==='CLOCKS'}
            onClick={()=>setLens('CLOCKS')}>OBSERVATORY OF CLOCKS</button>
          <button type="button" className={lens==='CHRONOLOGY'?'active':''} aria-pressed={lens==='CHRONOLOGY'}
            onClick={()=>setLens('CHRONOLOGY')}>RECORDED CHRONOLOGY</button>
        </div>
        {lens==='CLOCKS'?<section className="sfiTemporalClockStage" aria-label="Source-bounded clock observation">
          <div className="sfiTemporalClockStageIntro">
            <strong>{selected?'SELECTED OBJECT / SEVEN DISTINCT CLOCKS':'NO OBJECT SELECTED'}</strong>
            <span>{selected?.title??'No dated records in the selected window.'}</span>
          </div>
          {selectedClocks?<div className="sfiTemporalClockGrid">{selectedClocks.readings.map(clock=>
            <div className="sfiTemporalClockRow" key={clock.clock} data-state={clock.state}>
              <div className="sfiTemporalClockGlyph" aria-hidden="true"><i/></div>
              <div className="sfiTemporalClockName">
                <strong>{clock.label}</strong>
                <small>{TIMELINE_CLOCKS.find(c=>c.id===clock.clock)?.description}</small>
              </div>
              <div className="sfiTemporalClockValue">
                <b>{clock.at?fmt(clock.at):'UNKNOWN'}</b>
                <small>{clock.at?clock.meaning:'NO ADMISSIBLE DATE'}</small>
              </div>
            </div>
          )}</div>:<p className="sfiTemporalAbsent">NO RECORDED ENTRIES IN SELECTED WINDOW</p>}
          <div className="sfiTemporalClockSummary">
            <b>{selectedClocks?selectedClocks.readings.length-selectedClocks.incompleteClocks.length:0} / 7 DATED</b>
            <span>NO CLOCK SUBSTITUTION · NO SIMULATED HISTORY · NO AUTOMATIC MIHM Φ</span>
          </div>
          <div className="sfiTemporalClockChooser" aria-label="Select a dated object">
            {visible.slice(-14).reverse().map(e=><button type="button" key={e.id}
              aria-pressed={selected?.id===e.id} onClick={()=>setSelectedId(e.id)}>
              <span>{e.lane}</span>{e.title}
            </button>)}
            {!visible.length?<p>NO RECORDED ENTRIES IN SELECTED WINDOW</p>:null}
          </div>
        </section>:<div className="sfiTemporalViewport" aria-label="Horizontal recorded timeline" tabIndex={0}>
          <div className="sfiTemporalCanvas">
            <div className="sfiTemporalYears">{years.map(year=><b key={year}>{year}</b>)}</div>
            {LANES.map(lane=><div className="sfiTemporalLane" key={lane.id} data-lane={lane.id}>
              <div className="sfiTemporalLaneLabel"><strong>{lane.title}</strong><span>{lane.subtitle}</span></div>
              <div className="sfiTemporalLaneTrack">
                {visible.filter(e=>e.lane===lane.id).map(e=><button type="button" key={e.id}
                  onClick={()=>setSelectedId(e.id)} className={selected?.id===e.id?'isSelected':''}
                  style={{left:pos(e.at)+'%'}} title={e.title} aria-label={e.title+' '+fmt(e.at)}>
                  <i/><span>{e.title}</span>
                </button>)}
                {!byLane(lane.id).length?<p>{lane.id==='CASE'||lane.id==='PROJECT'
                  ?'NOT EXPOSED BY CURRENT READER':'NO RECORDED ENTRIES IN SELECTED WINDOW'}</p>:null}
              </div>
            </div>)}
          </div>
        </div>}
        <div className="sfiTemporalFieldFooter"><span>{visible.length} DATED RECORDS IN WINDOW</span>
          <span>OBSERVATION ≠ EVIDENCE ≠ RETURN</span></div>
        <div className="sfiTemporalScrubber" role="group" aria-label="Temporal range and selection controls">
          <div>RECORDED WINDOW <strong>{visible.length} RECORDS</strong></div>
          <nav className="sfiTemporalRailTicks" aria-label="Select recorded event by time">{visible.slice(-26).map(e=><button key={e.id}
            type="button" onClick={()=>setSelectedId(e.id)} style={{left:pos(e.at)+'%'}}
            title={fmt(e.at)+' · '+e.title} aria-label={fmt(e.at)+' · '+e.title} aria-pressed={e.id===selected?.id} data-active={e.id===selected?.id}><i/></button>)}</nav>
          <nav className="sfiTemporalRanges" aria-label="Select a recorded-time window">{([{value:30,label:'MONTH'},{value:365,label:'YEAR'},{value:0,label:'ALL'}] as const).map(x=>
            <button type="button" key={x.value} className={windowDays===x.value?'active':''} aria-pressed={windowDays===x.value}
              onClick={()=>setWindowDays(x.value)}>{x.label}</button>)}</nav>
        </div>
      </div>
      <aside className="sfiTemporalInspector">
        <div className="sfiTemporalInspectorTitle"><small>RECORD INSPECTOR</small><strong>{selected?'SOURCE-DATED':'UNAVAILABLE'}</strong></div>
        {selected?<><time>{fmt(selected.at)}</time><h2>{selected.title}</h2><p>{selected.subtitle}</p>
          <dl><div><dt>CLASS</dt><dd>{selected.lane}</dd></div>
            <div><dt>PROVENANCE</dt><dd>{selected.origin}</dd></div>
            <div><dt>STATE</dt><dd>{selected.state}</dd></div>
            <div><dt>TIMELINE ANCHOR</dt><dd>{selected.at}</dd></div>
            <div><dt>ANCHOR MEANING</dt><dd>{selected.clockAnchorMeaning??'SOURCE DATE'}</dd></div>
            {selected.recordCreatedAt?<div><dt>RECORD CREATED</dt><dd>{selected.recordCreatedAt} (not event time)</dd></div>:null}
          </dl>
          <section className="sfiTemporalIntervalPanel">
            <h3>DOCUMENTED CLOCK DIFFERENCES</h3>
            {selectedClocks?.documentedIntervals.length?selectedClocks.documentedIntervals.map(gap=>
              <div key={gap.from+'-'+gap.to} className="sfiTemporalInterval">
                <span>{gap.from} → {gap.to}</span><b>{elapsed(gap.deltaMs)}</b>
                <small>{gap.state==='REVERSED_OR_CONFLICTED'?'ORDER REQUIRES REVIEW':'TIMESTAMP DIFFERENCE ONLY'}</small>
              </div>):<p>INSUFFICIENT INDEPENDENT CLOCK PAIRS. Temporal transfer and causal lag remain UNKNOWN.</p>}
          </section>
          {selected.world?<section><h3>WORLD SNAPSHOT</h3><dl>
            <div><dt>WSI</dt><dd>{selected.world.wsi?.toFixed(3)??'UNKNOWN'}</dd></div>
            <div><dt>NTI</dt><dd>{selected.world.nti?.toFixed(3)??'UNKNOWN'}</dd></div>
            <div><dt>CONFIDENCE</dt><dd>{selected.world.confidence?.toFixed(3)??'UNKNOWN'}</dd></div>
          </dl>{selected.world.vectors.filter(x=>x.value!==null).slice(0,5).map(x=>
            <div className="sfiTemporalVector" key={x.id}><span>{x.label}</span>
              <b>{x.value!.toFixed(3)}</b><small>{x.sourceCount} SOURCES</small></div>)}</section>:null}
          <Link href={selected.href} className="sfiTemporalInspectLink">OPEN SOURCE BOUNDARY ↗</Link>
        </>:<p className="sfiTemporalAbsent">No dated record returned. The interface does not fabricate clocks or historical events.</p>}
      </aside>
    </section>
  </main>;
}
