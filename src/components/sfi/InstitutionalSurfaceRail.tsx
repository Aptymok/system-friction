'use client';

import Link from 'next/link';
import './InstitutionalSurfaceRail.css';

type Surface='ROOT'|'OBSERVATORY'|'CASES'|'FIELD'|'STUDIO'|'LABORATORY'|'NEURAL_GRAPH'|'DISCOVERY'|'EVIDENCE'|'ACCESS';

const NAV=[
  {href:'/neural',label:'NEURAL',surface:'NEURAL_GRAPH'},
  {href:'/observatory',label:'OBSERVATORY',surface:'OBSERVATORY'},
  {href:'/cases',label:'CASES',surface:'CASES'},
  {href:'/field',label:'FIELD',surface:'FIELD'},
  {href:'/studio',label:'STUDIO',surface:'STUDIO'},
  {href:'/method-lab',label:'LAB',surface:'LABORATORY'},
  {href:'/root',label:'ROOT',surface:'ROOT'},
] as const;

const COPY:Record<Surface,{mode:string;boundary:string}>={
  ROOT:{mode:'AUTHORITY CHAMBER',boundary:'OBSERVE ≠ DECIDE · OPERATE ≠ GOVERN'},
  OBSERVATORY:{mode:'OBSERVATION CHAMBER',boundary:'SIGNAL ≠ EVIDENCE · OBSERVATION ≠ TRUTH'},
  CASES:{mode:'CASE CHAMBER',boundary:'CASE ≠ CLAIM · CLOSURE ≠ LEARNING'},
  FIELD:{mode:'FIELD CHAMBER',boundary:'RELATION ≠ CAUSALITY · SIGNAL ≠ DECISION'},
  STUDIO:{mode:'OBJECT / EXECUTION CHAMBER',boundary:'OBJECT ≠ EVIDENCE · EXECUTION ≠ TRUTH'},
  LABORATORY:{mode:'EXPERIMENTAL CHAMBER',boundary:'SIMULATED ≠ OBSERVED · REPLAY ≠ RETURN'},
  NEURAL_GRAPH:{mode:'INSTITUTIONAL COGNITIVE FIELD',boundary:'ONE FIELD · MANY READINGS · GRAPH ≠ RETURN'},
  DISCOVERY:{mode:'PROPAGATION CHAMBER',boundary:'EXPOSURE ≠ DISCOVERY ≠ PULL ≠ RETURN'},
  EVIDENCE:{mode:'EVIDENCE CHAMBER',boundary:'SOURCE ≠ EVIDENCE · PROPOSAL ≠ ADMISSION'},
  ACCESS:{mode:'IDENTITY / ACCESS CHAMBER',boundary:'ACCESS ≠ AUTHORITY · INVITATION ≠ ROLE'},
};

export function InstitutionalSurfaceRail({surface,state,detail}:{surface:Surface;state?:string;detail?:string}){
  const copy=COPY[surface];
  return <section className="institutionRail" data-surface={surface} data-sfi-internal-shell="SFI-INTERNAL-VISUAL-2.0">
    <div className="institutionRailIdentity">
      <Link href="/entry" className="institutionRailMark">SFI</Link>
      <div><small>AUTHENTICATED INSTITUTIONAL FIELD</small><strong>{copy.mode}</strong></div>
    </div>
    <nav aria-label="SFI post-login field">
      {NAV.map((item)=><Link key={item.href} href={item.href} data-active={item.surface===surface?'true':undefined}>{item.label}</Link>)}
    </nav>
    <div className="institutionRailState">
      <span>{state||'GOVERNED SURFACE'}</span>{detail?<small>{detail}</small>:null}<b>{copy.boundary}</b>
    </div>
  </section>;
}
