import docs from '../../../data/sfi/sf_docs_frontmatter.json';
import { SFI_CANONICAL_OBJECT_REGISTRY, canonicalPublicationDisposition } from '@/lib/discovery/canonicalObjectRegistry';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { libraryDocumentGraphId } from '@/lib/graph/libraryCorpusProjection';
import { editorialPublicationForSlug } from '@/lib/publications/editorialContent';
import LibraryClient, { type LibraryDoc, type LibraryPublication, type LibrarySurfaceContract } from './LibraryClient';
import './library.css';

export const dynamic = 'force-static';
export const revalidate = 900;

const baseCorpus = docs as LibraryDoc[];

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
      collection: editorial?.collection ?? null,
      observationKind: editorial?.observationKind ?? null,
      publishedAt: editorial?.publishedAt ?? record.createdAt,
      mediumUrl: editorial?.mediumUrl ?? null,
      contentState: editorial?.contentState ?? null,
      coverImage: editorial?.coverImage ?? null,
    };
  })
  .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export default async function LibraryPage() {
  const graph = await readCanonicalGraphState('sfi');
  const nodeById = new Map(graph.nodes.map((node) => [node.nodeId, node]));
  const libraryEdges = graph.edges.filter((edge) => edge.origin === 'library_corpus');
  const incomingByTarget = new Map<string, string[]>();

  for (const edge of libraryEdges) {
    const existing = incomingByTarget.get(edge.targetNodeId) ?? [];
    existing.push(edge.sourceNodeId);
    incomingByTarget.set(edge.targetNodeId, existing);
  }

  const corpus = baseCorpus.map((doc) => {
    const graphId = libraryDocumentGraphId(doc);
    const outgoing = libraryEdges.filter((edge) => edge.sourceNodeId === graphId);
    const taxonomyLabels = outgoing
      .map((edge) => nodeById.get(edge.targetNodeId)?.label ?? '')
      .filter(Boolean);
    const relatedTitles = outgoing.flatMap((edge) =>
      (incomingByTarget.get(edge.targetNodeId) ?? [])
        .filter((sourceNodeId) => sourceNodeId !== graphId)
        .map((sourceNodeId) => nodeById.get(sourceNodeId)?.label ?? '')
        .filter(Boolean),
    );
    const graphRelations = unique([...taxonomyLabels, ...relatedTitles]);
    return {
      ...doc,
      graphRelations,
      graphRelationCount: graphRelations.length,
    };
  });

  const surfaceContract: LibrarySurfaceContract = {
    surfaceLabel: 'LIBRARY · DOCUMENTARY CORPUS · NEURAL GRAPH',
    catalogLabel: 'CATÁLOGO DOCUMENTAL CANÓNICO · NODOS / RELACIONES',
    compactBodyBoundary: 'El catálogo conserva metadata compacta y relaciones documentales declaradas; los cuerpos completos no se presumen materializados y una relación no equivale a validación.',
    fullBodyReaderBoundary: 'FULL DOCUMENT BODY READER = NOT MATERIALIZED',
    graphState: graph.sourceState,
    graphBoundary: graph.degradedReason ?? 'PERSISTED + DECLARED GRAPH READ OBSERVED',
    graphNodes: graph.nodes.filter((node) => node.origin === 'library_corpus').length,
    graphEdges: libraryEdges.length,
  };

  return <LibraryClient publications={publications} corpus={corpus} surfaceContract={surfaceContract} />;
}
