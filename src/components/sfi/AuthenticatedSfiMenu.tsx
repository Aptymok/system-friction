'use client';

import Link from 'next/link';
import { useState } from 'react';
import './AuthenticatedSfiMenu.css';

const CORE_SURFACES=[
  {label:'ROOT',href:'/root'},
  {label:'OBSERVATORY',href:'/observatory'},
  {label:'REALITY CHAIN',href:'/root?reading=REALITY_CHAIN'},
  {label:'METHOD LAB',href:'/method-lab'},
  {label:'WORLD VECTOR',href:'/root?reading=TRAJECTORY'},
  {label:'REPOSITORY',href:'/publications?view=registry'},
  {label:'TIMELINE',href:'/root?reading=RETROLONGITUDINAL'},
  {label:'ACCESS',href:'/root/access'},
] as const;

const ITEMS=[
  {label:'CURRENT STATE',href:'/root?reading=CURRENT_STATE'},
  {label:'TRAJECTORIES',href:'/root?reading=TRAJECTORY'},
  {label:'OBSERVATORY',href:'/observatory'},
  {label:'CASES',href:'/root?reading=CURRENT_STATE'},
  {label:'METHOD LAB',href:'/method-lab'},
  {label:'GOVERNANCE',href:'/governance'},
  {label:'TWIN / SPINE',href:'/root?reading=RETROLONGITUDINAL'},
  {label:'ACCESS',href:'/root/access'},
  {label:'PROJECTIONS & PHENOMENA',href:'/root?reading=PROJECTION'},
  {label:'JR. LOGBOOK',href:'/root?reading=RETURN_CONTRAST'},
  {label:'TECHNICAL LOG',href:'/root?reading=RETROLONGITUDINAL'},
  {label:'H1, HR, CONTRAST & LEARNING',href:'/root?reading=REALITY_CHAIN'},
] as const;

const YEARS=['2023','2024','2025','2026','2027','2028','2029'] as const;
const TICKS=Array.from({length:37},(_,index)=>index);

export function AuthenticatedSfiMenu(){
  const [open,setOpen]=useState(false);

  return <>
    <header className="sfiAuthCanonicalNav" data-sfi-auth-navigation="DIAMOND-1.0">
      <Link href="/root" className="sfiAuthBrand" aria-label="SFI ROOT">
        <img src="/library/assets/sfi-mark.svg" alt="" aria-hidden="true"/>
        <strong>SFI</strong>
        <i>|</i>
        <span>SYSTEM FRICTION INSTITUTE</span>
      </Link>
      <nav className="sfiAuthSurfaceNav" aria-label="SFI authenticated surfaces">
        {CORE_SURFACES.map((item)=><Link key={item.label} href={item.href}>{item.label}</Link>)}
      </nav>
      <button className="sfiDiamondTrigger" type="button" aria-label="Open SFI operations" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
        <img src="/library/assets/sfi-mark.svg" alt="" aria-hidden="true"/>
      </button>
      {open?<nav className="sfiDiamondMenu" aria-label="SFI authenticated operations">
        <span>OPERATIONS</span>
        {ITEMS.map((item)=><Link key={item.label} href={item.href} onClick={()=>setOpen(false)}>{item.label}</Link>)}
      </nav>:null}
    </header>

    <footer className="sfiAuthTimeline" aria-label="SFI institutional timeline">
      <div className="sfiAuthTimelineIdentity"><strong>JR / FIELD HISTORY</strong><span>NOTHING ACTS ALONE. REALITY ANSWERS BACK.</span></div>
      <div className="sfiAuthTimelineTrack">
        <div className="sfiAuthTicks" aria-hidden="true">{TICKS.map((tick)=><i key={tick} data-major={tick%6===0?'true':undefined}/>)}</div>
        <div className="sfiAuthYears">{YEARS.map((year)=><span key={year} data-current={year==='2026'?'true':undefined}>{year}</span>)}</div>
        <b aria-hidden="true">▶</b>
      </div>
      <div className="sfiAuthTimelineMode"><span>MONTH</span><strong>YEAR</strong><span>ALL</span></div>
    </footer>
  </>;
}
