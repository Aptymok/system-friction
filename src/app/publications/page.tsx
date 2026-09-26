import type { Metadata } from 'next';
import Link from 'next/link';
import { SFI_EDITORIAL_PUBLICATIONS } from '@/lib/publications/editorialContent';
import { publicEnglishProjection } from '@/lib/publications/publicEnglishProjection';
import { PublicationsCatalog, type PublicationCatalogItem } from './PublicationsCatalog';
import './publications.css';

export const dynamic = 'force-dynamic';

const CANONICAL_URL = 'https://systemfriction.org/publications';

const DOCUMENT_COVERS = [
  '/assets/documentos/exoplanet_observatory_golden_horizons.png',
  '/assets/documentos/futuristic_gold_observatory_annual_report.png',
  '/assets/documentos/interstellar_propulsion_working_paper.png',
  '/assets/documentos/orbital_stability_technical_note.png',
  '/assets/documentos/publicaciones_cosmicas_del_instituto_stellar.png',
  '/assets/documentos/sfi_field_document_alien_world_atlas.png',
  '/assets/documentos/sfi_internal_memorandum_cosmic_observatory.png',
  '/assets/documentos/sfi_policy_brief_interstellar_horizons.png',
] as const;

export const metadata: Metadata = {
  title: 'Publications · System Friction Institute',
  description: 'Publications from System Friction Institute: observations, research notes, cases, methods and RETURN.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type:'website',
    url:CANONICAL_URL,
    siteName:'System Friction Institute',
    title:'Publications · System Friction Institute',
    description:'Recoverable institutional memory: published observations, research, cases, methods and RETURN.',
    images:[{url:'/assets/sfi/scenes/06_archive_background.png'}],
  },
  other: {
    'sfi-surface':'PUBLICATIONS_HUB',
    'sfi-public-language':'en',
  },
};

function categoryFor(item:(typeof SFI_EDITORIAL_PUBLICATIONS)[number]){
  if(item.editorialKind==='TEMPORAL_ISSUE') return 'MONTHLY';
  if(item.editorialKind==='FRICTION_BRIEF') return 'RESEARCH';
  const map:Record<string,string>={
    SIGNAL:'SIGNALS',
    CASE:'CASES',
    TRAJECTORY:'FIELD',
    METHOD:'METHODS',
    MEMORY:'RETURN',
    ATLAS:'FIELD',
    INSTITUTIONAL:'INSTITUTIONS',
  };
  return map[item.observationKind||''] || 'OBSERVATIONS';
}

const items: readonly PublicationCatalogItem[] = SFI_EDITORIAL_PUBLICATIONS
  .slice()
  .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))
  .map((publication,index)=>{
    const projection=publicEnglishProjection(publication.slug,{
      title:publication.title,
      subtitle:publication.subtitle,
      summary:publication.deck,
    });
    return {
      slug:publication.slug,
      title:projection.title,
      subtitle:projection.subtitle,
      summary:projection.summary,
      publishedAt:publication.publishedAt,
      category:categoryFor(publication),
      cover:DOCUMENT_COVERS[index % DOCUMENT_COVERS.length],
    };
  });

export default function PublicationsPage(){
  return <main className="publicationsHub">
    <header className="pubTopbar">
      <Link href="/" className="pubBrand" aria-label="System Friction Institute home">SFI</Link>
      <div className="pubTopbarIdentity">
        <span>SYSTEM FRICTION INSTITUTE</span>
        <small>PUBLICATIONS</small>
      </div>
      <nav aria-label="Public navigation">
        <Link href="/observatory">OBSERVATORY</Link>
        <Link href="/publications" aria-current="page">PUBLICATIONS</Link>
        <Link href="/login">SIGN IN</Link>
      </nav>
    </header>

    <section className="pubArchiveHero" aria-labelledby="publications-title">
      <div className="pubArchiveHeroCopy">
        <span>PUBLICATIONS / PUBLIC RECORD</span>
        <h1 id="publications-title">Memory that can be recovered.</h1>
        <p>Published observations, research, cases and RETURN preserved as recoverable institutional objects.</p>
      </div>
    </section>

    <PublicationsCatalog items={items}/>

    <footer className="pubFooter">
      <b>SYSTEM FRICTION INSTITUTE</b>
      <span>OBSERVE · CONTRAST · RETURN</span>
    </footer>
  </main>;
}
