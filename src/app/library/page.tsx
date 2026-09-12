import { SFI_CANONICAL_OBJECT_REGISTRY, canonicalPublicationDisposition } from '@/lib/discovery/canonicalObjectRegistry';
import { editorialPublicationForSlug } from '@/lib/publications/editorialContent';
import LibraryClient, { type LibraryPublication } from './LibraryClient';
import './library.css';

export const dynamic = 'force-static';

const publications: LibraryPublication[] = SFI_CANONICAL_OBJECT_REGISTRY
  .filter((record) => record.objectType === 'PUBLICATION' && canonicalPublicationDisposition(record).disposition === 'PUBLISH')
  .map((record) => {
    const editorial = editorialPublicationForSlug(record.slug);
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      summary: record.summary,
      version: record.version,
      objectType: record.objectType,
      publicationState: record.publication.state,
      epistemicState: record.epistemicState,
      series: editorial?.series ?? null,
      issue: editorial?.issue ?? null,
      subtitle: editorial?.subtitle ?? null,
      editorialKind: editorial?.editorialKind ?? null,
    };
  });

export default function LibraryPage() {
  return <LibraryClient publications={publications} />;
}
