'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import docs from '../../../data/sfi/sf_docs_frontmatter.json';
import { SFI_CANONICAL_OBJECT_REGISTRY, canonicalPublicationDisposition } from '@/lib/discovery/canonicalObjectRegistry';
import { editorialPublicationForSlug } from '@/lib/publications/editorialContent';
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
const publications = SFI_CANONICAL_OBJECT_REGISTRY
  .filter((record) => record.objectType === 'PUBLICATION' && canonicalPublicationDisposition(record).disposition === 'PUBLISH')
  .map((record) => ({ record, editorial: editorialPublicationForSlug(record.slug) }));

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
    <header className="libraryTop"><div><Link href="/root">SFI / ROOT</Link><span>LIBRARY · PUBLICATIONS + DOCUMENTARY CORPUS</span></div><nav><Link href="/observatory">OBSERVATORIO</Link><Link href="/method-lab">METHOD LAB</Link><Link href="/twin">TWIN</Link></nav></header>

    <section className="libraryHero"><div><span>ÍNDICE INSTITUCIONAL</span><h1>Library</h1><p>Library reúne dos planos que no deben confundirse: publicaciones canónicas de SFI, cada una con su propia URL y estado editorial, y el corpus técnico que conserva métodos, fórmulas, patrones, workbooks y referencias. Publicar no convierte una pieza en evidencia externa ni demuestra Discovery: la vuelve una superficie canónica disponible para ser encontrada.</p></div><div className="libraryMetrics"><b>{publications.length}</b><span>publicaciones</span><b>{corpus.length}</b><span>documentos técnicos</span><b>{hashed}</b><span>con hash</span></div></section>

    <section style={{ padding: '32px 0 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', borderBottom: '1px solid rgba(202,160,92,.24)', paddingBottom: 14, marginBottom: 18 }}>
        <div><span style={{ letterSpacing: '.18em', fontSize: 11, color: '#a98954' }}>PUBLICACIONES CANÓNICAS</span><h2 style={{ margin: '7px 0 0', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400 }}>Publicaciones</h2></div>
        <Link href="/root/discovery" style={{ color: '#caa05c', fontSize: 12, letterSpacing: '.12em' }}>DISCOVERY MESH →</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
        {publications.map(({ record, editorial }) => <article key={record.id} style={{ border: '1px solid rgba(202,160,92,.24)', padding: 24, background: 'rgba(202,160,92,.025)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, letterSpacing: '.12em', color: '#9f845b' }}><span>{editorial?.series ?? 'SFI PUBLICATION'}</span><span>{editorial?.issue ?? `v${record.version}`}</span></div>
          <h3 style={{ fontSize: 32, fontWeight: 400, margin: '20px 0 8px' }}>{record.title}</h3>
          {editorial?.subtitle ? <p style={{ color: '#d0b985', fontSize: 18 }}>{editorial.subtitle}</p> : null}
          <p style={{ lineHeight: 1.7 }}>{record.summary}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '22px 0', fontSize: 12 }}>
            <span><b style={{ display: 'block', color: '#9f845b' }}>TIPO</b>{editorial?.editorialKind ?? record.objectType}</span>
            <span><b style={{ display: 'block', color: '#9f845b' }}>ESTADO</b>{record.publication.state}</span>
            <span><b style={{ display: 'block', color: '#9f845b' }}>EPISTÉMICO</b>{record.epistemicState}</span>
            <span><b style={{ display: 'block', color: '#9f845b' }}>DISCOVERY</b>EXPOSURE AL PUBLICAR</span>
          </div>
          <Link href={`/publications/${record.slug}`} style={{ color: '#d5ad69', letterSpacing: '.12em', fontSize: 12 }}>ABRIR PUBLICACIÓN →</Link>
        </article>)}
      </div>
      {!publications.length && <div className="libraryEmpty">No hay publicaciones canónicas admitidas.</div>}
    </section>

    <section className="libraryBoundary"><b>BOUNDARY</b><span>PUBLICATION = CANONICAL OBJECT</span><span>EXPOSURE ≠ DISCOVERY ≠ PULL ≠ RETURN</span><span>TECHNICAL CORPUS ≠ PUBLICATION BY DEFAULT</span></section>

    <section style={{ paddingTop: 30 }}><span style={{ letterSpacing: '.18em', fontSize: 11, color: '#a98954' }}>CORPUS TÉCNICO</span><h2 style={{ margin: '7px 0 4px', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400 }}>Métodos, fórmulas y documentos</h2><p style={{ maxWidth: 820, lineHeight: 1.7 }}>Este plano conserva el catálogo técnico preexistente: identidad documental, series, variables MIHM, patrones, hashes y referencias. Una pieza técnica puede ser públicamente accesible sin quedar admitida automáticamente como publicación canónica.</p></section>

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
