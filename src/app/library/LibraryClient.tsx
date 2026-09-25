'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { publicEnglishObservationLabel, publicEnglishProjection } from '@/lib/publications/publicEnglishProjection';

export type LibraryDoc = { id:string; type?:string; nodeId?:string; title:string; doc_id?:string; series?:string; summary?:string; version?:string; stability?:string; first_published?:string; node?:string; mihm_variable?:string; mihm_equation?:string; sf_pattern?:string; mihm_note?:string; patterns?:string[]; contentLength?:number; contentHash?:string; graphRelations?:string[]; graphRelationCount?:number };
export type LibraryPublication = { id:string; slug:string; title:string; summary:string; version:string; objectType:string; publicationState:string; epistemicState:string; series:string|null; issue:string|null; subtitle:string|null; editorialKind:string|null; collection:string|null; observationKind:string|null; publishedAt:string; mediumUrl:string|null; contentState:string|null; coverImage:string|null };
export type LibrarySurfaceContract = { surfaceLabel:string; catalogLabel:string; compactBodyBoundary:string; fullBodyReaderBoundary:string; graphState:string; graphBoundary:string; graphNodes:number; graphEdges:number };

function formatDate(value:string){
  const date=new Date(value);
  return Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric'}).format(date) : value;
}

export default function LibraryClient({ publications, corpus, surfaceContract }:{ publications:LibraryPublication[]; corpus:LibraryDoc[]; surfaceContract:LibrarySurfaceContract }) {
  const [query,setQuery]=useState('');
  const [observationFilter,setObservationFilter]=useState('ALL');
  const normalized=query.trim().toLowerCase();
  const filtered=useMemo(()=>corpus.filter((doc)=>{
    if(!normalized)return true;
    const haystack=[doc.title,doc.doc_id,doc.series,doc.summary,doc.mihm_variable,doc.mihm_equation,doc.sf_pattern,...(doc.patterns??[]),...(doc.graphRelations??[])].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(normalized);
  }),[corpus,normalized]);
  const temporalIssues=publications.filter((p)=>p.editorialKind==='TEMPORAL_ISSUE');
  const observations=publications.filter((p)=>p.editorialKind==='OBSERVATION');
  const observationKinds=[...new Set(observations.map((p)=>p.observationKind).filter((v):v is string=>Boolean(v)))];
  const visibleObservations=observationFilter==='ALL'?observations:observations.filter((p)=>p.observationKind===observationFilter);
  const hashed=corpus.filter((doc)=>doc.contentHash).length;

  return <main className="sfiLibrary">
    <header className="libraryTop">
      <div><Link href="/">SFI</Link><span>LIBRARY · KNOWLEDGE / EVIDENCE / RELATION</span></div>
      <nav><Link href="/observatory">OBSERVATORY</Link><Link href="/publications">PUBLICATIONS</Link><Link href="/library">LIBRARY</Link><Link href="/field">FIELD</Link><Link href="/institution">INSTITUTE</Link><Link href="/login">SIGN IN</Link></nav>
    </header>

    <section className="libraryHero">
      <div>
        <span>INSTITUTIONAL INDEX</span>
        <h1>Library</h1>
        <p>Library organizes knowledge by relation rather than format. Publications, observations and the technical corpus preserve identity, provenance, state and links; a document is a rendition of an object, not the object itself.</p>
      </div>
      <div className="libraryMetrics">
        <b>{temporalIssues.length}</b><span>monthly issues</span>
        <b>{observations.length}</b><span>observations</span>
        <b>{corpus.length}</b><span>technical records</span>
        <b>{hashed}</b><span>with content hash</span>
      </div>
    </section>

    <section className="libraryBoundary">
      <b>CANONICAL RELATION</b>
      <span>THEORY → METHOD → INSTRUMENT → CASE → RETURN</span>
      <span>DOCUMENT ≠ OBJECT</span>
      <span>PUBLICATION ≠ VALIDATION</span>
    </section>

    <section className="editorialCollection temporalCollection" id="temporary-notes">
      <div className="editorialCollectionHead">
        <div>
          <span>PERIODIC PUBLICATION · PDF</span>
          <h2>Temporary Notes</h2>
          <p>One institutional issue per month. Each issue preserves a time-bounded state that can later be contrasted against subsequent editions.</p>
        </div>
        <Link href="/publications">VIEW PUBLICATIONS →</Link>
      </div>
      <div className="temporalGrid">{temporalIssues.map((publication)=>{
        const projection=publicEnglishProjection(publication.slug,{title:publication.title,subtitle:publication.subtitle??undefined,summary:publication.summary});
        return <article className="temporalCard" key={publication.id}>
          <div className="temporalMark"><span>TEMPORARY</span><strong>NOTES</strong><small>{publication.issue??`v${publication.version}`}</small></div>
          <div className="temporalCopy">
            <span>{formatDate(publication.publishedAt)}</span>
            <h3>{projection.title}</h3>
            <p className="temporalSubtitle">{projection.subtitle}</p>
            <p>{projection.summary}</p>
            <Link href={`/publications/${publication.slug}`}>OPEN ISSUE →</Link>
          </div>
        </article>;
      })}</div>
    </section>

    <section className="editorialCollection observationsCollection" id="observations">
      <div className="editorialCollectionHead observationsHead">
        <div>
          <span>INDIVIDUAL PIECES · WEB</span>
          <h2>Observations</h2>
          <p>Individual readings across cases, signals, trajectories, methods, memory and institutional architecture.</p>
        </div>
        <span className="observationCount">{visibleObservations.length} / {observations.length}</span>
      </div>
      <div className="observationFilters" aria-label="Filter observations">
        <button type="button" className={observationFilter==='ALL'?'active':''} onClick={()=>setObservationFilter('ALL')}>ALL</button>
        {observationKinds.map((kind)=><button type="button" key={kind} className={observationFilter===kind?'active':''} onClick={()=>setObservationFilter(kind)}>{publicEnglishObservationLabel(kind)}</button>)}
      </div>
      <div className="observationGrid">{visibleObservations.map((publication,index)=>{
        const projection=publicEnglishProjection(publication.slug,{title:publication.title,subtitle:publication.subtitle??undefined,summary:publication.summary});
        const label=publicEnglishObservationLabel(publication.observationKind);
        return <article className={`observationCard ${index===0?'featured':''}`} key={publication.id}>
          <Link className="observationCover" href={`/publications/${publication.slug}`} style={publication.coverImage?{backgroundImage:`url(${publication.coverImage})`}:undefined}>
            {!publication.coverImage?<><span>{label}</span><strong>{String(index+1).padStart(2,'0')}</strong></>:null}
          </Link>
          <div className="observationBody">
            <div className="observationMeta"><span>{label}</span><time>{formatDate(publication.publishedAt)}</time></div>
            <h3><Link href={`/publications/${publication.slug}`}>{projection.title}</Link></h3>
            <p className="observationSubtitle">{projection.subtitle}</p>
            <p className="observationSummary">{projection.summary}</p>
            <footer><Link href={`/publications/${publication.slug}`}>READ IN SFI →</Link>{publication.mediumUrl?<a href={publication.mediumUrl} target="_blank" rel="noreferrer">SOURCE ↗</a>:<span>SFI ORIGINAL</span>}</footer>
          </div>
        </article>;
      })}</div>
    </section>

    <section className="libraryBoundary">
      <b>BOUNDARY</b>
      <span>TEMPORARY NOTES = MONTHLY INSTITUTIONAL ISSUE</span>
      <span>OBSERVATIONS = INDIVIDUAL PUBLIC PIECES</span>
      <span>EXPOSURE ≠ DISCOVERY ≠ PULL ≠ RETURN</span>
      <span>TECHNICAL CORPUS ≠ PUBLICATION BY DEFAULT</span>
    </section>

    <section className="technicalCorpusHead">
      <span>{surfaceContract.catalogLabel}</span>
      <h2>Methods, formulas and technical records</h2>
      <p>The public technical plane exposes canonical identifiers, structural metadata and graph counts. Original-language prose is withheld until an English public rendition exists; the underlying canonical record is not rewritten.</p>
      <p><b>GRAPH {surfaceContract.graphState.toUpperCase()}</b> · {surfaceContract.graphNodes} documentary nodes · {surfaceContract.graphEdges} relations · {surfaceContract.graphBoundary}</p>
      <small>{surfaceContract.fullBodyReaderBoundary}</small>
    </section>

    <section className="librarySearch">
      <label>SEARCH THE TECHNICAL CORPUS<input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="MIHM, observer, coordination, SF_P_…"/></label>
      <span>{filtered.length} / {corpus.length}</span>
    </section>

    <section className="libraryGrid">{filtered.map((doc)=><article key={doc.id}>
      <div className="libraryDocHead"><span>{doc.doc_id??doc.id}</span><span>{doc.version?`v${doc.version}`:'VERSION —'}</span></div>
      <h2>{doc.doc_id??doc.id}</h2>
      <p>Canonical technical corpus object. Public prose is intentionally withheld until an English rendition is available.</p>
      <div className="libraryFacts">
        <span><b>TYPE</b>{doc.type??'DOCUMENT'}</span>
        <span><b>NODE</b>{doc.nodeId??doc.node??'—'}</span>
        <span><b>MIHM</b>{doc.mihm_variable??'—'}</span>
        <span><b>STABILITY</b>{doc.stability??'—'}</span>
      </div>
      {doc.mihm_equation&&<code>{doc.mihm_equation}</code>}
      <div className="libraryPatterns">
        <span>{doc.patterns?.length??0} declared patterns</span>
        <span>{doc.graphRelationCount??0} graph relations</span>
      </div>
      <footer><span>{doc.first_published??'date —'}</span><span>{doc.contentHash?`hash ${doc.contentHash}`:'hash —'}</span><span>{typeof doc.contentLength==='number'?`${doc.contentLength} source chars`:'length —'}</span></footer>
    </article>)}</section>
    {!filtered.length&&<div className="libraryEmpty">No technical records match that filter.</div>}
  </main>;
}
