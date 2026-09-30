'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import './SfiPublicChrome.css';

const EVENT_URL='https://gomry.com/l/Kzcb3xl';

type ChromeContext={
  title:string;
  statement:string;
  stage:string;
  href:string;
  navKey:string;
};

const NAV_SURFACES=[
  {key:'home',label:'HOME',href:'/'},
  {key:'field',label:'FIELD',href:'/field/world-observatory'},
  {key:'registry',label:'REGISTRY',href:'/publications'},
  {key:'research',label:'RESEARCH',href:'/research'},
  {key:'method-lab',label:'METHOD LAB',href:'/method-lab'},
  {key:'integration',label:'INTEGRATION',href:'/integrations'},
  {key:'cases',label:'CASES',href:'/cases'},
  {key:'access',label:'ACCESS',href:'/root/access'},
] as const;

const SUBJECTS:Record<string,ChromeContext>={
  intro:{title:'SYSTEM FRICTION INSTITUTE',statement:'INSTITUTIONAL INTELLIGENCE MUST REMAIN RECONSTRUCTIBLE.',stage:'OBSERVATION',href:'/',navKey:'home'},
  time:{title:'AI WEEK NYC 2026',statement:'THE WORLD DOES NOT HAVE THE SAME TIME.',stage:'OBSERVATION',href:EVENT_URL,navKey:'home'},
  observation:{title:'FIELD',statement:'A SIGNAL IS NOT EVIDENCE.',stage:'OBSERVATION',href:'/field/world-observatory',navKey:'field'},
  authority:{title:'REGISTRY',statement:'EVIDENCE IS NOT A DECISION.',stage:'EVIDENCE',href:'/publications',navKey:'registry'},
  execution:{title:'INTEGRATION',statement:'AUTHORITY IS NOT EXECUTION.',stage:'EXECUTION',href:'/integrations',navKey:'integration'},
  return:{title:'CASES / RETURN',statement:'REALITY ANSWERS BACK.',stage:'RETURN',href:'/cases',navKey:'cases'},
  'after-ai-governance':{title:'METHOD LAB',statement:'GOVERNANCE IS ONLY THE BEGINNING.',stage:'RESEARCH',href:'/method-lab',navKey:'method-lab'},
};

const INSTITUTIONAL_CHAIN=['OBSERVATION','RESEARCH','EVIDENCE','INFERENCE','AUTHORITY','DECISION','EXECUTION','RETURN','LEARN','OBSERVATION'] as const;
const REALITY_CHAIN_METHOD=['WORLD','SENSOR','SIGNAL','ARTIFACT','CONTEXT','INFERENCE','AUTHORITY','CLAIM','ACTION','RETURN'] as const;

function routeContext(pathname:string):ChromeContext{
  if(pathname.startsWith('/publications')) return {title:'REGISTRY',statement:'PUBLICATION = EXPOSURE.',stage:'EVIDENCE',href:'/publications',navKey:'registry'};
  if(pathname.startsWith('/root/access')) return {title:'ACCESS',statement:'ACCESS ≠ AUTHORITY.',stage:'AUTHORITY',href:'/root/access',navKey:'access'};
  if(pathname.startsWith('/field')||pathname.startsWith('/observatory')) return {title:'FIELD',statement:'A SIGNAL IS NOT EVIDENCE.',stage:'OBSERVATION',href:'/field/world-observatory',navKey:'field'};
  if(pathname.startsWith('/method-lab')) return {title:'METHOD LAB',statement:'GOVERNANCE IS ONLY THE BEGINNING.',stage:'RESEARCH',href:'/method-lab',navKey:'method-lab'};
  if(pathname.startsWith('/integrations')) return {title:'INTEGRATION',statement:'AUTHORITY IS NOT EXECUTION.',stage:'EXECUTION',href:'/integrations',navKey:'integration'};
  if(pathname.startsWith('/cases')) return {title:'CASES / RETURN',statement:'REALITY ANSWERS BACK.',stage:'RETURN',href:'/cases',navKey:'cases'};
  if(pathname.startsWith('/research')) return {title:'RESEARCH',statement:'RESEARCH MUST REMAIN RECONSTRUCTIBLE.',stage:'RESEARCH',href:'/research',navKey:'research'};
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

function adjacentSurfaces(navKey:string){
  const index=Math.max(0,NAV_SURFACES.findIndex((item)=>item.key===navKey));
  const previous=NAV_SURFACES[(index-1+NAV_SURFACES.length)%NAV_SURFACES.length];
  const next=NAV_SURFACES[(index+1)%NAV_SURFACES.length];
  return {previous,next};
}

export function SfiPublicHeader({global=false,active}:{active?:string;global?:boolean}) {
  const {pathname,context,clock}=usePublicChromeContext();
  const title=active||context.title;
  const reserveSpace=pathname!=='/';
  const {previous,next}=adjacentSurfaces(context.navKey);
  const external=context.href.startsWith('http');

  return <>
    <header className={global?'sfiPublicTopbar sfiGlobalHeader':'sfiPublicTopbar'} data-sfi-public-chrome="SFI-NYC-CHROME-4.0">
      <Link href="/#intro" className="sfiPublicBrand" aria-label="System Friction Institute home">
        <img src="/sfi/brand/sfi-institutional-seal.png" alt="" aria-hidden="true"/>
        <span className="sfiPublicBrandText"><strong>SFI</strong><i aria-hidden="true">|</i><span>SYSTEM FRICTION INSTITUTE</span></span>
      </Link>

      <nav className="sfiPublicPageNav" aria-label="SFI surface navigation">
        <Link className="sfiPublicPageArrow sfiPublicPageArrow--previous" href={previous.href} aria-label={`Previous window: ${previous.label}`} title={`Previous window: ${previous.label}`}>
          <b aria-hidden="true">‹</b><span>{previous.label}</span>
        </Link>

        {external?<a className="sfiPublicPageTitle" href={context.href} target="_blank" rel="noreferrer">
          <strong>{title}</strong><i aria-hidden="true">|</i><span>{context.statement}</span><i aria-hidden="true">|</i><em>{context.stage}</em>
        </a>:<Link className="sfiPublicPageTitle" href={context.href}>
          <strong>{title}</strong><i aria-hidden="true">|</i><span>{context.statement}</span><i aria-hidden="true">|</i><em>{context.stage}</em>
        </Link>}

        <Link className="sfiPublicPageArrow sfiPublicPageArrow--next" href={next.href} aria-label={`Next window: ${next.label}`} title={`Next window: ${next.label}`}>
          <span>{next.label}</span><b aria-hidden="true">›</b>
        </Link>
      </nav>

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

  return <footer className={global?'sfiPublicFooter sfiGlobalInstitutionalFooter':'sfiPublicFooter'} data-sfi-public-chrome="SFI-NYC-CHROME-4.0">
    <span className="sfiFooterIdentity">SYSTEM FRICTION INSTITUTE</span>

    <div className="sfiFooterChains">
      <div className="sfiFooterChain sfiFooterChain--institutional" aria-label="Institutional cycle">
        {INSTITUTIONAL_CHAIN.map((stage,index)=><span key={stage+'-'+index} data-active={stage===context.stage?'true':undefined}>{stage}{index<INSTITUTIONAL_CHAIN.length-1?<i aria-hidden="true">›</i>:null}</span>)}
      </div>

      <div className="sfiFooterReality">
        <small>REALITY CHAIN METHOD</small>
        <div className="sfiFooterChain sfiFooterChain--reality" aria-label="Reality Chain Method">
          {REALITY_CHAIN_METHOD.map((stage,index)=><span key={stage}>{stage}{index<REALITY_CHAIN_METHOD.length-1?<i aria-hidden="true">›</i>:null}</span>)}
        </div>
      </div>
    </div>

    <a className="sfiFooterEvent" href={EVENT_URL} target="_blank" rel="noreferrer">AI WEEK NYC 2026 ↗</a>
  </footer>;
}
