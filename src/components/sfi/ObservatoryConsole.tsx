'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { SessionControls } from './SessionControls';
import './ObservatoryConsole.css';

type Proposal={id:string;title?:string;status?:string;risk_level?:string;created_at?:string;proposalType?:string};
type GeoSignal={id:string;label:string;lat:number;lng:number;kind:string;confidence?:number};
type Lens='field'|'tensions'|'time'|'evidence'|'lab'|'root';

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

function collectGeo(input:unknown,out:GeoSignal[]=[],depth=0):GeoSignal[]{
  if(depth>6||out.length>=80||input==null)return out;
  if(Array.isArray(input)){for(const item of input)collectGeo(item,out,depth+1);return out;}
  if(typeof input!=='object')return out;
  const o=input as Record<string,unknown>;
  const lat=Number(o.lat??o.latitude??o.latitud);
  const lng=Number(o.lng??o.lon??o.longitude??o.longitud);
  if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180){
    out.push({
      id:String(o.id??o.node_id??o.node_key??`geo-${out.length}`),
      label:String(o.label??o.name??o.title??o.node_key??`Observación ${out.length+1}`),
      lat,lng,
      kind:String(o.epistemic_class??o.status??o.kind??o.type??'observed').toLowerCase(),
      confidence:Number.isFinite(Number(o.confidence))?Number(o.confidence):undefined,
    });
  }
  for(const value of Object.values(o))collectGeo(value,out,depth+1);
  return out;
}

function project(lat:number,lng:number){
  const x=800+(lng*3.05);
  const y=470-(lat*2.35);
  return{x:clamp(x,300,1300),y:clamp(y,250,730)};
}

function systemNarrative(live:any,proposals:Proposal[],geo:GeoSignal[]){
  const pending=proposals.filter(p=>['proposed','waiting_evidence','needs_evidence'].includes(p.status||'')).length;
  const risky=proposals.filter(p=>['high','critical'].includes((p.risk_level||'').toLowerCase())).length;
  const tables=Array.isArray(live?.data?.tables)?live.data.tables:[];
  const broken=tables.filter((t:any)=>t?.ok===false);
  if(!live)return 'El observatorio todavía está conectando con el estado institucional.';
  if(live?.ok===false||broken.length>0){
    const names=broken.map((t:any)=>String(t?.table||'tabla desconocida')).join(', ');
    return `El sistema está respondiendo, pero ${broken.length||'algunas'} tablas críticas presentan advertencias${names?`: ${names}`:''}. Esto describe salud de persistencia, no fuentes externas incompletas. Hay ${pending} decisiones o solicitudes de evidencia abiertas y ${geo.length} observaciones con coordenadas verificables.`;
  }
  return `El campo está disponible. Hay ${pending} asuntos por resolver, ${risky} señales de riesgo alto y ${geo.length} observaciones georreferenciadas visibles sobre la Tierra.`;
}

export function ObservatoryConsole(){
  const auth=useAuthState();
  const[live,setLive]=useState<any>(null);
  const[proposals,setProposals]=useState<Proposal[]>([]);
  const[lens,setLens]=useState<Lens>('field');
  const[selected,setSelected]=useState<GeoSignal|null>(null);
  const[satelliteOpen,setSatelliteOpen]=useState(false);
  const[zoom,setZoom]=useState(1);
  const[tilt,setTilt]=useState(0);
  const[time,setTime]=useState(100);
  const[clock,setClock]=useState('');

  useEffect(()=>{const tick=()=>setClock(new Date().toISOString());tick();const t=setInterval(tick,1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{let stop=false;const pull=async()=>{try{const r=await fetch('/api/root/state',{cache:'no-store'});const j=await r.json();if(!stop)setLive(j)}catch{if(!stop)setLive({ok:false,data:{}})}};void pull();const t=setInterval(pull,12000);return()=>{stop=true;clearInterval(t)}},[]);
  useEffect(()=>{if(auth.status!=='authenticated')return;let stop=false;const pull=async()=>{try{const r=await fetch('/api/acp/proposals',{cache:'no-store'});const j=await r.json();if(!stop&&j?.ok)setProposals(j.data?.proposals||[])}catch{}};void pull();const t=setInterval(pull,15000);return()=>{stop=true;clearInterval(t)}},[auth.status]);

  const geo=useMemo(()=>collectGeo(live?.data),[live]);
  const tables=Array.isArray(live?.data?.tables)?live.data.tables:[];
  const degradedTables=tables.filter((t:any)=>t?.ok===false);
  const objects=tables.reduce((sum:number,t:any)=>sum+(Number(t?.count)||0),0)||Object.keys(live?.data||{}).length;
  const pending=proposals.filter(p=>['proposed','waiting_evidence','needs_evidence'].includes(p.status||'')).length;
  const rejected=proposals.filter(p=>p.status==='rejected').length;
  const accepted=proposals.filter(p=>p.status==='accepted').length;
  const timeline=useMemo(()=>proposals.map(p=>p.created_at).filter(Boolean).map(d=>new Date(d!).getTime()).filter(Number.isFinite).sort((a,b)=>a-b),[proposals]);
  const minT=timeline[0]||Date.now()-30*86400000,maxT=timeline[timeline.length-1]||Date.now();
  const cutoff=minT+(maxT-minT)*(time/100);
  const visibleProposals=proposals.filter(p=>!p.created_at||new Date(p.created_at).getTime()<=cutoff);
  const narrative=systemNarrative(live,visibleProposals,geo);

  return <main className="obsShell">
    <section className={`obsScene lens-${lens}`}>
      <div className="starfield"/>
      <div className="deepSpace"/>

      <button className={`satelliteActor satellite-${lens}`} onClick={()=>setSatelliteOpen(true)} aria-label="Inspeccionar satélite SFI-OBS-01">
        <img src="/sfi-scenes/satellite.png" alt="Satélite del observatorio SFI"/>
        <span className="scanBeam"/>
      </button>

      <div className="earthStage" style={{'--earthZoom':zoom,'--earthTilt':`${tilt}deg`} as React.CSSProperties}>
        <img className="worldActor" src="/sfi-scenes/world.png" alt="Tierra observada por System Friction Institute"/>
        <svg className="earthOverlay" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-label="Datos georreferenciados sobre la Tierra">
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {geo.map(g=>{const p=project(g.lat,g.lng);const cls=g.kind.includes('infer')?'inferred':g.kind.includes('emerg')?'emergent':g.kind.includes('persist')?'persistent':'observed';return <g key={g.id} className={`geoNode ${cls}`} onClick={()=>setSelected(g)} role="button" tabIndex={0}><circle cx={p.x} cy={p.y} r="11" className="geoHalo"/><circle cx={p.x} cy={p.y} r="4" className="geoCore"/><text x={p.x+14} y={p.y-10}>{g.label.slice(0,28)}</text></g>})}
          {lens==='tensions'&&<g className="tensionLayer"><path d="M520 555 C690 430 890 570 1040 400"/><path d="M660 385 C790 310 1010 390 1180 500"/><circle cx="820" cy="455" r="34"/><text x="850" y="445">TENSIÓN</text></g>}
        </svg>
      </div>

      <header className="obsTop">
        <div className="obsBrand"><strong>SFI</strong><span>FIELD · SYSTEM FRICTION INSTITUTE</span><small>LIVE OBSERVATION SURFACE</small></div>
        <nav>{(['field','tensions','time','evidence','lab','root'] as Lens[]).map(k=><button key={k} className={lens===k?'active':''} onClick={()=>setLens(k)}>{k==='time'?'TIME HISTORY':k.toUpperCase()}</button>)}<Link href="/history">ORIGIN → NOW</Link></nav>
        <div className="obsIdentity"><b>{auth.identity?.alias||'SESSION'}</b><span>{auth.identity?.role||auth.status}</span></div>
        <SessionControls className="obsSessionControls"/>
      </header>

      <aside className="hud hudLeft">
        <section><small>SATÉLITE ACTIVO</small><h3>SFI-OBS-01</h3><p className="good">● ENLACE ESTABLE</p><dl><dt>ÓRBITA</dt><dd>LEO 512 km</dd><dt>LECTURA</dt><dd>{clock.slice(11,19)} UTC</dd></dl><button onClick={()=>setSatelliteOpen(true)}>INSPECCIONAR</button></section>
        <section><small>CAMPO OBSERVADO</small><dl><dt>OBJETOS</dt><dd>{objects}</dd><dt>GEOREFERENCIADOS</dt><dd>{geo.length}</dd><dt>PROPUESTAS</dt><dd>{visibleProposals.length}</dd><dt>POR RESOLVER</dt><dd>{pending}</dd></dl></section>
        <section><small>ESTADO DEL SISTEMA</small><h3 className={live?.ok===false?'warn':'good'}>{live?.ok===false?'DEGRADED':live?'OBSERVADO':'CONECTANDO'}</h3><p className="source">/api/root/state</p></section>
      </aside>

      <aside className="hud hudRight">
        <section className="meaning"><small>WHAT DOES THIS MEAN?</small><p>{narrative}</p></section>
        {lens==='tensions'&&<section><small>TENSIONES</small><dl><dt>NECESITAN EVIDENCIA</dt><dd>{visibleProposals.filter(p=>['needs_evidence','waiting_evidence'].includes(p.status||'')).length}</dd><dt>RECHAZADAS</dt><dd>{rejected}</dd><dt>ACEPTADAS</dt><dd>{accepted}</dd></dl></section>}
        {lens==='evidence'&&<section><small>PERSISTENCIA / EVIDENCIA</small><p>{tables.filter((t:any)=>t?.ok).length} tablas críticas responden correctamente; {degradedTables.length} presentan advertencias.</p>{degradedTables.length>0&&<dl>{degradedTables.map((t:any)=><span key={String(t?.table)}><dt>{String(t?.table||'tabla desconocida')}</dt><dd>{String(t?.warning||'warning sin detalle')}</dd></span>)}</dl>}</section>}
        {lens==='lab'&&<section><small>LAB</small><p>El laboratorio usa el mismo campo: seleccionar evidencia, formular hipótesis y ejecutar sólo bajo autorización.</p></section>}
        {lens==='root'&&<section><small>ROOT</small><p>{pending} asuntos requieren decisión o evidencia. La autoridad permanece separada de la propuesta.</p></section>}
      </aside>

      {selected&&<div className="inspector"><button className="close" onClick={()=>setSelected(null)}>×</button><small>OBSERVACIÓN GEOREFERENCIADA</small><h2>{selected.label}</h2><dl><dt>LAT</dt><dd>{selected.lat.toFixed(4)}</dd><dt>LNG</dt><dd>{selected.lng.toFixed(4)}</dd><dt>ESTADO</dt><dd>{selected.kind}</dd>{selected.confidence!=null&&<><dt>CONFIANZA</dt><dd>{selected.confidence.toFixed(2)}</dd></>}</dl></div>}
      {satelliteOpen&&<div className="inspector satelliteInspector"><button className="close" onClick={()=>setSatelliteOpen(false)}>×</button><small>INSTRUMENTO</small><h2>SFI-OBS-01</h2><p>Plataforma visual del observatorio. Su posición cambia con la lente activa; la Tierra y sus señales conservan el mismo campo de referencia.</p><dl><dt>FUENTE</dt><dd>/api/root/state</dd><dt>ESTADO</dt><dd>{live?'LIVE':'CONNECTING'}</dd></dl></div>}

      <footer className="obsBottom">
        <div className="viewControls"><button onClick={()=>setTilt(t=>t===0?-3:0)}>INCLINACIÓN</button><button onClick={()=>setZoom(z=>clamp(z+.08,1,1.32))}>+ ZOOM</button><button onClick={()=>setZoom(z=>clamp(z-.08,1,1.32))}>− ZOOM</button><button onClick={()=>{setZoom(1);setTilt(0)}}>RESET</button></div>
        <div className="timeline"><span>{new Date(minT).toLocaleDateString('es-MX',{month:'short',day:'2-digit'})}</span><input aria-label="Time history" type="range" min="0" max="100" value={time} onChange={e=>setTime(Number(e.target.value))}/><span>{new Date(cutoff).toLocaleString('es-MX',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</span></div>
        <div className="legend"><span className="o">● observada</span><span className="p">● persistente</span><span className="e">● emergente</span><span className="i">● inferida</span></div>
      </footer>
    </section>
  </main>;
}
