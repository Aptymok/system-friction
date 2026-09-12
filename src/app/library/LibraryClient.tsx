'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type LibraryDoc = {
  id: string;
  type?: string;
  nodeId?: string;
  title: string;
  doc_id?: string;
  series?: string;
  summary?: string;
  version?: string;
  stability?: string;
  first_published?: string;
  node?: string;
  mihm_variable?: string;
  mihm_equation?: string;
  sf_pattern?: string;
  mihm_note?: string;
  patterns?: string[];
  contentLength?: number;
  contentHash?: string;
};

export type LibraryPublication = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  version: string;
  objectType: string;
  publicationState: string;
  epistemicState: string;
  series: string | null;
  issue: string | null;
  subtitle: string | null;
  editorialKind: string | null;
  collection: string | null;
  observationKind: string | null;
  publishedAt: string;
  mediumUrl: string | null;
  contentState: string | null;
  coverImage: string | null;
};

export type LibrarySurfaceContract = {
  surfaceLabel: string;
  catalogLabel: string;
  compactBodyBoundary: string;
  fullBodyReaderBoundary: string;
};

const OBSERVATION_LABELS: Record<string, string> = {
  SIGNAL: 'Señal',
  TRAJECTORY: 'Trayectoria',
  CASE: 'Caso',
  METHOD: 'Método',
  MEMORY: 'Memoria',
  ATLAS: 'Atlas',
  INSTITUTIONAL: 'Institucional',
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.valueOf())
    ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
    : value;
}

export default function LibraryClient({
  publications,
  corpus,
  surfaceContract,
}: {
  publications: LibraryPublication[];
  corpus: LibraryDoc[];
  surfaceContract: LibrarySurfaceContract;
}) {
  const [query, setQuery] = useState('');
  const [observationFilter, setObservationFilter] = useState('ALL');
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => corpus.filter((doc) => {
    if (!normalized) return true;
    const haystack = [doc.title, doc.doc_id, doc.series, doc.summary, doc.mihm_variable, doc.mihm_equation, doc.sf_pattern, ...(doc.patterns ?? [])].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(normalized);
  }), [corpus, normalized]);

  const temporalIssues = publications.filter((publication) => publication.editorialKind === 'TEMPORAL_ISSUE');
  const observations = publications.filter((publication) => publication.editorialKind === 'OBSERVATION');
  const observationKinds = [...new Set(observations.map((publication) => publication.observationKind).filter((value): value is string => Boolean(value)))];
  const visibleObservations = observationFilter === 'ALL'
    ? observations
    : observations.filter((publication) => publication.observationKind === observationFilter);
  const hashed = corpus.filter((doc) => doc.contentHash).length;

  return <main className="sfiLibrary">
    <header className="libraryTop"><div><Link href="/root">SFI / ROOT</Link><span>LIBRARY · PUBLICATIONS + DOCUMENTARY CORPUS</span></div><nav><Link href="/observatory">OBSERVATORIO</Link><Link href="/method-lab">METHOD LAB</Link><Link href="/twin">TWIN</Link></nav></header>

    <section className="libraryHero"><div><span>ÍNDICE INSTITUCIONAL</span><h1>Library</h1><p>Library distingue tres planos: <b>Notas Temporales</b>, la edición institucional mensual en PDF; <b>Observaciones</b>, piezas individuales de lectura —casos, señales, trayectorias, métodos y memoria—; y el corpus técnico. Una pieza puede circular en Medium, pero la URL de SFI conserva la identidad canónica para Discovery Mesh.</p></div><div className="libraryMetrics"><b>{temporalIssues.length}</b><span>ediciones mensuales</span><b>{observations.length}</b><span>observaciones</span><b>{corpus.length}</b><span>documentos técnicos</span><b>{hashed}</b><span>con hash</span></div></section>

    <section className="editorialCollection temporalCollection" id="notas-temporales">
      <div className="editorialCollectionHead">
        <div><span>PUBLICACIÓN PERIÓDICA · PDF</span><h2>Notas Temporales</h2><p>Una edición institucional por mes. Cada PDF conserva el corte del periodo y puede contrastarse después con las siguientes ediciones.</p></div>
        <Link href="/root/discovery">DISCOVERY MESH →</Link>
      </div>
      <div className="temporalGrid">
        {temporalIssues.map((publication) => <article className="temporalCard" key={publication.id}>
          <div className="temporalMark"><span>NOTAS</span><strong>TEMPORALES</strong><small>{publication.issue ?? `v${publication.version}`}</small></div>
          <div className="temporalCopy">
            <span>{formatDate(publication.publishedAt)}</span>
            <h3>{publication.title}</h3>
            {publication.subtitle ? <p className="temporalSubtitle">{publication.subtitle}</p> : null}
            <p>{publication.summary}</p>
            <Link href={`/publications/${publication.slug}`}>ABRIR EDICIÓN →</Link>
          </div>
        </article>)}
      </div>
    </section>

    <section className="editorialCollection observationsCollection" id="observaciones">
      <div className="editorialCollectionHead observationsHead">
        <div><span>PIEZAS INDIVIDUALES · WEB</span><h2>Observaciones</h2><p>Lecturas individuales que pueden cruzar casos, señales, trayectorias, métodos, memoria y arquitectura institucional. No son ediciones de Notas Temporales.</p></div>
        <span className="observationCount">{visibleObservations.length} / {observations.length}</span>
      </div>

      <div className="observationFilters" aria-label="Filtrar observaciones">
        <button type="button" className={observationFilter === 'ALL' ? 'active' : ''} onClick={() => setObservationFilter('ALL')}>Todas</button>
        {observationKinds.map((kind) => <button type="button" key={kind} className={observationFilter === kind ? 'active' : ''} onClick={() => setObservationFilter(kind)}>{OBSERVATION_LABELS[kind] ?? kind}</button>)}
      </div>

      <div className="observationGrid">
        {visibleObservations.map((publication, index) => <article className={`observationCard ${index === 0 ? 'featured' : ''}`} key={publication.id}>
          <Link className="observationCover" href={`/publications/${publication.slug}`} style={publication.coverImage ? { backgroundImage: `url(${publication.coverImage})` } : undefined}>
            {!publication.coverImage ? <><span>{publication.observationKind ? OBSERVATION_LABELS[publication.observationKind] ?? publication.observationKind : 'Observación'}</span><strong>{String(index + 1).padStart(2, '0')}</strong></> : null}
          </Link>
          <div className="observationBody">
            <div className="observationMeta"><span>{publication.observationKind ? OBSERVATION_LABELS[publication.observationKind] ?? publication.observationKind : 'Observación'}</span><time>{formatDate(publication.publishedAt)}</time></div>
            <h3><Link href={`/publications/${publication.slug}`}>{publication.title}</Link></h3>
            {publication.subtitle ? <p className="observationSubtitle">{publication.subtitle}</p> : null}
            <p className="observationSummary">{publication.summary}</p>
            <footer><Link href={`/publications/${publication.slug}`}>LEER EN SFI →</Link>{publication.mediumUrl ? <a href={publication.mediumUrl} target="_blank" rel="noreferrer">MEDIUM ↗</a> : <span>SFI ORIGINAL</span>}</footer>
          </div>
        </article>)}
      </div>
    </section>

    <section className="libraryBoundary"><b>BOUNDARY</b><span>NOTAS TEMPORALES = EDICIÓN MENSUAL PDF</span><span>OBSERVACIONES = PIEZAS INDIVIDUALES</span><span>EXPOSURE ≠ DISCOVERY ≠ PULL ≠ RETURN</span><span>TECHNICAL CORPUS ≠ PUBLICATION BY DEFAULT</span></section>

    <section className="technicalCorpusHead">
      <span>{surfaceContract.catalogLabel}</span>
      <h2>Métodos, fórmulas y documentos</h2>
      <p>Este plano conserva el catálogo técnico preexistente: identidad documental, series, variables MIHM, patrones, hashes y referencias. Es un catálogo compacto; no afirma que los cuerpos completos de cada documento estén materializados en esta superficie.</p>
      <small>{surfaceContract.fullBodyReaderBoundary}</small>
    </section>

    <section className="librarySearch"><label>BUSCAR EN EL CORPUS TÉCNICO<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="fricción, MIHM, observador, coordinación, SF_P_…"/></label><span>{filtered.length} / {corpus.length}</span></section>

    <section className="libraryGrid">{filtered.map((doc) => <article key={doc.id}>
      <div className="libraryDocHead"><span>{doc.doc_id ?? doc.id}</span><span>{doc.version ? `v${doc.version}` : 'VERSION —'}</span></div>
      <h2>{doc.title}</h2>
      <p>{doc.summary ?? 'Sin resumen materializado.'}</p>
      <div className="libraryFacts"><span><b>SERIE</b>{doc.series ?? '—'}</span><span><b>NODO</b>{doc.nodeId ?? doc.node ?? '—'}</span><span><b>MIHM</b>{doc.mihm_variable ?? '—'}</span><span><b>ESTABILIDAD</b>{doc.stability ?? '—'}</span></div>
      {doc.mihm_equation && <code>{doc.mihm_equation}</code>}
      {!!doc.patterns?.length && <div className="libraryPatterns">{doc.patterns.map((pattern) => <span key={pattern}>{pattern}</span>)}</div>}
      <footer><span>{doc.first_published ?? 'fecha —'}</span><span>{doc.contentHash ? `hash ${doc.contentHash}` : 'hash —'}</span><span>{typeof doc.contentLength === 'number' ? `${doc.contentLength} chars source` : 'length —'}</span></footer>
    </article>)}</section>

    {!filtered.length && <div className="libraryEmpty">No hay documentos técnicos que coincidan con ese filtro.</div>}
  </main>;
}
