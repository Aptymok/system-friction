import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalPublicationDisposition,
  publicProjectionForCanonicalObject,
  validateCanonicalObjectRegistry,
  type SfiCanonicalEpistemicState,
  type SfiCanonicalMissingField,
  type SfiCanonicalObjectRecord,
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

/**
 * `relatedObjects` in SFI-CANONICAL-OBJECT-1.0 is untyped. Research Graph therefore
 * preserves only the exact semantic that the canonical field proves. More specific
 * scholarly semantics (CITES, REFERENCES, DERIVED_FROM, RETURN_OF, etc.) require a
 * canonical source contract that explicitly carries those semantics first.
 */
export const SFI_RESEARCH_RELATIONSHIP_TYPES = ['RELATED_OBJECT'] as const;
export type SfiResearchRelationshipType = (typeof SFI_RESEARCH_RELATIONSHIP_TYPES)[number];

export interface SfiResearchGraphNode {
  canonicalObjectContract: typeof SFI_CANONICAL_OBJECT_CONTRACT;
  canonicalObjectId: string;
  canonicalObjectKey: string;
  canonicalUrl: string;
  objectType: SfiResearchProjectableObjectType;
  title: string;
  summary: string;
  version: string;
  language: string;
  publicationState: 'PUBLISHED';
  publicState: 'PUBLIC';
  epistemicState: SfiCanonicalEpistemicState;
  authors: string[];
  methods: string[];
  sourceRefs: string[];
  rightsState: SfiCanonicalRightsState;
  license: string | null;
  limitations: string[];
  missing: SfiCanonicalMissingField[];
  relatedCanonicalObjectIds: string[];
  unprojectedRelatedCanonicalObjectIds: string[];
}

export interface SfiResearchGraphRelationship {
  type: SfiResearchRelationshipType;
  fromCanonicalObjectId: string;
  toCanonicalObjectId: string;
}

export interface SfiResearchGraphProjection {
  contract: typeof SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT;
  metadataContract: typeof SFI_RESEARCH_METADATA_CONTRACT;
  identifierContract: typeof SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT;
  lineageContract: typeof SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT;
  sourceContract: typeof SFI_CANONICAL_OBJECT_CONTRACT;
  nodes: SfiResearchGraphNode[];
  relationships: SfiResearchGraphRelationship[];
}

export interface SfiResearchCitationExport {
  canonicalObjectId: string;
  canonicalUrl: string;
  objectType: SfiResearchProjectableObjectType;
  title: string;
  version: string;
  authors: string[];
  license: string | null;
  sourceRefs: string[];
  limitations: string[];
  missing: SfiCanonicalMissingField[];
}

function isResearchProjectableType(value: string): value is SfiResearchProjectableObjectType {
  return (SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES as readonly string[]).includes(value);
}

function cloneMissing(entries: readonly SfiCanonicalMissingField[]): SfiCanonicalMissingField[] {
  return entries.map((entry) => ({ ...entry }));
}

function projectNode(record: SfiCanonicalObjectRecord): SfiResearchGraphNode | null {
  if (!isResearchProjectableType(record.objectType)) return null;
  if (canonicalPublicationDisposition(record).disposition !== 'PUBLISH') return null;

  const publicProjection = publicProjectionForCanonicalObject(record);
  if (!publicProjection) return null;

  return {
    canonicalObjectContract: SFI_CANONICAL_OBJECT_CONTRACT,
    canonicalObjectId: publicProjection.id,
    canonicalObjectKey: publicProjection.objectKey,
    canonicalUrl: publicProjection.canonicalUrl,
    objectType: record.objectType,
    title: publicProjection.title,
    summary: publicProjection.summary,
    version: publicProjection.version,
    language: publicProjection.language,
    publicationState: publicProjection.publicationState,
    publicState: publicProjection.publicState,
    epistemicState: publicProjection.epistemicState,
    authors: [...publicProjection.authors],
    methods: [...publicProjection.methods],
    sourceRefs: [...publicProjection.sourceRefs],
    rightsState: record.rights.state,
    license: publicProjection.license,
    limitations: [...publicProjection.limitations],
    missing: cloneMissing(publicProjection.missing),
    relatedCanonicalObjectIds: [...publicProjection.relatedObjects],
    unprojectedRelatedCanonicalObjectIds: [],
  };
}

function relationshipKey(relationship: SfiResearchGraphRelationship): string {
  return `${relationship.fromCanonicalObjectId}\u0000${relationship.type}\u0000${relationship.toCanonicalObjectId}`;
}

function buildProjectionUnchecked(records: readonly SfiCanonicalObjectRecord[]): SfiResearchGraphProjection {
  const nodes = records
    .map(projectNode)
    .filter((node): node is SfiResearchGraphNode => node !== null)
    .sort((left, right) => left.canonicalObjectId.localeCompare(right.canonicalObjectId));

  const projectedIds = new Set(nodes.map((node) => node.canonicalObjectId));
  const relationships: SfiResearchGraphRelationship[] = [];

  for (const node of nodes) {
    const unprojected: string[] = [];
    for (const relatedId of [...node.relatedCanonicalObjectIds].sort()) {
      if (!projectedIds.has(relatedId) || relatedId === node.canonicalObjectId) {
        unprojected.push(relatedId);
        continue;
      }
      relationships.push({
        type: 'RELATED_OBJECT',
        fromCanonicalObjectId: node.canonicalObjectId,
        toCanonicalObjectId: relatedId,
      });
    }
    node.unprojectedRelatedCanonicalObjectIds = unprojected;
  }

  relationships.sort((left, right) => relationshipKey(left).localeCompare(relationshipKey(right)));

  return {
    contract: SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT,
    metadataContract: SFI_RESEARCH_METADATA_CONTRACT,
    identifierContract: SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT,
    lineageContract: SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT,
    sourceContract: SFI_CANONICAL_OBJECT_CONTRACT,
    nodes,
    relationships,
  };
}

export function researchGraphProjectionForCanonicalObjects(
  records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY,
): SfiResearchGraphProjection {
  const sourceErrors = validateCanonicalObjectRegistry(records);
  if (sourceErrors.length > 0) {
    throw new Error(`invalid_canonical_object_source:${sourceErrors.join('|')}`);
  }

  const projection = buildProjectionUnchecked(records);
  const errors = validateResearchGraphProjection(projection, records);
  if (errors.length > 0) throw new Error(`invalid_research_graph_projection:${errors.join('|')}`);
  return projection;
}

export function validateResearchGraphProjection(
  projection: SfiResearchGraphProjection,
  records: readonly SfiCanonicalObjectRecord[],
): string[] {
  const errors: string[] = [];
  const push = (code: string) => errors.push(code);

  if (projection.contract !== SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT) push('RESEARCH_GRAPH_CONTRACT_MISMATCH');
  if (projection.metadataContract !== SFI_RESEARCH_METADATA_CONTRACT) push('RESEARCH_METADATA_CONTRACT_MISMATCH');
  if (projection.identifierContract !== SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT) push('IDENTIFIER_CONTRACT_MISMATCH');
  if (projection.lineageContract !== SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT) push('LINEAGE_CONTRACT_MISMATCH');
  if (projection.sourceContract !== SFI_CANONICAL_OBJECT_CONTRACT) push('CANONICAL_SOURCE_CONTRACT_MISMATCH');

  const canonicalErrors = validateCanonicalObjectRegistry(records);
  if (canonicalErrors.length > 0) {
    push('CANONICAL_SOURCE_INVALID');
    return [...new Set(errors)].sort();
  }

  const expected = buildProjectionUnchecked(records);
  const expectedNodes = new Map(expected.nodes.map((node) => [node.canonicalObjectId, node]));
  const actualIds = new Set<string>();

  for (const node of projection.nodes) {
    if (actualIds.has(node.canonicalObjectId)) push(`DUPLICATE_NODE:${node.canonicalObjectId}`);
    actualIds.add(node.canonicalObjectId);

    const expectedNode = expectedNodes.get(node.canonicalObjectId);
    if (!expectedNode) {
      push(`NODE_NOT_CANONICAL_PROJECTABLE:${node.canonicalObjectId}`);
      continue;
    }
    if (JSON.stringify(node) !== JSON.stringify(expectedNode)) push(`NODE_CANONICAL_DRIFT:${node.canonicalObjectId}`);
  }

  for (const expectedNode of expected.nodes) {
    if (!actualIds.has(expectedNode.canonicalObjectId)) push(`PROJECTABLE_NODE_MISSING:${expectedNode.canonicalObjectId}`);
  }

  const expectedRelationshipKeys = new Set(expected.relationships.map(relationshipKey));
  const actualRelationshipKeys = new Set<string>();
  for (const relationship of projection.relationships) {
    if (!(SFI_RESEARCH_RELATIONSHIP_TYPES as readonly string[]).includes(relationship.type)) {
      push(`RELATIONSHIP_TYPE_UNSUPPORTED:${relationship.type}`);
    }
    if (!actualIds.has(relationship.fromCanonicalObjectId)) push(`RELATIONSHIP_SOURCE_MISSING:${relationship.fromCanonicalObjectId}`);
    if (!actualIds.has(relationship.toCanonicalObjectId)) push(`RELATIONSHIP_TARGET_MISSING:${relationship.toCanonicalObjectId}`);
    if (relationship.fromCanonicalObjectId === relationship.toCanonicalObjectId) push(`RELATIONSHIP_SELF_REFERENCE:${relationship.fromCanonicalObjectId}`);

    const key = relationshipKey(relationship);
    if (!expectedRelationshipKeys.has(key)) push(`RELATIONSHIP_NOT_CANONICAL:${relationship.fromCanonicalObjectId}->${relationship.toCanonicalObjectId}`);
    if (actualRelationshipKeys.has(key)) push(`RELATIONSHIP_DUPLICATE:${key}`);
    actualRelationshipKeys.add(key);
  }

  for (const relationship of expected.relationships) {
    const key = relationshipKey(relationship);
    if (!actualRelationshipKeys.has(key)) push(`PROJECTABLE_RELATIONSHIP_MISSING:${relationship.fromCanonicalObjectId}->${relationship.toCanonicalObjectId}`);
  }

  return [...new Set(errors)].sort();
}

export function researchCitationExportForNode(node: SfiResearchGraphNode): SfiResearchCitationExport {
  return {
    canonicalObjectId: node.canonicalObjectId,
    canonicalUrl: node.canonicalUrl,
    objectType: node.objectType,
    title: node.title,
    version: node.version,
    authors: [...node.authors],
    license: node.license,
    sourceRefs: [...node.sourceRefs],
    limitations: [...node.limitations],
    missing: cloneMissing(node.missing),
  };
}
