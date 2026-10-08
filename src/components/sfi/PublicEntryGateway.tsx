'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './PublicEntryGateway.css';

const SURFACE_RAIL=[
  {label:'ROOT',number:'01',sceneId:'root',href:'/instruments/root',line:'Canonical field · authority · RETURN'},
  {label:'OBSERVATORY',number:'02',sceneId:'observatory',href:'/instruments/observatory',line:'Sources · signals · trajectories'},
  {label:'REALITY CHAIN',number:'03',sceneId:'reality-chain',href:'/instruments/reality-chain',line:'Evidence · justification · Reality Passport'},
  {label:'METHOD LAB',number:'04',sceneId:'method-lab',href:'/instruments/method-lab',line:'Protocols · abstention · reproducibility'},
  {label:'WORLD VECTOR',number:'05',sceneId:'world-vector',href:'/instruments/world-vector',line:'World state · tensions · projection'},
  {label:'REPOSITORY',number:'06',sceneId:'repository',href:'/instruments/repository',line:'Sources · provenance · versions'},
  {label:'TIMELINE',number:'07',sceneId:'timeline',href:'/instruments/timeline',line:'Epistemic time · reconstruction'},
  {label:'ACCESS',number:'08',sceneId:'access',href:'/instruments/access',line:'Identity · scope · authority'},
] as const;

const CHAIN=['REAL WORLD','SIGNAL','OBSERVATION','EVIDENCE','INFERENCE','AUTHORITY','EXECUTION','RETURN'] as const;
const YEARS=['2023','2024','2025','2026','2027','2028','2029'] as const;

export function PublicEntryGateway(){
  const scroller=useRef<HTMLDivElement|null>(null);
  const [progress,setProgress]=useState(0);

  useEffect(()=>{
    const host=scroller.current;
    if(!host)return;
    const onScroll=()=>{
      const max=Math.max(host.scrollWidth-host.clientWidth,1);
      setProgress(host.scrollLeft/max);
    };
    const onWheel=(event:WheelEvent)=>{
      const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
      if(Math.abs(delta)<2)return;
      event.preventDefault();
      host.scrollBy({left:delta*1.25,behavior:'auto'});
    };
    host.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('wheel',onWheel,{passive:false});
    onScroll();
    return()=>{
      host.removeEventListener('scroll',onScroll);
      window.removeEventListener('wheel',onWheel);
    };
  },[]);

  const go=(direction:-1|1)=>{
    const host=scroller.current;
    if(!host)return;
    host.scrollBy({left:host.clientWidth*direction,behavior:'smooth'});
  };

  return <main className="sfiHomeExperience">
    <div className="sfiHomePanoramaScroller" ref={scroller} aria-label="SFI horizontal panorama">
      <div className="sfiHomePanoramaTrack">
        <img
          src="/assets/sfi/instruments/SFI_HOME_INDEX_PANORAMA_20261008.png"
          onError={(event)=>{event.currentTarget.src='/assets/sfi/instruments/SFI_HOME_PANORAMA.png';}}
          alt=""
          draggable={false}
        />
      </div>
    </div>

    <div className="sfiHomePanoramaVeil" aria-hidden="true"/>

    <header className="sfiHomeHeader">
      <Link href="/" className="sfiHomeBrand" aria-label="System Friction Institute home">
        <img src="/library/assets/sfi-mark.svg" alt="" aria-hidden="true"/>
        <strong>SFI</strong><i>—</i><span>SYSTEM FRICTION INSTITUTE</span>
      </Link>
      <nav aria-label="SFI instruments">
        {SURFACE_RAIL.map((surface)=><Link key={surface.sceneId} href={surface.href}>{surface.label}</Link>)}
      </nav>
      <Link className="sfiHomeAccessDot" href="/instruments/access" aria-label="Access"><span>ACCESS</span></Link>
    </header>

    <aside className="sfiHomeChain" aria-label="Reality Chain">
      {CHAIN.map((stage)=><span key={stage}>{stage}</span>)}
    </aside>

    <section className="sfiHomeStatement">
      <small>SYSTEMS MEET HERE.</small>
      <h1>NOTHING ACTS ALONE.<br/><b>REALITY ANSWERS BACK.</b></h1>
      <p>SFI observes how signals become evidence, how evidence supports inference, how authority enables action, and what reality returns.</p>
      <em>TRACEABILITY ≠ JUSTIFICATION · EVIDENCE INDEPENDENCE · TEMPORAL STATE · AUTHORITY · RETURN</em>
    </section>

    <section className="sfiHomeRightNotes" aria-hidden="true">
      <p>MULTIPLE LAYERS<br/>OF REALITY.<br/><br/>INTERCONNECTED<br/>CONSEQUENCES.</p>
      <p>UNDERSTAND TODAY.<br/>RECONSTRUCT TOMORROW.</p>
    </section>

    <nav className="sfiHomeSurfaceRail" aria-label="Explore SFI">
      {SURFACE_RAIL.map((surface)=><Link key={surface.sceneId} href={surface.href}>
        <small>{surface.number}</small>
        <strong>{surface.label}</strong>
        <span>{surface.line}</span>
        <b>→</b>
      </Link>)}
    </nav>

    <footer className="sfiHomeTimeline">
      <div><strong>SFI / GLOBAL TIMELINE</strong><span>RECONSTRUCTIBLE INSTITUTIONAL MEMORY</span></div>
      <div className="sfiHomeTimelineRail">
        <i style={{'--progress':progress} as CSSProperties}/>
        <div>{YEARS.map((year)=><span key={year} data-current={year==='2026'?'true':undefined}>{year}</span>)}</div>
      </div>
      <div className="sfiHomePanoramaState"><b>{progress<.5?'01':'02'}</b><span>/ 02</span></div>
    </footer>

    <button className="sfiHomePanoramaArrow sfiHomePanoramaArrow--left" type="button" onClick={()=>go(-1)} disabled={progress<.02} aria-label="Pan left">←</button>
    <button className="sfiHomePanoramaArrow sfiHomePanoramaArrow--right" type="button" onClick={()=>go(1)} disabled={progress>.98} aria-label="Pan right">→</button>
  </main>;
}
