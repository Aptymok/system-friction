import type { Metadata } from 'next';
import {
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
} from '@/lib/discovery/canonicalObjectRegistry';
import { SFI_EDITORIAL_PUBLICATIONS } from '@/lib/publications/editorialContent';
import {
  SFI_DISCOVERY_CRAWLER_POLICY,
  SFI_PUBLIC_DISCOVERY_API_PATHS,
} from '@/lib/discovery/crawlerPolicy';
import { discoveryExposurePlan } from '@/lib/discovery/exposureProjection';
import { discoveryMachineResources } from '@/lib/discovery/discoveryEmitter';
import { SFI_DISCOVERY_LIFECYCLE } from '@/lib/discovery/institutionalDiscoveryMesh';
import { RepositoryConsole, type RepositoryObject, type RepositoryDiscovery } from './RepositoryConsole';
import './repository.css';

export const dynamic='force-dynamic';

export const metadata:Metadata={
  title:'Repository',
  description:'SFI institutional repository: canonical objects, publications, provenance, lineage, versions and discovery state in one reconstructible surface.',
};

type PageProps={searchParams:Promise<{object?:string}>};

export default async function RepositoryPage({searchParams}:PageProps){
  const {object:requestedObject}=await searchParams;
  const editorialBySlug=new Map(SFI_EDITORIAL_PUBLICATIONS.map((publication)=>[publication.slug,publication]));

  const objects:RepositoryObject[]=SFI_CANONICAL_OBJECT_REGISTRY
    .filter((record)=>canonicalPublicationDisposition(record).disposition==='PUBLISH')
    .map((record)=>{
      const editorial=editorialBySlug.get(record.slug);
      return {
        id:record.id,
        slug:record.slug,
        objectKey:record.objectKey,
        objectType:record.objectType,
        canonicalUrl:record.canonicalUrl,
        title:record.title,
        summary:record.summary,
        epistemicState:record.epistemicState,
        version:record.version,
        language:record.language,
        authors:[...record.authors],
        methods:[...record.methods],
        relatedObjects:[...record.relatedObjects],
        sourceRefs:[...record.sourceRefs],
        evidenceRefs:[...record.evidenceIdentity.refs],
        publicState:record.publicState,
        publicationState:record.publication.state,
        license:record.license,
        createdAt:record.createdAt,
        updatedAt:record.updatedAt,
        limitations:[...record.limitations],
        missing:record.missing.map((item)=>({...item})),
        editorial:editorial?{
          editorialKind:editorial.editorialKind,
          collection:editorial.collection,
          observationKind:editorial.observationKind,
          language:editorial.language,
          series:editorial.series,
          issue:editorial.issue,
          subtitle:editorial.subtitle,
          motto:editorial.motto,
          deck:editorial.deck,
          publishedAt:editorial.publishedAt,
          mediumUrl:editorial.mediumUrl,
          coverImage:editorial.coverImage,
          contentState:editorial.contentState,
          visuals:editorial.visuals.map((visual)=>({...visual})),
          renditions:editorial.renditions.map((rendition)=>({...rendition})),
          sections:editorial.sections.map((section)=>({...section,paragraphs:[...section.paragraphs],items:section.items?[...section.items]:undefined})),
          cadence:editorial.cadence.map((item)=>({...item})),
          domains:[...editorial.domains],
          epistemicBoundary:[...editorial.epistemicBoundary],
          temporalProfile:editorial.temporalProfile?{
            ...editorial.temporalProfile,
            followUpPrompts:[...editorial.temporalProfile.followUpPrompts],
          }:null,
        }:null,
      };
    })
    .sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)||a.title.localeCompare(b.title));

  const resources=discoveryMachineResources();
  const exposure=discoveryExposurePlan();
  const discovery:RepositoryDiscovery={
    ownedMachineSurfaceCount:exposure.targets.filter((target)=>target.targetClass==='OWNED_MACHINE_SURFACE').length,
    channels:[
      {id:'HUMAN',state:'PUBLIC SURFACE',basis:'Repository is directly readable by people.'},
      {id:'SEARCH',state:SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.state,basis:'Crawl permission is not proof of indexing, retrieval or recognition.'},
      {id:'LLM',state:'ADDRESSABLE',basis:'Machine-readable representations exist; addressability is not observed discovery.'},
      {id:'MCP',state:'PUBLIC_READ_ONLY',basis:'Public canonical resources are exposed under read-only authority.'},
      {id:'API',state:'ALLOWLISTED_ONLY',basis:'Only explicitly public discovery APIs are eligible.'},
    ],
    lifecycle:SFI_DISCOVERY_LIFECYCLE.stages.map((stage)=>({
      id:stage.id,
      meaning:stage.meaning,
      state:stage.id==='EXPOSURE'?'AVAILABLE':'NOT OBSERVED IN THIS PUBLIC PROJECTION',
    })),
    machineLinks:[
      {label:'AI INDEX',href:resources.aiIndex},
      {label:'LLMS',href:resources.llms},
      {label:'LLMS FULL',href:resources.llmsFull},
      {label:'SITEMAP',href:resources.sitemap},
      {label:'JSON FEED',href:resources.jsonFeed},
      {label:'MCP',href:resources.mcp.endpoint},
    ],
    crawlerBots:[...SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.bots],
    trainingReuse:SFI_DISCOVERY_CRAWLER_POLICY.modelTrainingDataReuse.state,
    publicApiPaths:[...SFI_PUBLIC_DISCOVERY_API_PATHS],
  };

  return <RepositoryConsole objects={objects} initialObject={requestedObject??null} discovery={discovery}/>;
}
