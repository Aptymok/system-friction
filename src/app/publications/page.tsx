import type { Metadata } from 'next';
import Link from 'next/link';
import {
  SFI_EDITORIAL_PUBLICATIONS,
  SFI_NOTAS_TEMPORALES_V1,
  SFI_REALITY_CHAIN_BRIEF,
  SFI_YEARS_THAT_DID_EXIST_LAB_NOTE,
} from '@/lib/publications/editorialContent';
import {
  SFI_EDITORIAL_FAMILIES,
  SFI_PUBLICATIONS_BANNER,
  editorialFamilyEntries,
} from '@/lib/publications/editorialFamilies';
import {
  publicEnglishObservationLabel,
  publicEnglishProjection,
} from '@/lib/publications/publicEnglishProjection';
import { getPublicPublishedReturns } from '@/lib/observatory/publicState';
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
  title: 'Registry · System Friction Institute',
  description: 'SFI Registry: connected publications, observations, research notes, cases, methods and RETURN.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type:'website',
    url:CANONICAL_URL,
    siteName:'System Friction Institute',
    title:'Registry · System Friction Institute',
    description:'Connected institutional memory: publications, research, cases, methods and RETURN as reconstructible nodes.',
    images:[{url:SFI_PUBLICATIONS_BANNER.web}],
  },
  other: {
    'sfi-surface':'REGISTRY_GRAPH',
    'sfi-public-language':'en',
    'sfi-editorial-contract':'SFI-EDITORIAL-FAMILY-PROJECTION-1.0',
    'sfi-identity-manual':'SFI-ID-003 / MASTER EDITION V4.0',
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

function formatDate(value:string){
  const date=new Date(value);
  if(!Number.isFinite(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric'}).format(date);
}

const DISCOVERY_MESH_PUBLICATION = Object.freeze({
  canonicalId:'SFI-PUB-OBS-014',
  slug:'discovery-mesh-publicar-no-es-ser-encontrado',
  title:'Publishing Is Not Being Found',
  subtitle:'Discovery Mesh and the distance between exposure, discovery and RETURN',
  summary:'A method note on observing discoverability without converting publication, retrieval or propagation into recognition or external validation.',
  publishedAt:'2026-09-16T00:00:00-06:00',
  category:'METHODS',
  cover:'/assets/documentos/sfi_internal_memorandum_cosmic_observatory.png',
} as const);

const editorialItems: PublicationCatalogItem[] = SFI_EDITORIAL_PUBLICATIONS
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
      cover:publication.coverImage || DOCUMENT_COVERS[index % DOCUMENT_COVERS.length],
    };
  });

const items: readonly PublicationCatalogItem[] = [
  ...editorialItems,
  {
    slug:DISCOVERY_MESH_PUBLICATION.slug,
    title:DISCOVERY_MESH_PUBLICATION.title,
    subtitle:DISCOVERY_MESH_PUBLICATION.subtitle,
    summary:DISCOVERY_MESH_PUBLICATION.summary,
    publishedAt:DISCOVERY_MESH_PUBLICATION.publishedAt,
    category:DISCOVERY_MESH_PUBLICATION.category,
    cover:DISCOVERY_MESH_PUBLICATION.cover,
  },
].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));

export default async function PublicationsPage(){
  const monthly=SFI_NOTAS_TEMPORALES_V1;
  const monthlyProjection=publicEnglishProjection(monthly.slug,{
    title:monthly.title,
    subtitle:monthly.subtitle,
    summary:monthly.deck,
  });
  const persistedPublications=await getPublicPublishedReturns(12);

  return <main className="publicationsHub">
    <header className="pubTopbar">
      <Link href="/" className="pubBrand" aria-label="System Friction Institute home">SFI</Link>
      <div className="pubTopbarIdentity">
        <span>SYSTEM FRICTION INSTITUTE</span>
        <small>REGISTRY</small>
      </div>
      <nav aria-label="Public navigation">
        <Link href="/method-lab">LABORATORY</Link>
        <Link href="/publications" aria-current="page">REGISTRY</Link>
        <Link href="/observatory">OBSERVATORY</Link>
        <Link href="/login">SIGN IN</Link>
      </nav>
    </header>

    <section className="pubArchiveHero" aria-labelledby="publications-title">
      <figure className="pubCanonicalBanner">
        <picture>
          <source media="(max-width: 720px)" srcSet={SFI_PUBLICATIONS_BANNER.mobile}/>
          <img src={SFI_PUBLICATIONS_BANNER.web} alt={SFI_PUBLICATIONS_BANNER.alt}/>
        </picture>
        <figcaption>{SFI_PUBLICATIONS_BANNER.provenance}</figcaption>
      </figure>
      <div className="pubArchiveHeroCopy">
        <span>REGISTRY / PUBLIC RECORD</span>
        <h1 id="publications-title">Memory becomes a graph.</h1>
        <p>Every publication is an addressable node: connected by editorial sequence, shared themes and reconstructible institutional lineage.</p>
        <div className="pubBoundary">
          <b>PUBLICATION = EXPOSURE</b>
          <span>EXPOSURE ≠ EXTERNAL EVIDENCE ≠ RETURN</span>
        </div>
      </div>
    </section>

    <section className="pubFeatured" aria-label="Canonical editorial objects">
      <article>
        <span>MONTHLY ISSUE · {monthly.issue.toUpperCase()}</span>
        <h2>{monthlyProjection.title}</h2>
        <p>{monthlyProjection.summary}</p>
        <Link href={`/publications/${monthly.slug}`}>OPEN MONTHLY ISSUE →</Link>
      </article>
      <article>
        <span>PUBLIC-SOURCE FRICTION BRIEF</span>
        <h2>{SFI_REALITY_CHAIN_BRIEF.title}</h2>
        <p>{SFI_REALITY_CHAIN_BRIEF.deck}</p>
        <Link href={`/publications/${SFI_REALITY_CHAIN_BRIEF.slug}`}>READ BRIEF →</Link>
      </article>
      <article>
        <span>RESEARCH LAB NOTE</span>
        <h2>{SFI_YEARS_THAT_DID_EXIST_LAB_NOTE.title}</h2>
        <p>{SFI_YEARS_THAT_DID_EXIST_LAB_NOTE.deck}</p>
        <Link href={`/publications/${SFI_YEARS_THAT_DID_EXIST_LAB_NOTE.slug}`}>READ LAB NOTE →</Link>
      </article>
    </section>

    <section className="pubPersisted" aria-labelledby="persisted-returns-title">
      <header>
        <span>PUBLISHED OPERATIONAL RETURNS</span>
        <h2 id="persisted-returns-title">What the system can already reconstruct.</h2>
        <p>Original-language payload text is withheld from this English-only surface. PUBLICATION = EXPOSURE; publication does not become external validation merely because it is visible.</p>
      </header>
      <div className="pubPersistedGrid">
        {persistedPublications.length ? persistedPublications.map((publication)=><article key={publication.id}>
          <span>PUBLISHED RETURN</span>
          <time>{publication.publishedAt?formatDate(publication.publishedAt):'DATE UNAVAILABLE'}</time>
          <strong>SFI · Operational Return</strong>
          <small>{publication.snapshotVersion??'SNAPSHOT VERSION UNAVAILABLE'}</small>
        </article>) : <p>No governed operational RETURN is currently published.</p>}
      </div>
    </section>

    <section className="pubFamilies" aria-labelledby="families-title">
      <header>
        <span>EDITORIAL FAMILIES</span>
        <h2 id="families-title">Five lenses. One public record.</h2>
        <p>Families organize reading and discovery. They do not replace canonical classification or convert an observation into evidence.</p>
      </header>
      <div className="pubFamiliesGrid">
        {SFI_EDITORIAL_FAMILIES.map((family)=>{
          const entries=editorialFamilyEntries(family);
          return <article key={family.key}>
            <img src={family.image} alt=""/>
            <div>
              <span>{family.shortLabel.toUpperCase()}</span>
              <h3>{family.label}</h3>
              <p>{family.description}</p>
              <small>{family.imageProvenance}</small>
              <div className="pubFamilyLinks">
                {entries.slice(0,3).map((publication)=>{
                  const projection=publicEnglishProjection(publication.slug,{
                    title:publication.title,
                    subtitle:publication.subtitle,
                    summary:publication.deck,
                  });
                  return <Link key={publication.slug} href={`/publications/${publication.slug}`}>
                    {publicEnglishObservationLabel(publication.observationKind)} · {projection.title}
                  </Link>;
                })}
              </div>
            </div>
          </article>;
        })}
      </div>
    </section>

    <PublicationsCatalog items={items}/>

    <footer className="pubFooter">
      <b>SYSTEM FRICTION INSTITUTE</b>
      <span>OBSERVE · CONTRAST · RETURN</span>
    </footer>
  </main>;
}
