'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { SessionControls } from './SessionControls';
import { translateUiText, useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import {
  classifyObservatoryRead,
  observableMetricValue,
  type ObservatoryReadAvailability,
} from '@/lib/observatory/public/readAvailability';
import './ObservatoryConsole.css';
import './ObservatoryWorldLayer.css';

type Lens='field'|'hypotheses'|'trajectory'|'sources';
type Row=Record<string,any>;
type WorldNode={
  id:string;kind:string;sourceId:string;sourceFamily:string;publisher:string;observationKind:string;title:string;summary?:string|null;
  observedAt:string;fetchedAt:string;lat:number|null;lng:number|null;countryCodes:string[];affectedSystems:string[];actors:string[];confidence:number|null;
  reading?:Row|null;provenance?:Row;
};
type Hypothesis=Row&{
  id:string;statement?:string;status?:string;cutoff_at?:string;validation_starts_at?:string;validation_ends_at?:string;current_confidence?:number;initial_confidence?:number;
  evidence_ids?:string[];expected_signals?:string[];contradiction_signals?:string[];aiInference?:Row;graphSnapshot?:Row;outcome?:Row|null;learning?:Row|null;
};
type TimelineFrame={observedAt:string;wsi:number|null;nti:number|null;confidence:number|null;sourceState:string;ingestMode:string;vectors:Array<{id:string;label:string;value:number|null;sourceCount:number;trust:number|null}>};
type Position={x:number;y:number;geo:boolean};
type ObservatoryAvailability={world:ObservatoryReadAvailability;state:ObservatoryReadAvailability;timeline:ObservatoryReadAvailability};

const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const row=(v:unknown):Row|null=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:null;
const rows=(v:unknown):Row[]=>arr(v).filter((x):x is Row=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x));
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const txt=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():'';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const uniq=(v:string[])=>[...new Set(v.filter(Boolean))];
function project(lat:number,lng:number){return{x:clamp(800+(lng*3.05),260,1340),y:clamp(470-(lat*2.35),220,745),geo:true}}
function idHash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h)}
function orbitalPosition(id:string,index:number,total:number):Position{const seed=idHash(id);const angle=((seed%360)+(index/Math.max(1,total))*120)*Math.PI/180;const radius=285+(seed%95);return{x:800+Math.cos(angle)*radius,y:470+Math.sin(angle)*radius*.62,geo:false}}
function nodePosition(node:WorldNode,index:number,total:number):Position{return node.lat!=null&&node.lng!=null?project(node.lat,node.lng):orbitalPosition(node.id,index,total)}
function short(value:unknown,max=160){const t=txt(value);return t.length>max?`${t.slice(0,max-1)}…`:t}
function dateMs(value:unknown){const n=Date.parse(txt(value));return Number.isFinite(n)?n:0}
function mean(values:Array<number|null>){const valid=values.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null}
function pct(value:number|null){return value==null?'—':`${Math.round(value*100)}%`}

const INITIAL_AVAILABILITY:ObservatoryAvailability={world:'LOADING',state:'LOADING',timeline:'LOADING'};
const panel:CSSProperties={position:'absolute',zIndex:25,background:'rgba(4,6,7,.88)',backdropFilter:'blur(18px)',border:'1px solid rgba(214,180,120,.22)',boxShadow:'0 22px 70px rgba(0,0,0,.45)',borderRadius:14,color:'#e7dfd2'};
const micro:CSSProperties={fontSize:10,letterSpacing:'.12em',textTransform:'uppercase',opacity:.58};
const chip:CSSProperties={fontSize:10,padding:'5px 8px',border:'1px solid rgba(214,180,120,.2)',borderRadius:999,background:'rgba(214,180,120,.055)',whiteSpace:'nowrap'};
const selectStyle:CSSProperties={background:'rgba(5,7,8,.88)',color:'#e7dfd2',border:'1px solid rgba(214,180,120,.18)',borderRadius:8,padding:'7px 9px',fontSize:11,maxWidth:190};

async function fetchJson(path:string){
  try{const response=await fetch(path,{cache:'no-store'});const data=await response.json().catch(()=>null);return{ok:response.ok,data,status:response.status}}catch(error){return{ok:false,data:null,status:0,error:error instanceof Error?error.message:String(error)}}
}

export function ObservatoryConsole(){
  const auth=useAuthState();
  const {language,text:ownedText}=useSfiLanguage();
  const ui=(value:string)=>translateUiText(value,language);
  const[world,setWorld]=useState<Row|null>(null),[obs,setObs]=useState<Row|null>(null),[timeline,setTimeline]=useState<TimelineFrame[]>([]);
  const[availability,setAvailability]=useState<ObservatoryAvailability>(INITIAL_AVAILABILITY);
  const[lens,setLens]=useState<Lens>('field'),[satelliteOpen,setSatelliteOpen]=useState(true),[selectedNodeId,setSelectedNodeId]=useState<string|null>(null),[selectedHypothesisId,setSelectedHypothesisId]=useState<string|null>(null);
  const[sourceFamily,setSourceFamily]=useState('ALL'),[systemFilter,setSystemFilter]=useState('ALL'),[statusFilter,setStatusFilter]=useState('ALL'),[windowHours,setWindowHours]=useState(168),[minConfidence,setMinConfidence]=useState(0),[query,setQuery]=useState('');
  const[time,setTime]=useState(100),[clock,setClock]=useState('');

  useEffect(()=>{const tick=()=>setClock(new Date().toISOString());tick();const t=setInterval(tick,1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{let stop=false;const pull=async()=>{
    const[worldR,obsR,timeR]=await Promise.all([fetchJson('/api/observatory/world'),fetchJson('/api/observatory/state'),fetchJson('/api/observatory/timeline')]);
    if(stop)return;
    const nextAvailability:ObservatoryAvailability={world:classifyObservatoryRead(worldR),state:classifyObservatoryRead(obsR),timeline:classifyObservatoryRead(timeR)};
    setAvailability(nextAvailability);
    setWorld(nextAvailability.world==='AVAILABLE'?row(worldR.data):null);
    setObs(nextAvailability.state==='AVAILABLE'?row(obsR.data):null);
    setTimeline(nextAvailability.timeline==='AVAILABLE'&&Array.isArray(timeR.data?.frames)?timeR.data.frames:[]);
  };void pull();const t=setInterval(pull,20000);return()=>{stop=true;clearInterval(t)}},[]);

  const allNodes=useMemo<WorldNode[]>(()=>rows(world?.nodes).map((o)=>({
    id:String(o.id),kind:String(o.kind||'observed'),sourceId:String(o.sourceId||'unknown'),sourceFamily:String(o.sourceFamily||'unknown'),publisher:String(o.publisher||'unknown'),observationKind:String(o.observationKind||'unknown'),title:String(o.title||'Untitled observation'),summary:typeof o.summary==='string'?o.summary:null,observedAt:String(o.observedAt||''),fetchedAt:String(o.fetchedAt||o.observedAt||''),lat:num(o.lat),lng:num(o.lng),countryCodes:arr(o.countryCodes).filter((v):v is string=>typeof v==='string'),affectedSystems:arr(o.affectedSystems).filter((v):v is string=>typeof v==='string'),actors:arr(o.actors).filter((v):v is string=>typeof v==='string'),confidence:num(o.confidence),reading:o.reading&&typeof o.reading==='object'?o.reading:null,provenance:o.provenance&&typeof o.provenance==='object'?o.provenance:null,
  })),[world]);
  const hypotheses=useMemo<Hypothesis[]>(()=>rows(world?.hypotheses) as Hypothesis[],[world]);
  const cutoff=Date.now()-windowHours*3600000;
  const q=query.trim().toLowerCase();
  const nodes=useMemo(()=>allNodes.filter(node=>{
    if((dateMs(node.fetchedAt)||dateMs(node.observedAt))<cutoff)return false;
    if(sourceFamily!=='ALL'&&node.sourceFamily!==sourceFamily)return false;
    if(systemFilter!=='ALL'&&!node.affectedSystems.includes(systemFilter))return false;
    if((node.confidence??0)<minConfidence)return false;
    if(q&&!`${node.title} ${node.summary??''} ${node.publisher} ${node.sourceFamily} ${node.affectedSystems.join(' ')} ${node.actors.join(' ')}`.toLowerCase().includes(q))return false;
    return true;
  }),[allNodes,cutoff,sourceFamily,systemFilter,minConfidence,q]);
  const visibleIds=useMemo(()=>new Set(nodes.map(n=>n.id)),[nodes]);
  const filteredHypotheses=useMemo(()=>hypotheses.filter(h=>{
    if(statusFilter!=='ALL'&&String(h.status)!==statusFilter)return false;
    if((Number(h.current_confidence??h.initial_confidence??0))<minConfidence)return false;
    const evidence=arr(h.evidence_ids).map(String);
    const systems=arr(h.aiInference?.affectedSystems).map(String);
    if(systemFilter!=='ALL'&&!systems.includes(systemFilter))return false;
    if(sourceFamily!=='ALL'&&evidence.length&&!evidence.some(id=>visibleIds.has(id)))return false;
    if(q&&!`${h.statement??''} ${h.aiInference?.mechanism??''} ${h.aiInference?.relationClass??''} ${systems.join(' ')}`.toLowerCase().includes(q))return false;
    return true;
  }),[hypotheses,statusFilter,minConfidence,systemFilter,sourceFamily,visibleIds,q]);

  useEffect(()=>{if(selectedHypothesisId&&!filteredHypotheses.some(h=>String(h.id)===selectedHypothesisId))setSelectedHypothesisId(null)},[filteredHypotheses,selectedHypothesisId]);
  const selectedHypothesis=filteredHypotheses.find(h=>String(h.id)===selectedHypothesisId)??filteredHypotheses[0]??null;
  const selectedNode=nodes.find(n=>n.id===selectedNodeId)??null;
  const selectedEvidenceIds=useMemo(()=>new Set(arr(selectedHypothesis?.evidence_ids).map(String)),[selectedHypothesis]);
  const selectedAffectedIds=useMemo(()=>new Set(arr(selectedHypothesis?.aiInference?.affectedObservationIds).map(String)),[selectedHypothesis]);
  const positions=useMemo(()=>new Map(nodes.map((n,i)=>[n.id,nodePosition(n,i,nodes.length)])),[nodes]);
  const selectedGraphEdges=useMemo(()=>rows(world?.graph?.edges).filter(edge=>{
    if(!selectedHypothesis)return false;
    const hid=`hypothesis:${selectedHypothesis.id}`;
    return edge.from===hid||edge.to===hid||selectedEvidenceIds.has(String(edge.from))&&selectedAffectedIds.has(String(edge.to))||selectedEvidenceIds.has(String(edge.to))&&selectedAffectedIds.has(String(edge.from));
  }),[world,selectedHypothesis,selectedEvidenceIds,selectedAffectedIds]);

  const frameIndex=timeline.length?Math.round((timeline.length-1)*(time/100)):0;
  const frame=timeline[frameIndex]||null;
  const avgFs=mean(nodes.map(n=>num(n.reading?.systemic_friction)));
  const avgNti=mean(nodes.map(n=>num(n.reading?.interaction_density)));
  const avgPhi=mean(nodes.map(n=>num(n.reading?.systemic_coherence)));
  const sourceIds=uniq(nodes.map(n=>n.sourceId));
  const sourceFamilies=arr(world?.filters?.sourceFamilies).map(String);
  const systems=arr(world?.filters?.systems).map(String);
  const statuses=arr(world?.filters?.hypothesisStatuses).map(String);
  const openHypotheses=filteredHypotheses.filter(h=>['OPEN','AWAITING_OUTCOME'].includes(String(h.status))).length;
  const outcomeCount=filteredHypotheses.filter(h=>Boolean(h.outcome)).length;
  const learningCount=filteredHypotheses.filter(h=>Boolean(h.learning)).length;
  const aiProvider=txt(selectedHypothesis?.aiInference?.provider)||'—';
  const aiModel=txt(selectedHypothesis?.aiInference?.model)||'—';
  const relationClass=txt(selectedHypothesis?.aiInference?.relationClass)||'UNKNOWN';
  const worldMetric=(value:number|string)=>observableMetricValue(availability.world,value);
  const timelineMetric=(value:number|string)=>observableMetricValue(availability.timeline,value);

  const narrative=availability.world!=='AVAILABLE'
    ? ownedText(`Lectura autoritativa del campo: ${availability.world}. Los conteos permanecen no numéricos hasta una lectura exitosa.`,`Authoritative field read: ${availability.world}. Counts remain non-numeric until a successful read.`)
    : selectedHypothesis
      ? ownedText(`La hipótesis seleccionada es una inferencia, no un hecho: ${selectedHypothesis.statement??'sin enunciado'}. Su traza usa ${selectedEvidenceIds.size} registros fuente, afecta ${arr(selectedHypothesis.aiInference?.affectedSystems).length} sistemas y conserva señales de contradicción explícitas.`,`The selected hypothesis is an inference, not a fact: ${selectedHypothesis.statement??'no statement'}. Its trace uses ${selectedEvidenceIds.size} source records, affects ${arr(selectedHypothesis.aiInference?.affectedSystems).length} systems, and preserves explicit contradiction signals.`)
      : ownedText(`El campo contiene ${nodes.length} observaciones visibles y ${filteredHypotheses.length} hipótesis trazables bajo los filtros actuales.`,`The field contains ${nodes.length} visible observations and ${filteredHypotheses.length} traceable hypotheses under the current filters.`);

  return <main className="obsShell" data-world-availability={availability.world} data-state-availability={availability.state} data-timeline-availability={availability.timeline}><section className={`obsScene lens-${lens}`}><div className="starfield"/><div className="deepSpace"/>
    <button className={`satelliteActor satellite-${lens}`} onClick={()=>{setSatelliteOpen(v=>!v);if(!selectedHypothesisId&&filteredHypotheses[0])setSelectedHypothesisId(String(filteredHypotheses[0].id))}} aria-label={ui('Abrir instrumento satelital SFI')}>
      <img src="/sfi-scenes/satellite.png" alt={ui('Satélite del observatorio SFI')}/><span className="scanBeam"/>
    </button>

    <div className="earthStage"><img className="worldActor" src="/sfi-scenes/world.png" alt={ui('Tierra observada por System Friction Institute')}/><svg className="earthOverlay" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
      <defs><filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {selectedHypothesis&&[...selectedEvidenceIds].flatMap((fromId)=>{
        const from=positions.get(fromId);if(!from)return[];
        const targets=[...selectedAffectedIds].filter(id=>id!==fromId&&positions.has(id));
        if(!targets.length)return[<line key={`${fromId}-hyp`} className="neighborEdge" x1={from.x} y1={from.y} x2={800} y2={470} strokeDasharray="8 10"><animate attributeName="stroke-dashoffset" from="36" to="0" dur="2.4s" repeatCount="indefinite"/></line>];
        return targets.map(toId=>{const to=positions.get(toId)!;return <line key={`${fromId}-${toId}`} className="neighborEdge" x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeDasharray="8 10"><animate attributeName="stroke-dashoffset" from="36" to="0" dur="2.4s" repeatCount="indefinite"/></line>})
      })}
      {nodes.map((n,i)=>{const p=positions.get(n.id)!;const selected=n.id===selectedNodeId;const evidence=selectedEvidenceIds.has(n.id);const affected=selectedAffectedIds.has(n.id);return <g key={n.id} className={`geoNode observed ${selected?'nodeSelected':''} ${evidence||affected?'nodeNeighbor':''}`} onClick={()=>setSelectedNodeId(n.id)} role="button" tabIndex={0}>
        <circle cx={p.x} cy={p.y} r={selected?18:evidence?14:affected?12:8} className="geoHalo"/><circle cx={p.x} cy={p.y} r={selected?6:evidence?5:3.5} className="geoCore"/>{(selected||evidence)&&<text x={p.x+14} y={p.y-10}>{n.title.slice(0,28)}</text>}
      </g>})}
    </svg></div>

    <header className="obsTop"><div className="obsBrand"><strong>SFI</strong><span>{ui('FIELD · SYSTEM FRICTION INSTITUTE')}</span><small>{ui('OBSERVATORIO MUNDIAL EN VIVO')}</small></div>
      <nav>{(['field','hypotheses','trajectory','sources'] as Lens[]).map(k=><button key={k} className={lens===k?'active':''} onClick={()=>{setLens(k);setSatelliteOpen(true)}}>{k==='hypotheses'?ownedText('HIPÓTESIS','HYPOTHESES'):k==='trajectory'?ownedText('TRAYECTORIA','TRAJECTORY'):k==='sources'?ownedText('FUENTES','SOURCES'):ownedText('CAMPO','FIELD')}</button>)}<Link href="/history">{ui('ORIGEN → AHORA')}</Link>{auth.status==='authenticated'&&<Link href="/cases">{ui('CASOS')}</Link>}</nav>
      <div className="obsIdentity"><b>{auth.identity?.alias||'PUBLIC'}</b><span>{auth.identity?.role||auth.status}</span></div><SessionControls className="obsSessionControls"/></header>

    <aside className="hud hudLeft"><section><small>SFI-OBS-LIVE</small><h3>{ownedText('CAMPO VIVO','LIVE FIELD')}</h3><p className="good">● {clock.slice(11,19)} UTC</p><dl><dt>{ui('OBSERVACIONES')}</dt><dd data-availability={availability.world}>{worldMetric(nodes.length)}</dd><dt>{ui('FUENTES ACTIVAS')}</dt><dd data-availability={availability.world}>{worldMetric(sourceIds.length)}</dd><dt>{ui('HIPÓTESIS')}</dt><dd data-availability={availability.world}>{worldMetric(filteredHypotheses.length)}</dd><dt>{ui('EN RETORNO')}</dt><dd data-availability={availability.world}>{worldMetric(openHypotheses)}</dd></dl><button onClick={()=>setSatelliteOpen(true)}>{ui('ABRIR SATÉLITE')}</button></section>
      <section><small>{ownedText('MÉTRICAS DERIVADAS','DERIVED METRICS')}</small><dl><dt>Fₛ</dt><dd data-availability={availability.world}>{avgFs==null?'—':avgFs.toFixed(3)}</dd><dt>NTI</dt><dd data-availability={availability.world}>{avgNti==null?'—':avgNti.toFixed(3)}</dd><dt>Φ</dt><dd data-availability={availability.world}>{avgPhi==null?'—':avgPhi.toFixed(3)}</dd></dl><p style={{fontSize:11,opacity:.62,lineHeight:1.5}}>{ownedText('Los números describen estructura observada/derivada. El significado, mecanismo y consecuencias se muestran sólo como hipótesis trazables.','Numbers describe observed/derived structure. Meaning, mechanism and consequences are shown only as traceable hypotheses.')}</p></section>
    </aside>

    <div style={{...panel,left:'50%',transform:'translateX(-50%)',bottom:22,width:'min(94vw,980px)',padding:'10px 12px',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
      <span style={micro}>{ownedText('FILTROS','FILTERS')}</span>
      <select style={selectStyle} value={windowHours} onChange={e=>setWindowHours(Number(e.target.value))}><option value={6}>6h</option><option value={24}>24h</option><option value={72}>72h</option><option value={168}>7d</option><option value={720}>30d</option></select>
      <select style={selectStyle} value={sourceFamily} onChange={e=>setSourceFamily(e.target.value)}><option value="ALL">{ownedText('Todas las familias','All source families')}</option>{sourceFamilies.map(v=><option key={v} value={v}>{v}</option>)}</select>
      <select style={selectStyle} value={systemFilter} onChange={e=>setSystemFilter(e.target.value)}><option value="ALL">{ownedText('Todos los sistemas','All systems')}</option>{systems.map(v=><option key={v} value={v}>{v}</option>)}</select>
      <select style={selectStyle} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ALL">{ownedText('Todos los estados','All hypothesis states')}</option>{statuses.map(v=><option key={v} value={v}>{v}</option>)}</select>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={ownedText('buscar señal / nodo / hipótesis','search signal / node / hypothesis')} style={{...selectStyle,minWidth:210}}/>
      <label style={{display:'flex',gap:6,alignItems:'center',fontSize:10,opacity:.72}}>{ownedText('conf. mínima','min confidence')}<input type="range" min="0" max="0.9" step="0.1" value={minConfidence} onChange={e=>setMinConfidence(Number(e.target.value))}/><b>{pct(minConfidence)}</b></label>
    </div>

    {selectedNode&&<aside style={{...panel,left:20,bottom:170,width:'min(360px,38vw)',padding:14}}><div style={micro}>{selectedNode.sourceFamily} · {selectedNode.publisher}</div><h3 style={{margin:'7px 0 6px'}}>{selectedNode.title}</h3><p style={{fontSize:12,lineHeight:1.55,opacity:.78}}>{selectedNode.summary||ownedText('Sin resumen publicado.','No published summary.')}</p><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{selectedNode.affectedSystems.map(v=><span key={v} style={chip}>{v}</span>)}</div><hr style={{border:0,borderTop:'1px solid rgba(214,180,120,.14)',margin:'12px 0'}}/><div style={{fontSize:11,lineHeight:1.6,opacity:.72}}><b>{ownedText('Procedencia','Provenance')}:</b> {selectedNode.provenance?.sourceRole||'SOURCE_RECORD'}<br/><b>{ownedText('Verificación','Verification')}:</b> {selectedNode.provenance?.verificationState||'NOT_RECORDED'}<br/><b>{ownedText('Confianza de fuente','Source confidence')}:</b> {pct(selectedNode.confidence)}<br/>{selectedNode.provenance?.sourceUrl&&<a href={selectedNode.provenance.sourceUrl} target="_blank" rel="noreferrer" style={{color:'inherit'}}>{ownedText('abrir fuente','open source')}</a>}</div></aside>}

    {satelliteOpen&&<aside style={{...panel,right:18,top:104,bottom:142,width:'min(470px,42vw)',padding:16,overflowY:'auto',scrollbarWidth:'none'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><div style={micro}>SFI SATELLITE · {lens.toUpperCase()}</div><h2 style={{fontSize:18,margin:'5px 0 0'}}>{lens==='field'?ownedText('LECTURA DEL CAMPO','FIELD READING'):lens==='hypotheses'?ownedText('GRAFO DE HIPÓTESIS','HYPOTHESIS GRAPH'):lens==='trajectory'?ownedText('TRAYECTORIA Y RETORNO','TRAJECTORY & RETURN'):ownedText('FUENTES VIVAS','LIVE SOURCES')}</h2></div><button onClick={()=>setSatelliteOpen(false)} style={{...selectStyle,padding:'6px 9px'}}>×</button></div>
      <p style={{fontSize:12,lineHeight:1.6,opacity:.74}} data-availability={availability.world}>{narrative}</p>

      {lens==='field'&&<><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,margin:'12px 0'}}>{[[ownedText('Fuentes','Sources'),worldMetric(sourceIds.length)],[ownedText('Hipótesis abiertas','Open hypotheses'),worldMetric(openHypotheses)],[ownedText('Contrastadas','Contrasted'),worldMetric(outcomeCount)],[ownedText('Aprendizajes','Learning'),worldMetric(learningCount)],['WSI',num(obs?.data?.worldspect?.wsi??frame?.wsi)?.toFixed(3)??'—'],['NTI src',num(obs?.data?.worldspect?.nti??frame?.nti)?.toFixed(3)??'—']].map(([a,b],index)=><div key={String(a)} data-availability={index<4?availability.world:undefined} style={{padding:10,border:'1px solid rgba(214,180,120,.12)',borderRadius:9}}><div style={micro}>{a}</div><b style={{fontSize:18}}>{b}</b></div>)}</div>
        <div style={micro}>{ownedText('HIPÓTESIS ACTIVAS','ACTIVE HYPOTHESES')}</div>{filteredHypotheses.slice(0,8).map(h=><button key={String(h.id)} onClick={()=>{setSelectedHypothesisId(String(h.id));setLens('hypotheses')}} style={{display:'block',width:'100%',textAlign:'left',marginTop:7,padding:10,borderRadius:9,border:String(h.id)===String(selectedHypothesis?.id)?'1px solid rgba(214,180,120,.5)':'1px solid rgba(214,180,120,.12)',background:'rgba(255,255,255,.018)',color:'inherit'}}><b>{short(h.statement,120)||'Hypothesis'}</b><div style={{...micro,marginTop:5}}>{h.aiInference?.relationClass||'UNKNOWN'} · {pct(num(h.current_confidence))} · {h.status}</div></button>)}</>}

      {lens==='hypotheses'&&<>{selectedHypothesis?<div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',margin:'11px 0'}}><span style={chip}>{relationClass}</span><span style={chip}>{pct(num(selectedHypothesis.current_confidence))}</span><span style={chip}>{selectedHypothesis.status}</span><span style={chip}>{aiProvider} / {aiModel}</span></div>
        <h3 style={{fontSize:16,lineHeight:1.4}}>{selectedHypothesis.statement}</h3>
        <div style={{...micro,marginTop:14}}>{ownedText('MECANISMO PROPUESTO · INFERENCIA','PROPOSED MECHANISM · INFERENCE')}</div><p style={{fontSize:12,lineHeight:1.65}}>{selectedHypothesis.aiInference?.mechanism||ownedText('No determinado.','Undetermined.')}</p>
        <div style={{...micro,marginTop:14}}>{ownedText('TRAZA DE CONSECUENCIAS','CONSEQUENCE TRACE')}</div>{arr(selectedHypothesis.aiInference?.consequenceChain).length?rows(selectedHypothesis.aiInference?.consequenceChain).map((edge,i)=><div key={i} style={{marginTop:7,padding:9,borderLeft:'2px solid rgba(214,180,120,.34)',background:'rgba(255,255,255,.018)'}}><b>{edge.from} → {edge.to}</b><div style={{fontSize:11,opacity:.74}}>{edge.relation}</div><div style={{fontSize:10,opacity:.5}}>{ownedText('base','basis')}: {arr(edge.basisEvidenceIds).join(', ')||'—'}</div></div>):<p style={{fontSize:11,opacity:.6}}>{ownedText('No hay cadena de consecuencias propuesta.','No consequence chain proposed.')}</p>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:14}}><section><div style={micro}>{ownedText('SEÑALES ESPERADAS','EXPECTED SIGNALS')}</div>{arr(selectedHypothesis.expected_signals).map(String).map(v=><div key={v} style={{fontSize:11,padding:'4px 0'}}>+ {v}</div>)}</section><section><div style={micro}>{ownedText('CONTRADICCIONES','CONTRADICTIONS')}</div>{arr(selectedHypothesis.contradiction_signals).map(String).map(v=><div key={v} style={{fontSize:11,padding:'4px 0'}}>− {v}</div>)}</section></div>
        <div style={{...micro,marginTop:14}}>{ownedText('HIPÓTESIS RIVALES','RIVAL HYPOTHESES')}</div>{arr(selectedHypothesis.aiInference?.rivalHypotheses).map(String).map(v=><div key={v} style={{fontSize:11,padding:'4px 0'}}>{v}</div>)}
        <div style={{...micro,marginTop:14}}>{ownedText('EVIDENCIA DE ENTRADA','INPUT LINEAGE')}</div><div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:6}}>{[...selectedEvidenceIds].map(id=><button key={id} style={chip} onClick={()=>setSelectedNodeId(id)}>{id.slice(0,8)}</button>)}</div>
        {selectedHypothesis.outcome&&<div style={{marginTop:16,padding:11,border:'1px solid rgba(214,180,120,.18)',borderRadius:10}}><div style={micro}>RETURN / CONTRAST</div><b>{selectedHypothesis.outcome.classification}</b><p style={{fontSize:11,lineHeight:1.55}}>{selectedHypothesis.outcome.observed_outcome}</p></div>}
        {selectedHypothesis.learning&&<div style={{marginTop:10,padding:11,border:'1px solid rgba(214,180,120,.18)',borderRadius:10}}><div style={micro}>LEARNING</div><div style={{fontSize:11,lineHeight:1.55}}>{ownedText('Retenido','Retained')}: {arr(selectedHypothesis.learning.retained_assumptions).join(' · ')||'—'}<br/>{ownedText('Rechazado','Rejected')}: {arr(selectedHypothesis.learning.rejected_assumptions).join(' · ')||'—'}<br/>{ownedText('Variables faltantes','Missing variables')}: {arr(selectedHypothesis.learning.missing_variables).join(' · ')||'—'}</div></div>}
      </div>:<p>{ownedText('No existe una hipótesis bajo los filtros actuales.','No hypothesis exists under the current filters.')}</p>}
        <div style={{...micro,marginTop:18}}>{ownedText('OTRAS HIPÓTESIS','OTHER HYPOTHESES')}</div>{filteredHypotheses.slice(0,14).map(h=><button key={String(h.id)} onClick={()=>setSelectedHypothesisId(String(h.id))} style={{display:'block',width:'100%',textAlign:'left',padding:'8px 0',border:0,borderBottom:'1px solid rgba(214,180,120,.1)',background:'transparent',color:'inherit',fontSize:11}}>{short(h.statement,120)} <span style={{opacity:.5}}>· {pct(num(h.current_confidence))}</span></button>)}</>}

      {lens==='trajectory'&&<><div style={{display:'flex',justifyContent:'space-between',gap:8,margin:'12px 0'}}><span style={micro} data-availability={availability.timeline}>{timelineMetric(`${timeline.length} snapshots`)}</span><span style={micro}>{frame?.observedAt||availability.timeline}</span></div><input style={{width:'100%'}} type="range" min="0" max="100" value={time} onChange={e=>setTime(Number(e.target.value))}/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}><div style={{padding:10,border:'1px solid rgba(214,180,120,.12)',borderRadius:9}}><div style={micro}>WSI</div><b>{frame?.wsi==null?'—':frame.wsi.toFixed(3)}</b></div><div style={{padding:10,border:'1px solid rgba(214,180,120,.12)',borderRadius:9}}><div style={micro}>NTI</div><b>{frame?.nti==null?'—':frame.nti.toFixed(3)}</b></div></div><div style={{...micro,marginTop:14}}>{ownedText('CICLO DE HIPÓTESIS','HYPOTHESIS LIFECYCLE')}</div>{filteredHypotheses.slice(0,14).map(h=><div key={String(h.id)} style={{padding:'9px 0',borderBottom:'1px solid rgba(214,180,120,.1)'}}><b style={{fontSize:11}}>{short(h.statement,110)}</b><div style={{fontSize:10,opacity:.6}}>{h.cutoff_at} → {h.validation_ends_at} · {h.status} · {pct(num(h.current_confidence))}</div></div>)}</>}

      {lens==='sources'&&<><div style={{...micro,marginTop:12}}>{ownedText('FUENTES QUE REALMENTE PERSISTIERON OBSERVACIONES','SOURCES THAT ACTUALLY PERSISTED OBSERVATIONS')}</div>{availability.world!=='AVAILABLE'&&<p data-availability={availability.world} style={{fontSize:11,opacity:.72}}>{availability.world}</p>}{rows(world?.sourceSummary).slice(0,80).map(source=><div key={String(source.sourceId)} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'7px 0',borderBottom:'1px solid rgba(214,180,120,.08)',fontSize:11}}><span>{source.sourceId}</span><b>{source.count}</b></div>)}<p style={{fontSize:11,lineHeight:1.55,opacity:.62,marginTop:12}}>{ownedText('Aquí no se muestran fuentes “configuradas” como si estuvieran vivas. Sólo aparecen las que dejaron registros persistidos dentro del horizonte seleccionado.','Configured sources are not presented as live. This list contains only sources that actually left persisted records inside the selected horizon.')}</p></>}

      <hr style={{border:0,borderTop:'1px solid rgba(214,180,120,.14)',margin:'16px 0'}}/><div style={{fontSize:10,lineHeight:1.55,opacity:.52}}>{world?.graph?.boundary||ownedText('Fuente ≠ evidencia; relación derivada ≠ causalidad observada; hipótesis ≠ verdad.','Source ≠ evidence; derived relation ≠ observed causality; hypothesis ≠ truth.')}</div>
    </aside>}

    <div style={{position:'absolute',zIndex:15,left:'50%',transform:'translateX(-50%)',top:88,pointerEvents:'none',fontSize:11,letterSpacing:'.08em',opacity:.62}} data-availability={availability.world}>{ownedText('FLUJO VIVO','LIVE FLOW')} · {world?.generatedAt?.slice?.(11,19)||availability.world} · {worldMetric(sourceIds.length)} {ownedText('fuentes observadas','observed sources')} · {worldMetric(selectedGraphEdges.length)} {ownedText('relaciones visibles','visible relations')}</div>
  </section></main>;
}
