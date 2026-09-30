'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import './SfiPublicChrome.css';

const EVENT_URL='https://gomry.com/l/Kzcb3xl';

const SUBJECTS:Record<string,{title:string;statement:string;stage:string}>={
  intro:{title:'SYSTEM FRICTION INSTITUTE',statement:'INSTITUTIONAL INTELLIGENCE MUST REMAIN RECONSTRUCTIBLE.',stage:'OBSERVATION'},
  time:{title:'THE WORLD DOES NOT HAVE THE SAME TIME',statement:'THE WORLD DOES NOT HAVE THE SAME TIME.',stage:'OBSERVATION'},
  observation:{title:'OBSERVATORY',statement:'A SIGNAL IS NOT EVIDENCE.',stage:'RESEARCH'},
  authority:{title:'REGISTRY',statement:'EVIDENCE IS NOT A DECISION.',stage:'DECISION'},
  execution:{title:'INTEGRATION',statement:'AUTHORITY IS NOT EXECUTION.',stage:'EXECUTION'},
  return:{title:'CASES / RETURN',statement:'REALITY ANSWERS BACK.',stage:'RETURN'},
  'after-ai-governance':{title:'METHOD LAB',statement:'GOVERNANCE IS ONLY THE BEGINNING.',stage:'LEARN'},
};

const CHAIN=['OBSERVATION','DECISION','RESEARCH','AUTHORITY','EXECUTION','RETURN','LEARN','OBSERVATION'] as const;

function routeContext(pathname:string){
  if(pathname.startsWith('/publications')) return {title:'REGISTRY',statement:'PUBLICATION = EXPOSURE.',stage:'RESEARCH'};
  if(pathname.startsWith('/root/access')) return {title:'ACCESS',statement:'ACCESS ≠ AUTHORITY.',stage:'AUTHORITY'};
  if(pathname.startsWith('/field')||pathname.startsWith('/observatory')) return {title:'FIELD',statement:'OBSERVATION → HYPOTHESIS → RETURN.',stage:'OBSERVATION'};
  if(pathname.startsWith('/method-lab')) return {title:'METHOD LAB',statement:'SIMULATION ≠ REALITY.',stage:'RESEARCH'};
  if(pathname.startsWith('/integrations')) return {title:'INTEGRATION',statement:'CAPABILITY ≠ AUTHORITY.',stage:'EXECUTION'};
  if(pathname.startsWith('/cases')) return {title:'CASES',statement:'OUTCOME → CONTRAST → RETURN.',stage:'RETURN'};
  if(pathname.startsWith('/research')) return {title:'RESEARCH',statement:'RESEARCH MUST REMAIN RECONSTRUCTIBLE.',stage:'RESEARCH'};
  if(pathname.startsWith('/login')) return {title:'ACCESS',statement:'IDENTITY ≠ AUTHORITY.',stage:'AUTHORITY'};
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
  const reserveSpace=pathname!=='/';

  return <>
    <header className={global?'sfiPublicTopbar sfiGlobalHeader':'sfiPublicTopbar'} data-sfi-public-chrome="SFI-NYC-CHROME-3.0">
      <Link href="/#intro" className="sfiPublicBrand" aria-label="System Friction Institute home">
        <img src="/sfi/brand/sfi-institutional-seal.png" alt="" aria-hidden="true"/>
        <span className="sfiPublicBrandText"><strong>SFI</strong><i aria-hidden="true">|</i><span>SYSTEM FRICTION INSTITUTE</span></span>
      </Link>
      <div className="sfiPublicPageTitle" aria-live="polite">{title}</div>
      <div className="sfiPublicChromeRight">
        <time suppressHydrationWarning>{clock||'UTC'}</time>
        <Link className="sfiPublicAccess" href="/login">SIGN IN</Link>
      </div>
    </header>
    {reserveSpace?<div className="sfiPublicChromeSpacer" aria-hidden="true"/>:null}
  </>;
}

export function SfiPublicFooter({global=false}:{global?:boolean}){
  const {pathname,context}=usePublicChromeContext();
  const showFooter=!pathname.startsWith('/root')&&!pathname.startsWith('/studio');

  if(!showFooter) return null;

  return <footer className={global?'sfiPublicFooter sfiGlobalInstitutionalFooter':'sfiPublicFooter'} data-sfi-public-chrome="SFI-NYC-CHROME-3.0">
    <span className="sfiFooterIdentity">SYSTEM FRICTION INSTITUTE</span>
    <div className="sfiFooterState">
      <b>{context.statement}</b>
      <div className="sfiFooterChain" aria-label="Institutional cycle">
        {CHAIN.map((stage,index)=><span key={stage+'-'+index} data-active={stage===context.stage?'true':undefined}>{stage}{index<CHAIN.length-1?<i aria-hidden="true">›</i>:null}</span>)}
      </div>
    </div>
    <a className="sfiFooterEvent" href={EVENT_URL} target="_blank" rel="noreferrer">AI WEEK NYC 2026 ↗</a>
  </footer>;
}
