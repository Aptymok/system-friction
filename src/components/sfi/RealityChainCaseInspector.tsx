'use client';

import { useMemo, useState } from 'react';

type CaseObject = {
 id:string; kind:string; epistemicRole:string; canonicalRef?:{id?:string};
 payload:Record<string,unknown>; createdAt:string; observedAt?:string|null;
 sourceRefs?:{id:string}[]; recordRefs?:{id:string}[]; evidenceRefs?:{id:string}[];
};
const CATEGORIES=[
 {key:'SOURCE',label:'Fuentes',kinds:['SOURCE']},
 {key:'RECORD',label:'Registros',kinds:['RECORD']},
 {key:'OBSERVATION',label:'Observaciones',kinds:['OBSERVATION']},
 {key:'ANALYSIS',label:'Análisis e hipótesis',kinds:['ANALYSIS','HYPOTHESIS','EPISTEMIC_ASSESSMENT','UNRESOLVED_QUESTION','CONTRADICTION']},
 {key:'EVIDENCE',label:'Evidencia admitida',kinds:['EVIDENCE']},
 {key:'GOVERNANCE',label:'Decisiones',kinds:['GOVERNANCE_DECISION','RECOMMENDATION']},
 {key:'EXECUTION',label:'Ejecuciones',kinds:['INTERVENTION','INSTRUMENT_RUN']},
 {key:'RETURN',label:'RETURN',kinds:['RETURN']},
];
function stringify(v:unknown):string{
 if(typeof v==='string')return v;
 if(v===null||v===undefined)return 'Sin dato';
 return JSON.stringify(v,null,2);
}
export function RealityChainCaseInspector({objects,caseId}:{objects:CaseObject[];caseId:string}){
 const [filter,setFilter]=useState('ALL');
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState<string|null>(null);
 const [limit,setLimit]=useState(40);
 const filtered=useMemo(()=>objects.filter(o=>{
  const group=CATEGORIES.find(g=>g.key===filter);
  if(group&&!group.kinds.includes(o.kind))return false;
  const q=query.trim().toLocaleLowerCase();
  return !q||[o.kind,o.epistemicRole,o.canonicalRef?.id,JSON.stringify(o.payload)].join(' ').toLocaleLowerCase().includes(q);
 }),[objects,filter,query]);
 const focused=objects.find(o=>o.id===selected);
 return <section aria-label="Explorador detallado del expediente" style={{padding:'1.5rem',background:'#171819',color:'#f0ede7',border:'1px solid #625b50',margin:'1.5rem 0'}}>
  <h2 style={{fontSize:'1.3rem'}}>EXPEDIENTE / EXPLORADOR</h2>
  <p>Inspección de objetos persistidos. Los registros no se promueven automáticamente a evidencia ni RETURN.</p>
  <p><strong>{objects.length} objetos</strong> · Caso <code>{caseId}</code></p>
  <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}}>
   <button type="button" aria-pressed={filter==='ALL'} onClick={()=>{setFilter('ALL');setLimit(40);}}>Todos ({objects.length})</button>
   {CATEGORIES.map(g=><button type="button" key={g.key} aria-pressed={filter===g.key} onClick={()=>{setFilter(g.key);setLimit(40);}}>{g.label} ({objects.filter(o=>g.kinds.includes(o.kind)).length})</button>)}
  </div>
  <label>Buscar dentro del expediente
   <input style={{display:'block',width:'100%',padding:10,margin:'8px 0 16px',background:'#292a2a',color:'white'}} value={query} onChange={e=>{setQuery(e.target.value);setLimit(40);}} placeholder="Referencia, contenido, tipo, decisión..." />
  </label>
  <p>{filtered.length} coincidencias. Se muestran {Math.min(limit,filtered.length)}.</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,350px),1fr))',gap:16}}>
   <div style={{maxHeight:520,overflowY:'auto'}}>
    {filtered.slice(0,limit).map(o=><button type="button" key={o.id} onClick={()=>setSelected(o.id)} aria-pressed={selected===o.id} style={{display:'block',width:'100%',textAlign:'left',marginBottom:6,padding:12,background:selected===o.id?'#514839':'#252626',color:'white',border:'1px solid #777'}}>
     <strong>{o.kind} · {o.epistemicRole}</strong><span style={{display:'block',overflowWrap:'anywhere'}}>{o.canonicalRef?.id||o.id}</span><small>{o.createdAt}</small>
    </button>)}
    {limit<filtered.length&&<button type="button" onClick={()=>setLimit(n=>n+100)}>Mostrar 100 más</button>}
   </div>
   <article style={{minWidth:0,overflowWrap:'anywhere'}}>
    {focused?<><h3>Detalle verificable</h3><p><strong>Tipo:</strong> {focused.kind} · {focused.epistemicRole}</p>
     <p><strong>Referencia:</strong> {focused.canonicalRef?.id||'No representada'}</p>
     <p><strong>Registrado:</strong> {focused.createdAt}</p>
     <p><strong>Observado:</strong> {focused.observedAt||'No representado'}</p>
     <p><strong>Fuentes:</strong> {focused.sourceRefs?.map(r=>r.id).join(', ')||'Sin referencias'}</p>
     <p><strong>Registros relacionados:</strong> {focused.recordRefs?.map(r=>r.id).join(', ')||'Sin referencias'}</p>
     <p><strong>Evidencias relacionadas:</strong> {focused.evidenceRefs?.map(r=>r.id).join(', ')||'Sin referencias'}</p>
     <h4>Contenido persistido</h4><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:380,overflowY:'auto'}}>{stringify(focused.payload)}</pre>
     </>:<p>Selecciona un objeto para consultar su contenido, procedencia y referencias.</p>}
   </article>
  </div>
 </section>;
}
