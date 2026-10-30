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
    {href:'/repository',label:'Repositorio',description:'Publicaciones y procedencia',branch:'Documentación'},
  ]},
  {id:'laboratorio',label:'Laboratorio',description:'Experimentar, contrastar y retornar',nodes:[
    {href:'/method-lab',label:'Method Lab',description:'Protocolos y simulaciones gobernadas',branch:'Experimentación'},
    {href:'/reality-chain',label:'Reality Chain',description:'Casos y cadena de realidad',branch:'Ejecución'},
  ]},
] as const;

const ON_SURFACES=['/root','/method-lab','/timeline','/reality-chain','/observatory','/repository'] as const;
export function isUnifiedSurface(pathname:string):boolean {
  return ON_SURFACES.some(prefix=>pathname===prefix||pathname.startsWith(prefix+'/'));
}

const POSITIONS=[
  {x:290,y:75,angle:'top'},
  {x:100,y:382,angle:'left'},
  {x:480,y:382,angle:'right'},
] as const;

export function SfiNeuralNavigation(){
  const pathname=usePathname()??'';
  const active=isUnifiedSurface(pathname);
  const [open,setOpen]=useState(false);
  const [branch,setBranch]=useState<string|null>(null);
  useEffect(()=>{setOpen(false);setBranch(null)},[pathname]);
  useEffect(()=>{
    if(!open)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    window.addEventListener('keydown',close);
    return ()=>window.removeEventListener('keydown',close);
  },[open]);
  if(!active)return null;
  const selected=SFI_NEURAL_SURFACES.find(g=>g.id===branch)??SFI_NEURAL_SURFACES.find(g=>g.nodes.some(n=>n.href.split('?')[0]===pathname))??SFI_NEURAL_SURFACES[0];
  const selectedIndex=SFI_NEURAL_SURFACES.findIndex(g=>g.id===selected.id);
  return <div className="sfiNeuralNavigation" data-sfi-unified-nav="SFI-NEURAL-SURFACE-MAP-2.0">
    <button type="button" className="sfiNeuralTrigger" aria-label={open?'Cerrar conexiones de SFI':'Abrir conexiones de SFI'}
      aria-expanded={open} aria-controls="sfi-neural-graph-nav" onClick={()=>setOpen(v=>!v)}>
      <img src="/assets/sfi/ui/sfi-institute-node-mark.svg" width={48} height={48} alt="Logotipo de SFI" />
    </button>
    {open?<div id="sfi-neural-graph-nav" className="sfiNeuralOverlay sfiNeuralRadialOverlay" role="dialog" aria-modal="false" aria-label="Mapa interconectado del instituto">
      <div className="sfiNeuralHeading">
        <div><small>SYSTEM FRICTION INSTITUTE</small><h2>Un organismo. Tres sistemas interconectados.</h2>
          <p>Cada nodo abre una rama. Todas las ramas están conectadas y permiten cambiar de perspectiva sin alterar los registros.</p></div>
        <button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar conexiones">×</button>
      </div>
      <div className="sfiNeuralRadialBody">
        <div className="sfiNeuralOrbit" role="group" aria-label="Tres sistemas relacionados">
          <svg className="sfiNeuralOrbitLines" viewBox="0 0 580 490" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <path className="sfiNeuralRingLink" d="M290 75 Q55 180 100 382 Q290 479 480 382 Q525 180 290 75Z"/>
            <path className="sfiNeuralRingLink" d="M290 75 L100 382 L480 382 Z"/>
            <path className="sfiNeuralRingSpoke" d="M290 235L290 75 M290 235L100 382 M290 235L480 382"/>
            {POSITIONS.map((p,i)=><path key={i} className={'sfiNeuralActiveConnection'+(selectedIndex===i?' isActive':'')} d={`M290 235 Q${(290+p.x)/2+ (i===1?-38:i===2?38:0)} ${(235+p.y)/2-18} ${p.x} ${p.y}`}/>)}
          </svg>
          <button type="button" className="sfiNeuralHeart" aria-label="Logotipo del instituto: cerrar mapa" onClick={()=>setOpen(false)}>
            <img src="/assets/sfi/ui/sfi-institute-node-mark.svg" alt="" width={94} height={94} />
          </button>
          {SFI_NEURAL_SURFACES.map((g,i)=><button key={g.id} type="button"
            className={'sfiNeuralOrbitNode sfiNeuralOrbitNode-'+g.id}
            data-orbit={POSITIONS[i].angle}
            aria-pressed={selected.id===g.id}
            onClick={()=>setBranch(g.id)}>
            <span className="sfiNeuralOrbitSymbol" aria-hidden="true">{g.id==='gobierno'?'◇':g.id==='mundo'?'◉':'✧'}</span>
            <strong>{g.label}</strong>
            <small>{g.nodes.length} conexiones</small>
          </button>)}
        </div>
        <div className="sfiNeuralRadialDetail" key={selected.id}>
          <span className="sfiNeuralDestinationHeading">RAMAS CONECTADAS · {selected.label.toUpperCase()}</span>
          <h3>{selected.description}</h3>
          <div className="sfiNeuralLinks">
            {selected.nodes.map(n=><Link href={n.href} key={n.href} aria-current={pathname===n.href.split('?')[0]?'page':undefined}
              onClick={()=>setOpen(false)}><i/><span><small>{n.branch}</small><strong>{n.label}</strong><em>{n.description}</em></span><b aria-hidden="true">↗</b></Link>)}
          </div>
          <p>Elige otra esfera para recorrer una rama diferente.</p>
        </div>
      </div>
    </div>:null}
  </div>;
}
