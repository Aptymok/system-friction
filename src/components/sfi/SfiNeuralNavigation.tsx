'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import './SfiNeuralNavigation.css';

export const SFI_NEURAL_SURFACES = [
  {id:'gobierno',label:'Gobierno',description:'Decisiones, evidencia y continuidad',nodes:[
    {href:'/root',label:'ROOT',description:'Campo cognitivo y decisiones',branch:'Institución'},
    {href:'/root/evidence-review',label:'Revisión de evidencia',description:'Admisión y procedencia',branch:'Evidencia'},
    {href:'/root/discovery',label:'Discovery',description:'Oportunidades y propagación',branch:'Investigación'},
    {href:'/root/access',label:'Acceso',description:'Identidad y autorizaciones',branch:'Autoridad'},
    {href:'/root?reading=TRAJECTORY',label:'Trayectorias',description:'Lecturas del campo ROOT',branch:'Dinámica'},
    {href:'/root?reading=RETURN_CONTRAST',label:'Contrastes',description:'Retornos y aprendizaje',branch:'Aprendizaje'},
  ]},
  {id:'mundo',label:'Mundo',description:'Observar, localizar y reconstruir',nodes:[
    {href:'/observatory',label:'Observatorio',description:'Globo y señales con fuente',branch:'Observación'},
    {href:'/timeline',label:'Timeline',description:'Tiempos y ramas verificables',branch:'Tiempo'},
    {href:'/repository',label:'Repositorio',description:'Objetos y trazabilidad',branch:'Documentación'},
  ]},
  {id:'laboratorio',label:'Laboratorio',description:'Experimentar, contrastar y retornar',nodes:[
    {href:'/method-lab',label:'Method Lab',description:'Protocolos y simulaciones gobernadas',branch:'Experimentación'},
    {href:'/reality-chain',label:'Reality Chain',description:'Casos y cadena de realidad',branch:'Ejecución'},
  ]},
] as const;

const ON_SURFACES=['/root','/method-lab','/timeline','/reality-chain','/observatory'] as const;
export function isUnifiedSurface(pathname:string):boolean {
  return ON_SURFACES.some(prefix=>pathname===prefix||pathname.startsWith(prefix+'/'));
}

export function SfiNeuralNavigation(){
  const pathname=usePathname()??'';
  const active=isUnifiedSurface(pathname);
  const [open,setOpen]=useState(false);
  const [branch,setBranch]=useState<string|null>(null);
  useEffect(()=>{setOpen(false);setBranch(null)},[pathname]);
  if(!active)return null;
  const selected=SFI_NEURAL_SURFACES.find(g=>g.id===branch)??SFI_NEURAL_SURFACES.find(g=>g.nodes.some(n=>n.href.split('?')[0]===pathname))??SFI_NEURAL_SURFACES[0];
  return <div className="sfiNeuralNavigation" data-sfi-unified-nav="SFI-NEURAL-SURFACE-MAP-1.0">
    <button type="button" className="sfiNeuralTrigger" aria-label={open?'Cerrar mapa de superficies':'Abrir mapa de superficies'} aria-expanded={open}
      aria-controls="sfi-neural-graph-nav" onClick={()=>setOpen(v=>!v)}>
      <svg viewBox="0 0 64 64" role="presentation" aria-hidden="true">
        <path d="M32 7L10 26L18 55L47 53L57 23Z M32 7L31 33L18 55 M31 33L57 23 M31 33L10 26 M31 33L47 53" fill="none" stroke="currentColor" strokeWidth="1.7"/>
        <circle cx="32" cy="7" r="4"/><circle cx="10" cy="26" r="3.4"/><circle cx="18" cy="55" r="3.4"/><circle cx="47" cy="53" r="3.4"/><circle cx="57" cy="23" r="3.4"/><circle cx="31" cy="33" r="6.4"/>
      </svg>
      <span><b>SFI</b><small>{open?'Cerrar conexiones':'Explorar superficies'}</small></span>
    </button>
    {open?<div id="sfi-neural-graph-nav" className="sfiNeuralOverlay" role="dialog" aria-modal="false" aria-label="Mapa neuronal institucional">
      <div className="sfiNeuralHeading">
        <div><small>INSTITUTO DE FRICCIÓN DE SISTEMAS</small><h2>Un sistema. Ramas conectadas.</h2>
          <p>Selecciona una rama y entra en el instrumento que necesitas. La navegación no altera su evidencia ni sus permisos.</p></div>
        <button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar mapa">×</button>
      </div>
      <div className="sfiNeuralGraph" data-selected={selected.id}>
        <svg className="sfiNeuralLines" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">
          <path className="sfiNeuralLine sfiNeuralPrimary" d="M90 220 C220 220 240 70 360 70"/>
          <path className="sfiNeuralLine sfiNeuralPrimary" d="M90 220 C220 220 240 220 360 220"/>
          <path className="sfiNeuralLine sfiNeuralPrimary" d="M90 220 C220 220 240 370 360 370"/>
          {SFI_NEURAL_SURFACES.map((g,i)=><path key={g.id}
            className={'sfiNeuralLine sfiNeuralSecondary'+(selected.id===g.id?' isConnected':'')}
            d={'M360 '+(70+i*150)+' C500 '+(70+i*150)+' 490 220 590 220'}/>)}
        </svg>
        <div className="sfiNeuralOrigin"><span className="sfiNeuralNodeMark">SFI</span><strong>Institución</strong></div>
        <div className="sfiNeuralBranches" role="group" aria-label="Ramas institucionales">
          {SFI_NEURAL_SURFACES.map(g=><button type="button" key={g.id} aria-pressed={selected.id===g.id}
            onClick={()=>setBranch(g.id)}><i/><strong>{g.label}</strong><span>{g.description}</span></button>)}
        </div>
        <div className="sfiNeuralDestinations" key={selected.id}>
          <span className="sfiNeuralDestinationHeading">SUBRAMAS · {selected.label}</span>
          <div className="sfiNeuralLinks">
            {selected.nodes.map(n=><Link href={n.href} key={n.href}
              aria-current={pathname===n.href.split('?')[0]?'page':undefined}
              onClick={()=>setOpen(false)}><i/><span><small>{n.branch}</small><strong>{n.label}</strong><em>{n.description}</em></span><b aria-hidden="true">↗</b></Link>)}
          </div>
        </div>
      </div>
      <p className="sfiNeuralBoundary">Una sola navegación. Cada superficie conserva sus herramientas y sus restricciones de acceso.</p>
    </div>:null}
  </div>;
}
