'use client';

import Link from 'next/link';
import { useState } from 'react';
import './AuthenticatedSfiMenu.css';

const ITEMS=[
  {label:'CURRENT STATE',href:'/root?reading=CURRENT_STATE'},
  {label:'TRAJECTORIES',href:'/root?reading=TRAJECTORY'},
  {label:'OBSERVATORY',href:'/observatory'},
  {label:'CASES',href:'/cases'},
  {label:'METHOD LAB',href:'/method-lab'},
  {label:'GOVERNANCE',href:'/governance'},
  {label:'TWIN / SPINE',href:'/twin'},
  {label:'ACCESS',href:'/root/access'},
  {label:'PROJECTIONS & PHENOMENA',href:'/root?reading=PROJECTION'},
  {label:'JR. LOGBOOK',href:'/root?reading=RETURN_CONTRAST'},
  {label:'TECHNICAL LOG',href:'/root?reading=RETROLONGITUDINAL'},
  {label:'H1, HR, CONTRAST & LEARNING',href:'/root?reading=REALITY_CHAIN'},
] as const;

export function AuthenticatedSfiMenu(){
  const [open,setOpen]=useState(false);
  return <div className="sfiDiamondNavigation" data-sfi-auth-navigation="DIAMOND-1.0">
    <button className="sfiDiamondTrigger" type="button" aria-label="Open SFI navigation" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <img src="/identity/sfi-canonical-diamond.svg" alt="" aria-hidden="true"/>
    </button>
    {open?<nav className="sfiDiamondMenu" aria-label="SFI authenticated navigation">
      {ITEMS.map((item)=><Link key={item.label} href={item.href} onClick={()=>setOpen(false)}>{item.label}</Link>)}
    </nav>:null}
  </div>;
}
