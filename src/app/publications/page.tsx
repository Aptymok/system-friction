import { PublicationsCatalog, type PublicationCatalogItem } from './PublicationsCatalog';
import { RegistryDiscoveryMesh } from './RegistryDiscoveryMesh';
import {
  SFI_EDITORIAL_PUBLICATIONS,
  SFI_NOTAS_TEMPORALES_V1,
  type SfiEditorialPublication,
} from '@/lib/publications/editorialContent';
import { getPublicPublishedReturns } from '@/lib/observatory/publicState';
import './publications.css';

export const dynamic='force-dynamic';

function categoryFor(publication:SfiEditorialPublication){
  if(publication.editorialKind==='TEMPORAL_ISSUE') return 'MONTHLY';
  if(publication.editorialKind==='FRICTION_BRIEF') return 'RESEARCH';
  const kind=publication.observationKind;
  if(kind==='METHOD') return 'METHODS';
  if(kind==='CASE') return 'CASES';
  if(kind==='TRAJECTORY') return 'FIELD';
  if(kind==='ATLAS') return 'FIELD';
  if(kind==='MEMORY') return 'RETURN';
  if(kind==='INSTITUTIONAL') return 'INSTITUTIONS';
  return 'OBSERVATIONS';
}

function editorialItem(publication:SfiEditorialPublication):PublicationCatalogItem{
  return {
    slug:publication.slug,
    title:publication.title,
    subtitle:publication.subtitle,
    summary:publication.deck,
    publishedAt:publication.publishedAt,
    category:categoryFor(publication),
  };
}

function textValue(payload:Record<string,unknown>|null,key:string){
  const value=payload?.[key];
  return typeof value==='string'&&value.trim()?value.trim():null;
}

export default async function PublicationsPage(){
  const persisted=await getPublicPublishedReturns(24);
  const itemsBySlug=new Map<string,PublicationCatalogItem>();

  SFI_EDITORIAL_PUBLICATIONS.forEach((publication)=>itemsBySlug.set(publication.slug,editorialItem(publication)));
  itemsBySlug.set(SFI_NOTAS_TEMPORALES_V1.slug,editorialItem(SFI_NOTAS_TEMPORALES_V1));

  persisted.forEach((row)=>{
    const payload=row.publicPayload;
    const slug=textValue(payload,'slug')??textValue(payload,'canonical_slug');
    const title=textValue(payload,'title');
    if(!slug||!title||itemsBySlug.has(slug)) return;
    itemsBySlug.set(slug,{
      slug,
      title,
      subtitle:textValue(payload,'subtitle')??textValue(payload,'deck')??'Published institutional object.',
      summary:textValue(payload,'summary')??textValue(payload,'description')??textValue(payload,'deck')??'Published institutional object.',
      publishedAt:row.publishedAt??new Date(0).toISOString(),
      category:(textValue(payload,'category')??textValue(payload,'editorialKind')??'OBSERVATIONS').toUpperCase(),
    });
  });

  const items=[...itemsBySlug.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));

  return <main className="publicationsHub">
    <section className="pubGraphHero">
      <div>
        <span>REGISTRY · PUBLICATIONS · DISCOVERY MESH</span>
        <h1>Memory is a graph, not a gallery.</h1>
        <p>Publications, research notes, temporal issues and institutional records remain connected to their lineage, classification and public discovery boundary. Publication establishes exposure; later discovery and RETURN require separate evidence.</p>
      </div>
      <aside>
        <small>PUBLIC REGISTRY</small>
        <strong>{items.length} ADDRESSABLE OBJECTS</strong>
        <span>PUBLICATION = EXPOSURE</span>
        <span>DISCOVERY ≠ ASSUMED</span>
      </aside>
    </section>
    <PublicationsCatalog items={items}/>
    <RegistryDiscoveryMesh/>
  </main>;
}
