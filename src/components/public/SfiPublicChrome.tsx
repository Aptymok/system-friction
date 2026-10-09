'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import './SfiPublicChrome.css';

type ChromeContext={
  title:string;
  statement:string;
  stage:string;
  href:string;
  navKey:string;
};

const NAV_SURFACES=[
  {key:'root',label:'ROOT',href:'/instruments/root'},
  {key:'observatory',label:'OBSERVATORY',href:'/instruments/observatory'},
  {key:'reality-chain',label:'REALITY CHAIN',href:'/instruments/reality-chain'},
  {key:'method-lab',label:'METHOD LAB',href:'/instruments/method-lab'},
  {key:'world-vector',label:'WORLD VECTOR',href:'/instruments/world-vector'},
  {key:'repository',label:'REPOSITORY',href:'/instruments/repository'},
  {key:'timeline',label:'TIMELINE',href:'/instruments/timeline'},
  {key:'access',label:'ACCESS',href:'/instruments/access'},
] as const;

const SUBJECTS:Record<string,ChromeContext>={
  intro:{title:'SYSTEM FRICTION INSTITUTE',statement:'INSTITUTIONAL INTELLIGENCE MUST REMAIN RECONSTRUCTIBLE.',stage:'OBSERVATION',href:'/',navKey:'home'},
  timeline:{title:'TIMELINE',statement:'EVERYTHING THE INSTITUTION CAN RECONSTRUCT OVER TIME.',stage:'OBSERVATION',href:'/instruments/timeline',navKey:'timeline'},
  repository:{title:'REPOSITORY',statement:'PROVENANCE REMAINS ADDRESSABLE.',stage:'EVIDENCE',href:'/instruments/repository',navKey:'repository'},
  'world-vector':{title:'WORLD VECTOR',statement:'THE WORLD DOES NOT HAVE THE SAME TIME.',stage:'OBSERVATION',href:'/instruments/world-vector',navKey:'world-vector'},
  'method-lab':{title:'METHOD LAB',statement:'SIMULATION ≠ OBSERVATION.',stage:'INFERENCE',href:'/instruments/method-lab',navKey:'method-lab'},
  'reality-chain':{title:'REALITY CHAIN',statement:'RECONSTRUCTION PRECEDES EXPLANATION.',stage:'RETURN',href:'/instruments/reality-chain',navKey:'reality-chain'},
  observatory:{title:'OBSERVATORY',statement:'A SIGNAL IS NOT EVIDENCE.',stage:'OBSERVATION',href:'/instruments/observatory',navKey:'observatory'},
  root:{title:'ROOT',statement:'REASONING IS DIFFERENT FROM AUTHORITY.',stage:'AUTHORITY',href:'/instruments/root',navKey:'root'},
  access:{title:'ACCESS',statement:'IDENTITY IS NOT AUTHORITY.',stage:'AUTHORITY',href:'/instruments/access',navKey:'access'},
}

const TIMELINE_YEARS=['2023','2024','2025','2026','2027','2028','2029'] as const;
const TIMELINE_TICKS=Array.from({length:37},(_,index)=>index);

function routeContext(pathname:string):ChromeContext{
  if(pathname.startsWith('/instruments/root')) return {title:'ROOT',statement:'REASONING IS DIFFERENT FROM AUTHORITY.',stage:'AUTHORITY',href:'/instruments/root',navKey:'root'};
  if(pathname.startsWith('/instruments/observatory')) return {title:'OBSERVATORY',statement:'A SIGNAL IS NOT EVIDENCE.',stage:'OBSERVATION',href:'/instruments/observatory',navKey:'observatory'};
  if(pathname.startsWith('/instruments/reality-chain')) return {title:'REALITY CHAIN',statement:'TRACEABILITY ≠ JUSTIFICATION.',stage:'RETURN',href:'/instruments/reality-chain',navKey:'reality-chain'};
  if(pathname.startsWith('/instruments/method-lab')) return {title:'METHOD LAB',statement:'COMPETENCE ≠ SELF-RESTRAINT.',stage:'INFERENCE',href:'/instruments/method-lab',navKey:'method-lab'};
  if(pathname.startsWith('/instruments/world-vector')) return {title:'WORLD VECTOR',statement:'THE WORLD DOES NOT HAVE THE SAME TIME.',stage:'OBSERVATION',href:'/instruments/world-vector',navKey:'world-vector'};
  if(pathname.startsWith('/instruments/repository')) return {title:'REPOSITORY',statement:'PROVENANCE REMAINS ADDRESSABLE.',stage:'EVIDENCE',href:'/instruments/repository',navKey:'repository'};
  if(pathname.startsWith('/instruments/timeline')) return {title:'TIMELINE',statement:'KNOWN THEN ≠ KNOWN NOW.',stage:'OBSERVATION',href:'/instruments/timeline',navKey:'timeline'};
  if(pathname.startsWith('/instruments/access')) return {title:'ACCESS',statement:'IDENTITY ≠ AUTHORITY.',stage:'AUTHORITY',href:'/instruments/access',navKey:'access'};
  if(pathname.startsWith('/root')) return {title:'ROOT',statement:'AUTHORITY REMAINS EXPLICIT.',stage:'AUTHORITY',href:'/root',navKey:'root'};
  if(pathname.startsWith('/publications')) return {title:'REPOSITORY',statement:'PUBLICATION = EXPOSURE.',stage:'EVIDENCE',href:'/publications',navKey:'repository'};
  if(pathname.startsWith('/root/access')) return {title:'ACCESS',statement:'ACCESS ≠ AUTHORITY.',stage:'AUTHORITY',href:'/root/access',navKey:'access'};
  if(pathname.startsWith('/field')||pathname.startsWith('/observatory')) return {title:'OBSERVATORY',statement:'A SIGNAL IS NOT EVIDENCE.',stage:'OBSERVATION',href:'/observatory',navKey:'observatory'};
  if(pathname.startsWith('/method-lab')) return {title:'METHOD LAB',statement:'GOVERNANCE IS ONLY THE BEGINNING.',stage:'INFERENCE',href:'/method-lab',navKey:'method-lab'};
  if(pathname.startsWith('/integrations')) return {title:'INTEGRATION',statement:'AUTHORITY IS NOT EXECUTION.',stage:'EXECUTION',href:'/integrations',navKey:'integration'};
  if(pathname.startsWith('/cases')) return {title:'CASES / RETURN',statement:'REALITY ANSWERS BACK.',stage:'RETURN',href:'/cases',navKey:'cases'};
  if(pathname.startsWith('/research')) return {title:'RESEARCH',statement:'RESEARCH MUST REMAIN RECONSTRUCTIBLE.',stage:'INFERENCE',href:'/research',navKey:'reality-chain'};
  if(pathname.startsWith('/login')) return {title:'ACCESS',statement:'IDENTITY ≠ AUTHORITY.',stage:'AUTHORITY',href:'/login',navKey:'access'};
  return SUBJECTS.intro;
}

function utcLabel(date:Date){
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'UTC',
    weekday:'long',
    day:'2-digit',
    month:'long',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit',
    hour12:false,
  }).formatToParts(date);
  const pick=(type:string)=>parts.find((part)=>part.type===type)?.value??'';
  return `${pick('weekday').toUpperCase()}, ${pick('day')} ${pick('month').toUpperCase()} ${pick('year')}, AT ${pick('hour')}:${pick('minute')} UTC`;
}

function usePublicChromeContext(){
  const pathname=usePathname()||'/';
  const [subject,setSubject]=useState('intro');
  const [clock,setClock]=useState('');

  useEffect(()=>{
    const updateSubject=()=>{
      if(pathname!=='/') return;
      const next=window.location.hash.replace(/^#/,'')||'intro';
      setSubject(SUBJECTS[next]?next:'intro');
    };
    updateSubject();
    const onSubject=(event:Event)=>{
      const custom=event as CustomEvent<{subject?:string}>;
      if(custom.detail?.subject&&SUBJECTS[custom.detail.subject]) setSubject(custom.detail.subject);
    };
    window.addEventListener('hashchange',updateSubject);
    window.addEventListener('sfi:subjectchange',onSubject);
    return()=>{window.removeEventListener('hashchange',updateSubject);window.removeEventListener('sfi:subjectchange',onSubject);};
  },[pathname]);

  useEffect(()=>{
    const update=()=>setClock(utcLabel(new Date()));
    update();
    const timer=window.setInterval(update,30_000);
    return()=>window.clearInterval(timer);
  },[]);

  const context=useMemo(()=>pathname==='/'?(SUBJECTS[subject]??SUBJECTS.intro):routeContext(pathname),[pathname,subject]);
  return {pathname,context,clock};
}

export function SfiPublicHeader({global=false,active}:{active?:string;global?:boolean}) {
  const {pathname,context,clock}=usePublicChromeContext();
  const title=active||context.title;
  const privateShell=pathname==='/'||pathname==='/root'||pathname==='/governance'||pathname.startsWith('/studio');
  const reserveSpace=pathname!=='/';

  if(global&&privateShell) return null;

  return <>
    <header className={global?'sfiPublicTopbar sfiGlobalHeader':'sfiPublicTopbar'} data-sfi-public-chrome="SFI-NYC-CHROME-4.0">
      <Link href="/" className="sfiPublicBrand" aria-label="System Friction Institute home">
        <img src="/library/assets/sfi-mark.svg" alt="" aria-hidden="true"/>
        <span className="sfiPublicBrandText"><strong>SFI</strong><i aria-hidden="true">|</i><span>SYSTEM FRICTION INSTITUTE</span></span>
      </Link>

      <nav className="sfiPublicPageNav" aria-label="SFI surface navigation">
        {NAV_SURFACES.map((surface)=><Link
          key={surface.key}
          className="sfiPublicMenuItem"
          href={surface.href}
          data-active={surface.key===context.navKey?'true':undefined}
        >{surface.label}</Link>)}
      </nav>

      <div className="sfiPublicChromeRight">
        <span className="sfiPublicContext" aria-label={`${title}. ${context.statement}. ${context.stage}`}>
          <time suppressHydrationWarning>{clock||'UTC'}</time>
        </span>
        <Link className="sfiPublicAccess" href="/login" aria-label="Institutional access" title="Institutional access"><span>ACCESS</span></Link>
      </div>
    </header>
    {reserveSpace?<div className="sfiPublicChromeSpacer" aria-hidden="true"/>:null}
  </>;
}

export function SfiPublicFooter({global=false}:{global?:boolean}){
  const {pathname,context}=usePublicChromeContext();
  const privateShell=pathname==='/'||pathname==='/root'||pathname==='/governance'||pathname.startsWith('/studio');

  if(privateShell) return null;

  return <footer className={global?'sfiPublicFooter sfiGlobalInstitutionalFooter':'sfiPublicFooter'} data-sfi-public-chrome="SFI-HORIZONTAL-CHROME-5.0">
    <div className="sfiTimelineIdentity">
      <strong>SFI / GLOBAL TIMELINE</strong>
      <span>NOTHING ACTS ALONE. REALITY ANSWERS BACK.</span>
    </div>

    <div className="sfiGlobalTimeline" aria-label="SFI global timeline">
      <div className="sfiTimelineTicks" aria-hidden="true">
        {TIMELINE_TICKS.map((tick)=><i key={tick} data-major={tick%6===0?'true':undefined}/>)}
      </div>
      <div className="sfiTimelineYears">
        {TIMELINE_YEARS.map((year)=><span key={year} data-current={year==='2026'?'true':undefined}>{year}</span>)}
      </div>
      <div className="sfiTimelinePlay" aria-hidden="true">▶</div>
    </div>

    <div className="sfiTimelineContext">
      <strong>{context.title}</strong>
      <span>{context.stage}</span>
    </div>
  </footer>;
}
