'use client';

import { useEffect,useMemo,useState } from 'react';
import { studioAttractorProjection,type StudioAttractorNode } from './studioAttractorProjection';

type Row=Record<string,unknown>;
const sections=[
  ['world','World / vector cultural'],['scoreFriction','ScoreFriction'],['mihm','MIHM'],['fad','FAD'],
  ['t0','T0 · estado inicial'],['invariants','Invariantes mínimas'],['observationWindow','Ventana de observación'],
  ['hypotheses','Hipótesis rivales'],['h1','H1 · predicción'],['h2','H2 · predicción'],
  ['contrast','Contraste'],['agent','Agente / ejecutor'],['rationale','Por qué se decidió'],['authority','Autoridad y autorización'],
  ['action','Acción ejecutada'],['expectedReturn','RETURN esperado'],['observedReturn','RETURN observado'],
  ['learning','Aprendizaje integrado'],['appliedChange','Qué se aplicó / modificó'],
  ['t1','T1 · estado posterior'],['winningHypothesis','Hipótesis ganadora'],
  ['targetFulfilled','¿Se cumplió?'],['nextObservation','Siguiente observación necesaria'],
] as const;
function details(v:unknown):string{
  if(v===null||v===undefined)return 'NO OBSERVADO';
  return typeof v==='string'?v:JSON.stringify(v,null,2)??'NO OBSERVADO';
}
export default function StudioAttractorExplorer({objects,sessions}:{objects:Row[];sessions:Row[]}){
  const graph=useMemo(()=>studioAttractorProjection(objects,sessions),[objects,sessions]);
  const roots=graph.nodes.filter(x=>x.kind==='attractor'||(!x.parentId&&(x.kind==='project'||x.kind==='node'||x.kind==='object')));
  const [rootId,setRootId]=useState('');
  const selectedRoot=roots.some(x=>x.id===rootId)?rootId:roots[0]?.id??'';
  const visible=useMemo(()=>{
    const allowed=new Set<string>();
    if(!selectedRoot)return graph.nodes.filter(x=>!x.parentId);
    allowed.add(selectedRoot);
    let change=true;
    while(change){
      change=false;
      for(const node of graph.nodes)if(node.parentId&&allowed.has(node.parentId)&&!allowed.has(node.id)){
        allowed.add(node.id);change=true;
      }
    }
    return graph.nodes.filter(n=>allowed.has(n.id));
  },[graph.nodes,selectedRoot]);
  const [selectedId,setSelectedId]=useState('');
  const current=visible.find(x=>x.id===selectedId)??visible[0]??null;
  const level=(node:StudioAttractorNode)=>{
    let depth=0;let parent=node.parentId;
    while(parent && depth<3){depth++;parent=graph.nodes.find(n=>n.id===parent)?.parentId??null;}
    return depth;
  };
  const coords=new Map<string,{x:number;y:number}>(visible.map((node,index):[string,{x:number;y:number}]=>[node.id,{x:110+level(node)*235,y:72+index*94}]));
  const width=940,height=Math.max(260,visible.length*94+110);
  const [evidence,setEvidence]=useState<{
    objectId:string;sourceStatus:string;sourceFailures:Array<{source:string;error:string}>;
    evidence:Array<{id:string|null;type:string;at:string|null;label:string;source:string;status:string}>;
  }|null>(null);
  const [evidenceError,setEvidenceError]=useState('');
  const [evidenceLoading,setEvidenceLoading]=useState(false);
  const objectId=current?.sourceObjectId??null;
  useEffect(()=>{
    setEvidence(null);setEvidenceError('');
    if(!objectId){setEvidenceLoading(false);return;}
    const controller=new AbortController();
    setEvidenceLoading(true);
    fetch('/api/studio/objects/'+encodeURIComponent(objectId)+'/passport-evidence',{
      method:'GET',signal:controller.signal,cache:'no-store',
    }).then(async response=>{
      const payload=await response.json();
      if(!response.ok)throw new Error(String(payload.error??'READ_UNAVAILABLE'));
      return payload;
    }).then(payload=>{if(!controller.signal.aborted)setEvidence(payload);})
      .catch(error=>{if(!controller.signal.aborted)setEvidenceError(error instanceof Error?error.message:'READ_UNAVAILABLE');})
      .finally(()=>{if(!controller.signal.aborted)setEvidenceLoading(false);});
    return ()=>controller.abort();
  },[objectId]);
  const pass=current?.passport??{};
  const stages=pass.stageEvidence as Record<string,unknown>|undefined;
  return <section style={{border:'1px solid rgba(138,198,230,.27)',padding:16,
    background:'rgba(15,30,44,.2)',display:'grid',gap:12}}>
    <div style={{fontSize:11,letterSpacing:'.15em',color:'#86cef3'}}>STUDIO · MAPA DE ATRACTORES Y PASAPORTES</div>
    <h2 style={{margin:0,fontSize:24,fontWeight:450}}>Centro → proyecto → objeto → evidencia</h2>
    <p style={{fontSize:12,color:'#a9becb',margin:0,lineHeight:1.6}}>
      Visualización de objetos y campos de sesión realmente asociados a tu identidad. Las relaciones se muestran sólo cuando
      la sesión o los metadatos persistidos identifican su vínculo. La conexión visual no certifica
      causalidad, autoridad, resultados científicos ni un RETURN.
    </p>
    {roots.length>0&&<label style={{display:'grid',gap:5,fontSize:12}}>
      Elegir atractor o agrupación recuperada
      <select value={selectedRoot} onChange={e=>{setRootId(e.target.value);setSelectedId('');}}
        style={{padding:9,background:'#122638',color:'#eaf5fd',border:'1px solid #3f617a'}}>
        {roots.map(node=><option key={node.id} value={node.id}>
          {node.kind==='attractor'?'Atractor: ':'Agrupación: '}{node.label}
        </option>)}
      </select>
    </label>}
    {!graph.nodes.length?<p style={{margin:0,color:'#b2bbc3'}}>
      No se recuperaron objetos de Studio para esta identidad. No se inventaron proyectos, campañas ni recibos.
    </p>:<>
      <div style={{overflowX:'auto',border:'1px solid rgba(255,255,255,.12)'}}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
          aria-label="Mapa interactivo de relaciones declaradas de Studio">
          {graph.edges.filter(edge=>coords.has(edge.from)&&coords.has(edge.to)).map((edge,index)=>{
            const a=coords.get(edge.from)!;const b=coords.get(edge.to)!;
            return <line key={index} x1={a.x+60} y1={a.y} x2={b.x-60} y2={b.y}
              stroke="#547993" strokeWidth="1.5" strokeDasharray="5 4"/>;
          })}
          {visible.map(node=>{
            const pos=coords.get(node.id)!;
            const selected=current?.id===node.id;
            return <g key={node.id} role="button" tabIndex={0}
              onClick={()=>setSelectedId(node.id)}
              onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedId(node.id);}}}
              style={{cursor:'pointer'}}>
              <rect x={pos.x-73} y={pos.y-28} width={146} height={57} rx={9}
                fill={selected?'#245b70':'#152b3b'} stroke={selected?'#b1eeff':'#42657b'}
                strokeWidth={selected?2:1}/>
              <text x={pos.x} y={pos.y-5} textAnchor="middle" fontSize="11" fill="#9ecae1">
                {node.kind.toUpperCase()}
              </text>
              <text x={pos.x} y={pos.y+13} textAnchor="middle" fontSize="11" fill="#effaff">
                {node.label.length>20?node.label.slice(0,18)+'…':node.label}
              </text>
            </g>;
          })}
        </svg>
      </div>
      {current&&<article style={{padding:14,border:'1px solid rgba(160,210,235,.18)',
        background:'rgba(15,33,45,.35)',display:'grid',gap:10}}>
        <strong style={{fontSize:17}}>Pasaporte · {current.label}</strong>
        <div style={{color:'#9bb8cc',fontSize:11}}>
          {current.kind} · {current.source} · {current.epistemic}
        </div>
        {current.sourceObjectId&&<a style={{color:'#90d2f4',fontSize:12}}
          href={'/studio?objectId='+encodeURIComponent(current.sourceObjectId)}>
          Abrir objeto persistido y mediciones
        </a>}
        <div style={{color:'#b9c9d4',fontSize:12}}>
          {current.kind==='object'?
            'Reconstrucción parcial: los campos sólo se muestran si están presentes en metadatos asociados al objeto.':
            'Centro de agrupación: no se atribuyen ejecutores, resultados ni fechas por pertenencia.'}
        </div>
        {current.kind==='object'&&<div style={{display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:8}}>
          {sections.map(([key,label])=><div key={key} style={{
            border:'1px solid rgba(150,195,220,.14)',padding:10,display:'grid',gap:4}}>
            <strong style={{fontSize:11,color:'#b2d9ed'}}>{label}</strong>
            <pre style={{margin:0,whiteSpace:'pre-wrap',overflowWrap:'anywhere',
              color:stages?.[key]==null?'#a2a9b0':'#e8f3f8',fontSize:11}}>
              {details(stages?.[key])}
            </pre>
          </div>)}
        </div>}
        {current.sourceObjectId&&<section style={{
          border:'1px solid rgba(145,210,235,.23)',padding:12,display:'grid',gap:9,
        }}>
          <strong style={{fontSize:13}}>Registros persistidos vinculados a este objeto</strong>
          <p style={{fontSize:11,color:'#a3b6c2',margin:0}}>
            Evidencia, hipótesis, intervenciones, análisis y archivo de Studio;
            su existencia no certifica hipótesis, autoridad o RETURN.
          </p>
          {evidenceLoading&&<p role="status">Leyendo fuentes autorizadas…</p>}
          {evidenceError&&<p role="alert" style={{color:'#edbaaa'}}>
            Fuente no disponible: {evidenceError}
          </p>}
          {evidence&&<>
            <p style={{color:'#9bbcd0',margin:0,fontSize:11}}>
              Lectura: {evidence.sourceStatus} · {evidence.evidence.length} registros mostrados
              {evidence.sourceFailures.length>0?' · Algunas fuentes no respondieron':''}
            </p>
            {evidence.evidence.map(item=><div key={item.type+':'+item.id}
              style={{display:'grid',gap:3,borderBottom:'1px solid rgba(255,255,255,.1)',padding:'7px 0'}}>
              <strong style={{fontSize:11}}>{item.type} · {item.label}</strong>
              <span style={{fontSize:10,color:'#a0b7c6'}}>
                {item.at??'Fecha no disponible'} · {item.source} · {item.status}
              </span>
            </div>)}
            {!evidence.evidence.length&&<p style={{fontSize:11,color:'#b3bdc3'}}>
              Ningún registro recuperado en esta lectura. No implica inexistencia histórica.
            </p>}
          </>}
        </section>}
        <p style={{fontSize:11,color:'#d2bb98',margin:0}}>
          Estado: PASAPORTE PARCIAL. Para declarar T1 y una hipótesis ganadora se requieren
          contraste, autoridad, ejecución y RETURN con evidencia verificable.
        </p>
      </article>}
    </>}
  </section>;
}
