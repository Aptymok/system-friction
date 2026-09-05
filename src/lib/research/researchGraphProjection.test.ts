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
  SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES,
  SFI_RESEARCH_RELATIONSHIP_TYPES,
  researchCitationExportForNode,
  researchGraphProjectionForCanonicalObjects,
  validateResearchGraphProjection,
  type SfiResearchGraphProjection,
} from './researchGraphProjection';

function fixture(objectType: SfiCanonicalObjectType, suffix = objectType.toLowerCase()): SfiCanonicalObjectRecord {
  const slug = `research-${suffix.replace(/_/g, '-')}`;
  const sourceRef = `source:fixture:${suffix}`;
  return {
    contract: SFI_CANONICAL_OBJECT_CONTRACT,
    id: `sfi-object-${suffix}`,
    objectKey: canonicalObjectKey(objectType, slug),
    objectType,
    slug,
    canonicalUrl: canonicalUrlFor(objectType, slug),
    title: `Research fixture ${objectType}`,
    summary: `Deterministic ${objectType} research projection fixture.`,
    bodyRef: null,
    epistemicState: objectType === 'RETURN' ? 'OBSERVED' : 'DECLARED',
    version: '1.2.3',
    language: 'en',
    authors: ['Aptymok'],
    methods: ['method:fixture'],
    relatedObjects: [],
    sourceRefs: [sourceRef],
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
    evidenceIdentity: {
      state: 'VALID',
      refs: [sourceRef],
    },
    limitations: [],
    missing: [],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mutateGraph(
  graph: SfiResearchGraphProjection,
  mutate: (candidate: SfiResearchGraphProjection) => void,
): SfiResearchGraphProjection {
  const candidate = clone(graph);
  mutate(candidate);
  return candidate;
}

test('Research Graph projects only the explicit R2-B projectable object types', () => {
  assert.deepEqual(SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES, [
    'METHOD', 'INSTRUMENT', 'DATASET', 'REPORT', 'PAPER', 'SOFTWARE', 'RELEASE', 'RETURN', 'PUBLICATION',
  ]);

  const records = [
    fixture('CONCEPT'),
    fixture('OBSERVATION'),
    ...SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES.map((type) => fixture(type)),
  ];

  const graph = researchGraphProjectionForCanonicalObjects(records);
  assert.deepEqual(graph.nodes.map((node) => node.objectType).sort(), [...SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES].sort());
  assert.ok(!graph.nodes.some((node) => (node.objectType as string) === 'CONCEPT'));
  assert.ok(!graph.nodes.some((node) => (node.objectType as string) === 'OBSERVATION'));
});

test('publication and publicability gates are inherited only from the canonical owner', () => {
  const publicReport = fixture('REPORT', 'public-report');
  const reviewReport = fixture('REPORT', 'review-report');
  reviewReport.publicState = 'REVIEW_REQUIRED';
  reviewReport.publication.state = 'REVIEWED';
  reviewReport.eligibility.publicEligible = false;

  const privateDataset = fixture('DATASET', 'private-dataset');
  privateDataset.publicState = 'PRIVATE';
  privateDataset.publication.state = 'DRAFT';
  privateDataset.eligibility.privacyClass = 'PRIVATE';
  privateDataset.eligibility.publicEligible = false;
  privateDataset.eligibility.securityEligible = false;

  const graph = researchGraphProjectionForCanonicalObjects([publicReport, reviewReport, privateDataset]);
  assert.deepEqual(graph.nodes.map((node) => node.canonicalObjectId), [publicReport.id]);
});

test('canonical identity, URL, publication, epistemic state, lineage and missing stay unchanged', () => {
  const record = fixture('PAPER', 'missing-paper');
  record.epistemicState = 'MISSING';
  record.authors = ['Aptymok'];
  record.sourceRefs = ['source:paper:primary'];
  record.evidenceIdentity.refs = ['source:paper:primary'];
  record.limitations = ['Sample size is not disclosed by the canonical source.'];
  record.missing = [{
    field: 'sample_size',
    reason: 'Canonical source does not disclose sample size.',
    sourceRef: 'source:paper:primary',
  }];

  const graph = researchGraphProjectionForCanonicalObjects([record]);
  const node = graph.nodes[0];
  assert.ok(node);
  assert.equal(node.canonicalObjectId, record.id);
  assert.equal(node.canonicalObjectKey, record.objectKey);
  assert.equal(node.canonicalUrl, record.canonicalUrl);
  assert.equal(node.version, record.version);
  assert.equal(node.publicationState, record.publication.state);
  assert.equal(node.publicState, record.publicState);
  assert.equal(node.epistemicState, record.epistemicState);
  assert.deepEqual(node.authors, record.authors);
  assert.deepEqual(node.sourceRefs, record.sourceRefs);
  assert.equal(node.rightsState, record.rights.state);
  assert.equal(node.license, record.license);
  assert.deepEqual(node.limitations, record.limitations);
  assert.deepEqual(node.missing, record.missing);
});

test('unknown rights metadata is not upgraded and null license remains null', () => {
  const record = fixture('SOFTWARE', 'license-null');
  record.rights.state = 'NOT_APPLICABLE';
  record.license = null;

  const graph = researchGraphProjectionForCanonicalObjects([record]);
  assert.equal(graph.nodes[0]?.rightsState, 'NOT_APPLICABLE');
  assert.equal(graph.nodes[0]?.license, null);
  assert.equal(researchCitationExportForNode(graph.nodes[0]!).license, null);
});

test('citation/export representation contains no DOI ORCID ROR affiliation or invented dates', () => {
  const record = fixture('REPORT', 'citation-export');
  const node = researchGraphProjectionForCanonicalObjects([record]).nodes[0]!;
  const exported = researchCitationExportForNode(node);

  for (const forbidden of ['doi', 'orcid', 'ror', 'affiliation', 'publicationDate', 'releaseDate', 'datePublished', 'dateReleased']) {
    assert.equal(Object.prototype.hasOwnProperty.call(exported, forbidden), false, forbidden);
  }
  assert.deepEqual(exported.authors, record.authors);
  assert.equal(exported.canonicalObjectId, record.id);
  assert.equal(exported.canonicalUrl, record.canonicalUrl);
});

test('relatedObjects yields only deterministic RELATED_OBJECT edges between projected canonical nodes', () => {
  assert.deepEqual(SFI_RESEARCH_RELATIONSHIP_TYPES, ['RELATED_OBJECT']);

  const report = fixture('REPORT', 'relationship-report');
  const paper = fixture('PAPER', 'relationship-paper');
  const concept = fixture('CONCEPT', 'relationship-concept');
  report.relatedObjects = [paper.id, concept.id];

  const graph = researchGraphProjectionForCanonicalObjects([report, paper, concept]);
  assert.deepEqual(graph.relationships, [{
    type: 'RELATED_OBJECT',
    fromCanonicalObjectId: report.id,
    toCanonicalObjectId: paper.id,
  }]);
  assert.deepEqual(
    graph.nodes.find((node) => node.canonicalObjectId === report.id)?.unprojectedRelatedCanonicalObjectIds,
    [concept.id],
  );
});

test('relationship order is deterministic regardless of canonical source order', () => {
  const report = fixture('REPORT', 'deterministic-report');
  const paperA = fixture('PAPER', 'deterministic-a');
  const paperB = fixture('PAPER', 'deterministic-b');
  report.relatedObjects = [paperB.id, paperA.id];

  const first = researchGraphProjectionForCanonicalObjects([report, paperA, paperB]);
  const second = researchGraphProjectionForCanonicalObjects([paperB, report, paperA]);
  assert.deepEqual(first, second);
});

test('invented scholarly graph relationships are rejected fail-closed', () => {
  const report = fixture('REPORT', 'invalid-relation-report');
  const paper = fixture('PAPER', 'invalid-relation-paper');
  report.relatedObjects = [paper.id];
  const graph = researchGraphProjectionForCanonicalObjects([report, paper]);

  for (const inventedType of ['CITES', 'REFERENCES', 'DERIVED_FROM', 'IMPLEMENTS', 'VERSION_OF', 'SUPERSEDES', 'RETURN_OF', 'RELEASE_OF', 'PUBLICATION_OF']) {
    const unsupported = mutateGraph(graph, (candidate) => {
      candidate.relationships[0]!.type = inventedType as never;
    });
    assert.ok(
      validateResearchGraphProjection(unsupported, [report, paper]).some((error) => error.startsWith('RELATIONSHIP_TYPE_UNSUPPORTED')),
      inventedType,
    );
  }

  const unknownTarget = mutateGraph(graph, (candidate) => {
    candidate.relationships[0]!.toCanonicalObjectId = 'sfi-object-not-canonical';
  });
  const unknownErrors = validateResearchGraphProjection(unknownTarget, [report, paper]);
  assert.ok(unknownErrors.some((error) => error.startsWith('RELATIONSHIP_TARGET_MISSING')));
  assert.ok(unknownErrors.some((error) => error.startsWith('RELATIONSHIP_NOT_CANONICAL')));
});

test('projection rejects a graph node that drifts from its canonical source', () => {
  const report = fixture('REPORT', 'drift-report');
  const graph = researchGraphProjectionForCanonicalObjects([report]);
  const drifted = mutateGraph(graph, (candidate) => {
    candidate.nodes[0]!.canonicalUrl = 'https://example.invalid/not-canon';
  });
  assert.ok(validateResearchGraphProjection(drifted, [report]).includes(`NODE_CANONICAL_DRIFT:${report.id}`));
});

test('projection rejects mutation of unprojected canonical relationship state', () => {
  const report = fixture('REPORT', 'related-state-report');
  const concept = fixture('CONCEPT', 'related-state-concept');
  report.relatedObjects = [concept.id];
  const graph = researchGraphProjectionForCanonicalObjects([report, concept]);
  const drifted = mutateGraph(graph, (candidate) => {
    candidate.nodes[0]!.unprojectedRelatedCanonicalObjectIds = [];
  });
  assert.ok(validateResearchGraphProjection(drifted, [report, concept]).includes(`NODE_CANONICAL_DRIFT:${report.id}`));
});

test('invalid canonical source blocks the entire derived projection', () => {
  const invalid = fixture('DATASET', 'invalid-canonical-source');
  invalid.canonicalUrl = 'https://example.invalid/fabricated-canon';
  assert.throws(
    () => researchGraphProjectionForCanonicalObjects([invalid]),
    /invalid_canonical_object_source/,
  );
});
