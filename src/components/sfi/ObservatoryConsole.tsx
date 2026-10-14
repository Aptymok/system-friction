'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HypothesisClosureDiff } from './HypothesisClosureDiff';
import { deriveTerritorialTensions } from '@/lib/observatory/public/territorialTensions';
import { translateUiText } from '@/components/i18n/SfiLanguageProvider';
import {
  classifyObservatoryRead,
  observableMetricValue,
  type ObservatoryReadAvailability,
} from '@/lib/observatory/public/readAvailability';
import './ObservatoryConsole.css';

type Lens='field'|'sources'|'territories'|'hypotheses'|'trajectory'|'world-vector';
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
type ObservatoryAvailability={world:ObservatoryReadAvailability;state:ObservatoryReadAvailability;timeline:ObservatoryReadAvailability};
type ObservatorySnapshot={at:number;world:Row|null;obs:Row|null;worldVector:Row|null;timeline:TimelineFrame[];availability:ObservatoryAvailability};

const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const row=(v:unknown):Row|null=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:null;
const rows=(v:unknown):Row[]=>arr(v).filter((x):x is Row=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x));
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):null;
const txt=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():'';
const uniq=(v:string[])=>[...new Set(v.filter(Boolean))];
function short(value:unknown,max=160){const t=txt(value);return t.length>max?`${t.slice(0,max-1)}…`:t}



/* Bounded 3D sphere for the existing Observatory stage. The texture is illustrative,
   not a verified geospatial reference; evidence, node coordinates and decisions stay
   in their existing read-only institutional services. No fabricated globe markers. */
function HolographicEarth({zoom,onInspect}:{zoom:number;onInspect:(lat:number,lng:number)=>void}){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const orientation=useRef({yaw:-1.45,pitch:.06,drag:false,wasDrag:false,x:0,y:0});
  const [failed,setFailed]=useState(false),[paused,setPaused]=useState(false);
  const pausedRef=useRef(false);
  useEffect(()=>{
    const element=canvasRef.current;
    if(!element)return;
    const gl=element.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power',premultipliedAlpha:false});
    if(!gl){setFailed(true);return;}
    let stopped=false,visible=true,loaded=false,last=0,raf=0,delay=0;
    const vertex=gl.createShader(gl.VERTEX_SHADER),fragment=gl.createShader(gl.FRAGMENT_SHADER);
    if(!vertex||!fragment){setFailed(true);return;}
    gl.shaderSource(vertex,'attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}');
    gl.shaderSource(fragment,[
      'precision mediump float;',
      'uniform sampler2D skin; uniform vec2 resolution; uniform float yaw; uniform float pitch;',
      'const float PI=3.141592653589793;',
      'void main(){',
      'vec2 xy=(gl_FragCoord.xy/resolution-.5)*2.0;',
      'float r2=dot(xy,xy); if(r2>0.98)discard;',
      'vec3 n=vec3(xy,sqrt(max(0.0,1.0-r2)));',
      'float cp=cos(pitch),sp=sin(pitch);',
      'vec3 t=vec3(n.x,n.y*cp+n.z*sp,-n.y*sp+n.z*cp);',
      'float cy=cos(yaw),sy=sin(yaw);',
      'vec3 v=vec3(t.x*cy+t.z*sy,t.y,-t.x*sy+t.z*cy);',
      'vec2 uv=vec2(fract(.5+atan(v.x,v.z)/(2.0*PI)),clamp(.5-asin(clamp(v.y,-1.,1.))/PI,.001,.999));',
      'vec3 color=texture2D(skin,uv).rgb;',
      'float light=.84+.31*max(0.,dot(n,normalize(vec3(-.36,.45,.84))));',
      'float rim=pow(1.0-n.z,3.0);',
      'color=color*light+vec3(.67,.81,.88)*rim*.90;',
      'gl_FragColor=vec4(color,1.0-smoothstep(.95,.99,r2));',
      '}'
    ].join('\n'));
    const compile=(shader:WebGLShader)=>{gl.compileShader(shader);return Boolean(gl.getShaderParameter(shader,gl.COMPILE_STATUS));};
    if(!compile(vertex)||!compile(fragment)){setFailed(true);gl.deleteShader(vertex);gl.deleteShader(fragment);return;}
    const program=gl.createProgram();
    if(!program){setFailed(true);return;}
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){setFailed(true);return;}
    gl.useProgram(program);
    const buffer=gl.createBuffer(),texture=gl.createTexture();
    if(!buffer||!texture){setFailed(true);return;}
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([14,36,54,255]));
    const image=new Image();
    image.onload=()=>{if(stopped)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);loaded=true;};
    image.onerror=()=>{if(!stopped)setFailed(true);};
    image.src='/assets/sfi/instruments/OBSERVATORY_MAPS.png';
    const resolution=gl.getUniformLocation(program,'resolution'),heading=gl.getUniformLocation(program,'yaw'),tilt=gl.getUniformLocation(program,'pitch'),sampler=gl.getUniformLocation(program,'skin');
    const wantsMotion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer=new IntersectionObserver(entries=>{visible=Boolean(entries[0]?.isIntersecting);},{threshold:.05});observer.observe(element);
    const lost=(event:Event)=>{event.preventDefault();setFailed(true);stopped=true;cancelAnimationFrame(raf);window.clearTimeout(delay);};
    element.addEventListener('webglcontextlost',lost);
    const render=(time:number)=>{
      if(stopped)return;
      const dt=Math.min((time-last)/1000,.17);last=time;
      if(visible&&!document.hidden){
        if(wantsMotion&&!pausedRef.current&&loaded&&!orientation.current.drag)orientation.current.yaw=(orientation.current.yaw+dt*.02)%(Math.PI*2);
        const px=Math.min(420,Math.max(200,Math.round(element.clientWidth)));
        if(element.width!==px||element.height!==px){element.width=px;element.height=px;}
        gl.viewport(0,0,px,px);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resolution,px,px);gl.uniform1f(heading,orientation.current.yaw);gl.uniform1f(tilt,orientation.current.pitch);gl.uniform1i(sampler,0);
        gl.drawArrays(gl.TRIANGLES,0,6);
      }
      delay=window.setTimeout(()=>{raf=window.requestAnimationFrame(render);},140);
    };
    raf=window.requestAnimationFrame(render);
    return()=>{stopped=true;observer.disconnect();element.removeEventListener('webglcontextlost',lost);cancelAnimationFrame(raf);window.clearTimeout(delay);image.onload=null;image.onerror=null;gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);};
  },[]);
  return <>
    {failed?<div className="sfiGlobeSphere sfiGlobeStaticFallback" role="img" aria-label="Static Earth illustration; WebGL unavailable; use the dashboard to select territorial readings"/>:
      <canvas ref={canvasRef} className="sfiLiveGlobeCanvas" style={{transform:'scale('+zoom+')'}} aria-label="Rotating globe. Drag to change view, use zoom controls and click to inspect territorial records."
        onPointerDown={e=>{const p=orientation.current;p.drag=true;p.wasDrag=false;p.x=e.clientX;p.y=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);}}
        onPointerMove={e=>{const p=orientation.current;if(!p.drag)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.abs(dx)+Math.abs(dy)>1)p.wasDrag=true;p.yaw-=dx*.007;p.pitch=Math.max(-.85,Math.min(.85,p.pitch+dy*.005));}}
        onPointerUp={e=>{const p=orientation.current;p.drag=false;if(!p.wasDrag){
          const b=e.currentTarget.getBoundingClientRect();
          const x=2*(e.clientX-b.left)/b.width-1,y=1-2*(e.clientY-b.top)/b.height;
          if(x*x+y*y<.98){
            const z=Math.sqrt(1-x*x-y*y),cp=Math.cos(p.pitch),sp=Math.sin(p.pitch);
            const latComponent=y*cp+z*sp,depth=-y*sp+z*cp;
            const lngComponent=x*Math.cos(p.yaw)+depth*Math.sin(p.yaw);
            const forward=-x*Math.sin(p.yaw)+depth*Math.cos(p.yaw);
            const lat=Math.asin(Math.max(-1,Math.min(1,latComponent)))*180/Math.PI;
            const lng=((Math.atan2(lngComponent,forward)*180/Math.PI+540)%360)-180;
            onInspect(lat,lng);
          }
        }}}
        onPointerCancel={()=>{orientation.current.drag=false;}}
      />}
    <button type="button" className="sfiGlobePause" aria-label={paused?'Resume Earth rotation':'Pause Earth rotation'} onClick={()=>{pausedRef.current=!pausedRef.current;setPaused(pausedRef.current);}}>{paused?'▶':'Ⅱ'}</button>
  </>;
}

function dateMs(value:unknown){const n=Date.parse(txt(value));return Number.isFinite(n)?n:0}
function mean(values:Array<number|null>){const valid=values.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null}
function pct(value:number|null){return value==null?'—':`${Math.round(value*100)}%`}
function signedPct(value:number|null){return value==null?'—':`${value>=0?'+':''}${Math.round(value*100)}%`}

const OBSERVATORY_REQUEST_TIMEOUT_MS=15000;
const OBSERVATORY_CACHE_TTL_MS=120_000;
const INITIAL_AVAILABILITY:ObservatoryAvailability={world:'LOADING',state:'LOADING',timeline:'LOADING'};
let observatorySnapshotCache:ObservatorySnapshot|null=null;
const panel:CSSProperties={position:'absolute',zIndex:25,background:'rgba(4,6,7,.88)',backdropFilter:'blur(18px)',border:'1px solid rgba(214,180,120,.22)',boxShadow:'0 22px 70px rgba(0,0,0,.45)',borderRadius:14,color:'#e7dfd2'};
const micro:CSSProperties={fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',opacity:.58};
const chip:CSSProperties={fontSize:11,padding:'5px 8px',border:'1px solid rgba(214,180,120,.2)',borderRadius:999,background:'rgba(214,180,120,.055)',whiteSpace:'nowrap'};
const selectStyle:CSSProperties={background:'rgba(5,7,8,.88)',color:'#e7dfd2',border:'1px solid rgba(214,180,120,.18)',borderRadius:8,padding:'7px 9px',fontSize:11,maxWidth:190};

async function fetchJson(path:string){
  try{const response=await fetch(path,{signal:AbortSignal.timeout(OBSERVATORY_REQUEST_TIMEOUT_MS)});const data=await response.json().catch(()=>null);return{ok:response.ok,data,status:response.status}}catch(error){return{ok:false,data:null,status:0,error:error instanceof Error?error.message:String(error)}}
}

export function ObservatoryConsole(){
  const searchParams=useSearchParams();
  const requestedLens=searchParams.get('lens');
  const requestedFocus=searchParams.get('focus');
  const initialLens:Lens=requestedLens==='world-vector'?'world-vector':requestedLens==='trajectory'?'trajectory':requestedLens==='hypotheses'?'hypotheses':requestedLens==='territories'?'territories':requestedLens==='sources'?'sources':'field';
  const language='en' as const;
  const ui=(value:string)=>translateUiText(value,language);
  const[world,setWorld]=useState<Row|null>(null),[obs,setObs]=useState<Row|null>(null),[worldVector,setWorldVector]=useState<Row|null>(null),[timeline,setTimeline]=useState<TimelineFrame[]>([]);
  const[availability,setAvailability]=useState<ObservatoryAvailability>(INITIAL_AVAILABILITY);
  const[refreshing,setRefreshing]=useState(false);
  const[lens,setLens]=useState<Lens>(initialLens),[satelliteOpen,setSatelliteOpen]=useState(true),[selectedNodeId,setSelectedNodeId]=useState<string|null>(null),[selectedHypothesisId,setSelectedHypothesisId]=useState<string|null>(null);
  const[sourceFamily,setSourceFamily]=useState('ALL'),[systemFilter,setSystemFilter]=useState('ALL'),[statusFilter,setStatusFilter]=useState('ALL'),[windowHours,setWindowHours]=useState(168),[minConfidence,setMinConfidence]=useState(0),[query,setQuery]=useState('');
  const[baselineTime,setBaselineTime]=useState(0),[time,setTime]=useState(100),[clock,setClock]=useState('');
  const[selectedTerritoryId,setSelectedTerritoryId]=useState<string|null>(null);
  // Sampling this clock once per minute prevents a global node/graph redraw every second.
  const[observationNow,setObservationNow]=useState(()=>Date.now());

  const applySnapshot=useCallback((snapshot:ObservatorySnapshot)=>{
    setAvailability(snapshot.availability);setWorld(snapshot.world);setObs(snapshot.obs);setWorldVector(snapshot.worldVector);setTimeline(snapshot.timeline);
  },[]);
  const pull=useCallback(async(force=false)=>{
    if(!force&&observatorySnapshotCache&&Date.now()-observatorySnapshotCache.at<OBSERVATORY_CACHE_TTL_MS){
      applySnapshot(observatorySnapshotCache);return;
    }
    setRefreshing(true);
    try{
      // First paint only waits for the primary world and state readers.
      // Historical frames and bounded World Vector arrive later and cannot block it.
      const [worldR,obsR]=await Promise.all([fetchJson('/api/observatory/world'),fetchJson('/api/observatory/state?view=observatory')]);
      const nextAvailability:ObservatoryAvailability={
        world:classifyObservatoryRead(worldR,'WORLD'),
        state:classifyObservatoryRead(obsR,'STATE'),
        timeline:'LOADING',
      };
      const snapshot:ObservatorySnapshot={
        at:Date.now(),availability:nextAvailability,
        world:(nextAvailability.world==='AVAILABLE'||nextAvailability.world==='DEGRADED')?row(worldR.data):null,
        obs:nextAvailability.state==='AVAILABLE'?row(obsR.data):null,
        worldVector:null,timeline:[],
      };
      observatorySnapshotCache=snapshot;
      applySnapshot(snapshot);
      void Promise.all([fetchJson('/api/observatory/timeline'),fetchJson('/api/world-vector/today')]).then(([timeR,vectorR])=>{
        // A later refresh supersedes a pending history read.
        if(observatorySnapshotCache!==snapshot)return;
        const complete:ObservatorySnapshot={
          ...snapshot,
          availability:{...snapshot.availability,timeline:classifyObservatoryRead(timeR,'TIMELINE')},
          timeline:timeR.ok&&Array.isArray(timeR.data?.frames)?timeR.data.frames:[],
          worldVector:vectorR.ok?row(vectorR.data?.data):null,
        };
        observatorySnapshotCache=complete;applySnapshot(complete);
      });
    }finally{setRefreshing(false)}
  },[applySnapshot]);

  useEffect(()=>{const tick=()=>{setClock(new Date().toISOString());setObservationNow(Date.now())};tick();const t=setInterval(tick,60_000);return()=>clearInterval(t)},[]);
  useEffect(()=>{setLens(initialLens);if(requestedFocus==='timeline')setSatelliteOpen(true)},[requestedLens,requestedFocus]);
  useEffect(()=>{void pull(false)},[pull]);

  const allNodes=useMemo<WorldNode[]>(()=>rows(world?.nodes).map((o)=>({
    id:String(o.id),kind:String(o.kind||'observed'),sourceId:String(o.sourceId||'unknown'),sourceFamily:String(o.sourceFamily||'unknown'),publisher:String(o.publisher||'unknown'),observationKind:String(o.observationKind||'unknown'),title:String(o.title||'Untitled observation'),summary:typeof o.summary==='string'?o.summary:null,observedAt:String(o.observedAt||''),fetchedAt:String(o.fetchedAt||o.observedAt||''),lat:num(o.lat),lng:num(o.lng),countryCodes:arr(o.countryCodes).filter((v):v is string=>typeof v==='string'),affectedSystems:arr(o.affectedSystems).filter((v):v is string=>typeof v==='string'),actors:arr(o.actors).filter((v):v is string=>typeof v==='string'),confidence:num(o.confidence),reading:o.reading&&typeof o.reading==='object'?o.reading:null,provenance:o.provenance&&typeof o.provenance==='object'?o.provenance:null,
  })),[world]);
  const hypotheses=useMemo<Hypothesis[]>(()=>rows(world?.hypotheses)
    .sort((a,b)=>dateMs(b.cutoff_at??b.created_at)-dateMs(a.cutoff_at??a.created_at))
    .slice(0,8) as Hypothesis[],[world]);
  const cutoff=useMemo(()=>observationNow-windowHours*3600000,[observationNow,windowHours]);
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
  const territorialModel=useMemo(()=>deriveTerritorialTensions(nodes.map(node=>({
    id:node.id,
    sourceId:node.sourceId,
    lat:node.lat,
    lng:node.lng,
    countryCodes:node.countryCodes,
    observedAt:node.observedAt,
    fetchedAt:node.fetchedAt,
    confidence:node.confidence,
    affectedSystems:node.affectedSystems,
    reading:node.reading,
  }))),[nodes]);
  const selectedTerritory=territorialModel.territories.find(territory=>territory.id===selectedTerritoryId)??null;
  const baselineFrameIndex=timeline.length?Math.round((timeline.length-1)*(baselineTime/100)):0;
  const frameIndex=timeline.length?Math.round((timeline.length-1)*(time/100)):0;
  const baselineFrame=timeline[baselineFrameIndex]||null;
  const frame=timeline[frameIndex]||null;
  const temporalVectorDeltas=useMemo(()=>{
    const baselineById=new Map((baselineFrame?.vectors??[]).map((vector)=>[vector.id,vector]));
    return (frame?.vectors??[]).flatMap((vector)=>{
      const prior=baselineById.get(vector.id);
      if(vector.value==null||prior?.value==null)return[];
      return[{id:vector.id,label:vector.label,from:prior.value,to:vector.value,delta:vector.value-prior.value}];
    }).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,6);
  },[baselineFrame,frame]);
  const avgFs=mean(nodes.map(n=>n.reading?.systemic_friction==null?null:num(n.reading.systemic_friction)));
  const avgNti=mean(nodes.map(n=>n.reading?.interaction_density==null?null:num(n.reading.interaction_density)));
  const avgPhi=mean(nodes.map(n=>n.reading?.systemic_coherence==null?null:num(n.reading.systemic_coherence)));
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
  const platformMetrics=row(obs?.data?.platformMetrics);
  const platformBySource=row(platformMetrics?.byPlatform);
  const ga4Metrics=row(platformMetrics?.ga4);
  const platformSnapshotCount=num(platformMetrics?.snapshotCount);
  const platformSourceCount=platformBySource?Object.keys(platformBySource).length:0;
  const ga4Users=num(ga4Metrics?.activeUsers);
  const ga4Sessions=num(ga4Metrics?.sessions);
  const aiAssistantSessions=num(ga4Metrics?.aiAssistantSessions);
  const worldVectorObservation=row(worldVector?.observation);
  const worldVectorCycle=row(worldVector?.cycle_day);
  const worldVectorRange=row(worldVector?.cycle_range);
  const worldVectorPersistence=row(worldVector?.persistence);
  const worldVectorReadProvenance=row(worldVector?.read_provenance);
  const worldVectorDomains=rows(worldVectorObservation?.domain_values);
  const worldVectorStatus=txt(worldVectorObservation?.status)||'NOT AVAILABLE';
  const worldVectorConfidence=num(worldVectorObservation?.confidence);
  const worldVectorSignal=txt(worldVectorObservation?.dominant_signal)||'No dominant signal represented.';
  const worldVectorInterpretation=txt(worldVectorObservation?.interpretation)||'No bounded World Vector interpretation is available.';
  const narrative=availability.world!=='AVAILABLE'
    ? `Authoritative field read: ${availability.world}. Counts remain non-numeric until a successful read.`
    : lens==='territories'
      ? `Territorial tension is DERIVED from ${territorialModel.mappedCount} geocoded observations across ${territorialModel.territories.length} display regions. ${territorialModel.unmappedCount} visible observations remain unmapped; density and tension are not claims of importance or causality.`
      : selectedHypothesis&&lens==='hypotheses'
        ? `The selected hypothesis is an inference, not a fact: ${selectedHypothesis.statement??'no statement'}. Its trace uses ${selectedEvidenceIds.size} source records, affects ${arr(selectedHypothesis.aiInference?.affectedSystems).length} systems, and preserves explicit contradiction signals.`
        : `The field contains ${nodes.length} visible observations and ${filteredHypotheses.length} traceable hypotheses under the current filters.`;

  const[earthZoom,setEarthZoom]=useState(1);
  const visualDate=clock?new Date(clock):null;
  const synodic=29.53058867;
  const moonAge=visualDate?(((visualDate.getTime()-Date.UTC(2000,0,6,18,14))/86400000)%synodic+synodic)%synodic:0;
  const moonFraction=moonAge/synodic;
  const moonFrame=Math.round(moonFraction*8)%8;
  const moonIllumination=Math.round((1-Math.cos(2*Math.PI*moonFraction))*50);
  const moonName=moonFraction<.04||moonFraction>.96?'NEW MOON':moonFraction<.21?'WAXING CRESCENT':moonFraction<.29?'FIRST QUARTER':moonFraction<.46?'WAXING GIBBOUS':moonFraction<.54?'FULL MOON':moonFraction<.71?'WANING GIBBOUS':moonFraction<.79?'LAST QUARTER':'WANING CRESCENT';
  const changeLens=(value:Lens)=>{setLens(value);setSatelliteOpen(true)};
  return <main className="obsShell" data-canonical-visual="SFI-INSTRUMENT-OBSERVATORY-1.0" data-world-availability={availability.world}>
    <section className={'obsScene lens-'+lens}>
      <Link href="/" className="sfiObservatoryBrand"><strong>S F I</strong><span>OBSERVATORY</span><small>NOTHING ACTS ALONE. REALITY ANSWERS BACK.</small></Link>
      <div className="sfiLunarWitness" aria-label={'Approximate lunar phase '+moonName}>
        <div className="sfiMoonSprite" style={{backgroundPosition:String((moonFrame%4)*100/3)+'% '+String(Math.floor(moonFrame/4)*100)+'%'}}/>
        <span>{moonName} · ≈{moonIllumination}%</span>
      </div>
      <div className="sfiProjector" aria-hidden="true"/>
      <div className="sfiGlobeAssembly">
        <svg className="sfiGlobeGeometry" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
          <g className="sfiCubeWireframe" fill="none" stroke="currentColor" strokeWidth="0.72" strokeLinejoin="miter">
            <path d="M98 73 H549 V513 H98 Z M65 110 H516 V550 H65 Z"/>
            <path d="M98 73 L65 110 M549 73 L516 110 M549 513 L516 550 M98 513 L65 550"/>
          </g>
          <g className="sfiOrbitalLines" fill="none" stroke="currentColor" strokeWidth="0.58">
            <ellipse cx="303" cy="312" rx="266" ry="73" transform="rotate(-19 303 312)"/>
            <ellipse cx="303" cy="312" rx="250" ry="84" transform="rotate(62 303 312)"/>
            <ellipse cx="303" cy="312" rx="264" ry="61" transform="rotate(124 303 312)"/>
          </g>
        </svg>
        <HolographicEarth zoom={earthZoom} onInspect={(lat,lng)=>{
          changeLens('territories');
          const best=territorialModel.territories
            .map(territory=>({territory,distance:Math.acos(Math.max(-1,Math.min(1,
              Math.sin(lat*Math.PI/180)*Math.sin(territory.anchor.lat*Math.PI/180)+
              Math.cos(lat*Math.PI/180)*Math.cos(territory.anchor.lat*Math.PI/180)*Math.cos((lng-territory.anchor.lng)*Math.PI/180)
            )))}))
            .sort((a,b)=>a.distance-b.distance)[0];
          setSelectedTerritoryId(best&&best.distance<.35?best.territory.id:null);
        }}/>
        <div className="sfiGlobeControl"><button onClick={()=>setEarthZoom(v=>Math.min(1.5,v+.1))} aria-label="Zoom in">+</button><button onClick={()=>setEarthZoom(v=>Math.max(.8,v-.1))} aria-label="Zoom out">−</button></div>
        <span className="sfiGlobeBoundary">MAP SKIN: ILLUSTRATIVE · NOT GEOREFERENCED</span>
      </div>
      <div className="sfiMonitor" aria-label="SFI Observatory selected data over the existing right-hand scene console">
        <div className="sfiMonitorBody">
          <div className="sfiMonitorHeader"><span>SFI OBSERVATORY · {lens.toUpperCase()}</span><span>{lens.toUpperCase()} · {clock.slice(11,16)||'—'} UTC</span></div>
          <h2>{lens==='field'?'LIVE OBSERVATIONS':lens==='sources'?'SOURCES':lens==='territories'?'GEOGRAPHICAL FRICTION':lens==='hypotheses'?'LATEST HYPOTHESES':lens==='trajectory'?'RECONSTRUCT / RETURN':'WORLD VECTOR'}</h2>
          <p className="sfiSourceStatus" data-availability={availability.world}>WORLD {availability.world} · STATE {availability.state} · HISTORY {availability.timeline}</p>
          <div className="sfiMonitorReading">
            {lens==='field'&&<>
              <div className="sfiInfoLine"><span>RECORDED OBSERVATIONS</span><b>{worldMetric(nodes.length)}</b></div>
              <div className="sfiInfoLine"><span>ATTRIBUTED SOURCES</span><b>{worldMetric(sourceIds.length)}</b></div>
              <div className="sfiInfoLine"><span>HYPOTHESES</span><b>{worldMetric(filteredHypotheses.length)}</b></div>
              <div className="sfiInfoLine"><span>OPEN / AWAITING RETURN</span><b>{worldMetric(openHypotheses)}</b></div>
              <p>{narrative}</p><p>DERIVED METRICS · Fₛ {avgFs==null?'—':avgFs.toFixed(3)} · NTI {avgNti==null?'—':avgNti.toFixed(3)} · Φ {avgPhi==null?'—':avgPhi.toFixed(3)}</p>
            </>}
            {lens==='world-vector'&&<>
              <div className="sfiInfoLine"><span>STATUS</span><b>{worldVectorStatus}</b></div>
              <div className="sfiInfoLine"><span>CONFIDENCE</span><b>{pct(worldVectorConfidence)}</b></div>
              <p>{worldVectorSignal}</p>
              <p>{worldVectorInterpretation}</p>
              {worldVectorDomains.slice(0,8).map(d=><div className="sfiInfoLine" key={String(d.domain)}><span>{String(d.domain)}</span><b>{pct(num(d.value))}</b></div>)}
            </>}
            {lens==='territories'&&<>
              <div className="sfiInfoLine"><span>MAPPED</span><b>{territorialModel.mappedCount}</b></div>
              <div className="sfiInfoLine"><span>UNMAPPED</span><b>{territorialModel.unmappedCount}</b></div>
              <div className="sfiInfoLine"><span>GEO COVERAGE</span><b>{pct(territorialModel.coverage)}</b></div>
              {selectedTerritory&&<p>SELECTED: {selectedTerritory.label} · {selectedTerritory.observationCount} observations · Fₛ {selectedTerritory.systemicFriction==null?'UNAVAILABLE':selectedTerritory.systemicFriction.toFixed(3)}</p>}
              {territorialModel.territories.slice(0,12).map(t=><button key={t.id} className="sfiMonitorRow" onClick={()=>setSelectedTerritoryId(t.id)} aria-pressed={t.id===selectedTerritoryId}><span>{t.label}</span><span>{t.observationCount} obs</span></button>)}
              <p>TERRITORIAL TENSIONS. Territorial buckets are derived from persisted geocoded observations. Coverage ≠ completeness; density ≠ importance; tension ≠ causality.</p>
            </>}
            {lens==='sources'&&<>
              {selectedNode&&<p>SELECTED: {selectedNode.title} · {selectedNode.publisher} · {selectedNode.provenance?.verificationState||'NOT_RECORDED'} {selectedNode.provenance?.sourceUrl&&<a href={selectedNode.provenance.sourceUrl} target="_blank" rel="noreferrer">SOURCE ↗</a>}</p>}
              {nodes.slice(0,18).map(n=><button key={n.id} className="sfiMonitorRow" onClick={()=>setSelectedNodeId(n.id)}><span>{short(n.title,78)}</span><span>{n.sourceFamily}</span></button>)}
              {nodes.length===0&&<p>NO SOURCE OBSERVATIONS IN THIS WINDOW.</p>}
            </>}
            {lens==='hypotheses'&&<>
              {selectedHypothesis&&<><p>{selectedHypothesis.statement} · {selectedHypothesis.status}</p><p>PROPOSED MECHANISM · INFERENCE: {selectedHypothesis.aiInference?.mechanism||'Mechanism not established.'}</p><p>CONSEQUENCE TRACE · {arr(selectedHypothesis.aiInference?.consequenceChain).length} declared links</p><p>RETURN: {selectedHypothesis.outcome?.classification||'NOT OBSERVED'}</p></>}
              {filteredHypotheses.slice(0,8).map(h=><button className="sfiMonitorRow" key={String(h.id)} onClick={()=>setSelectedHypothesisId(String(h.id))}><span>{short(h.statement,78)}</span><span>{h.status}</span></button>)}
            </>}
            {lens==='trajectory'&&<>
              <p>T0 → T1 · PERSISTED WORLDSPECT</p>
              <label className="sfiTimeControl">T0 <input type="range" min={0} max={100} value={baselineTime} onChange={e=>setBaselineTime(Math.min(Number(e.target.value),time))}/><span>{baselineFrame?.observedAt?.slice(0,10)||'NO FRAME'}</span></label>
              <label className="sfiTimeControl">T1 <input type="range" min={0} max={100} value={time} onChange={e=>setTime(Math.max(Number(e.target.value),baselineTime))}/><span>{frame?.observedAt?.slice(0,10)||'NO FRAME'}</span></label>
              <div className="sfiInfoLine"><span>WSI · T0 / T1</span><b>{baselineFrame?.wsi?.toFixed(3)||'—'} / {frame?.wsi?.toFixed(3)||'—'}</b></div>
              <div className="sfiInfoLine"><span>NTI · T0 / T1</span><b>{baselineFrame?.nti?.toFixed(3)||'—'} / {frame?.nti?.toFixed(3)||'—'}</b></div>
              <p>T0/T1 compares persisted WorldSpect snapshots only. The current source/hypothesis graph is not backdated or rewritten by this control.</p>
            </>}
          </div>
          <button className="sfiMonitorRefresh" onClick={()=>void pull(true)} disabled={refreshing}>{refreshing?'REFRESHING…':'REFRESH RECORDS ↻'}</button>
        </div>
      </div>
      <div className="sfiDashboard" aria-label="OBSERVATORY_MONITOR lower console and selection controls">
        <img className="sfiBottomMonitorImage" src="/assets/sfi/instruments/OBSERVATORY_MONITOR.png" alt="" aria-hidden="true" decoding="async"/>
        <nav className="sfiDashboardModes" aria-label="Select Observatory instrument">
          {(['field','sources','territories','hypotheses','trajectory','world-vector'] as Lens[]).map(mode=><button key={mode} type="button" aria-pressed={lens===mode} onClick={()=>changeLens(mode)}>{mode==='field'?'FIELD':mode==='sources'?'SOURCES':mode==='territories'?'FRICTION MAP':mode==='hypotheses'?'HYPOTHESES':mode==='trajectory'?'TRAJECTORY':'WORLD VECTOR'}</button>)}
        </nav>
        <div className="sfiDashboardFilters">
          <label>WINDOW <select value={windowHours} onChange={e=>setWindowHours(Number(e.target.value))}><option value={6}>6H</option><option value={24}>24H</option><option value={168}>7D</option><option value={720}>30D</option></select></label>
          <label>SOURCE <select value={sourceFamily} onChange={e=>setSourceFamily(e.target.value)}><option value="ALL">ALL</option>{sourceFamilies.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>SYSTEM <select value={systemFilter} onChange={e=>setSystemFilter(e.target.value)}><option value="ALL">ALL</option>{systems.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>SEARCH <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="source / hypothesis"/></label>
        </div>
      </div>
    </section>
  </main>;
}
