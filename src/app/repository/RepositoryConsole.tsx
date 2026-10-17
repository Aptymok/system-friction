'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { PublicPassportReading } from '@/lib/repository/publicPassportProjection';

export type RepositoryEditorial={
  editorialKind:string;
  collection:string;
  observationKind:string|null;
  language:string;
  series:string;
  issue:string;
  subtitle:string;
  motto:string;
  deck:string;
  publishedAt:string;
  mediumUrl:string|null;
  coverImage:string|null;
  contentState:string;
  visuals:Array<{id:string;src:string;alt:string;caption:string}>;
  renditions:Array<{kind:string;mediaType:string;filename:string;byteLength:number;sha256:string;publicUrl:string|null;state:string}>;
  sections:Array<{id:string;title:string;paragraphs:string[];items?:string[]}>;
  cadence:Array<{interval:string;name:string;scope:string}>;
  domains:string[];
  epistemicBoundary:string[];
  temporalProfile:({code:string;coordinate:string;year:number;month:number;phase:string;state:string;returnState:string;cutoffLabel:string;scopeLabel:string;authorityLabel:string;nextAuthority:string;followUpPrompts:string[]})|null;
};

export type RepositoryDiscovery={
  ownedMachineSurfaceCount:number;
  channels:Array<{id:string;state:string;basis:string}>;
  lifecycle:Array<{id:string;meaning:string;state:string}>;
  machineLinks:Array<{label:string;href:string}>;
  crawlerBots:string[];
  trainingReuse:string;
  publicApiPaths:string[];
};

export type RepositoryObject={
  id:string;
  slug:string;
  objectKey:string;
  objectType:string;
  canonicalUrl:string;
  title:string;
  summary:string;
  epistemicState:string;
  version:string;
  language:string;
  authors:string[];
  methods:string[];
  relatedObjects:string[];
  sourceRefs:string[];
  evidenceRefs:string[];
  publicState:string;
  publicationState:string;
  license:string|null;
  createdAt:string;
  updatedAt:string;
  limitations:string[];
  missing:Array<{field:string;reason:string;sourceRef:string}>;
  editorial:RepositoryEditorial|null;
};


type Filter='ALL'|'PUBLICATION'|'OBSERVATION'|'REPORT'|'PAPER'|'METHOD'|'DATASET'|'RETURN'|'INSTRUMENT'|'SOFTWARE';
type Selection={kind:'object'|'source'|'evidence';id:string};
type ReaderMode='LECTURA'|'FUENTES'|'FICHA';
const palette:Record<string,string>={PUBLICATION:'gold',REPORT:'teal',PAPER:'blue',METHOD:'violet',DATASET:'mint',RETURN:'red',OBSERVATION:'teal',SOFTWARE:'blue',INSTRUMENT:'gold',SOURCE:'blue',EVIDENCE:'mint'};
const uniq=(arr:readonly string[])=>[...new Set(arr.filter(Boolean))];
const date=(x:string)=>Number.isFinite(Date.parse(x))?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium'}).format(new Date(x)):'No consta';
const short=(s:string,n=44)=>s.length>n?s.slice(0,n-1)+'…':s;
const safeURL=(s:string)=>{try{const url=new URL(s);return url.protocol==='https:'||url.protocol==='http:'?url.href:null}catch{return null}};
const value=(s:string|null|undefined)=>s&&s.trim()?s:'No consta';
const passportTile=(key:string,label:string,tone:string,children:ReactNode,open=false)=><details key={key} className="repoPassportTile" data-tone={tone} open={open}><summary>{label}<span aria-hidden="true">⌄</span></summary><div className="repoTileContent">{children}</div></details>;

export function RepositoryConsole({objects,initialObject,discovery,publicReadings}:{objects:readonly RepositoryObject[];initialObject:string|null;discovery:RepositoryDiscovery;publicReadings:Record<string,PublicPassportReading>}){
  const initial=objects.find(x=>x.id===initialObject||x.slug===initialObject)||objects[0];
  const [selection,setSelection]=useState<Selection>({kind:'object',id:initial?.id||''});
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<Filter>('ALL');
  const [platform,setPlatform]=useState('ALL');
  const [order,setOrder]=useState<'new'|'old'|'name'>('new');
  const [view,setView]=useState<'cards'|'graph'>('cards');
  const [readerOpen,setReaderOpen]=useState(true);
  const [readerMode,setReaderMode]=useState<ReaderMode>('LECTURA');
  const [zoom,setZoom]=useState(1);
  const [timelineYear,setTimelineYear]=useState<number|null>(null);
  const horizontal=useRef<HTMLDivElement>(null);
  const readerRef=useRef<HTMLDivElement>(null);
  const selectedObject=objects.find(x=>x.id===selection.id)||null;
  const connected=selection.kind==='object'?selectedObject:
    objects.find(o=>(selection.kind==='source'?o.sourceRefs:o.evidenceRefs).includes(selection.id))||null;
  const active=selectedObject||connected;
  const reading=selection.kind==='object'&&active?(publicReadings[active.id]||publicReadings[active.slug]||publicReadings[active.objectKey]):null;
  const sources=useMemo(()=>uniq(objects.flatMap(o=>o.sourceRefs)),[objects]);
  const evidence=useMemo(()=>uniq(objects.flatMap(o=>o.evidenceRefs)),[objects]);
  const related=useMemo(()=>uniq(objects.flatMap(o=>o.relatedObjects)),[objects]);
  const versions=useMemo(()=>uniq(objects.map(o=>o.version)),[objects]);
  const matched=useMemo(()=>{
    const q=query.toLocaleLowerCase().trim();
    return objects.filter(o=>
      (filter==='ALL'||o.objectType===filter)&&
      (platform==='ALL'||(platform==='MEDIUM'?Boolean(o.editorial?.mediumUrl):platform==='SFI'?Boolean(o.canonicalUrl):false))&&
      (!timelineYear||new Date(o.createdAt).getFullYear()===timelineYear)&&
      (!q||[o.title,o.summary,o.id,o.objectKey,o.objectType,...o.sourceRefs,...o.evidenceRefs,...o.methods].join(' ').toLocaleLowerCase().includes(q))
    ).sort((a,b)=>order==='name'?a.title.localeCompare(b.title):order==='old'?Date.parse(a.createdAt)-Date.parse(b.createdAt):Date.parse(b.createdAt)-Date.parse(a.createdAt));
  },[objects,filter,platform,query,order,timelineYear]);
  const select=(kind:Selection['kind'],id:string)=>{
    setSelection({kind,id});setReaderOpen(true);setReaderMode('LECTURA');
    const ref=kind==='object'?objects.find(o=>o.id===id):null;
    if(ref&&typeof window!=='undefined')window.history.replaceState({},'', '/repository?object='+encodeURIComponent(ref.slug));
  };
  const goto=(index:number)=>horizontal.current?.scrollTo({left:index*590,behavior:'smooth'});
  const jumpReader=()=>{setReaderOpen(true);readerRef.current?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})};
  const yearList=uniq(objects.map(o=>String(new Date(o.createdAt).getFullYear())).filter(y=>y!=='NaN')).sort();
  const categories:[string,number|string][]=[['SOURCE RECORDS',sources.length],['EVIDENCE',evidence.length],['PUBLICATIONS',objects.filter(o=>o.objectType==='PUBLICATION').length],['CASE OBJECTS',related.length],['PROVENANCE',sources.length],['VERSIONS',versions.length],['HASHES','NOT MATERIALIZED'],['LINEAGE',related.length],['MANIFESTS',objects.length]];
  const safeDoc=selection.kind==='object'?active?.editorial?.renditions.find(r=>r.publicUrl&&safeURL(r.publicUrl) && (r.mediaType==='application/pdf'||r.filename.toLowerCase().endsWith('.pdf')))||null:null;
  const graphObjects=matched.slice(0,15);
  const graphSources=uniq(graphObjects.flatMap(o=>o.sourceRefs)).slice(0,10);
  const graphLayout=new Map<string,{x:number,y:number}>();
  graphObjects.forEach((o,i)=>graphLayout.set(o.id,{x:120+(i%5)*150+(Math.floor(i/5)%2)*27,y:80+Math.floor(i/5)*112}));
  graphSources.forEach((s,i)=>graphLayout.set('source:'+s,{x:100+(i%5)*170,y:405+Math.floor(i/5)*65}));
  const nodeEdges=graphObjects.flatMap(o=>o.sourceRefs.filter(s=>graphLayout.has('source:'+s)).map(s=>({a:o.id,b:'source:'+s})));
  const description=selection.kind==='object'?active?.summary:selection.kind==='source'?'Fuente citada en el registro público. La cita no equivale a evidencia independiente.':'Identificador de evidencia referido por el objeto. Su contenido no se publica automáticamente.';
  const objectTitle=selection.kind==='object'?active?.title||'Sin objeto':short(selection.id,68);
  const stateText=selection.kind==='object'?active?.epistemicState:'REFERENCIA';
  const showRow=(label:string,text:string|null|undefined)=><div className="repoFieldRow" key={label}><span>{label}</span><strong>{value(text)}</strong></div>;
  const selectSource=(ref:string)=>select('source',ref);
  const activateTimeline=(id:string)=>{select('object',id);goto(2)};
  return <main className="repositoryShell repoLiveV2">
    <div className="repoToolbar">
      <span className="repoToolbarIdentity">REPOSITORY <small>ARCHIVO PÚBLICO · PASSPORT CONTEXTUAL</small></span>
      <label className="repoQuery"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar publicaciones, métodos, fuentes y evidencia..." aria-label="Buscar registros"/></label>
      <select aria-label="Filtrar plataforma" value={platform} onChange={e=>setPlatform(e.target.value)}><option value="ALL">Todas las plataformas</option><option value="SFI">SFI</option><option value="MEDIUM">Medium</option></select>
      <select aria-label="Ordenar" value={order} onChange={e=>setOrder(e.target.value as 'new'|'old'|'name')}><option value="new">Más recientes</option><option value="old">Más antiguos</option><option value="name">Título A–Z</option></select>
      <button type="button" onClick={()=>setView(view==='cards'?'graph':'cards')} aria-pressed={view==='graph'}>{view==='cards'?'VER GRAFO':'VER TARJETAS'}</button>
    </div>
    <div className="repoFieldScroll" ref={horizontal} aria-label="Campo horizontal del Repository" tabIndex={0}>
      <div className="repoFieldTrack">
        <aside className="repoIdentity repoFloating">
          <span>EXPLORA</span><p>Selecciona una clase de objeto. El Passport se construye con la información autorizada que exista.</p>
          <div className="repoCategoryList">{categories.map(([k,count])=><div key={k}><i/><span>{k}</span><b>{count}</b></div>)}</div>
          <div className="repoNarrowFilters">{(['ALL','PUBLICATION','OBSERVATION','REPORT','PAPER','METHOD','DATASET','RETURN','INSTRUMENT','SOFTWARE'] as Filter[]).map(t=><button key={t} data-active={filter===t} onClick={()=>setFilter(t)}>{t==='ALL'?'TODOS':t}</button>)}</div>
          <p className="repoScopeNote">Conteos del registro admitido, no del inventario privado de SFI.</p>
          <button className="repoPhaseButton" onClick={()=>goto(1)}>EXPLORAR ARCHIVO →</button>
        </aside>
        <section className="repoArchiveRail repoFloating" aria-label="Explorar material canónico">
          <div className="repoHero"><small>REPOSITORIO · NAVEGACIÓN INSTITUCIONAL</small><p>Selecciona un registro.<br/>Reconstruye su procedencia.</p><span>{matched.length} OBJETOS PÚBLICOS · SIN CIFRAS ILUSTRATIVAS</span></div>
          <div className="repoCategoryDoors">{(['PUBLICATION','METHOD','REPORT','DATASET'] as Filter[]).map(t=><button key={t} data-active={filter===t} onClick={()=>setFilter(t)}><strong>{t}</strong><small>{objects.filter(o=>o.objectType===t).length} objetos</small></button>)}</div>
          <div className="repoArchiveHead"><span>PUBLICATIONS / OBJECTS · {matched.length}</span><div><button data-active={view==='cards'} onClick={()=>setView('cards')}>TARJETAS</button><button data-active={view==='graph'} onClick={()=>setView('graph')}>CONEXIONES</button></div></div>
          {view==='cards'?<div className="repoObjectCards">{matched.map(o=><button key={o.id} className="repoObjectCard" data-tone={palette[o.objectType]||'gold'} data-active={o.id===selection.id} onClick={()=>select('object',o.id)}>
            <span className="repoObjectVisual">{o.editorial?.coverImage?<img src={o.editorial.coverImage} alt=""/>:<i aria-hidden="true">◇</i>}</span>
            <small>{o.objectType} · {o.epistemicState}</small><strong>{o.title}</strong><span>{short(o.summary,110)}</span><em>{date(o.createdAt)} · v{o.version}</em>
          </button>)}{!matched.length?<p className="repoNothing">No hay objetos públicos admitidos para este filtro. No se completan registros mediante inferencia.</p>:null}</div>:
            <div className="repoGraphWrap"><svg viewBox="0 0 900 560" role="img" aria-label="Conexiones verificadas entre objetos públicos y referencias de origen">
              {nodeEdges.map((edge,i)=>{const a=graphLayout.get(edge.a)!,b=graphLayout.get(edge.b)!;return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#c9aa74" strokeOpacity=".34" strokeWidth="1"/>})}
              {graphObjects.map(o=>{const p=graphLayout.get(o.id)!;return <g key={o.id} onClick={()=>select('object',o.id)} role="button" tabIndex={0} aria-label={'Abrir '+o.title} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')select('object',o.id)}} style={{cursor:'pointer'}}><circle cx={p.x} cy={p.y} r={o.id===selection.id?20:14} fill="#0c1317" stroke="#d3af68" strokeWidth="2"/><text x={p.x} y={p.y+32} fontSize="9" textAnchor="middle" fill="#f0ddba">{short(o.title,20)}</text></g>})}
              {graphSources.map(s=>{const p=graphLayout.get('source:'+s)!;return <g key={s} role="button" tabIndex={0} onClick={()=>selectSource(s)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')selectSource(s)}} style={{cursor:'pointer'}}><rect x={p.x-9} y={p.y-9} width="18" height="18" fill="#0e171d" stroke="#74b4c9" transform={`rotate(45 ${p.x} ${p.y})`}/><text x={p.x} y={p.y+29} textAnchor="middle" fontSize="8" fill="#acc0c8">{short(s.replace('https://',''),24)}</text></g>})}
            </svg><span>Solo se dibujan referencias efectivamente registradas. La conexión de origen no prueba corroboración.</span></div>}
          <div className="repoArchiveLower"><div className="repoRailColumn repoSources"><header><span>SOURCE RECORDS</span><b>{sources.length}</b></header><div className="repoRailScroll">{sources.slice(0,12).map(s=><button key={s} onClick={()=>selectSource(s)}><span>{short(s)}</span><small>REFERENCIA REGISTRADA</small></button>)}</div></div><div className="repoRailColumn repoEvidence"><header><span>EVIDENCE</span><b>{evidence.length}</b></header><div className="repoRailScroll">{evidence.slice(0,12).map(e=><button key={e} onClick={()=>select('evidence',e)}><span>{short(e)}</span><small>REFERENCIA · NO PUBLICA CONTENIDO</small></button>)}</div></div></div>
          <button className="repoPhaseButton" onClick={()=>goto(2)}>ABRIR PASSPORT →</button>
        </section>
        <section className="repoObjectInspector repoFloating" aria-live="polite">
          <div className="repoObjectState"><span>PASSPORT / {selection.kind.toUpperCase()}</span><b>{stateText}</b></div>
          <div className="repoPassportTitle">{objectTitle}</div><p>{description}</p>
          <div className="repoPassportTiles">
            {passportTile('id','IDENTIDAD · ESTADO · AUTORIDAD','gold',<>{showRow('ID',selection.id)}{showRow('TIPO',selection.kind==='object'?active?.objectType:selection.kind.toUpperCase())}{showRow('ESTADO EPISTÉMICO',stateText)}{showRow('PUBLICACIÓN',selection.kind==='object'?active?.publicationState:null)}{showRow('IDIOMA',selection.kind==='object'?active?.language:null)}{showRow('LICENCIA',selection.kind==='object'?active?.license:null)}{showRow('FECHA DE REGISTRO',selection.kind==='object'&&active?date(active.createdAt):null)}{showRow('VERSIÓN',selection.kind==='object'?active?.version:null)}</>,true)}
            {passportTile('prov','PROVENANCE · ORIGEN','blue',<><p>Los enlaces citados identifican procedencia; no demuestran independencia ni veracidad del evento.</p>{(selection.kind==='source'?[selection.id]:active?.sourceRefs||[]).map(s=><button className="repoPassportLink" key={s} onClick={()=>selectSource(s)}>{short(s,55)} <span>↗</span></button>)}{!(active?.sourceRefs.length)&&selection.kind!=='source'?<p>NOT OBSERVED · Sin fuentes explícitas</p>:null}</>)}
            {passportTile('t0','T0 / T1 · CONTRASTE TEMPORAL','teal',<>{reading&&(reading.t0||reading.t1)?<>{showRow('T0',reading.t0)}{showRow('T1',reading.t1)}</>:<p>NOT OBSERVED IN PUBLIC PROJECTION · No existe un T0/T1 publicado para este objeto. Su fecha de edición no sustituye la fecha de conocimiento.</p>}</>)}
            {reading?.sixQuestions.length?passportTile('six','6 PREGUNTAS · EVALUACIÓN','gold',<>{reading.sixQuestions.map((q,i)=><div key={i} className="repoQA"><b>{i+1}. {q.question}</b><p>{value(q.answer)}</p></div>)}</>):null}
            {reading?.hypothesis||reading?.rivalHypotheses.length?passportTile('h','HIPÓTESIS · RIVALES','red',<>{showRow('HIPÓTESIS',reading.hypothesis)}{reading.rivalHypotheses.map((h,i)=><p key={i}>Rival {i+1}: {h}</p>)}</>):null}
            {reading?.expectedReturn||reading?.observedReturn?passportTile('returns','RESULTADO · RETURN','mint',<>{showRow('ESPERADO',reading.expectedReturn)}{showRow('OBSERVADO',reading.observedReturn)}</>):null}
            {passportTile('lin','LINEAGE · CONEXIONES','mint',<><p>{active?.relatedObjects.length||0} objetos relacionados explícitos</p>{(active?.relatedObjects||[]).map(id=><button className="repoPassportLink" key={id} onClick={()=>select('object',id)}>{id}</button>)}{!(active?.relatedObjects.length)?<p>NOT OBSERVED · No se dibuja una relación inexistente.</p>:null}{showRow('EVIDENCIAS REFERIDAS',String(active?.evidenceRefs.length||0))}</>)}
            {passportTile('versions','VERSIONS · HASHES · MANIFEST','blue',<>{showRow('VERSIÓN',selection.kind==='object'?active?.version:null)}{showRow('OBJETO QUE LO REFERENCIA',active?.id)}{showRow('OBJECT KEY',selection.kind==='object'?active?.objectKey:null)}{showRow('HASHES','NOT MATERIALIZED')}{showRow('INTEGRIDAD','Object identity ≠ content hash.')}{showRow('FUENTES',String(active?.sourceRefs.length||0))}{showRow('MISSING',String(active?.missing.length||0))}{active?.missing.map(m=><p key={m.field}>{m.field}: {m.reason}</p>)}</>)}
            {passportTile('discovery','DISCOVERY MESH · EXPOSICIÓN','gold',<><p>{discovery.ownedMachineSurfaceCount} OWNED SURFACES</p>{discovery.channels.map(c=><div key={c.id} className="repoFieldRow"><span>{c.id}</span><strong>{c.state}</strong></div>)}<p>PUBLICATION = EXPOSURE · EXPOSURE ≠ DISCOVERY ≠ RECOGNITION ≠ INTERACTION ≠ RELATION ≠ PROPAGATION ≠ PULL ≠ RETURN</p></>)}
          </div>
          <button type="button" className="repoPrimaryAction" onClick={jumpReader}>READ PUBLICATION / ABRIR VISOR →</button>
        </section>
        <section className="repoProvenance repoFloating" ref={readerRef}>
          <div className="repoReader" aria-label="Visor integrado de documentos y registros">
            <div className="repoViewerHeading"><span>VISOR / {selection.kind.toUpperCase()}</span><button onClick={()=>setReaderOpen(!readerOpen)} aria-expanded={readerOpen}>{readerOpen?'CONTRAER −':'DESPLEGAR +'}</button></div>
            {readerOpen?<><nav className="repoReaderTabs">{(['LECTURA','FUENTES','FICHA'] as ReaderMode[]).map(mode=><button key={mode} onClick={()=>setReaderMode(mode)} data-active={readerMode===mode}>{mode}</button>)}</nav>
            <div className="repoViewerBody">
              {readerMode==='LECTURA'?selection.kind==='object'&&active?.editorial?.sections.length?<><span className="repoDocType">{active.editorial.collection} · {active.id}</span><h2>{active.title}</h2><p>{active.editorial.deck||active.summary}</p>{active.editorial.coverImage?<img className="repoDocCover" src={active.editorial.coverImage} alt={active.title}/>:null}{active.editorial.sections.map(sec=><details key={sec.id} className="repoDocumentTile" open><summary>{sec.title}</summary><div>{sec.paragraphs.map((p,i)=><p key={i}>{p}</p>)}{sec.items?.map((item,i)=><p key={i}>{item}</p>)}</div></details>)}{active.editorial.visuals.map(v=><figure key={v.id}><img src={v.src} alt={v.alt}/><figcaption>{v.caption}</figcaption></figure>)}</>:
                safeDoc?.publicUrl?<><h2>{safeDoc.filename}</h2><iframe src={safeDoc.publicUrl} title="Documento materializado" sandbox="allow-scripts allow-same-origin allow-downloads" referrerPolicy="no-referrer" loading="lazy" className="repoDocumentFrame"/><p>Si el origen impide ser incrustado, consulta la fuente pública autorizada.</p></>:
                <><h2>{objectTitle}</h2><p>{description}</p><p>NOT MATERIALIZED · No existe contenido de lectura público asociado a esta selección.</p></>:
                readerMode==='FUENTES'?<><h2>Fuente y material de apoyo</h2>{(active?.sourceRefs||[]).map(s=><div key={s} className="repoSourceItem"><button onClick={()=>selectSource(s)}>{short(s,70)}</button>{safeURL(s)?<a href={safeURL(s)!} target="_blank" rel="noopener noreferrer">VER FUENTE ORIGINAL ↗</a>:null}</div>)}{!active?.sourceRefs.length?<p>NOT OBSERVED · Sin fuentes publicables.</p>:null}{active?.editorial?.renditions.map(r=><div key={r.filename} className="repoSourceItem"><b>{r.filename}</b><span>{r.state}</span><code>SHA-256 {r.sha256 || 'NOT MATERIALIZED'}</code>{r.publicUrl&&safeURL(r.publicUrl)?<a href={r.publicUrl} rel="noopener noreferrer" target="_blank">ABRIR FORMATO ↗</a>:null}</div>)}</>:
                <><h2>Ficha documental</h2>{showRow('OBJETO',active?.id)}{showRow('VERSIÓN',active?.version)}{showRow('AUTORES',active?.authors.join(', '))}{showRow('MÉTODOS',active?.methods.join(', '))}{showRow('ESTADO',active?.epistemicState)}{showRow('CANONICAL URL',active?.canonicalUrl)}{reading?showRow('PUBLICACIÓN PERSISTIDA',date(reading.publishedAt)):null}{(active?.limitations||[]).map((s,i)=><p key={i}>{s}</p>)}</>}
            </div></>:null}
          </div>
          <div className="repoDiscovery"><h3>DISCOVERY MESH</h3><p>Machine-readable public resources are an exposure mechanism, not proof of recognition.</p><div className="repoMachineLinks">{discovery.machineLinks.map(l=><a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}</div></div>
        </section>
      </div>
    </div>
    <nav className="repoTimeline" aria-label="REPOSITORY HISTORY · cronología registrada">
      <div className="repoTimelineIdentity"><span>REPOSITORY HISTORY</span><b>{objects.length} OBJETOS PÚBLICOS</b></div>
      <div className="repoTimelineTrack"><div className="repoTimelineLine"/>{objects.slice().sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)).slice(-12).map((o,i,arr)=><button key={o.id} style={{left:(4+i*92/Math.max(1,arr.length-1))+'%'}} data-active={selection.id===o.id} onClick={()=>activateTimeline(o.id)}><i/><time>{date(o.createdAt)}</time><span>{short(o.title,15)}</span></button>)}</div>
      <div className="repoTimelineMode"><span>TIEMPO</span><select aria-label="Filtrar año" value={timelineYear??'ALL'} onChange={e=>setTimelineYear(e.target.value==='ALL'?null:Number(e.target.value))}><option value="ALL">TODOS</option>{yearList.map(y=><option key={y} value={y}>{y}</option>)}</select><button onClick={()=>goto(0)} title="Volver al inicio">←</button><button onClick={()=>horizontal.current?.scrollBy({left:640,behavior:'smooth'})} title="Avanzar en el campo">→</button></div>
    </nav>
  </main>;
}
