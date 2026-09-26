import docs from '../../../../data/sfi/sf_docs_frontmatter.json';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { libraryDocumentGraphId } from '@/lib/graph/libraryCorpusProjection';

type DocumentaryCatalogDoc = {
  id: string;
  title?: string;
  [key: string]: unknown;
};

export const DOCUMENTARY_CATALOG_CONTRACT = Object.freeze({
  surfaceState: 'PUBLIC_SURFACE_RETIRED_TO_PUBLICATIONS',
  source: 'data/sfi/sf_docs_frontmatter.json',
  surfaceLabel: 'LIBRARY · DOCUMENTARY CORPUS',
  catalogLabel: 'CANONICAL DOCUMENTARY CATALOG',
  compactBodyBoundary: 'The canonical compact corpus preserves metadata and declared documentary relations; full bodies are not assumed to be materialized.',
  fullBodyReaderBoundary: 'FULL DOCUMENT BODY READER = NOT MATERIALIZED',
  storageCreatesEvidence: false,
  publicRoute: '/publications',
} as const);

export const DOCUMENTARY_CATALOG_CORPUS = docs as DocumentaryCatalogDoc[];

function unique(values:string[]){
  return [...new Set(values.filter(Boolean))];
}

/**
 * Internal read-only documentary capability.
 *
 * The former public /library page is retired to /publications, but its canonical
 * corpus remains connected to the SFI graph. Reading documentary relations does
 * not validate a document, infer causality, or consume private Cognitive Spine state.
 */
export async function readDocumentaryCatalogGraph(){
  const graph = await readCanonicalGraphState('sfi');
  const nodeById = new Map(graph.nodes.map((node)=>[node.nodeId,node]));
  const libraryEdges = graph.edges.filter((edge)=>edge.origin==='library_corpus');
  const incomingByTarget = new Map<string,string[]>();

  for(const edge of libraryEdges){
    const existing=incomingByTarget.get(edge.targetNodeId)??[];
    existing.push(edge.sourceNodeId);
    incomingByTarget.set(edge.targetNodeId,existing);
  }

  const corpus=DOCUMENTARY_CATALOG_CORPUS.map((doc)=>{
    const graphId=libraryDocumentGraphId(doc);
    const outgoing=libraryEdges.filter((edge)=>edge.sourceNodeId===graphId);
    const taxonomyLabels=outgoing
      .map((edge)=>nodeById.get(edge.targetNodeId)?.label??'')
      .filter(Boolean);
    const relatedTitles=outgoing.flatMap((edge)=>
      (incomingByTarget.get(edge.targetNodeId)??[])
        .filter((sourceNodeId)=>sourceNodeId!==graphId)
        .map((sourceNodeId)=>nodeById.get(sourceNodeId)?.label??'')
        .filter(Boolean),
    );
    const graphRelations=unique([...taxonomyLabels,...relatedTitles]);
    return {...doc,graphRelations,graphRelationCount:graphRelations.length};
  });

  return {
    corpus,
    graphRelations:true,
    graphState:graph.sourceState,
    graphBoundary:graph.degradedReason??'PERSISTED + DECLARED GRAPH READ OBSERVED',
    graphNodes:graph.nodes.filter((node)=>node.origin==='library_corpus').length,
    graphEdges:libraryEdges.length,
  };
}
