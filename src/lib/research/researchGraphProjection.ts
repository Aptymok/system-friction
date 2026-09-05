import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
  publicProjectionForCanonicalObject,
  validateCanonicalObjectRegistry,
  type SfiCanonicalEpistemicState,
  type SfiCanonicalMissingField,
  type SfiCanonicalObjectRecord,
  type SfiCanonicalObjectType,
  type SfiCanonicalRightsState,
} from '../discovery/canonicalObjectRegistry';

export const SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT = 'SFI-RESEARCH-GRAPH-INTEGRITY-1.0' as const;
export const SFI_RESEARCH_METADATA_CONTRACT = 'SFI-RESEARCH-METADATA-1.0' as const;
export const SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT = 'SFI-RESEARCH-NO-FABRICATED-IDENTIFIERS-1.0' as const;
export const SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT = 'SFI-RESEARCH-CANONICAL-LINEAGE-1.0' as const;

export const SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES = [
  'METHOD',
  'INSTRUMENT',
  'DATASET',
  'REPORT',
  'PAPER',
  'SOFTWARE',
  'RELEASE',
  'RETURN',
  'PUBLICATION',
] as const;

export type SfiResearchProjectableObjectType = (typeof SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES)[number];

export const SFI_RESEARCH_RELATIONSHIP_TYPES = [
  'REFERENCES',
  'IMPLEMENTS',
] as const;

export type SfiResearchRelationshipType = (typeof SFI_RESEARCH_RELATIONSHIP_TYPES)[number];
export type SfiResearchProjectionDisposition = 'PROJECT' | 'BLOCK';

export interface SfiResearchGraphNode {
  researchContract: typeof SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT;
  metadataContract: typeof SFI_RESEARCH_METADATA_CONTRACT;
  canonicalContract: typeof SFI_CANONICAL_OBJECT_CONTRACT;
  canonicalObjectId: string;
  canonicalObjectKey: string;
  canonicalUrl: string;
  objectType: SfiResearchProjectableObjectType;
  title: string;
  summary: string;
  version: string;
  language: string;
  publicState: 'PUBLIC';
  publicationState: 'PUBLISHED';
  epistemicState: SfiCanonicalEpistemicState;
  lineage: {
    contract: typeof SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT;
    sourceRefs: string[];
    canonicalRelatedObjectRefs: string[];
    methodRefs: string[];
  };
  authorship: {
    state: 'CANONICAL_EXPLICIT' | 'MISSING';
    authors: string[];
  };
  contributors: {
    state: 'MISSING';
    contributors: [];
  };
  rights: {
    state: SfiCanonicalRightsState;
    license: string | null;
  };
  limitations: string[];
  missing: SfiCanonicalMissingField[];
  identifiers: {
    contract: typeof SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT;
    doi: null;
    orcidRefs: [];
    rorRefs: [];
  };
  scholarlyMetadata: {
    affiliation: null;
    legalName: null;
    publicationDate: null;
    releaseDate: null;
    scholarlyStatus: 'NOT_ASSERTED';
  };
}

export interface SfiResearchGraphRelationship {
  relationshipId: string;
  type: SfiResearchRelationshipType;
  sourceCanonicalObjectId: string;
  targetCanonicalObjectId: string;
  evidenceField: 'sourceRefs' | 'methods';
  evidenceRef: string;
}

export interface SfiResearchProjectionRejection {
  canonicalObjectId: string;
  objectType: SfiCanonicalObjectType;
  reasons: string[];
}

export interface SfiResearchGraphProjection {
  contract: typeof SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT;
  metadataContract: typeof SFI_RESEARCH_METADATA_CONTRACT;
  canonicalContract: typeof SFI_CANONICAL_OBJECT_CONTRACT;
  sourceOwner: 'SFI_CANONICAL_OBJECT_REGISTRY';
  nodes: SfiResearchGraphNode[];
  relationships: SfiResearchGraphRelationship[];
  rejected: SfiResearchProjectionRejection[];
  integrityErrors: string[];
}

export interface SfiResearchCitationExport {
  title: string;
  type: SfiResearchProjectableObjectType;
  canonicalUrl: string;
  version: string;
  authors: string[];
  license: string | null;
  doi: null;
  orcidRefs: [];
  rorRefs: [];
  affiliation: null;
  legalName: null;
  publicationDate: null;
  releaseDate: null;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function isProjectableObjectType(objectType: SfiCanonicalObjectType): objectType is SfiResearchProjectableObjectType {
  return (SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES as readonly string[]).includes(objectType);
}

function relationshipId(sourceCanonicalObjectId: string, type: SfiResearchRelationshipType, targetCanonicalObjectId: string): string {
  return `${sourceCanonicalObjectId}:${type}:${targetCanonicalObjectId}`;
}

function canonicalRefTokens(record: SfiCanonicalObjectRecord): string[] {
  return [record.id, record.objectKey, record.canonicalUrl];
}

export function researchProjectionEligibility(record: SfiCanonicalObjectRecord): {
  disposition: SfiResearchProjectionDisposition;
  reasons: string[];
} {
  const publication = canonicalPublicationDisposition(record);
  const reasons = [...publication.reasons];

  if (!isProjectableObjectType(record.objectType)) {
    reasons.push(`OBJECT_TYPE_NOT_RESEARCH_PROJECTABLE:${record.objectType}`);
  }

  if (publication.disposition !== 'PUBLISH') {
    if (publication.reasons.length === 0) reasons.push('CANONICAL_PUBLICATION_GATE_FAILED');
  } else if (!publicProjectionForCanonicalObject(record)) {
    reasons.push('CANONICAL_PUBLIC_PROJECTION_UNAVAILABLE');
  }

  const normalized = unique(reasons);
  return normalized.length
    ? { disposition: 'BLOCK', reasons: normalized }
    : { disposition: 'PROJECT', reasons: [] };
}

function researchNodeFor(record: SfiCanonicalObjectRecord): SfiResearchGraphNode | null {
  if (researchProjectionEligibility(record).disposition !== 'PROJECT') return null;
  if (!isProjectableObjectType(record.objectType)) return null;

  const canonical = publicProjectionForCanonicalObject(record);
  if (!canonical) return null;

  const explicitLicense = record.rights.state === 'OPEN' ? canonical.license : null;

  return {
    researchContract: SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT,
    metadataContract: SFI_RESEARCH_METADATA_CONTRACT,
    canonicalContract: SFI_CANONICAL_OBJECT_CONTRACT,
    canonicalObjectId: canonical.id,
    canonicalObjectKey: canonical.objectKey,
    canonicalUrl: canonical.canonicalUrl,
    objectType: record.objectType,
    title: canonical.title,
    summary: canonical.summary,
    version: canonical.version,
    language: canonical.language,
    publicState: canonical.publicState,
    publicationState: canonical.publicationState,
    epistemicState: canonical.epistemicState,
    lineage: {
      contract: SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT,
      sourceRefs: [...canonical.sourceRefs],
      canonicalRelatedObjectRefs: [...canonical.relatedObjects],
      methodRefs: [...canonical.methods],
    },
    authorship: canonical.authors.length
      ? { state: 'CANONICAL_EXPLICIT', authors: [...canonical.authors] }
      : { state: 'MISSING', authors: [] },
    contributors: {
      state: 'MISSING',
      contributors: [],
    },
    rights: {
      state: record.rights.state,
      license: explicitLicense,
    },
    limitations: [...canonical.limitations],
    missing: canonical.missing.map((entry) => ({ ...entry })),
    identifiers: {
      contract: SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT,
      doi: null,
      orcidRefs: [],
      rorRefs: [],
    },
    scholarlyMetadata: {
      affiliation: null,
      legalName: null,
      publicationDate: null,
      releaseDate: null,
      scholarlyStatus: 'NOT_ASSERTED',
    },
  };
}

function relationshipCandidates(
  record: SfiCanonicalObjectRecord,
  refIndex: ReadonlyMap<string, SfiCanonicalObjectRecord>,
): SfiResearchGraphRelationship[] {
  const output: SfiResearchGraphRelationship[] = [];

  const add = (
    type: SfiResearchRelationshipType,
    evidenceField: SfiResearchGraphRelationship['evidenceField'],
    evidenceRef: string,
  ) => {
    const target = refIndex.get(evidenceRef);
    if (!target || target.id === record.id) return;
    output.push({
      relationshipId: relationshipId(record.id, type, target.id),
      type,
      sourceCanonicalObjectId: record.id,
      targetCanonicalObjectId: target.id,
      evidenceField,
      evidenceRef,
    });
  };

  // sourceRefs prove a reference to a canonical source; they do not, by themselves,
  // prove derivation/causality. Keep the typed claim at REFERENCES.
  for (const ref of record.sourceRefs) add('REFERENCES', 'sourceRefs', ref);

  // A generic `methods` entry means a method is associated with the object. R2-B only
  // emits IMPLEMENTS where the source is SOFTWARE and the target is a canonical METHOD.
  if (record.objectType === 'SOFTWARE') {
    for (const ref of record.methods) {
      const target = refIndex.get(ref);
      if (target?.objectType === 'METHOD') add('IMPLEMENTS', 'methods', ref);
    }
  }

  // relatedObjects is intentionally preserved as canonical lineage but is not given a
  // typed Research Graph edge because the canonical field does not encode relation semantics.
  return output;
}

function deterministicRelationships(records: readonly SfiCanonicalObjectRecord[]): SfiResearchGraphRelationship[] {
  const refIndex = new Map<string, SfiCanonicalObjectRecord>();
  for (const record of records) {
    for (const token of canonicalRefTokens(record)) refIndex.set(token, record);
  }

  const candidates = records.flatMap((record) => relationshipCandidates(record, refIndex));
  candidates.sort((left, right) => {
    const a = `${left.relationshipId}:${left.evidenceField}:${left.evidenceRef}`;
    const b = `${right.relationshipId}:${right.evidenceField}:${right.evidenceRef}`;
    return a.localeCompare(b);
  });

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.relationshipId)) return false;
    seen.add(candidate.relationshipId);
    return true;
  });
}

export function projectResearchGraph(
  records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY,
): SfiResearchGraphProjection {
  const canonicalErrors = validateCanonicalObjectRegistry(records);
  if (canonicalErrors.length) {
    return {
      contract: SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT,
      metadataContract: SFI_RESEARCH_METADATA_CONTRACT,
      canonicalContract: SFI_CANONICAL_OBJECT_CONTRACT,
      sourceOwner: 'SFI_CANONICAL_OBJECT_REGISTRY',
      nodes: [],
      relationships: [],
      rejected: records.map((record) => ({
        canonicalObjectId: record.id,
        objectType: record.objectType,
        reasons: ['CANONICAL_REGISTRY_INVALID'],
      })),
      integrityErrors: canonicalErrors.map((error) => `CANONICAL:${error}`),
    };
  }

  const projectedRecords: SfiCanonicalObjectRecord[] = [];
  const nodes: SfiResearchGraphNode[] = [];
  const rejected: SfiResearchProjectionRejection[] = [];

  for (const record of records) {
    const eligibility = researchProjectionEligibility(record);
    if (eligibility.disposition !== 'PROJECT') {
      rejected.push({
        canonicalObjectId: record.id,
        objectType: record.objectType,
        reasons: eligibility.reasons,
      });
      continue;
    }

    const node = researchNodeFor(record);
    if (!node) {
      rejected.push({
        canonicalObjectId: record.id,
        objectType: record.objectType,
        reasons: ['RESEARCH_PROJECTION_FAILED_CLOSED'],
      });
      continue;
    }

    projectedRecords.push(record);
    nodes.push(node);
  }

  nodes.sort((left, right) => left.canonicalObjectId.localeCompare(right.canonicalObjectId));
  rejected.sort((left, right) => left.canonicalObjectId.localeCompare(right.canonicalObjectId));

  return {
    contract: SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT,
    metadataContract: SFI_RESEARCH_METADATA_CONTRACT,
    canonicalContract: SFI_CANONICAL_OBJECT_CONTRACT,
    sourceOwner: 'SFI_CANONICAL_OBJECT_REGISTRY',
    nodes,
    relationships: deterministicRelationships(projectedRecords),
    rejected,
    integrityErrors: [],
  };
}

export function validateResearchGraphProjection(
  graph: SfiResearchGraphProjection,
  records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY,
): string[] {
  const errors: string[] = [];
  const push = (code: string) => errors.push(code);

  if (graph.contract !== SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT) push('RESEARCH_GRAPH_CONTRACT_MISMATCH');
  if (graph.metadataContract !== SFI_RESEARCH_METADATA_CONTRACT) push('RESEARCH_METADATA_CONTRACT_MISMATCH');
  if (graph.canonicalContract !== SFI_CANONICAL_OBJECT_CONTRACT) push('CANONICAL_CONTRACT_MISMATCH');
  if (graph.sourceOwner !== 'SFI_CANONICAL_OBJECT_REGISTRY') push('NONCANONICAL_SOURCE_OWNER');

  const expected = projectResearchGraph(records);
  const expectedNodes = new Map(expected.nodes.map((node) => [node.canonicalObjectId, node]));
  const expectedRelationships = new Map(expected.relationships.map((relationship) => [relationship.relationshipId, relationship]));

  if (JSON.stringify(graph.integrityErrors) !== JSON.stringify(expected.integrityErrors)) push('INTEGRITY_ERROR_PROJECTION_MISMATCH');
  if (JSON.stringify(graph.rejected) !== JSON.stringify(expected.rejected)) push('REJECTION_PROJECTION_MISMATCH');

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.canonicalObjectId)) push(`DUPLICATE_RESEARCH_NODE:${node.canonicalObjectId}`);
    nodeIds.add(node.canonicalObjectId);

    if (!SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES.includes(node.objectType)) push(`NODE_TYPE_NOT_PROJECTABLE:${node.canonicalObjectId}`);
    if (node.identifiers.doi !== null || node.identifiers.orcidRefs.length || node.identifiers.rorRefs.length) {
      push(`FABRICATED_IDENTIFIER:${node.canonicalObjectId}`);
    }
    if (
      node.scholarlyMetadata.affiliation !== null
      || node.scholarlyMetadata.legalName !== null
      || node.scholarlyMetadata.publicationDate !== null
      || node.scholarlyMetadata.releaseDate !== null
      || node.scholarlyMetadata.scholarlyStatus !== 'NOT_ASSERTED'
    ) {
      push(`INFERRED_SCHOLARLY_METADATA:${node.canonicalObjectId}`);
    }

    const expectedNode = expectedNodes.get(node.canonicalObjectId);
    if (!expectedNode) push(`NODE_NOT_DERIVABLE:${node.canonicalObjectId}`);
    else if (JSON.stringify(node) !== JSON.stringify(expectedNode)) push(`NODE_PROJECTION_MISMATCH:${node.canonicalObjectId}`);
  }

  if (graph.nodes.length !== expected.nodes.length) push('NODE_COUNT_MISMATCH');

  const relationshipIds = new Set<string>();
  for (const relationship of graph.relationships) {
    if (relationshipIds.has(relationship.relationshipId)) push(`DUPLICATE_RELATIONSHIP:${relationship.relationshipId}`);
    relationshipIds.add(relationship.relationshipId);

    if (!(SFI_RESEARCH_RELATIONSHIP_TYPES as readonly string[]).includes(relationship.type)) {
      push(`RELATION_TYPE_UNSUPPORTED:${relationship.relationshipId}`);
    }
    if (!nodeIds.has(relationship.sourceCanonicalObjectId)) push(`RELATION_SOURCE_NOT_PROJECTED:${relationship.relationshipId}`);
    if (!nodeIds.has(relationship.targetCanonicalObjectId)) push(`RELATION_TARGET_NOT_PROJECTED:${relationship.relationshipId}`);

    const expectedRelationship = expectedRelationships.get(relationship.relationshipId);
    if (!expectedRelationship) push(`RELATION_NOT_DERIVABLE:${relationship.relationshipId}`);
    else if (JSON.stringify(relationship) !== JSON.stringify(expectedRelationship)) push(`RELATION_PROJECTION_MISMATCH:${relationship.relationshipId}`);
  }

  if (graph.relationships.length !== expected.relationships.length) push('RELATIONSHIP_COUNT_MISMATCH');

  return unique(errors);
}

export function researchCitationExportForNode(node: SfiResearchGraphNode): SfiResearchCitationExport {
  return {
    title: node.title,
    type: node.objectType,
    canonicalUrl: node.canonicalUrl,
    version: node.version,
    authors: [...node.authorship.authors],
    license: node.rights.license,
    doi: null,
    orcidRefs: [],
    rorRefs: [],
    affiliation: null,
    legalName: null,
    publicationDate: null,
    releaseDate: null,
  };
}
