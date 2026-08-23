'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { SessionControls } from './SessionControls';
import './ObservatoryConsole.css';
import './ObservatoryWorldLayer.css';

type Lens='field'|'tensions'|'time'|'evidence'|'lab'|'root';
type Proposal={id:string;title?:string;status?:string;risk_level?:string;created_at?:string};
type WorldNode={
  id:string; kind:string; sourceFamily:string; publisher:string; title:string; summary?:string|null; observedAt:string;
  lat:number|null; lng:number|null; affectedSystems:string[]; actors:string[]; confidence:number; reading?:Record<string,unknown>|null;
};
type Hypothesis={id:string;phenomenon_key?:string;statement?:string;status?:string;cutoff_at?:string;validation_ends_at?:string;current_confidence?:number;initial_confidence?:number;evidence_ids?:string[];predicted_trajectory?:unknown;expected_signals?:unknown;contradiction_signals?:unknown};
type TimelineFrame={observedAt:string;wsi:number|null;nti:number|null;confidence:number|null;sourceState:string;ingestMode:string;vectors:Array<{id:string;label:string;value:number|null;sourceCount:number;trust:number|null}>};

type SatelliteHub='daily'|'world10d'|'hypotheses'|'learning';

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const arr=(v:unknown)=>Array.isArray(v)?v:[];
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const text=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():'';

function project(lat:number,lng:number){
  return {x:clamp(800+(lng*3.05),300,1300),y:clamp(470-(lat*2.35),250,730)};
}
function compact(value:unknown){
  if(value==null)return '';
  if(typeof value==='string')return value;
  if(typeof value==='number'||typeof value==='boolean')return String(value);
  if(Array.isArray(value))return value.slice(0,3).map(compact).filter(Boolean).join(' · ');
  if(typeof value==='object'){
    const entries=Object.entries(value as Record<string,unknown>).filter(([,v])=>v!=null).slice(0,3);
    return entries.map(([k,v])=>`${k}: ${compact(v)}`).join(' · ');
  }
  return '';
}
function distance(a:WorldNode,b:WorldNode){
  if(a.lat==null||a.lng==null||b.lat==null||b.lng==null)return Infinity;
  return Math.hypot(a.lat-b.lat,a.lng-b.lng);
}
function relatedScore(a:WorldNode,b:WorldNode){
  if(a.id===b.id)return -1;
  let score=0;
  if(a.sourceFamily===b.sourceFamily)score+=4;
  score+=a.affectedSystems.filter(v=>b.affectedSystems.includes(v)).length*3;
  score+=a.actors.filter(v=>b.actors.includes(v)).length*2;
  const d=distance(a,b); if(Number.isFinite(d))score+=Math.max(0,4-d/25);
  return score;
}
function nodeNarrative(node:WorldNode,neighbors:WorldNode[]){
  const r=node.reading||{};
  const friction=num(r.systemic_friction);
  const density=num(r.interaction_density);
  const coherence=num(r.systemic_coherence);
  const tension=compact(r.tension);
  const trajectory=compact(r.trajectory);
  const systems=node.affectedSystems.slice(0,3).join(', ');
  const parts=[`Se observa ${node.title}.`];
  if(systems)parts.push(`Afecta ${systems}.`);
  if(friction!=null)parts.push(`La fricción sistémica registrada es ${friction.toFixed(3)}${density!=null?`, con densidad de interacción ${density.toFixed(3)}`:''}${coherence!=null?` y coherencia ${coherence.toFixed(3)}`:''}.`);
  if(tension)parts.push(`La tensión registrada se concentra en ${tension}.`);
  if(trajectory)parts.push(`La trayectoria descrita es ${trajectory}.`);
  if(neighbors.length)parts.push(`Comparte campo inmediato con ${neighbors.length} nodos: ${neighbors.slice(0,3).map(n=>n.title).join('; ')}.`);
  return parts.join(' ');
}

export function ObservatoryConsole(){
  const auth=useAuthState();
  const[live,setLive]=useState<any>(null);
  const[obs,setObs]=useState<any>(null);
  const[world,setWorld]=useState<any>(null);
  const[timeline,setTimeline]=useState<TimelineFrame[]>([]);
  const[proposals,setProposals]=useState<Proposal[]>([]);
  const[lens,setLens]=useState<Lens>('field');
  const[selectedId,setSelectedId]=useState<string|null>(null);
  const[satelliteOpen,setSatelliteOpen]=useState(false);
  const[satelliteHub,setSatelliteHub]=useState<SatelliteHub>('daily');
  const[zoom,setZoom]=useState(1);
  const[tilt,setTilt]=useState(0);
  const[time,setTime]=useState(100);
  const[clock,setClock]=useState('');

  useEffect(()=>{const tick=()=>setClock(new Date().toISOString());tick();const t=setInterval(tick,1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{let stop=false;const pull=async()=>{try{const [rootR,obsR,timeR]=await Promise.all([fetch('/api/root/state',{cache:'no-store'}),fetch('/api/observatory/state',{cache:'no-store'}),fetch('/api/observatory/timeline',{cache:'no-store'})]);const [rootJ,obsJ,timeJ]=await Promise.all([rootR.json(),obsR.json(),timeR.json()]);if(!stop){setLive(rootJ);setObs(obsJ);setTimeline(Array.isArray(timeJ?.frames)?timeJ.frames:[])}}catch{if(!stop)setLive({ok:false,data:{}})}};void pull();const t=setInterval(pull,20000);return()=>{stop=true;clearInterval(t)}},[]);
  useEffect(()=>{if(auth.status!=='authenticated')return;let stop=false;const pull=async()=>{try{const [worldR,pR]=await Promise.all([fetch('/api/field/map/world',{cache:'no-store'}),fetch('/api/acp/proposals',{cache:'no-store'})]);const [worldJ,pJ]=await Promise.all([worldR.json(),pR.json()]);if(!stop){if(worldJ?.ok)setWorld(worldJ);if(pJ?.ok)setProposals(pJ.data?.proposals||[])}}catch{}};void pull();const t=setInterval(pull,20000);return()=>{stop=true;clearInterval(t)}},[auth.status]);

  const nodes=useMemo<WorldNode[]>(()=>arr(world?.nodes).map((o:any)=>({id:String(o.id),kind:String(o.kind||'observed'),sourceFamily:String(o.sourceFamily||'unknown'),publisher:String(o.publisher||'unknown'),title:String(o.title||'Untitled observation'),summary:typeof o.summary==='string'?o.summary:null,observedAt:String(o.observedAt||''),lat:num(o.lat),lng:num(o.lng),affectedSystems:arr(o.affectedSystems).filter((v):v is string=>typeof v==='string'),actors:arr(o.actors).filter((v):v is string=>typeof v==='string'),confidence:Number(o.confidence||0),reading:o.reading&&typeof o.reading==='object'?o.reading:null})).filter(n=>n.lat!=null&&n.lng!=null),[world]);
  const hypotheses=useMemo<Hypothesis[]>(()=>arr(world?.hypotheses) as Hypothesis[],[world]);
  const outcomes=useMemo(()=>arr(world?.outcomes) as any[],[world]);
  const learning=useMemo(()=>arr(world?.learning) as any[],[world]);
  const selected=useMemo(()=>nodes.find(n=>n.id===selectedId)||null,[nodes,selectedId]);
  const neighbors=useMemo(()=>selected?nodes.map(n=>({n,score:relatedScore(selected,n)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8).map(x=>x.n):[],[selected,nodes]);
  const neighborIds=useMemo(()=>new Set(neighbors.map(n=>n.id)),[neighbors]);
  const frames=timeline;
  const frameIndex=frames.length?Math.round((frames.length-1)*(time/100)):0;
  const frame=frames[frameIndex]||null;
  const selectedHypotheses=useMemo(()=>selected?hypotheses.filter(h=>arr(h.evidence_ids).includes(selected.id)||text(h.phenomenon_key).includes(selected.id)):[],[selected,hypotheses]);
  const selectedOutcomes=useMemo(()=>selectedHypotheses.flatMap(h=>outcomes.filter((o:any)=>String(o.hypothesis_id)===h.id)),[selectedHypotheses,outcomes]);
  const tables=arr(live?.data?.tables) as any[];
  const degradedTables=tables.filter(t=>t?.ok===false);
  const pending=proposals.filter(p=>['proposed','waiting_evidence','needs_evidence'].includes(p.status||'')).length;
  const vectors=arr(obs?.data?.worldspect?.fieldStateSignal?.vectors??obs?.data?.worldspect?.vectors??frame?.vectors) as any[];
  const wsi=num(obs?.data?.worldspect?.wsi??frame?.wsi);
  const nti=num(obs?.data?.worldspect?.nti??frame?.nti);
  const narrative=selected?nodeNarrative(selected,neighbors):nodes.length?`Se observan ${nodes.length} eventos georreferenciados en el horizonte activo. ${hypotheses.length} hipótesis conectan observaciones con trayectorias esperadas; ${outcomes.length} ya tienen contraste registrado. Selecciona un nodo para leer su fricción y su vecindad.`:`El campo mundial está activo. La vista histórica contiene ${frames.length} cortes WorldSpect; selecciona el satélite para abrir la lectura diaria, las 10 dimensiones y las hipótesis.`;

  const hubs:[SatelliteHub,string,string][]=[
    ['daily','LECTURA DIARIA',`WSV ${wsi==null?'n/d':wsi.toFixed(3)} · NTI ${nti==null?'n/d':nti.toFixed(3)}`],
    ['world10d','MUNDO · 10D',`${frame?.vectors?.filter(v=>v.value!=null).length??vectors.length}/10 dimensiones con lectura`],
    ['hypotheses','HIPÓTESIS',`${hypotheses.filter(h=>['OPEN','AWAITING_OUTCOME'].includes(String(h.status))).length} abiertas`],
    ['learning','APRENDIZAJE',`${learning.length} eventos · ${outcomes.length} contrastes`],
  ];

  return <main className="obsShell"><section className={`obsScene lens-${lens}`}>
    <div className="starfield"/><div className="deepSpace"/>
    <button className={`satelliteActor satellite-${lens}`} onClick={()=>setSatelliteOpen(v=>!v)} aria-label="Abrir observatorio del satélite"><img src="/sfi-scenes/satellite.png" alt="Satélite del observatorio SFI"/><span className="scanBeam"/></button>

    <div className="earthStage" style={{'--earthZoom':zoom,'--earthTilt':`${tilt}deg`} as React.CSSProperties}>
      <img className="worldActor" src="/sfi-scenes/world.png" alt="Tierra observada por System Friction Institute"/>
      <svg className="earthOverlay" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
        <defs><filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        {selected&&neighbors.map(n=>{const a=project(selected.lat!,selected.lng!),b=project(n.lat!,n.lng!);return <line key={`edge-${n.id}`} className="neighborEdge" x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>})}
        {nodes.map(n=>{const p=project(n.lat!,n.lng!);const active=n.id===selectedId;const near=neighborIds.has(n.id);return <g key={n.id} className={`geoNode observed ${active?'nodeSelected':''} ${near?'nodeNeighbor':''}`} onClick={()=>setSelectedId(n.id)} role="button" tabIndex={0}><circle cx={p.x} cy={p.y} r={active?18:near?13:10} className="geoHalo"/><circle cx={p.x} cy={p.y} r={active?6:4} className="geoCore"/><text x={p.x+14} y={p.y-10}>{n.title.slice(0,28)}</text></g>})}
      </svg>
    </div>

    <header className="obsTop"><div className="obsBrand"><strong>SFI</strong><span>FIELD · SYSTEM FRICTION INSTITUTE</span><small>LIVE WORLD OBSERVATORY</small></div><nav>{(['field','tensions','time','evidence','lab','root'] as Lens[]).map(k=><button key={k} className={lens===k?'active':''} onClick={()=>setLens(k)}>{k==='time'?'TIME HISTORY':k.toUpperCase()}</button>)}<Link href="/history">ORIGIN → NOW</Link></nav><div className="obsIdentity"><b>{auth.identity?.alias||'SESSION'}</b><span>{auth.identity?.role||auth.status}</span></div><SessionControls className="obsSessionControls"/></header>

    <aside className="hud hudLeft"><section><small>SFI-OBS-01</small><h3>LECTURA MUNDIAL</h3><p className="good">● {clock.slice(11,19)} UTC</p><dl><dt>NODOS</dt><dd>{nodes.length}</dd><dt>HIPÓTESIS</dt><dd>{hypotheses.length}</dd><dt>CONTRASTES</dt><dd>{outcomes.length}</dd><dt>CICLOS ROOT</dt><dd>{pending}</dd></dl><button onClick={()=>setSatelliteOpen(true)}>ABRIR SATÉLITE</button></section><section><small>WORLDSPECT</small><dl><dt>WSV</dt><dd>{wsi==null?'n/d':wsi.toFixed(3)}</dd><dt>NTI</dt><dd>{nti==null?'n/d':nti.toFixed(3)}</dd><dt>HISTORIA</dt><dd>{frames.length} cortes</dd></dl></section></aside>

    <aside className="hud hudRight"><section className="meaning"><small>LECTURA DEL CAMPO</small><p>{narrative}</p></section>{selected&&<section><small>NODO ACTIVO</small><h3>{selected.title}</h3><p>{selected.summary||`${selected.publisher} · ${selected.sourceFamily}`}</p><dl><dt>FRICCIÓN</dt><dd>{num(selected.reading?.systemic_friction)?.toFixed(3)??'n/d'}</dd><dt>VECINOS</dt><dd>{neighbors.length}</dd><dt>HIPÓTESIS</dt><dd>{selectedHypotheses.length}</dd></dl></section>}{lens==='evidence'&&<section><small>PERSISTENCIA</small><p>{tables.filter(t=>t?.ok).length} tablas críticas responden; {degradedTables.length} presentan advertencias.</p></section>}</aside>

    {satelliteOpen&&<div className="satelliteHubPanel"><button className="close" onClick={()=>setSatelliteOpen(false)}>×</button><small>SFI-OBS-01 · HUBS VIVOS</small><div className="hubRail">{hubs.map(([id,label,meta])=><button key={id} className={satelliteHub===id?'active':''} onClick={()=>setSatelliteHub(id)}><b>{label}</b><span>{meta}</span></button>)}</div><div className="hubBody">{satelliteHub==='daily'&&<><h2>LECTURA DIARIA</h2><p>{`WSV ${wsi==null?'n/d':wsi.toFixed(3)} y NTI ${nti==null?'n/d':nti.toFixed(3)}. El campo contiene ${nodes.length} observaciones georreferenciadas, ${hypotheses.length} hipótesis y ${outcomes.length} contrastes.`}</p></>}{satelliteHub==='world10d'&&<><h2>10 DIMENSIONES</h2><div className="dimensionGrid">{(frame?.vectors||vectors).slice(0,10).map((v:any)=><div key={String(v.id||v.label)}><span>{String(v.label||v.id)}</span><b>{num(v.value)==null?'MISSING':num(v.value)!.toFixed(3)}</b></div>)}</div></>}{satelliteHub==='hypotheses'&&<><h2>HIPÓTESIS ABIERTAS</h2><div className="hubList">{hypotheses.slice(-8).reverse().map(h=><button key={h.id} onClick={()=>{setLens('time');setSatelliteOpen(false)}}><b>{h.statement||h.phenomenon_key||h.id}</b><span>{h.status||'OPEN'} · conf. {num(h.current_confidence)?.toFixed(2)??'n/d'}</span></button>)}</div></>}{satelliteHub==='learning'&&<><h2>APRENDIZAJE / RETORNO</h2><div className="hubList">{learning.slice(-8).reverse().map((l:any)=><div key={String(l.id)}><b>{String(l.hypothesis_id||'learning')}</b><span>{`confianza ${num(l.confidence_before)?.toFixed(2)??'n/d'} → ${num(l.confidence_after)?.toFixed(2)??'n/d'}`}</span></div>)}</div></>}</div></div>}

    {selected&&<div className="nodeTimelinePanel"><button className="close" onClick={()=>setSelectedId(null)}>×</button><small>TIME HISTORY · NODO</small><h2>{selected.title}</h2><div className="nodeTimelineRows"><div><time>{selected.observedAt?.slice(0,16).replace('T',' ')}</time><p>Observación registrada por {selected.publisher}. {selected.summary||''}</p></div>{selectedHypotheses.map(h=><div key={h.id}><time>{String(h.cutoff_at||'').slice(0,16).replace('T',' ')}</time><p>Hipótesis: {h.statement||h.phenomenon_key}. Estado {h.status}.</p></div>)}{selectedOutcomes.map((o:any)=><div key={String(o.id)}><time>{String(o.evaluated_at||'').slice(0,16).replace('T',' ')}</time><p>Contraste: {String(o.classification||'')} — {String(o.observed_outcome||'')}</p></div>)}</div></div>}

    <footer className="obsBottom"><div className="viewControls"><button onClick={()=>setTilt(t=>t===0?-3:0)}>INCLINACIÓN</button><button onClick={()=>setZoom(z=>clamp(z+.08,1,1.32))}>+ ZOOM</button><button onClick={()=>setZoom(z=>clamp(z-.08,1,1.32))}>− ZOOM</button><button onClick={()=>{setZoom(1);setTilt(0)}}>RESET</button></div><div className="timeline"><span>{frames[0]?.observedAt?.slice(5,10)||'—'}</span><input aria-label="Time history" type="range" min="0" max="100" value={time} onChange={e=>setTime(Number(e.target.value))}/><span>{frame?.observedAt?.slice(0,16).replace('T',' ')||'AHORA'}</span></div><div className="legend"><span className="o">● observación</span><span className="p">◎ vecindad</span><span className="e">— relación</span></div></footer>
  </section></main>;
}
