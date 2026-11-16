'use client';

import { useMemo,useState } from 'react';
import { useRouter } from 'next/navigation';

type Row=Record<string,unknown>;
const rec=(v:unknown):Row=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():'';
type FieldNode={id:string;kind:'project'|'node';label:string;parentId:string|null;description:string|null;archivedAt?:string|null};
type FieldEdge={id:string;sourceId:string;targetId:string;relationType:string};
type Field={attractor:{id:string;label:string}|null;nodes:FieldNode[];edges:FieldEdge[]};
function fieldOf(session:Row|undefined):Field{
  const raw=rec(rec(session?.metadata).field);
  const attractor=rec(raw.attractor);
  const nodes=(Array.isArray(raw.nodes)?raw.nodes:[])
    .filter((n):n is FieldNode=>Boolean(n)&&typeof n==='object'&&!Array.isArray(n))
    .filter(n=>!n.archivedAt);
  const edges=(Array.isArray(raw.edges)?raw.edges:[])
    .filter((n):n is FieldEdge=>Boolean(n)&&typeof n==='object'&&!Array.isArray(n));
  return {attractor:str(attractor.id)?{id:str(attractor.id),label:str(attractor.label)}:null,nodes,edges};
}
export default function StudioFieldEditor({sessions,objects}:{sessions:Row[];objects:Row[]}){
  const router=useRouter();
  const [sessionId,setSessionId]=useState('');
  const session=sessions.find(s=>s.id===sessionId)??sessions[0];
  const activeId=str(session?.id);
  const field=useMemo(()=>fieldOf(session),[session]);
  const [attractorName,setAttractorName]=useState('');
  const [attractorDescription,setAttractorDescription]=useState('');
  const [nodeName,setNodeName]=useState('');
  const [nodeDescription,setNodeDescription]=useState('');
  const [kind,setKind]=useState<'project'|'node'>('project');
  const [parentId,setParentId]=useState('');
  const [sourceId,setSourceId]=useState('');
  const [targetId,setTargetId]=useState('');
  const [relation,setRelation]=useState<'CONTAINS'|'DERIVED_FROM'|'INFLUENCES'|'PROJECTS'>('DERIVED_FROM');
  const [attachedObjectId,setAttachedObjectId]=useState('');
  const [attachedNodeId,setAttachedNodeId]=useState('');
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  const options=[
    ...(field.attractor?[{id:field.attractor.id,label:field.attractor.label}]:[]),
    ...field.nodes,
  ];
  const sessionObjects=objects.filter(obj=>obj.session_id===activeId);
  async function write(action:string,attrs:Row,createNew=false){
    if(busy)return;
    setBusy(true);setStatus('Guardando y verificando estado…');
    try{
      const body={action,...attrs,...(createNew?{createNewSession:true}:{sessionId:activeId})};
      const response=await fetch('/api/studio/field',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify(body),
      });
      const result=await response.json() as {
        ok?:boolean;error?:string;sessionId?:string;persistence?:string;archiveEventStatus?:string;
      };
      if(!response.ok||!result.ok||result.persistence!=='INDEPENDENTLY_REREAD'){
        throw new Error(result.error??'FIELD_PERSISTENCE_NOT_VERIFIED');
      }
      setStatus('Registrado y releído desde Studio. Sesión: '+result.sessionId+
        (result.archiveEventStatus==='WRITE_FAILED'?' · Registro histórico no confirmado':''));
      setNodeName('');setNodeDescription('');
      if(createNew&&result.sessionId)setSessionId(result.sessionId);
      setRefreshing(true);router.refresh();
    }catch(error){
      setStatus('La operación no quedó certificada: '+(error instanceof Error?error.message:String(error)));
    }finally{setBusy(false);setRefreshing(false);}
  }
  const input={padding:'8px 10px',background:'#142b3e',color:'#e3f4ff',
    border:'1px solid #4c7183',fontSize:12} as const;
  const btn={padding:'9px 12px',background:'#245469',color:'#f0faff',
    border:'1px solid #6b95ac',cursor:'pointer',fontSize:12} as const;
  return <section style={{
    padding:16,display:'grid',gap:12,
    border:'1px solid rgba(140,208,229,.27)',background:'rgba(10,38,58,.24)',
  }}>
    <strong style={{fontSize:18}}>Administrar atractores y nodos existentes</strong>
    <p style={{margin:0,fontSize:12,lineHeight:1.55,color:'#afc4cf'}}>
      Reutiliza Studio Field. Puedes abrir un nuevo atractor, agregar proyectos y tareas,
      vincular objetos existentes y declarar relaciones. Las operaciones no publican,
      no realizan análisis científico ni conceden permisos ROOT.
    </p>
    <div style={{display:'grid',gap:8,padding:10,border:'1px solid rgba(171,215,236,.13)'}}>
      <strong style={{fontSize:12}}>Nuevo atractor</strong>
      <input value={attractorName} maxLength={100} onChange={e=>setAttractorName(e.target.value)}
        placeholder="KXTXR, STUDIO115…" style={input}/>
      <textarea value={attractorDescription} maxLength={1200}
        onChange={e=>setAttractorDescription(e.target.value)}
        placeholder="Identidad, misión, continuidad y límites declarados"
        rows={2} style={input}/>
      <button type="button" disabled={busy||!attractorName.trim()}
        onClick={()=>void write('create_attractor',{
          label:attractorName.trim(),description:attractorDescription.trim(),
          sessionTitle:attractorName.trim()+' · Studio Field',
        },true)} style={{...btn,justifySelf:'start'}}>
        CREAR ATRACTOR CON SESIÓN PROPIA
      </button>
    </div>
    {sessions.length>0&&<>
      <label style={{display:'grid',gap:6}}>Sesión existente
        <select value={activeId} onChange={e=>{
          setSessionId(e.target.value);setParentId('');setSourceId('');
          setTargetId('');setAttachedObjectId('');setAttachedNodeId('');
        }} style={input}>
          {sessions.map(s=><option key={str(s.id)} value={str(s.id)}>
            {str(s.title)||str(s.id)}
          </option>)}
        </select>
      </label>
      {field.attractor?<div style={{display:'grid',gap:10}}>
        <strong style={{fontSize:14}}>{field.attractor.label} · {field.nodes.length} nodos</strong>
        <div style={{display:'grid',gap:7}}>
          <strong style={{fontSize:12}}>Crear proyecto o tarea dentro del atractor</strong>
          <input style={input} value={nodeName} maxLength={180}
            onChange={e=>setNodeName(e.target.value)} placeholder="QUE NO, LUGAR LUNAR, publicación TikTok…"/>
          <textarea style={input} value={nodeDescription} maxLength={1200} rows={2}
            onChange={e=>setNodeDescription(e.target.value)}
            placeholder="Descripción narrativa, invariantes declaradas o finalidad del nodo"/>
          <select style={input} value={kind} onChange={e=>setKind(e.target.value as 'project'|'node')}>
            <option value="project">Proyecto / Single</option>
            <option value="node">Tarea / Asset / Publicación</option>
          </select>
          <label style={{display:'grid',gap:5}}>Nodo padre
            <select value={options.some(n=>n.id===parentId)?parentId:field.attractor.id}
              onChange={e=>setParentId(e.target.value)} style={input}>
              {options.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
          </label>
          <button type="button" style={{...btn,justifySelf:'start'}} disabled={busy||!nodeName.trim()}
            onClick={()=>void write('create_node',{
              label:nodeName,description:nodeDescription,kind,
              parentId:options.some(n=>n.id===parentId)?parentId:field.attractor!.id,
            })}>AGREGAR NODO PERSISTIDO</button>
        </div>
        <div style={{display:'grid',gap:7,paddingTop:10,borderTop:'1px solid rgba(255,255,255,.1)'}}>
          <strong style={{fontSize:12}}>Declarar una relación adicional</strong>
          <select style={input} value={sourceId}
            onChange={e=>setSourceId(e.target.value)}>
            <option value="">Origen</option>
            {options.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <select style={input} value={targetId}
            onChange={e=>setTargetId(e.target.value)}>
            <option value="">Destino</option>
            {options.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <select value={relation} onChange={e=>setRelation(e.target.value as typeof relation)} style={input}>
            <option value="CONTAINS">Contiene</option>
            <option value="DERIVED_FROM">Deriva de</option>
            <option value="INFLUENCES">Influye en (declarado)</option>
            <option value="PROJECTS">Proyecta</option>
          </select>
          <button type="button" disabled={busy||!sourceId||!targetId||sourceId===targetId}
            onClick={()=>void write('link_nodes',{sourceId,targetId,relationType:relation})}
            style={{...btn,justifySelf:'start'}}>VINCULAR NODOS</button>
          <span style={{fontSize:11,color:'#9eacb5'}}>
            Relaciones explícitas registradas: {field.edges.length}.
            El vínculo declarado no demuestra causalidad o RETURN.
          </span>
        </div>
        {sessionObjects.length>0&&<div style={{display:'grid',gap:7,
          paddingTop:10,borderTop:'1px solid rgba(255,255,255,.1)'}}>
          <strong style={{fontSize:12}}>Asignar una obra real al nodo</strong>
          <select style={input} value={attachedObjectId} onChange={e=>setAttachedObjectId(e.target.value)}>
            <option value="">Objeto de esta sesión</option>
            {sessionObjects.map(o=><option key={str(o.id)} value={str(o.id)}>{str(o.title)}</option>)}
          </select>
          <select style={input} value={attachedNodeId} onChange={e=>setAttachedNodeId(e.target.value)}>
            <option value="">Nodo destino</option>
            {options.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <button type="button" disabled={busy||!attachedObjectId||!attachedNodeId}
            onClick={()=>void write('attach_object',{objectId:attachedObjectId,nodeId:attachedNodeId})}
            style={{...btn,justifySelf:'start'}}>ASOCIAR OBJETO EXISTENTE</button>
        </div>}
      </div>:<p style={{fontSize:12,color:'#c1b09e'}}>
        Esta sesión todavía no tiene un atractor. Puedes crear otro en una nueva sesión.
      </p>}
    </>}
    {refreshing&&<p role="status">Actualizando lectura del servidor…</p>}
    {status&&<p role="status" style={{margin:0,color:'#b5dcca',fontSize:12}}>{status}</p>}
  </section>;
}
