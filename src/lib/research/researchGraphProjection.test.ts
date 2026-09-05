import assert from 'node:assert/strict';
import test from 'node:test';
import { SFI_PUBLIC_PROFILE } from '../public/institutionProfile';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  canonicalObjectKey,
  canonicalUrlFor,
  type SfiCanonicalObjectRecord,
  type SfiCanonicalObjectType,
} from '../discovery/canonicalObjectRegistry';
import {
  SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT,
  SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT,
  SFI_RESEARCH_METADATA_CONTRACT,
  SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT,
  SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES,
  SFI_RESEARCH_RELATIONSHIP_TYPES,
  projectResearchGraph,
  researchCitationExportForNode,
  researchProjectionEligibility,
  validateResearchGraphProjection,
} from './researchGraphProjection';

function fixture(objectType: SfiCanonicalObjectType, suffix = objectType.toLowerCase()): SfiCanonicalObjectRecord {
  const slug = `research-${suffix.replace(/_/g, '-')}`;
  return {
    contract: SFI_CANONICAL_OBJECT_CONTRACT,
    id: `research-object-${suffix}`,
    objectKey: canonicalObjectKey(objectType, slug),
    objectType,
    slug,
    canonicalUrl: canonicalUrlFor(objectType, slug),
    title: `Research fixture ${objectType}`,
    summary: `Canonical ${objectType} fixture for research projection.`,
    bodyRef: null,
    epistemicState: objectType === 'RETURN' ? 'OBSERVED' : 'DECLARED',
    version: '1.0.0',
    language: 'en',
    authors: ['Aptymok'],
    methods: [],
    relatedObjects: [],
    sourceRefs: [`source:research:${suffix}`],
    publicState: 'PUBLIC',
    license: 'CC BY 4.0',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    entity: {
      entityId: SFI_PUBLIC_PROFILE.institution.entityId,
      relation: objectType === 'RETURN' ? 'OBSERVED_BY' : 'PUBLISHED_BY',
    },
    publication: {
      state: 'PUBLISHED',
      explicit: true,
    },
    eligibility: {
      privacyClass: 'PUBLIC',
      publicEligible: true,
      securityEligible: true,
    },
    rights: {
      state: 'OPEN',
    },
    limitations: [],
    missing: [],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test('research graph is a canonical-only fail-closed projection with frozen research object subset', () => {
  assert.equal(SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT, 'SFI-RESEARCH-GRAPH-INTEGRITY-1.0');
  assert.equal(SFI_RESEARCH_METADATA_CONTRACT, 'SFI-RESEARCH-METADATA-1.0');
  assert.equal(SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT, 'SFI-RESEARCH-NO-FABRICATED-IDENTIFIERS-1.0');
  assert.equal(SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT, 'SFI-RESEARCH-CANONICAL-LINEAGE-1.0');
  assert.deepEqual(SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES, [
    'METHOD', 'INSTRUMENT', 'DATASET', 'REPORT', 'PAPER', 'SOFTWARE', 'RELEASE', 'RETURN', 'PUBLICATION',
  ]);
  assert.deepEqual(SFI_RESEARCH_RELATIONSHIP_TYPES, ['REFERENCES', 'IMPLEMENTS']);

  const records = [
    ...SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES.map((objectType) => fixture(objectType)),
    fixture('CONCEPT'),
    fixture('OBSERVATION'),
  ];
  const graph = projectResearchGraph(records);

  assert.equal(graph.nodes.length, SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES.length);
  assert.equal(graph.sourceOwner, 'SFI_CANONICAL_OBJECT_REGISTRY');
  assert.equal(graph.integrityErrors.length, 0);
  assert.ok(graph.rejected.some((entry) => entry.objectType === 'CONCEPT' && entry.reasons.includes('OBJECT_TYPE_NOT_RESEARCH_PROJECTABLE:CONCEPT')));
  assert.ok(graph.rejected.some((entry) => entry.objectType === 'OBSERVATION' && entry.reasons.includes('OBJECT_TYPE_NOT_RESEARCH_PROJECTABLE:OBSERVATION')));
  assert.deepEqual(validateResearchGraphProjection(graph, records), []);
});

test('private, review-required and publication-gate failures never project', () => {
  const privateRecord = fixture('DATASET', 'private');
  privateRecord.publicState = 'PRIVATE';
  privateRecord.publication.state = 'DRAFT';
  privateRecord.eligibility.privacyClass = 'PRIVATE';
  privateRecord.eligibility.publicEligible = false;
  privateRecord.eligibility.securityEligible = false;

  const reviewRecord = fixture('REPORT', 'review');
  reviewRecord.publicState = 'REVIEW_REQUIRED';
  reviewRecord.publication.state = 'REVIEWED';
  reviewRecord.eligibility.publicEligible = false;

  assert.equal(researchProjectionEligibility(privateRecord).disposition, 'BLOCK');
  assert.equal(researchProjectionEligibility(reviewRecord).disposition, 'BLOCK');

  const graph = projectResearchGraph([privateRecord, reviewRecord]);
  assert.deepEqual(graph.nodes, []);
  assert.deepEqual(graph.relationships, []);
  assert.equal(graph.rejected.length, 2);
  assert.deepEqual(validateResearchGraphProjection(graph, [privateRecord, reviewRecord]), []);
});

test('canonical ID, URL, type, version, publication, epistemic state, lineage, rights, limitations and MISSING survive projection', () => {
  const record = fixture('REPORT', 'missing-preserved');
  record.epistemicState = 'MISSING';
  record.sourceRefs = ['source:research:missing-preserved'];
  record.limitations = ['Sample size is not observed.'];
  record.missing = [{
    field: 'sample_size',
    reason: 'Canonical source does not disclose sample size.',
    sourceRef: 'source:research:missing-preserved',
  }];

  const graph = projectResearchGraph([record]);
  assert.equal(graph.nodes.length, 1);
  const node = graph.nodes[0];
  assert.equal(node.canonicalObjectId, record.id);
  assert.equal(node.canonicalObjectKey, record.objectKey);
  assert.equal(node.canonicalUrl, record.canonicalUrl);
  assert.equal(node.objectType, record.objectType);
  assert.equal(node.version, record.version);
  assert.equal(node.publicationState, 'PUBLISHED');
  assert.equal(node.epistemicState, 'MISSING');
  assert.deepEqual(node.lineage.sourceRefs, record.sourceRefs);
  assert.deepEqual(node.limitations, record.limitations);
  assert.deepEqual(node.missing, record.missing);
  assert.equal(node.rights.state, 'OPEN');
  assert.equal(node.rights.license, record.license);
  assert.equal(node.authorship.state, 'CANONICAL_EXPLICIT');
  assert.deepEqual(node.authorship.authors, ['Aptymok']);
  assert.deepEqual(validateResearchGraphProjection(graph, [record]), []);
});

test('unknown authorship, contributors and rights remain fail closed instead of being inferred', () => {
  const record = fixture('INSTRUMENT', 'missing-authorship');
  record.authors = [];
  record.rights.state = 'NOT_APPLICABLE';
  record.license = null;

  const graph = projectResearchGraph([record]);
  const node = graph.nodes[0];
  assert.equal(node.authorship.state, 'MISSING');
  assert.deepEqual(node.authorship.authors, []);
  assert.equal(node.contributors.state, 'MISSING');
  assert.deepEqual(node.contributors.contributors, []);
  assert.equal(node.rights.state, 'NOT_APPLICABLE');
  assert.equal(node.rights.license, null);
  assert.deepEqual(node.identifiers, {
    contract: SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT,
    doi: null,
    orcidRefs: [],
    rorRefs: [],
  });
  assert.deepEqual(node.scholarlyMetadata, {
    affiliation: null,
    legalName: null,
    publicationDate: null,
    releaseDate: null,
    scholarlyStatus: 'NOT_ASSERTED',
  });
});

test('typed relationships are emitted only when canonical fields prove the narrower semantics', () => {
  const method = fixture('METHOD', 'method-target');
  const dataset = fixture('DATASET', 'dataset-source');
  const report = fixture('REPORT', 'report-related');
  const software = fixture('SOFTWARE', 'software-relations');
  software.methods = [method.id];
  software.sourceRefs = ['source:research:software-relations', dataset.canonicalUrl];
  software.relatedObjects = [report.objectKey];

  const records = [software, report, dataset, method];
  const graph = projectResearchGraph(records);

  assert.deepEqual(graph.relationships.map((relationship) => [
    relationship.type,
    relationship.sourceCanonicalObjectId,
    relationship.targetCanonicalObjectId,
    relationship.evidenceField,
  ]), [
    ['IMPLEMENTS', software.id, method.id, 'methods'],
    ['REFERENCES', software.id, dataset.id, 'sourceRefs'],
  ]);
  assert.deepEqual(graph.nodes.find((node) => node.canonicalObjectId === software.id)?.lineage.canonicalRelatedObjectRefs, [report.objectKey]);
  assert.deepEqual(validateResearchGraphProjection(graph, records), []);
});

test('generic relatedObjects and non-software method associations remain lineage without typed semantic promotion', () => {
  const method = fixture('METHOD', 'method-associated');
  const report = fixture('REPORT', 'report-association');
  const related = fixture('PAPER', 'related-paper');
  report.methods = [method.id];
  report.relatedObjects = [related.id];

  const graph = projectResearchGraph([report, method, related]);
  const reportNode = graph.nodes.find((node) => node.canonicalObjectId === report.id);
  assert.deepEqual(reportNode?.lineage.methodRefs, [method.id]);
  assert.deepEqual(reportNode?.lineage.canonicalRelatedObjectRefs, [related.id]);
  assert.deepEqual(graph.relationships, []);
});

test('a canonical source reference does not create an edge to an ineligible/private target', () => {
  const publicRecord = fixture('PAPER', 'public-source');
  const privateTarget = fixture('DATASET', 'private-target');
  privateTarget.publicState = 'PRIVATE';
  privateTarget.publication.state = 'DRAFT';
  privateTarget.eligibility.privacyClass = 'PRIVATE';
  privateTarget.eligibility.publicEligible = false;
  privateTarget.eligibility.securityEligible = false;
  publicRecord.sourceRefs = ['source:research:public-source', privateTarget.id];

  const graph = projectResearchGraph([publicRecord, privateTarget]);
  assert.equal(graph.nodes.length, 1);
  assert.deepEqual(graph.nodes[0].lineage.sourceRefs, ['source:research:public-source', privateTarget.id]);
  assert.deepEqual(graph.relationships, []);
});

test('invalid or fabricated relationships are rejected by projection validation', () => {
  const first = fixture('REPORT', 'relationship-first');
  const second = fixture('DATASET', 'relationship-second');
  first.sourceRefs = ['source:research:relationship-first', second.id];
  const records = [first, second];
  const graph = projectResearchGraph(records);
  assert.equal(graph.relationships.length, 1);

  const unsupported: any = clone(graph);
  unsupported.relationships[0].type = 'DERIVED_FROM';
  const unsupportedErrors = validateResearchGraphProjection(unsupported, records);
  assert.ok(unsupportedErrors.some((error) => error.startsWith('RELATION_TYPE_UNSUPPORTED:')));
  assert.ok(unsupportedErrors.some((error) => error.startsWith('RELATION_PROJECTION_MISMATCH:')));

  const inventedTarget: any = clone(graph);
  inventedTarget.relationships[0].targetCanonicalObjectId = 'invented-canonical-object';
  const targetErrors = validateResearchGraphProjection(inventedTarget, records);
  assert.ok(targetErrors.some((error) => error.startsWith('RELATION_TARGET_NOT_PROJECTED:')));
  assert.ok(targetErrors.some((error) => error.startsWith('RELATION_PROJECTION_MISMATCH:')));
});

test('canonical identity drift and fabricated scholarly metadata fail validation', () => {
  const record = fixture('PAPER', 'no-fabrication');
  const graph = projectResearchGraph([record]);

  const canonicalDrift = clone(graph);
  canonicalDrift.nodes[0].canonicalUrl = 'https://example.invalid/fake-canon';
  assert.ok(validateResearchGraphProjection(canonicalDrift, [record]).includes(`NODE_PROJECTION_MISMATCH:${record.id}`));

  const identifierDrift: any = clone(graph);
  identifierDrift.nodes[0].identifiers.doi = '10.1234/fabricated';
  assert.ok(validateResearchGraphProjection(identifierDrift, [record]).includes(`FABRICATED_IDENTIFIER:${record.id}`));

  const affiliationDrift: any = clone(graph);
  affiliationDrift.nodes[0].scholarlyMetadata.affiliation = 'Fabricated University';
  assert.ok(validateResearchGraphProjection(affiliationDrift, [record]).includes(`INFERRED_SCHOLARLY_METADATA:${record.id}`));
});

test('citation export is derived from the research node and never invents DOI, ORCID, ROR, affiliation or dates', () => {
  const record = fixture('SOFTWARE', 'citation-export');
  const node = projectResearchGraph([record]).nodes[0];
  const citation = researchCitationExportForNode(node);

  assert.equal(citation.title, record.title);
  assert.equal(citation.canonicalUrl, record.canonicalUrl);
  assert.equal(citation.version, record.version);
  assert.deepEqual(citation.authors, ['Aptymok']);
  assert.equal(citation.license, 'CC BY 4.0');
  assert.equal(citation.doi, null);
  assert.deepEqual(citation.orcidRefs, []);
  assert.deepEqual(citation.rorRefs, []);
  assert.equal(citation.affiliation, null);
  assert.equal(citation.legalName, null);
  assert.equal(citation.publicationDate, null);
  assert.equal(citation.releaseDate, null);
});

test('an invalid canonical registry fails closed with zero research nodes', () => {
  const first = fixture('REPORT', 'duplicate');
  const second = clone(first);
  second.id = 'research-object-duplicate-second';

  const graph = projectResearchGraph([first, second]);
  assert.deepEqual(graph.nodes, []);
  assert.deepEqual(graph.relationships, []);
  assert.ok(graph.integrityErrors.some((error) => error.includes('DUPLICATE_OBJECT_KEY')));
  assert.ok(graph.integrityErrors.some((error) => error.includes('DUPLICATE_CANONICAL_URL')));
});
