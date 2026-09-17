import docs from '../../../data/sfi/sf_docs_frontmatter.json';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../../../packages/graph/src';

type LibraryDocRecord = {
  id: string;
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

const CORPUS = docs as LibraryDocRecord[];
const PROJECTION_TIMESTAMP = '2026-09-17T00:00:00.000Z';
const PROVENANCE = 'data/sfi/sf_docs_frontmatter.json';

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'unknown';
}

function sharedAttributes(extra: Record<string, unknown> = {}) {
  return {
    profile: 'shared',
    epistemicClass: 'DECLARED',
    projectionKind: 'DOCUMENTARY_RELATION',
    doesNotImplyValidation: true,
    source: PROVENANCE,
    ...extra,
  };
}

function node(input: {
  nodeId: string;
  label: string;
  ontologyType: string;
  lineage?: string[];
  attributes?: Record<string, unknown>;
}): CanonicalGraphNode {
  return {
    nodeId: input.nodeId,
    label: input.label,
    ontologyType: input.ontologyType,
    profile: 'shared',
    origin: 'library_corpus',
    provenance: PROVENANCE,
    lineage: input.lineage ?? [],
    attributes: sharedAttributes(input.attributes),
    createdAt: PROJECTION_TIMESTAMP,
    updatedAt: PROJECTION_TIMESTAMP,
  };
}

function edge(input: {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
  weight: number;
  lineage?: string[];
  attributes?: Record<string, unknown>;
}): CanonicalGraphEdge {
  return {
    edgeId: input.edgeId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    relation: input.relation,
    weight: input.weight,
    profile: 'shared',
    origin: 'library_corpus',
    provenance: PROVENANCE,
    lineage: input.lineage ?? [],
    attributes: sharedAttributes(input.attributes),
    createdAt: PROJECTION_TIMESTAMP,
    updatedAt: PROJECTION_TIMESTAMP,
  };
}

export function libraryDocumentGraphId(doc: Pick<LibraryDocRecord, 'id'>) {
  return `library:doc:${doc.id}`;
}

export function buildLibraryCorpusGraphProjection() {
  const nodes = new Map<string, CanonicalGraphNode>();
  const edges = new Map<string, CanonicalGraphEdge>();

  const ensureTaxonomyNode = (kind: 'series' | 'pattern' | 'mihm_variable', value: string) => {
    const nodeId = `library:${kind}:${slug(value)}`;
    if (!nodes.has(nodeId)) {
      nodes.set(nodeId, node({
        nodeId,
        label: value,
        ontologyType: kind,
        attributes: { taxonomyKind: kind, taxonomyValue: value },
      }));
    }
    return nodeId;
  };

  for (const doc of CORPUS) {
    const docNodeId = libraryDocumentGraphId(doc);
    const lineage = doc.contentHash ? [`content-hash:${doc.contentHash}`] : [];
    nodes.set(docNodeId, node({
      nodeId: docNodeId,
      label: doc.title,
      ontologyType: 'document',
      lineage,
      attributes: {
        libraryId: doc.id,
        declaredNodeId: doc.nodeId ?? null,
        docId: doc.doc_id ?? null,
        series: doc.series ?? null,
        summary: doc.summary ?? null,
        version: doc.version ?? null,
        stability: doc.stability ?? null,
        firstPublished: doc.first_published ?? null,
        sourceNode: doc.node ?? null,
        mihmVariable: doc.mihm_variable ?? null,
        mihmEquation: doc.mihm_equation ?? null,
        sfPattern: doc.sf_pattern ?? null,
        mihmNote: doc.mihm_note ?? null,
        patterns: doc.patterns ?? [],
        contentLength: doc.contentLength ?? null,
        contentHash: doc.contentHash ?? null,
      },
    }));

    if (doc.series) {
      const target = ensureTaxonomyNode('series', doc.series);
      const edgeId = `${docNodeId}->${target}:belongs_to_series`;
      edges.set(edgeId, edge({ edgeId, sourceNodeId: docNodeId, targetNodeId: target, relation: 'belongs_to_series', weight: 0.8, lineage }));
    }

    const patterns = [...new Set([doc.sf_pattern, ...(doc.patterns ?? [])].filter((value): value is string => Boolean(value?.trim())))];
    for (const pattern of patterns) {
      const target = ensureTaxonomyNode('pattern', pattern);
      const edgeId = `${docNodeId}->${target}:expresses_pattern`;
      edges.set(edgeId, edge({ edgeId, sourceNodeId: docNodeId, targetNodeId: target, relation: 'expresses_pattern', weight: 0.7, lineage }));
    }

    if (doc.mihm_variable) {
      const target = ensureTaxonomyNode('mihm_variable', doc.mihm_variable);
      const edgeId = `${docNodeId}->${target}:declares_mihm_variable`;
      edges.set(edgeId, edge({ edgeId, sourceNodeId: docNodeId, targetNodeId: target, relation: 'declares_mihm_variable', weight: 0.9, lineage }));
    }
  }

  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    source: PROVENANCE,
    epistemicClass: 'DECLARED' as const,
    persisted: false,
    claimBoundary: 'Documentary relations project declared corpus metadata into the canonical graph runtime. They do not validate claims, infer causality, or imply RETURN.',
  };
}
