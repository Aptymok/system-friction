'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { SCENES, SCENE_KEYS, type SceneKey } from './scenes';
import { ObservatoryConsole } from './ObservatoryConsole';
import { SessionControls } from './SessionControls';
import './SfiConsole.css';

type Proposal={id:string;title?:string;status?:string;risk_level?:string;proposalType?:string;created_at?:string};
type ProposalReadState={status:'idle'|'connecting'|'ready'|'degraded';error?:string};
function summarize(v:unknown){ if(Array.isArray(v))return `${v.length} elementos`; if(v&&typeof v==='object')return `${Object.keys(v as object).length} campos`; return String(v??'—'); }
function Instrument({scene}:{scene:SceneKey}){return <><div className="atmosphere"/><div className="vectorField"/><div className="sceneObject" aria-hidden="true"><div className="halo"/><div className="ring"/><div className="ring2"/><div className="ring3"/><div className="core"/></div><div className="dataNode dn1"/><div className="dataNode dn2"/><div className="dataNode dn3"/><div className="dataNode dn4"/><div className="grain"/></>}

function LegacySceneConsole({scene}:{scene:SceneKey}){
 const spec=SCENES[scene],auth=useAuthState(); const [clock,setClock]=useState(''); const [live,setLive]=useState<any>(null); const [proposals,setProposals]=useState<Proposal[]>([]); const [proposalRead,setProposalRead]=useState<ProposalReadState>({status:'idle'}); const [selected,setSelected]=useState<Proposal|null>(null); const [open,setOpen]=useState(false);
 useEffect(()=>{const t=setInterval(()=>setClock(new Date().toISOString()),1000);setClock(new Date().toISOString());return()=>clearInterval(t)},[]);
 useEffect(()=>{let stop=false;const pull=async()=>{try{const r=await fetch(spec.liveSource,{cache:'no-store'});const j=await r.json();if(!stop)setLive(j);}catch{if(!stop)setLive({ok:false,error:'live_source_unreachable'})}};void pull();const t=setInterval(pull,12000);return()=>{stop=true;clearInterval(t)}},[spec.liveSource]);
 useEffect(()=>{if(auth.status!=='authenticated'){setProposalRead({status:'idle'});return;}let stop=false;const pull=async()=>{if(!stop)setProposalRead(prev=>prev.status==='ready'?prev:{status:'connecting'});try{const r=await fetch('/api/acp/proposals',{cache:'no-store'});const j=await r.json();if(stop)return;if(r.ok&&j?.ok){setProposals(j.data?.proposals||[]);setProposalRead({status:'ready'});}else{setProposalRead({status:'degraded',error:String(j?.error||`proposal_read_http_${r.status}`)});}}catch(error){if(!stop)setProposalRead({status:'degraded',error:error instanceof Error?error.message:'proposal_read_failed'});}};void pull();const t=setInterval(pull,15000);return()=>{stop=true;clearInterval(t)}},[auth.status]);
 const liveCount=useMemo(()=>live?.data?.tables?.length??live?.data?.proposals?.length??Object.keys(live?.data||{}).length,[live]);
 const pendingCount=proposalRead.status==='ready'?proposals.filter(p=>['proposed','waiting_evidence'].includes(p.status||'')).length:null;
 const decide=async(kind:'approve'|'reject')=>{if(!selected)return;await fetch(`/api/acp/proposals/${selected.id}/${kind}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({note:'Decisión ROOT desde SFI Live Interface'})});setSelected(null);try{const r=await fetch('/api/acp/proposals',{cache:'no-store'});const j=await r.json();if(r.ok&&j?.ok){setProposals(j.data.proposals||[]);setProposalRead({status:'ready'});}else setProposalRead({status:'degraded',error:String(j?.error||`proposal_read_http_${r.status}`)});}catch(error){setProposalRead({status:'degraded',error:error instanceof Error?error.message:'proposal_read_failed'});}};
 return <main className="sfi"><div className={`scene cinematic scene-${scene}`} style={{backgroundImage:`linear-gradient(90deg,rgba(5,5,4,.66),rgba(5,5,4,.06) 55%,rgba(5,5,4,.72)),url(${spec.image})`}}><Instrument scene={scene}/><div className="scan"/><div className="orbital"/><div className="pulse p1"/><div className="pulse p2"/><div className="pulse p3"/>
   <header className="top"><Link href="/field" className="brand">SFI.</Link><button className="menu" onClick={()=>setOpen(v=>!v)}>INDEX</button><span className="liveDot">LIVE</span><span className="clock">{clock}</span><span className="identity">{auth.identity?.alias||auth.status}</span><SessionControls/></header>
   {open&&<nav className="index">{SCENE_KEYS.map(k=><Link key={k} href={`/${k}`} className={k===scene?'active':''}>{SCENES[k].label}<small>{SCENES[k].title}</small></Link>)}</nav>}
   <section className="caption"><span>{spec.label}</span><h1>{spec.title}</h1><p>{spec.subtitle}</p><div className="chips">{spec.markers.map(x=><b key={x}>{x}</b>)}</div></section>
   <aside className="telemetry"><div><small>FUENTE VIVA</small><strong>{spec.liveSource}</strong></div><div><small>ESTADO</small><strong>{live?.ok===false?'DEGRADED':live?'OBSERVADO':'CONECTANDO'}</strong></div><div><small>OBJETOS</small><strong>{liveCount}</strong></div><div><small>PROPOSICIONES</small><strong>{proposalRead.status==='degraded'?'DEGRADED':proposalRead.status==='ready'?proposals.length:'—'}</strong></div></aside>
   <section className="twin"><div className="twinHead"><span>COGNITIVE TWIN</span><b>{proposalRead.status==='degraded'?'cola no legible':pendingCount===null?'leyendo cola':`${pendingCount} por decidir`}</b></div><p>Propone cambios; la autoridad permanece en ROOT. Sin jerga operativa.</p><div className="proposalList">{proposalRead.status==='degraded'?<em>No se pudo leer la cola de propuestas{proposalRead.error?`: ${proposalRead.error}`:''}.</em>:proposalRead.status!=='ready'?<em>Leyendo cola gobernada…</em>:<>{proposals.slice(0,5).map(p=><button key={p.id} onClick={()=>setSelected(p)}><strong>{p.title||p.proposalType||'Propuesta'}</strong><span>{p.status||'propuesta'} · riesgo {p.risk_level||'no indicado'}</span></button>)}{!proposals.length&&<em>No hay propuestas persistidas pendientes o visibles.</em>}</>}</div></section>
   {selected&&<div className="modal"><div><small>PROPUESTA DEL SISTEMA</small><h2>{selected.title||selected.proposalType}</h2><p>El sistema propone este cambio. Puedes aceptarlo, rechazarlo o cerrarlo sin modificar nada.</p><dl><dt>Estado</dt><dd>{selected.status}</dd><dt>Riesgo</dt><dd>{selected.risk_level||'no indicado'}</dd><dt>Creada</dt><dd>{selected.created_at||'—'}</dd></dl><div className="actions"><button onClick={()=>void decide('approve')}>ACEPTAR</button><button onClick={()=>void decide('reject')}>RECHAZAR</button><button onClick={()=>setSelected(null)}>CERRAR</button></div></div></div>}
 </div></main>
}

export function SfiConsole({scene}:{scene:SceneKey}){
 if(scene==='field')return <ObservatoryConsole/>;
 return <LegacySceneConsole scene={scene}/>;
}
