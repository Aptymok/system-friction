import type { Metadata } from 'next';
import {
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
} from '@/lib/discovery/canonicalObjectRegistry';
import { RepositoryConsole, type RepositoryObject } from './RepositoryConsole';
import './repository.css';

export const dynamic='force-dynamic';

export const metadata:Metadata={
  title:'Repository',
  description:'SFI institutional repository: canonical public objects, provenance, lineage, versions and source identity.',
};

export default function RepositoryPage(){
  const objects:RepositoryObject[]=SFI_CANONICAL_OBJECT_REGISTRY
    .filter((record)=>canonicalPublicationDisposition(record).disposition==='PUBLISH')
    .map((record)=>({
      id:record.id,
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
    }))
    .sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)||a.title.localeCompare(b.title));

  return <RepositoryConsole objects={objects}/>;
}
