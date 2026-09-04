'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import docs from '../../../data/sfi/sf_docs_frontmatter.json';
import './library.css';

type Doc = {
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

const corpus = docs as Doc[];

export default function LibraryPage() {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => corpus.filter((doc) => {
    if (!normalized) return true;
    const haystack = [doc.title, doc.doc_id, doc.series, doc.summary, doc.mihm_variable, doc.mihm_equation, doc.sf_pattern, ...(doc.patterns ?? [])].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(normalized);
  }), [normalized]);
  const series = new Set(corpus.map((doc) => doc.series).filter(Boolean)).size;
  const hashed = corpus.filter((doc) => doc.contentHash).length;

  return <main className="sfiLibrary">
    <header className="libraryTop"><div><Link href="/root">SFI / ROOT</Link><span>LIBRARY · DOCUMENTARY CORPUS</span></div><nav><Link href="/observatory">OBSERVATORIO</Link><Link href="/method-lab">METHOD LAB</Link><Link href="/twin">TWIN</Link></nav></header>

    <section className="libraryHero"><div><span>CATÁLOGO DOCUMENTAL CANÓNICO</span><h1>Library</h1><p>Este plano recupera el corpus documental que ya existe en SFI. Expone identidad, serie, resumen, versión, estabilidad, variables MIHM, patrones y hashes. El dataset compacto excluye deliberadamente los cuerpos completos; por eso esta interfaz no inventa un lector que aún no está materializado.</p></div><div className="libraryMetrics"><b>{corpus.length}</b><span>documentos</span><b>{series}</b><span>series</span><b>{hashed}</b><span>con hash</span></div></section>

    <section className="libraryBoundary"><b>BOUNDARY</b><span>CATALOG / METADATA = AVAILABLE</span><span>FULL DOCUMENT BODY READER = NOT MATERIALIZED</span><span>NO REDIRECT TO ROOT</span></section>

    <section className="librarySearch"><label>BUSCAR EN EL CORPUS<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="fricción, MIHM, observador, coordinación, SF_P_…"/></label><span>{filtered.length} / {corpus.length}</span></section>

    <section className="libraryGrid">{filtered.map((doc) => <article key={doc.id}>
      <div className="libraryDocHead"><span>{doc.doc_id ?? doc.id}</span><span>{doc.version ? `v${doc.version}` : 'VERSION —'}</span></div>
      <h2>{doc.title}</h2>
      <p>{doc.summary ?? 'Sin resumen materializado.'}</p>
      <div className="libraryFacts"><span><b>SERIE</b>{doc.series ?? '—'}</span><span><b>NODO</b>{doc.nodeId ?? doc.node ?? '—'}</span><span><b>MIHM</b>{doc.mihm_variable ?? '—'}</span><span><b>ESTABILIDAD</b>{doc.stability ?? '—'}</span></div>
      {doc.mihm_equation && <code>{doc.mihm_equation}</code>}
      {!!doc.patterns?.length && <div className="libraryPatterns">{doc.patterns.map((pattern) => <span key={pattern}>{pattern}</span>)}</div>}
      <footer><span>{doc.first_published ?? 'fecha —'}</span><span>{doc.contentHash ? `hash ${doc.contentHash}` : 'hash —'}</span><span>{typeof doc.contentLength === 'number' ? `${doc.contentLength} chars source` : 'length —'}</span></footer>
    </article>)}</section>

    {!filtered.length && <div className="libraryEmpty">No hay documentos que coincidan con ese filtro.</div>}
  </main>;
}
