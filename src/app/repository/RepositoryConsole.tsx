'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type RepositoryObject={
  id:string;
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
};

type Filter='ALL'|'PUBLICATION'|'OBSERVATION'|'REPORT'|'PAPER'|'METHOD'|'DATASET'|'RETURN';

function formatDate(value:string){
  const date=new Date(value);
  if(!Number.isFinite(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function shortRef(value:string){
  const clean=value.replace(/^https?:\/\//,'');
  return clean.length>42?clean.slice(0,39)+'…':clean;
}
function unique(values:readonly string[]){
  return [...new Set(values.filter(Boolean))];
}
function year(value:string){
  const parsed=new Date(value);
  return Number.isFinite(parsed.valueOf())?String(parsed.getFullYear()):'—';
}

export function RepositoryConsole({objects}:{objects:readonly RepositoryObject[]}){
  const [selectedId,setSelectedId]=useState(objects[0]?.id??'');
  const [filter,setFilter]=useState<Filter>('ALL');
  const [query,setQuery]=useState('');

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return objects.filter((object)=>{
      const typeOk=filter==='ALL'||object.objectType===filter;
      const queryOk=!q||[object.id,object.objectKey,object.title,object.summary,object.objectType,...object.sourceRefs,...object.methods].join(' ').toLowerCase().includes(q);
      return typeOk&&queryOk;
    });
  },[objects,filter,query]);

  const selected=objects.find((object)=>object.id===selectedId)??filtered[0]??objects[0]??null;
  const sourceRefs=useMemo(()=>unique(objects.flatMap((object)=>object.sourceRefs)),[objects]);
  const evidenceRefs=useMemo(()=>unique(objects.flatMap((object)=>object.evidenceRefs)),[objects]);
  const relatedObjects=useMemo(()=>unique(objects.flatMap((object)=>object.relatedObjects)),[objects]);
  const versions=useMemo(()=>unique(objects.map((object)=>object.version)),[objects]);
  const timeline=useMemo(()=>[...objects].sort((a,b)=>Date.parse(a.updatedAt)-Date.parse(b.updatedAt)),[objects]);

  const categories=[
    ['SOURCE RECORDS',sourceRefs.length],
    ['EVIDENCE',evidenceRefs.length],
    ['PUBLICATIONS',objects.filter((object)=>object.objectType==='PUBLICATION').length],
    ['CASE OBJECTS',relatedObjects.length||'NOT OBSERVED'],
    ['PROVENANCE',sourceRefs.length],
    ['VERSIONS',versions.length],
    ['HASHES','NOT MATERIALIZED'],
    ['LINEAGE',relatedObjects.length],
    ['MANIFESTS',objects.length],
  ] as const;

  return <main className="repositoryShell">
    <section className="repositoryScene" aria-label="SFI Repository">
      <div className="repositoryBackdrop" aria-hidden="true"/>

      <aside className="repoIdentity">
        <span>REPOSITORY</span>
        <h1>Durable memory<br/>for a moving institution.</h1>
        <p>Source records, evidence, publications and canonical objects remain distinguishable, addressable and reconstructible.</p>
        <div className="repoCategoryList">
          {categories.map(([label,value])=><div key={label}><i/><span>{label}</span><b>{value}</b></div>)}
        </div>
        <label className="repoSearch"><span>FILTERS</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search object / source / method"/></label>
      </aside>

      <section className="repoArchiveRail" aria-label="Repository object rail">
        <div className="repoRailColumn repoSources">
          <header><span>SOURCE RECORDS</span><b>{sourceRefs.length}</b></header>
          <div className="repoRailScroll">
            {sourceRefs.slice(0,12).map((ref,index)=><button type="button" key={ref} onClick={()=>{const hit=objects.find((object)=>object.sourceRefs.includes(ref));if(hit)setSelectedId(hit.id)}}><i data-index={index%4}/><span>{shortRef(ref)}</span><small>SOURCE REF</small></button>)}
            {!sourceRefs.length?<p>NO SOURCE RECORDS OBSERVED</p>:null}
          </div>
        </div>

        <div className="repoRailColumn repoEvidence">
          <header><span>EVIDENCE</span><b>{evidenceRefs.length}</b></header>
          <div className="repoRailScroll">
            {objects.slice(0,10).map((object)=><button type="button" key={object.id} data-active={object.id===selected?.id?'true':undefined} onClick={()=>setSelectedId(object.id)}><i data-state={object.epistemicState}/><span>{object.id}</span><small>{object.epistemicState} · {object.evidenceRefs.length} refs</small></button>)}
          </div>
        </div>

        <div className="repoRailColumn repoPublications">
          <header><span>PUBLICATIONS / OBJECTS</span><b>{filtered.length}</b></header>
          <div className="repoFilterStrip">
            {(['ALL','PUBLICATION','OBSERVATION','REPORT','PAPER','METHOD','DATASET','RETURN'] as Filter[]).map((value)=><button type="button" key={value} data-active={filter===value?'true':undefined} onClick={()=>setFilter(value)}>{value}</button>)}
          </div>
          <div className="repoRailScroll">
            {filtered.slice(0,18).map((object)=><button type="button" key={object.id} data-active={object.id===selected?.id?'true':undefined} onClick={()=>setSelectedId(object.id)}><i/><span>{object.title}</span><small>{object.objectType} · {object.id}</small></button>)}
            {!filtered.length?<p>NO OBJECTS MATCH THIS FILTER</p>:null}
          </div>
        </div>
      </section>

      {selected?<section className="repoObjectInspector" aria-live="polite">
        <div className="repoObjectState"><span>{selected.objectType}</span><b>{selected.publicationState}</b></div>
        <h2>{selected.title}</h2>
        <p>{selected.summary}</p>
        <div className="repoObjectVisual" aria-hidden="true">
          <i/><i/><i/><i/><i/><i/><i/><i/><i/>
        </div>
        <dl>
          <dt>TYPE</dt><dd>{selected.objectType}</dd>
          <dt>CREATED</dt><dd>{formatDate(selected.createdAt)}</dd>
          <dt>UPDATED</dt><dd>{formatDate(selected.updatedAt)}</dd>
          <dt>AUTHORS</dt><dd>{selected.authors.join(', ')||'NOT REPRESENTED'}</dd>
          <dt>VERSION</dt><dd>{selected.version}</dd>
          <dt>STATE</dt><dd>{selected.epistemicState}</dd>
          <dt>LICENSE</dt><dd>{selected.license??'UNKNOWN'}</dd>
        </dl>
        <Link className="repoPrimaryAction" href={selected.canonicalUrl}>OPEN OBJECT <span>→</span></Link>
        <div className="repoObjectActions"><button type="button" disabled>DOWNLOAD · NOT MATERIALIZED</button><button type="button" onClick={()=>navigator.clipboard?.writeText(selected.canonicalUrl)}>COPY CANONICAL URL</button></div>
      </section>:null}

      {selected?<aside className="repoProvenance">
        <section>
          <header><span>PROVENANCE</span><b>{selected.sourceRefs.length} SOURCES</b></header>
          <div className="repoProvenanceRows">
            <div><i data-tone="gold"/><span>CREATED</span><b>{formatDate(selected.createdAt)}</b></div>
            <div><i data-tone="blue"/><span>EPISTEMIC STATE</span><b>{selected.epistemicState}</b></div>
            <div><i data-tone="cream"/><span>PUBLICATION</span><b>{selected.publicationState}</b></div>
            <div><i data-tone="green"/><span>EVIDENCE IDENTITY</span><b>{selected.evidenceRefs.length?'VALIDATED REFS':'NOT REPRESENTED'}</b></div>
          </div>
        </section>

        <section className="repoLineage">
          <header><span>LINEAGE</span><b>{selected.relatedObjects.length} RELATED</b></header>
          <div className="repoLineageGraph">
            <div><i/>DATA / SOURCE<small>{selected.sourceRefs.length} refs</small></div><em>→</em>
            <div><i/>PROCESS<small>{selected.methods.length} methods</small></div><em>→</em>
            <div data-current="true"><i/>THIS OBJECT<small>{selected.id}</small></div><em>→</em>
            <div><i/>DERIVATIVES<small>{selected.relatedObjects.length} objects</small></div>
          </div>
        </section>

        <div className="repoTwinCards">
          <section><header><span>VERSIONS</span><b>VIEW</b></header><div className="repoVersionCurrent"><i/>v{selected.version}<span>CURRENT VERSION ONLY</span><time>{formatDate(selected.updatedAt)}</time></div></section>
          <section><header><span>HASHES</span><b>INTEGRITY</b></header><div className="repoHashEmpty">CONTENT HASH<br/><strong>NOT MATERIALIZED</strong><small>Object identity ≠ content hash.</small></div></section>
        </div>

        <div className="repoTwinCards">
          <section><header><span>CASE / RELATED OBJECTS</span><b>{selected.relatedObjects.length}</b></header>{selected.relatedObjects.slice(0,4).map((object)=><div className="repoRelated" key={object}>{object}</div>)}{!selected.relatedObjects.length?<div className="repoEmpty">NOT OBSERVED IN PUBLIC REGISTRY</div>:null}</section>
          <section><header><span>MANIFEST</span><b>READ</b></header><div className="repoManifest"><span>METADATA</span><b>{selected.objectKey}</b><span>SOURCE LIST</span><b>{selected.sourceRefs.length}</b><span>LINEAGE</span><b>{selected.relatedObjects.length}</b><span>MISSING</span><b>{selected.missing.length}</b></div></section>
        </div>
      </aside>:null}

      <footer className="repoTimeline">
        <div className="repoTimelineIdentity"><span>REPOSITORY HISTORY</span><b>{objects.length} PUBLIC CANONICAL OBJECTS</b></div>
        <div className="repoTimelineTrack">
          <div className="repoTimelineLine"/>
          {timeline.slice(-9).map((object,index)=><button type="button" key={object.id} style={{left:(6+(index*(88/Math.max(1,Math.min(8,timeline.length-1)))))+'%'}} data-active={object.id===selected?.id?'true':undefined} onClick={()=>setSelectedId(object.id)}><i/><time>{formatDate(object.updatedAt)}</time><span>{object.objectType}</span><small>{object.id}</small></button>)}
        </div>
        <div className="repoTimelineMode"><span>YEAR</span><b>{year(selected?.updatedAt??'')}</b></div>
      </footer>
    </section>
  </main>;
}
