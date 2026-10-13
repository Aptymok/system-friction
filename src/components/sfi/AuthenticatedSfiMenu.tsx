'use client';

import Link from 'next/link';
import { useState } from 'react';
import './AuthenticatedSfiMenu.css';

const CORE_SURFACES=[
  {label:'ROOT',href:'/root'},
  {label:'OBSERVATORY',href:'/observatory'},
  {label:'REALITY CHAIN',href:'/reality-chain'},
  {label:'METHOD LAB',href:'/method-lab'},
  {label:'REPOSITORY',href:'/repository'},
  {label:'TIMELINE',href:'/timeline'},
  {label:'ACCESS',href:'/root/access'},
] as const;

const ITEMS=[
  {label:'CURRENT STATE',href:'/root?reading=CURRENT_STATE'},
  {label:'TRAJECTORIES',href:'/root?reading=TRAJECTORY'},
  {label:'OBSERVATORY',href:'/observatory'},
  {label:'CASES',href:'/reality-chain'},
  {label:'METHOD LAB',href:'/method-lab'},
  {label:'GOVERNANCE',href:'/governance'},
  {label:'TWIN / SPINE',href:'/root?reading=RETROLONGITUDINAL'},
  {label:'ACCESS',href:'/root/access'},
  {label:'PROJECTIONS & PHENOMENA',href:'/root?reading=PROJECTION'},
  {label:'JR. LOGBOOK',href:'/root?reading=RETURN_CONTRAST'},
  {label:'TECHNICAL LOG',href:'/root?reading=RETROLONGITUDINAL'},
  {label:'H1, HR, CONTRAST & LEARNING',href:'/root?reading=REALITY_CHAIN'},
] as const;

export function AuthenticatedSfiMenu(){
  const [open,setOpen]=useState(false);

  return <>
    <header className="sfiAuthCanonicalNav" data-sfi-auth-navigation="DIAMOND-1.0">
      <Link href="/root" className="sfiAuthBrand" aria-label="SFI ROOT">
        <img src="/assets/sfi/ui/icons/00_sfi_canonical_mark.png" alt="" aria-hidden="true"/>
        <span>SYSTEM FRICTION INSTITUTE</span>
      </Link>
      <nav className="sfiAuthSurfaceNav" aria-label="SFI authenticated surfaces">
        {CORE_SURFACES.map((item)=><Link key={item.label} href={item.href}>{item.label}</Link>)}
      </nav>
      <button className="sfiDiamondTrigger" type="button" aria-label="Open SFI operations" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
        <img src="/assets/sfi/ui/icons/00_sfi_canonical_mark.png" alt="" aria-hidden="true"/>
      </button>
      {open?<nav className="sfiDiamondMenu" aria-label="SFI authenticated operations">
        <span>OPERATIONS</span>
        {ITEMS.map((item)=><Link key={item.label} href={item.href} onClick={()=>setOpen(false)}>{item.label}</Link>)}
      </nav>:null}
    </header>

  </>;
}
