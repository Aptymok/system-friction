'use client';

import Link from 'next/link';
import { useState } from 'react';
import './AuthenticatedSfiMenu.css';

const ITEMS=[
  {label:'DESPLAZAMIENTO',href:'/root?reading=CURRENT_STATE'},
  {label:'TRAYECTORIAS',href:'/root?reading=TRAJECTORY'},
  {label:'OBSERVATORIO',href:'/observatory'},
  {label:'PROYECCIONES Y FENÓMENOS',href:'/root?reading=PROJECTION'},
  {label:'BITÁCORA JR.',href:'/root?reading=RETURN_CONTRAST'},
  {label:'BITÁCORA TÉCNICA',href:'/root?reading=RETROLONGITUDINAL'},
  {label:'H1, HR, CONTRASTE Y APRENDIZAJE',href:'/root?reading=REALITY_CHAIN'},
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
