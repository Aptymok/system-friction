'use client';

import { useMemo,useState } from 'react';
import { studioAttractorProjection } from './studioAttractorProjection';
import {
  planStudioContinuityCampaign,
  type CampaignChannel,type CampaignConstraints,type CampaignPhase,type CampaignOutput,
  type CampaignEvidenceInput,
} from './localNarrativeCampaignPlanner';

type Row=Record<string,unknown>;
const CHANNELS:CampaignChannel[]=['instagram','tiktok','youtube','website','newsletter'];
const PHASES:CampaignPhase[]=['PRE_RELEASE','RELEASE','POST_RELEASE','REACTIVATION','TRANSITION'];
const PRETTY:Record<CampaignPhase,string>={
  PRE_RELEASE:'Previo al lanzamiento',RELEASE:'Lanzamiento',POST_RELEASE:'Posterior al lanzamiento',
  REACTIVATION:'Reactivación',TRANSITION:'Transición a otra obra',
};
function text(value:unknown):string{return typeof value==='string'?value:'';}
function localDay(){
  const date=new Date();return [
    date.getFullYear(),
    String(date.getMonth()+1).padStart(2,'0'),
    String(date.getDate()).padStart(2,'0'),
  ].join('-');
}
function download(name:string,contents:string,type:string){
  const url=URL.createObjectURL(new Blob([contents],{type}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function csv(artifact:CampaignOutput):string{
  const quote=(value:string)=>'"'+value.replace(/"/g,'""')+'"';
  const lines=[['date','channel','format','assignment','expected_observation','t0','t1','status']];
  for(const item of artifact.schedule)lines.push([
    item.date,item.channel,item.format,item.assignment,item.expectedObservation,
    item.t0,item.t1,item.state,
  ]);
  return lines.map(line=>line.map(quote).join(',')).join('\r\n');
}
function calendar(artifact:CampaignOutput):string{
  const clean=(input:string)=>input.replace(/\\/g,'\\\\').replace(/,/g,'\\,')
    .replace(/;/g,'\\;').replace(/\n/g,'\\n');
  const rows=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SFI Studio//Campaign proposals//ES',
    'X-WR-CALNAME:'+clean(artifact.anchor.title+' · propuesta no autorizada')];
  for(const [index,item] of artifact.schedule.entries()){
    const day=item.date.replace(/-/g,'');
    const next=new Date(Date.parse(item.date+'T12:00:00Z')+86_400_000).toISOString().slice(0,10).replace(/-/g,'');
    rows.push('BEGIN:VEVENT','UID:sfi-proposed-'+index+'-'+day+'@studio.local',
      'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
      'DTSTART;VALUE=DATE:'+day,'DTEND;VALUE=DATE:'+next,
      'SUMMARY:'+clean('BORRADOR · '+item.channel+' · '+artifact.anchor.title),
      'DESCRIPTION:'+clean(item.assignment+' | Sin publicación autorizada. T1: '+item.t1),
      'STATUS:TENTATIVE','END:VEVENT');
  }
  rows.push('END:VCALENDAR');return rows.join('\r\n')+'\r\n';
}
function photoBrief(artifact:CampaignOutput,index:number):string{
  const directions=[
    'fotografía editorial anamórfica 35 mm, luz fría con un solo punto cálido',
    'retrato ambiental cinematográfico, composición de espacio negativo',
    'fotografía documental nocturna, profundidad de campo reducida',
    'escena urbana realista, sombras suaves y perspectiva arquitectónica',
    'fotografía íntima de un objeto significativo, textura analógica',
    'composición fotográfica de transición, planos reflejados y continuidad de lugar',
  ];
  const motifs=artifact.continuity.preservedNarrative.slice(0,3);
  return [
    'DIRECCIÓN FOTOGRÁFICA '+(index+1),
    directions[index%directions.length],
    'Obra: '+artifact.anchor.title,
    'Fase editorial: '+PRETTY[artifact.phase],
    'Motivos declarados: '+(motifs.join(' · ')||'No constan en el registro: definir antes de generar.'),
    'Conservar identidad fotográfica; prohibido reemplazar la escena por figuras geométricas.',
    'Una imagen independiente por salida, enfoque editorial, sin palabras integradas.',
    'Estado: propuesta no generada. Proveedor, derechos, costo y autorización pendientes.',
  ].join('\n');
}
type WorldRead={
  ok:boolean;error?:string;sourceStatus?:string;
  retrievedAt?:string;
  worldVector?:unknown;
  observations?:Array<{id:string;title:string;sourceUrl:string;observedAt:string;publishedAt:string|null}>;
  warnings?:string[];
};
export default function StudioCampaignDesk({objects,sessions}:{objects:Row[];sessions:Row[]}){

  const knownSessions=useMemo(()=>sessions.filter(session=>{
    const metadata=session.metadata;
    const stored=metadata!==null&&typeof metadata==='object'&&!Array.isArray(metadata)
      ?metadata as Row:{};
    const field=stored.field!==null&&typeof stored.field==='object'&&!Array.isArray(stored.field)
      ?stored.field as Row:{};
    const attr=field.attractor!==null&&typeof field.attractor==='object'&&!Array.isArray(field.attractor)
      ?field.attractor as Row:{};
    return typeof attr.id==='string'&&Boolean(attr.id.trim());
  }),[sessions]);
  const [sessionId,setSessionId]=useState('');
  const selectedSessionId=knownSessions.some(s=>s.id===sessionId)?sessionId:text(knownSessions[0]?.id);
  const sessionNodes=useMemo(()=>{
    const session=sessions.find(s=>s.id===selectedSessionId);
    const nodes=studioAttractorProjection(objects.filter(o=>o.session_id===selectedSessionId),
      session?[session]:[]).nodes;
    return nodes.filter(n=>n.kind==='project'||n.kind==='node'||n.kind==='attractor'||n.kind==='object');
  },[objects,sessions,selectedSessionId]);
  const [anchorId,setAnchorId]=useState('');
  const selectedAnchorId=sessionNodes.some(n=>n.id===anchorId)?anchorId:
    sessionNodes.find(n=>n.kind==='project')?.id??sessionNodes[0]?.id??'';
  const [intent,setIntent]=useState('');
  const [phase,setPhase]=useState<CampaignPhase>('POST_RELEASE');
  const [startDate,setStartDate]=useState(localDay);
  const [weeks,setWeeks]=useState(3);
  const [channels,setChannels]=useState<CampaignChannel[]>(['instagram','tiktok']);
  const [formats,setFormats]=useState<Array<'PHOTOGRAPH'|'VIDEO'|'TEXT'|'AUDIO'>>(['PHOTOGRAPH','VIDEO','TEXT']);
  const [candidates,setCandidates]=useState('');
  const [world,setWorld]=useState<WorldRead|null>(null);
  const [worldBusy,setWorldBusy]=useState(false);
  const [plan,setPlan]=useState<CampaignOutput|null>(null);
  const [planSessionId,setPlanSessionId]=useState('');
  const [status,setStatus]=useState('');
  const [saving,setSaving]=useState(false);
  const [history,setHistory]=useState<Array<{id:string;createdAt:string;plan:CampaignOutput|null}>>([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  function interpret(){
    const normalized=intent.trim().toLocaleLowerCase();
    if(!normalized)return;
    const found=PHASES.find(p=>normalized.includes(p.toLowerCase().replace('_','-')));
    if(found)setPhase(found);
    else if(/post.?release|despu[eé]s|posterior/.test(normalized))setPhase('POST_RELEASE');
    else if(/pre.?release|antes|previo/.test(normalized))setPhase('PRE_RELEASE');
    else if(/reactiva/.test(normalized))setPhase('REACTIVATION');
    else if(/transici[oó]n/.test(normalized))setPhase('TRANSITION');
    else if(/lanzamiento|estreno/.test(normalized))setPhase('RELEASE');
    const matches=sessionNodes.filter(n=>n.kind!=='attractor'&&
      normalized.includes(n.label.toLocaleLowerCase()));
    matches.sort((a,b)=>b.label.length-a.label.length);
    if(matches.length)setAnchorId(matches[0].id);
    setStatus(matches.length?'Intención interpretada contra un nodo registrado; revisa el alcance.':
      'Fase interpretada. Selecciona el objeto si el texto no coincide con un nodo registrado.');
  }
  function toggle<T>(v:T,selected:T[],set:(next:T[])=>void){
    set(selected.includes(v)?selected.filter(item=>item!==v):[...selected,v]);
  }
  async function readWorld(){
    if(worldBusy)return;
    setWorldBusy(true);setWorld(null);
    try {
      const response=await fetch('/api/studio/campaign/world-evidence',{cache:'no-store'});
      const result=await response.json() as WorldRead;
      if(!response.ok||!result.ok)throw new Error(result.error||'WORLD_READ_UNAVAILABLE');
      setWorld(result);
      setStatus('Fuentes públicas consultadas. No se ha inferido intención de escucha ni eventos futuros a partir de titulares.');
    }catch(error){setStatus('Lectura mundial falló: '+(error instanceof Error?error.message:String(error)));}
    finally{setWorldBusy(false);}
  }
  function build(){
    setPlan(null);setPlanSessionId('');
    const sources=(world?.observations??[]).slice(0,30).filter(x=>x.observedAt&&x.sourceUrl);
    const observations:CampaignEvidenceInput[]=sources.map(source=>({
      sourceUrl:source.sourceUrl,sourceTitle:source.title||'Fuente sin título',
      observedAt:source.observedAt,relevance:'UNKNOWN',
      relevanceRationale:'Indexación pública: relevancia cultural no adjudicada',
      observationKind:'PAST_SIGNAL',
    }));
    const constraint:CampaignConstraints={
      anchorId:selectedAnchorId,phase,startDate,weeks,channels,assetFormats:formats,
      releaseCandidates:candidates.split(/[\s,;]+/).filter(Boolean).slice(0,16),
      externalObservations:observations,
    };
    try{
      const session=sessions.find(s=>s.id===selectedSessionId);
      const local=studioAttractorProjection(objects.filter(o=>o.session_id===selectedSessionId),session?[session]:[]);
      const result=planStudioContinuityCampaign(local,constraint);
      setPlan(result);setPlanSessionId(selectedSessionId);
      setStatus(result.schedule.length+' piezas propuestas. Sin ejecución, publicación ni costos de proveedor.');
    }catch(error){setStatus('Plan no generado: '+(error instanceof Error?error.message:String(error)));}
  }
  async function save(){
    if(!plan||saving||planSessionId!==selectedSessionId)return;
    setSaving(true);
    try{
      const constraint:CampaignConstraints={
        anchorId:plan.anchor.id,phase:plan.phase,startDate:plan.timeWindow.start,
        weeks:plan.timeWindow.weeks,
        channels:[...new Set(plan.schedule.map(s=>s.channel))],
        assetFormats:[...new Set(plan.schedule.map(s=>s.format))],
        releaseCandidates:plan.releaseWindows.map(s=>s.date),
        externalObservations:plan.evidence.observations,
      };
      const response=await fetch('/api/studio/campaign/plans',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({sessionId:planSessionId,constraints}),
      });
      const result=await response.json() as {ok:boolean;archivedEventId?:string;archiveReadback?:string;error?:string};
      if(!response.ok||!result.ok||result.archiveReadback!=='VERIFIED_PERSISTED'){
        throw new Error(result.error??'ARCHIVE_READBACK_UNVERIFIED');
      }
      setStatus('Plan guardado y releído del archivo de Studio: '+result.archivedEventId+'. Sin publicación ejecutada.');
      await loadHistory();
    }catch(error){setStatus('No se verificó persistencia: '+(error instanceof Error?error.message:String(error)));}
    finally{setSaving(false);}
  }
  async function loadHistory(){
    if(!selectedSessionId||historyLoading)return;
    setHistoryLoading(true);
    try{
      const response=await fetch('/api/studio/campaign/plans?sessionId='+encodeURIComponent(selectedSessionId),{cache:'no-store'});
      const result=await response.json() as {ok:boolean;plans?:Array<{id:string;createdAt:string;plan:CampaignOutput|null}>;error?:string};
      if(!response.ok||!result.ok)throw new Error(result.error||'ARCHIVE_UNAVAILABLE');
      setHistory(result.plans??[]);
      setStatus('Recuperadas '+(result.plans?.length??0)+' propuestas anteriores de esta sesión.');
    }catch(error){setStatus('Historial no disponible: '+(error instanceof Error?error.message:String(error)));}
    finally{setHistoryLoading(false);}
  }
  const ctrl={padding:'9px 11px',background:'#122b3b',border:'1px solid #466c85',
    color:'#e8f6fc',fontSize:12} as const;
  const btn={padding:'10px 12px',background:'#23526a',border:'1px solid #669aba',
    color:'#e8f6fc',cursor:'pointer',fontSize:12} as const;
  const validPlan=plan!==null&&planSessionId===selectedSessionId;
  return <section style={{padding:16,border:'1px solid rgba(144,205,233,.34)',
    background:'rgba(15,34,50,.35)',display:'grid',gap:13}}>
    <span style={{fontSize:11,color:'#8bc9e5',letterSpacing:'.15em'}}>
      CAMPAÑAS · CONTINUIDAD Y FECHAS
    </span>
    <h2 style={{fontSize:22,margin:0,fontWeight:500}}>Planificar desde un atractor existente</h2>
    <p style={{fontSize:12,color:'#aac2d1',margin:0,lineHeight:1.5}}>
      Elige una sesión y una obra registrada. El plan recupera únicamente vínculos declarados:
      no inventa antecedentes KXTXR, publicaciones, autorizaciones ni resultados.
      Una propuesta puede funcionar sin completar todo el álbum.
    </p>
    <label style={{display:'grid',gap:5}}>Sesión de Studio
      <select value={selectedSessionId} onChange={e=>{setSessionId(e.target.value);setAnchorId('');setPlan(null);setHistory([]);}} style={ctrl}>
        {knownSessions.map(session=><option key={text(session.id)} value={text(session.id)}>
          {text(session.title)||text(session.id)}</option>)}
      </select>
    </label>
    {!knownSessions.length&&<p style={{fontSize:12,color:'#d6bb9a',margin:0}}>
      No hay una sesión con atractor registrado. Se necesita declarar el atractor mediante Studio Field;
      Studio no inventará una genealogía para mostrar un ejemplo.
    </p>}
    {knownSessions.length>0&&<>
      <label style={{display:'grid',gap:5}}>Describe el encargo
        <input value={intent} onChange={e=>setIntent(e.target.value)}
          placeholder="Campaña post-release de QUE NO" style={ctrl}/>
      </label>
      <button type="button" onClick={interpret} style={{...btn,justifySelf:'start'}}>
        INTERPRETAR ENCARGO CONTRA NODOS REALES
      </button>
      <label style={{display:'grid',gap:5}}>Obra, proyecto o atractor
        <select value={selectedAnchorId} onChange={e=>{setAnchorId(e.target.value);setPlan(null);}} style={ctrl}>
          {sessionNodes.map(node=><option key={node.id} value={node.id}>
            {node.kind.toUpperCase()} · {node.label}
          </option>)}
        </select>
      </label>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10}}>
        <label style={{display:'grid',gap:5}}>Fase
          <select value={phase} onChange={e=>setPhase(e.target.value as CampaignPhase)} style={ctrl}>
            {PHASES.map(p=><option key={p} value={p}>{PRETTY[p]}</option>)}
          </select>
        </label>
        <label style={{display:'grid',gap:5}}>Inicio
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={ctrl}/>
        </label>
        <label style={{display:'grid',gap:5}}>Semanas
          <input type="number" min={1} max={12} value={weeks}
            onChange={e=>setWeeks(Number(e.target.value))} style={ctrl}/>
        </label>
      </div>
      <div style={{display:'grid',gap:6}}>
        <strong style={{fontSize:12}}>Canales</strong>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          {CHANNELS.map(channel=><label key={channel} style={{fontSize:12}}>
            <input type="checkbox" checked={channels.includes(channel)}
              onChange={()=>toggle(channel,channels,setChannels)}/> {channel}
          </label>)}
        </div>
      </div>
      <div style={{display:'grid',gap:6}}>
        <strong style={{fontSize:12}}>Materiales por producir</strong>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          {(['PHOTOGRAPH','VIDEO','TEXT','AUDIO'] as const).map(format=><label key={format} style={{fontSize:12}}>
            <input type="checkbox" checked={formats.includes(format)}
              onChange={()=>toggle(format,formats,setFormats)}/> {format}
          </label>)}
        </div>
      </div>
      <label style={{display:'grid',gap:5}}>Fechas candidatas de estreno (opcional, YYYY-MM-DD)
        <input value={candidates} onChange={e=>setCandidates(e.target.value)}
          placeholder="2027-01-08, 2027-01-22" style={ctrl}/>
      </label>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button type="button" disabled={worldBusy} onClick={readWorld} style={btn}>
          {worldBusy?'LEYENDO MUNDO…':'CONSULTAR MOVIMIENTO OBSERVADO DEL MUNDO'}
        </button>
        <button type="button" disabled={!selectedAnchorId} onClick={build}
          style={{...btn,background:'#24624d'}}>GENERAR PLAN Y CONTRASTE</button>
        <button type="button" disabled={historyLoading} onClick={loadHistory} style={btn}>
          RECUPERAR CAMPAÑAS ANTERIORES
        </button>
      </div>
      {world&&<p style={{fontSize:11,color:'#c8e0e9',margin:0}}>
        World: {world.sourceStatus??'SIN ESTADO'} ·
        {' '+(world.observations?.length??0)+' referencias públicas'} ·
        No se deducen tendencias de audiencia ni eventos futuros desde titulares.
      </p>}
      {validPlan&&<>
        <div style={{display:'grid',gap:5,padding:10,border:'1px solid rgba(105,190,170,.3)'}}>
          <strong>{plan.anchor.title} · {PRETTY[plan.phase]}</strong>
          <span style={{fontSize:12,color:'#b6c9d4'}}>
            {plan.timeWindow.start} → {plan.timeWindow.end} · {plan.schedule.length} asignaciones ·
            {' '+plan.continuity.relationCount+' vínculos registrados'}
          </span>
          <span style={{fontSize:12,color:'#b6c9d4'}}>
            Antecedentes: {plan.ancestry.map(n=>n.title).join(' / ')||'NINGUNO REGISTRADO'} ·
            Descendientes: {plan.descendants.map(n=>n.title).join(' / ')||'NINGUNO REGISTRADO'}
          </span>
          <span style={{fontSize:11,color:'#d6ba9d'}}>
            Estado: PROPUESTA. No hay publicación, inversión, hipótesis ganadora ni RETURN ejecutado.
          </span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{borderCollapse:'collapse',width:'100%',fontSize:11}}>
            <thead><tr>{['Fecha','Canal','Formato','Acción','T1'].map(label=>
              <th key={label} style={{padding:7,textAlign:'left',borderBottom:'1px solid #506c7f'}}>{label}</th>)}
            </tr></thead>
            <tbody>{plan.schedule.map((item,index)=><tr key={index}>
              <td style={{padding:7}}>{item.date}</td>
              <td style={{padding:7}}>{item.channel}</td>
              <td style={{padding:7}}>{item.format}</td>
              <td style={{padding:7}}>{item.assignment}</td>
              <td style={{padding:7}}>{item.t1}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {plan.releaseWindows.length>0&&<div style={{display:'grid',gap:6}}>
          <strong>Ventanas de estreno propuestas, sin ranking calibrado</strong>
          {plan.releaseWindows.map(item=><p key={item.date} style={{fontSize:12,margin:0}}>
            {item.date} · Coincidencias de eventos futuros documentados: {item.conflicts.length} ·
            Estado: REQUIERE CONTRASTE
          </p>)}
        </div>}
        {plan.schedule.some(s=>s.format==='PHOTOGRAPH')&&<details>
          <summary>Seis direcciones fotográficas para producción</summary>
          <div style={{display:'grid',gap:8,paddingTop:10}}>
            {Array.from({length:6},(_,index)=><pre key={index} style={{
              whiteSpace:'pre-wrap',padding:10,background:'#142c39',fontSize:11,
            }}>{photoBrief(plan,index)}</pre>)}
          </div>
        </details>}
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          <button type="button" style={btn} onClick={()=>download(
            'studio-campaign-'+plan.anchor.title.replace(/[^a-z0-9]+/gi,'-')+'.json',
            JSON.stringify(plan,null,2),'application/json')}>DESCARGAR PLAN Y EVIDENCIA JSON</button>
          <button type="button" style={btn} onClick={()=>download(
            'studio-campaign-schedule.csv',csv(plan),'text/csv')}>DESCARGAR CALENDARIO CSV</button>
          <button type="button" style={btn} onClick={()=>download(
            'studio-campaign-proposal.ics',calendar(plan),'text/calendar')}>CALENDARIO ICS</button>
          <button type="button" style={{...btn,background:'#24624d'}}
            disabled={saving} onClick={save}>{saving?'GUARDANDO…':'GUARDAR PLAN EN STUDIO'}</button>
        </div>
      </>}
      {history.length>0&&<div style={{display:'grid',gap:6}}>
        <strong>Expedientes de campaña persistidos</strong>
        {history.map(entry=><button key={entry.id} type="button"
          onClick={()=>{if(entry.plan){setPlan(entry.plan);setPlanSessionId(selectedSessionId);
            setStatus('Expediente recuperado de Studio, propuesta histórica sin publicar.');}}}
          style={{...btn,textAlign:'left'}}>
          {entry.createdAt} · {entry.plan?.anchor.title??'Sin plan legible'} ·
          {' '+(entry.plan?.phase??'desconocida')}
        </button>)}
      </div>}
      {status&&<p role="status" style={{color:'#c6e4d7',margin:0,fontSize:12}}>{status}</p>}
    </>}
  </section>;
}
