'use client';

import Link from 'next/link';
import './InstitutionalSurfaceRail.css';

type Surface='ROOT'|'LABORATORY'|'DISCOVERY'|'EVIDENCE'|'ACCESS';

const NAV=[
  {href:'/root',label:'ROOT',surface:'ROOT'},
  {href:'/method-lab',label:'LAB',surface:'LABORATORY'},
  {href:'/root/discovery',label:'DISCOVERY',surface:'DISCOVERY'},
  {href:'/root/evidence-review',label:'EVIDENCE',surface:'EVIDENCE'},
  {href:'/root/access',label:'ACCESS',surface:'ACCESS'},
] as const;

const COPY:Record<Surface,{mode:string;boundary:string}>={
  ROOT:{mode:'AUTHORITY CHAMBER',boundary:'OBSERVE ≠ DECIDE · OPERATE ≠ GOVERN'},
  LABORATORY:{mode:'EXPERIMENTAL CHAMBER',boundary:'SIMULATED ≠ OBSERVED · REPLAY ≠ RETURN'},
  DISCOVERY:{mode:'PROPAGATION CHAMBER',boundary:'EXPOSURE ≠ DISCOVERY ≠ PULL ≠ RETURN'},
  EVIDENCE:{mode:'EVIDENCE CHAMBER',boundary:'SOURCE ≠ EVIDENCE · PROPOSAL ≠ ADMISSION'},
  ACCESS:{mode:'IDENTITY / ACCESS CHAMBER',boundary:'ACCESS ≠ AUTHORITY · INVITATION ≠ ROLE'},
};

export function InstitutionalSurfaceRail({
  surface,
  state,
  detail,
}:{surface:Surface;state?:string;detail?:string}){
  const copy=COPY[surface];
  return <section className="institutionRail" data-surface={surface} data-sfi-internal-shell="SFI-INTERNAL-VISUAL-1.0">
    <div className="institutionRailIdentity">
      <Link href="/root" className="institutionRailMark">SFI</Link>
      <div>
        <small>INTERNAL INSTITUTIONAL FIELD</small>
        <strong>{copy.mode}</strong>
      </div>
    </div>
    <nav aria-label="Institutional chambers">
      {NAV.map((item)=><Link key={item.href} href={item.href} data-active={item.surface===surface?'true':undefined}>{item.label}</Link>)}
    </nav>
    <div className="institutionRailState">
      <span>{state||'GOVERNED SURFACE'}</span>
      {detail?<small>{detail}</small>:null}
      <b>{copy.boundary}</b>
    </div>
  </section>;
}
