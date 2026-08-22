'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import './ObservatoryConsole.css';

type Proposal={id:string;title?:string;status?:string;risk_level?:string;created_at?:string;proposalType?:string};
type GeoSignal={id:string;label:string;lat:number;lng:number;kind:string;confidence?:number};
type Lens='field'|'tensions'|'time'|'evidence'|'lab'|'root';

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

function collectGeo(input:unknown, out:GeoSignal[]=[], depth=0):GeoSignal[]{
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
  // Equirectangular projection visually constrained to the visible Earth disc.
  const x=800+(lng*3.25);
  const y=505-(lat*2.72);
  return {x:clamp(x,270,1330),y:clamp(y,320,760)};
}

function systemNarrative(live:any, proposals:Proposal[], geo:GeoSignal[]){
  const pending=proposals.filter(p=>['proposed','waiting_evidence','needs_evidence'].includes(p.status||'')).length;
  const risky=proposals.filter(p=>['high','critical'].includes((p.risk_level||'').toLowerCase())).length;
  const tables=Array.isArray(live?.data?.tables)?live.data.tables:[];
  const broken=tables.filter((t:any)=>t?.ok===false).length;
  if(!live)return 'El observatorio todavía está conectando con el estado institucional.';
  if(live?.ok===false||broken>0)return `El sistema está respondiendo, pero ${broken||'algunas'} fuentes no están completas. Hay ${pending} decisiones o solicitudes de evidencia abiertas y ${geo.length} observaciones con coordenadas verificables.`;
  return `El campo está disponible. Hay ${pending} asuntos por resolver, ${risky} señales de riesgo alto y ${geo.length} observaciones georreferenciadas visibles sobre la Tierra.`;
}

export function ObservatoryConsole(){
  const auth=useAuthState();
  const [live,setLive]=useState<any>(null);
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [lens,setLens]=useState<Lens>('field');
  const [selected,setSelected]=useState<GeoSignal|null>(null);
  const [satelliteOpen,setSatelliteOpen]=useState(false);
  const [zoom,setZoom]=useState(1);
  const [tilt,setTilt]=useState(0);
  const [time,setTime]=useState(100);
  const [clock,setClock]=useState('');

  useEffect(()=>{const tick=()=>setClock(new Date().toISOString());tick();const t=setInterval(tick,1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{let stop=false;const pull=async()=>{try{const r=await fetch('/api/root/state',{cache:'no-store'});const j=await r.json();if(!stop)setLive(j)}catch{if(!stop)setLive({ok:false,data:{}})}};void pull();const t=setInterval(pull,12000);return()=>{stop=true;clearInterval(t)}},[]);
  useEffect(()=>{if(auth.status!=='authenticated')return;let stop=false;const pull=async()=>{try{const r=await fetch('/api/acp/proposals',{cache:'no-store'});const j=await r.json();if(!stop&&j?.ok)setProposals(j.data?.proposals||[])}catch{}};void pull();const t=setInterval(pull,15000);return()=>{stop=true;clearInterval(t)}},[auth.status]);

  const geo=useMemo(()=>collectGeo(live?.data),[live]);
  const tables=Array.isArray(live?.data?.tables)?live.data.tables:[];
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
    <section className={`obsScene lens-${lens}`} style={{'--earthZoom':zoom,'--earthTilt':`${tilt}deg`} as React.CSSProperties}>
      <div className="starfield"/>
      <svg className="orbitalEarth" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-label="Tierra orbital interactiva">
        <defs>
          <radialGradient id="earthGlow" cx="62%" cy="28%" r="74%"><stop offset="0" stopColor="#72583a" stopOpacity=".58"/><stop offset=".2" stopColor="#203342"/><stop offset=".58" stopColor="#09131a"/><stop offset="1" stopColor="#020405"/></radialGradient>
          <linearGradient id="atm" x1="0" x2="1"><stop stopColor="#1f4d70" stopOpacity=".15"/><stop offset=".62" stopColor="#98c6e4" stopOpacity=".85"/><stop offset="1" stopColor="#f5c67c" stopOpacity=".9"/></linearGradient>
          <linearGradient id="scanBeam" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e0b773" stopOpacity=".5"/><stop offset="1" stopColor="#d7a95e" stopOpacity="0"/></linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <clipPath id="earthClip"><ellipse cx="830" cy="725" rx="980" ry="465"/></clipPath>
        </defs>
        <g className="earthTransform">
          <ellipse cx="830" cy="725" rx="990" ry="475" fill="none" stroke="url(#atm)" strokeWidth="7" opacity=".92" filter="url(#glow)"/>
          <ellipse cx="830" cy="725" rx="980" ry="465" fill="url(#earthGlow)"/>
          <g clipPath="url(#earthClip)" className="continentLayer">
            <path d="M345 435 L430 365 535 350 620 392 690 388 734 431 720 486 657 512 616 552 566 568 517 619 470 610 453 570 415 540 377 500 Z"/>
            <path d="M520 605 L570 616 613 650 639 706 621 758 585 786 550 745 532 694 500 655 Z"/>
            <path d="M728 405 L820 360 943 365 1030 405 1125 413 1218 461 1282 520 1260 575 1160 570 1098 533 1017 543 957 518 875 529 819 501 764 474 Z"/>
            <path d="M914 548 L1000 548 1071 585 1098 651 1060 726 997 766 953 715 934 644 892 591 Z"/>
            <path d="M1180 606 L1240 590 1295 622 1281 676 1228 690 1194 660 Z"/>
            {Array.from({length:145}).map((_,i)=>{const x=260+((i*83)%1080),y=405+((i*47)%340),r=(i%7===0)?2.4:1.2;return <circle key={i} cx={x} cy={y} r={r} fill="#d9aa62" opacity={.28+(i%5)*.11}/>})}
            {Array.from({length:42}).map((_,i)=>{const x1=300+((i*97)%1000),y1=430+((i*53)%300),x2=300+(((i+7)*97)%1000),y2=430+(((i+11)*53)%300);return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b98a4e" strokeWidth=".65" opacity=".19"/>})}
          </g>
          {geo.map(g=>{const p=project(g.lat,g.lng);const cls=g.kind.includes('infer')?'inferred':g.kind.includes('emerg')?'emergent':g.kind.includes('persist')?'persistent':'observed';return <g key={g.id} className={`geoNode ${cls}`} onClick={()=>setSelected(g)} role="button" tabIndex={0}><circle cx={p.x} cy={p.y} r="10" className="geoHalo"/><circle cx={p.x} cy={p.y} r="4" className="geoCore"/><text x={p.x+13} y={p.y-9}>{g.label.slice(0,28)}</text></g>})}
        </g>
        <g className="satelliteActor" onClick={()=>setSatelliteOpen(true)} role="button" tabIndex={0}>
          <rect x="265" y="128" width="118" height="54" rx="2" className="panel"/><rect x="405" y="128" width="118" height="54" rx="2" className="panel"/>
          {Array.from({length:6}).map((_,i)=><line key={`p${i}`} x1={280+i*18} y1="130" x2={280+i*18} y2="180" className="panelGrid"/>)}
          {Array.from({length:6}).map((_,i)=><line key={`q${i}`} x1={420+i*18} y1="130" x2={420+i*18} y2="180" className="panelGrid"/>)}
          <circle cx="394" cy="155" r="30" className="satBody"/><path d="M385 148 L407 138 416 151 406 171 382 164 Z" className="satMetal"/><circle cx="396" cy="151" r="8" className="satLens"/>
          <polygon points="386,178 422,178 655,612 555,612" fill="url(#scanBeam)" opacity=".43"/>
        </g>
        {lens==='tensions'&&<g className="tensionLayer"><path d="M565 610 C690 520 850 590 960 520"/><path d="M720 486 C790 420 975 440 1120 520"/><circle cx="760" cy="520" r="34"/><text x="781" y="510">TENSIÓN</text></g>}
      </svg>

      <header className="obsTop">
        <div className="obsBrand"><strong>SFI</strong><span>FIELD · SYSTEM FRICTION INSTITUTE</span><small>LIVE OBSERVATION SURFACE</small></div>
        <nav>{(['field','tensions','time','evidence','lab','root'] as Lens[]).map(k=><button key={k} className={lens===k?'active':''} onClick={()=>setLens(k)}>{k==='time'?'TIME HISTORY':k.toUpperCase()}</button>)}</nav>
        <div className="obsIdentity"><b>{auth.identity?.alias||'SESSION'}</b><span>{auth.identity?.role||auth.status}</span></div>
      </header>

      <aside className="hud hudLeft">
        <section><small>SATÉLITE ACTIVO</small><h3>SFI-OBS-01</h3><p className="good">● ENLACE ESTABLE</p><dl><dt>ÓRBITA</dt><dd>LEO 512 km</dd><dt>LECTURA</dt><dd>{clock.slice(11,19)} UTC</dd></dl><button onClick={()=>setSatelliteOpen(true)}>INSPECCIONAR</button></section>
        <section><small>CAMPO OBSERVADO</small><dl><dt>OBJETOS</dt><dd>{objects}</dd><dt>GEOREFERENCIADOS</dt><dd>{geo.length}</dd><dt>PROPUESTAS</dt><dd>{visibleProposals.length}</dd><dt>POR RESOLVER</dt><dd>{pending}</dd></dl></section>
        <section><small>ESTADO DEL SISTEMA</small><h3 className={live?.ok===false?'warn':'good'}>{live?.ok===false?'DEGRADED':live?'OBSERVADO':'CONECTANDO'}</h3><p className="source">/api/root/state</p></section>
      </aside>

      <aside className="hud hudRight">
        <section className="meaning"><small>WHAT DOES THIS MEAN?</small><p>{narrative}</p></section>
        {lens==='tensions'&&<section><small>TENSIONES</small><dl><dt>NECESITAN EVIDENCIA</dt><dd>{visibleProposals.filter(p=>['needs_evidence','waiting_evidence'].includes(p.status||'')).length}</dd><dt>RECHAZADAS</dt><dd>{rejected}</dd><dt>ACEPTADAS</dt><dd>{accepted}</dd></dl></section>}
        {lens==='evidence'&&<section><small>EVIDENCIA</small><p>{tables.filter((t:any)=>t?.ok).length} fuentes/tablas responden correctamente; {tables.filter((t:any)=>t?.ok===false).length} presentan advertencias.</p></section>}
        {lens==='lab'&&<section><small>LAB</small><p>El laboratorio usa el mismo campo: seleccionar evidencia, formular hipótesis y ejecutar sólo bajo autorización.</p></section>}
        {lens==='root'&&<section><small>ROOT</small><p>{pending} asuntos requieren decisión o evidencia. La autoridad permanece separada de la propuesta.</p></section>}
      </aside>

      {selected&&<div className="inspector"><button className="close" onClick={()=>setSelected(null)}>×</button><small>OBSERVACIÓN GEOREFERENCIADA</small><h2>{selected.label}</h2><dl><dt>LAT</dt><dd>{selected.lat.toFixed(4)}</dd><dt>LNG</dt><dd>{selected.lng.toFixed(4)}</dd><dt>ESTADO</dt><dd>{selected.kind}</dd>{selected.confidence!=null&&<><dt>CONFIANZA</dt><dd>{selected.confidence.toFixed(2)}</dd></>}</dl></div>}
      {satelliteOpen&&<div className="inspector satelliteInspector"><button className="close" onClick={()=>setSatelliteOpen(false)}>×</button><small>INSTRUMENTO</small><h2>SFI-OBS-01</h2><p>Plataforma visual del observatorio. El movimiento es ambiental; los datos que aparezcan sobre la Tierra sólo se posicionan si incluyen coordenadas verificables.</p><dl><dt>FUENTE</dt><dd>/api/root/state</dd><dt>ESTADO</dt><dd>{live?'LIVE':'CONNECTING'}</dd></dl></div>}

      <footer className="obsBottom">
        <div className="viewControls"><button onClick={()=>setTilt(t=>t===0?-3:0)}>INCLINACIÓN</button><button onClick={()=>setZoom(z=>clamp(z+.08,1,1.32))}>+ ZOOM</button><button onClick={()=>setZoom(z=>clamp(z-.08,1,1.32))}>− ZOOM</button><button onClick={()=>{setZoom(1);setTilt(0)}}>RESET</button></div>
        <div className="timeline"><span>{new Date(minT).toLocaleDateString('es-MX',{month:'short',day:'2-digit'})}</span><input aria-label="Time history" type="range" min="0" max="100" value={time} onChange={e=>setTime(Number(e.target.value))}/><span>{new Date(cutoff).toLocaleString('es-MX',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</span></div>
        <div className="legend"><span className="o">● observada</span><span className="p">● persistente</span><span className="e">● emergente</span><span className="i">● inferida</span></div>
      </footer>
    </section>
  </main>;
}
