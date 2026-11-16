'use client';

import { useEffect, useState, type ReactNode } from 'react';

export function LabCreateDialog({label='Iniciar una investigación o experimento',children}:{label?:string;children:ReactNode}) {
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    if(!open)return;
    function onKey(event:KeyboardEvent){if(event.key==='Escape')setOpen(false);}
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[open]);
  return <>
    <button type="button" className="sfi-lab-create-trigger" onClick={()=>setOpen(true)}>
      <span aria-hidden="true">＋</span> {label}
    </button>
    {open?<div className="sfi-lab-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
      <section role="dialog" aria-modal="true" aria-label={label} className="sfi-lab-dialog" tabIndex={-1}>
        <div className="sfi-lab-dialog-head">
          <div><small>METHOD LAB · REGISTRO VOLUNTARIO</small><h2>{label}</h2></div>
          <button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar formulario">Cerrar ×</button>
        </div>
        <p>El expediente de lectura sigue disponible sin completar este formulario. El registro de una investigación nueva permanece sujeto a los controles de acceso existentes.</p>
        <div className="sfi-lab-dialog-body">{children}</div>
      </section>
    </div>:null}
  </>;
}
