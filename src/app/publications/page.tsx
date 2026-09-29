import type { Metadata } from 'next';
import Link from 'next/link';
import {
  SFI_EDITORIAL_PUBLICATIONS,
  SFI_NOTAS_TEMPORALES_V1,
} from '@/lib/publications/editorialContent';
import {
  publicEnglishProjection,
} from '@/lib/publications/publicEnglishProjection';
import { getPublicPublishedReturns } from '@/lib/observatory/publicState';
import { PublicationsCatalog, type PublicationCatalogItem } from './PublicationsCatalog';
import { RegistryDiscoveryMesh } from './RegistryDiscoveryMesh';
import { SfiPublicHeader, SfiPublicFooter } from '@/components/public/SfiPublicChrome';
import './publications.css';

export const dynamic='force-dynamic';

const CANONICAL_URL='https://systemfriction.org/publications';

export const metadata:Metadata={
  title:'Registry · System Friction Institute',
  description:'SFI Registry: a connected graph of publications, methods, observations and RETURN.',
  alternates:{canonical:CANONICAL_URL},
  openGraph:{
    type:'website',
    url:CANONICAL_URL,
    siteName:'System Friction Institute',
    title:'Registry · System Friction Institute',
    description:'Connected institutional memory: publications as reconstructible nodes linked by sequence and shared classification.',
  },
  other:{
    'sfi-surface':'REGISTRY_GRAPH',
    'sfi-public-language':'en',
    'sfi-editorial-contract':'SFI-EDITORIAL-FAMILY-PROJECTION-1.0',
    'sfi-identity-manual':'SFI-ID-003 / MASTER EDITION V4.0',
  },
};

function categoryFor(item:(typeof SFI_EDITORIAL_PUBLICATIONS)[number]){
  if(item.editorialKind==='TEMPORAL_ISSUE')return'MONTHLY';
  if(item.editorialKind==='FRICTION_BRIEF')return'RESEARCH';
  const map:Record<string,string>={
    SIGNAL:'SIGNALS',
    CASE:'CASES',
    TRAJECTORY:'FIELD',
    METHOD:'METHODS',
    MEMORY:'RETURN',
    ATLAS:'FIELD',
    INSTITUTIONAL:'INSTITUTIONS',
  };
  return map[item.observationKind||'']||'OBSERVATIONS';
}

function formatDate(value:string){
  const date=new Date(value);
  if(!Number.isFinite(date.valueOf()))return value;
  return new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric'}).format(date);
}

const DISCOVERY_MESH_PUBLICATION=Object.freeze({
  slug:'discovery-mesh-publicar-no-es-ser-encontrado',
  title:'Publishing Is Not Being Found',
  subtitle:'Discovery Mesh and the distance between exposure, discovery and RETURN',
  summary:'A method note on observing discoverability without converting publication, retrieval or propagation into recognition or external validation.',
  publishedAt:'2026-09-16T00:00:00-06:00',
  category:'METHODS',
} as const);

const editorialItems:PublicationCatalogItem[]=SFI_EDITORIAL_PUBLICATIONS
  .slice()
  .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))
  .map((publication)=>{
    const projection=publicEnglishProjection(publication.slug,{
      title:publication.title,
      subtitle:publication.subtitle,
      summary:publication.deck,
    });
    return{
      slug:publication.slug,
      title:projection.title,
      subtitle:projection.subtitle,
      summary:projection.summary,
      publishedAt:publication.publishedAt,
      category:categoryFor(publication),
    };
  });

const items:readonly PublicationCatalogItem[]=[
  ...editorialItems,
  DISCOVERY_MESH_PUBLICATION,
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
    <SfiPublicHeader active="/publications"/>

    <section className="pubGraphHero" aria-labelledby="publications-title">
      <div>
        <span>REGISTRY / PUBLIC RECORD</span>
        <h1 id="publications-title">Memory is a graph, not a gallery.</h1>
        <p>Each publication is an addressable information hub. The registry shows relationships through shape, color and links instead of decorative photography.</p>
      </div>
      <aside>
        <small>READING RULE</small>
        <strong>NODE ≠ CLAIM OF IMPORTANCE</strong>
        <span>LINE ≠ CAUSALITY</span>
        <span>PUBLICATION = EXPOSURE</span>
        <span>EXPOSURE ≠ EXTERNAL EVIDENCE ≠ RETURN</span>
      </aside>
    </section>

    <PublicationsCatalog items={items}/>

    <section className="pubPersisted" aria-labelledby="persisted-returns-title">
      <header>
        <span>PUBLISHED OPERATIONAL RETURNS</span>
        <h2 id="persisted-returns-title">What the system can already reconstruct.</h2>
        <p>These records are operational RETURN publications. Their visibility does not convert them into external validation.</p>
      </header>
      <div className="pubPersistedGrid">
        {persistedPublications.length?persistedPublications.map((publication)=><article key={publication.id}>
          <span>PUBLISHED RETURN</span>
          <time>{publication.publishedAt?formatDate(publication.publishedAt):'DATE UNAVAILABLE'}</time>
          <strong>SFI · Operational Return</strong>
          <small>{publication.snapshotVersion??'SNAPSHOT VERSION UNAVAILABLE'}</small>
        </article>):<p>No governed operational RETURN is currently published.</p>}
      </div>
    </section>

    <section className="pubMonthlyAnchor" aria-label="Current monthly issue">
      <small>CURRENT MONTHLY ISSUE</small>
      <strong>{monthlyProjection.title}</strong>
      <p>{monthlyProjection.summary}</p>
      <Link href={'/publications/'+monthly.slug}>OPEN MONTHLY INFORMATION HUB →</Link>
    </section>

    <RegistryDiscoveryMesh/>

    <SfiPublicFooter/>
  </main>;
}
