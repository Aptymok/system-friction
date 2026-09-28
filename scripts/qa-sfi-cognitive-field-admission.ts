import assert from 'node:assert/strict';
import { cognitiveNodeAdmission, SFI_COGNITIVE_GRAPH_ADMISSION } from '../src/lib/graph/cognitiveGraphAdmission';
import type { CanonicalGraphNode } from '../packages/graph/src';

const base = {
  profile: 'sfi',
  lineage: [],
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
} as const;

const futureExtremeSituation = {
  ...base,
  nodeId: 'future:novel-domain:001',
  label: 'Novel bounded situation',
  ontologyType: 'future_domain_not_known_at_compile_time',
  origin: 'future_governed_execution',
  provenance: 'future:evidence:001',
  attributes: { epistemicClass: 'OBSERVED', sourceId: 'future:evidence:001' },
} as CanonicalGraphNode;

const futureInference = {
  ...futureExtremeSituation,
  nodeId: 'future:novel-domain:002',
  provenance: 'future:method:001',
  attributes: { epistemicClass: 'INFERRED', methodId: 'future:method:001' },
} as CanonicalGraphNode;

const documentaryPublication = {
  ...base,
  nodeId: 'library:doc:future-paper',
  label: 'Future publication',
  ontologyType: 'document',
  origin: 'library_corpus',
  provenance: 'data/sfi/sf_docs_frontmatter.json',
  attributes: { epistemicClass: 'DECLARED', projectionKind: 'DOCUMENTARY_RELATION', doesNotImplyValidation: true },
} as CanonicalGraphNode;

const provenanceMissing = {
  ...futureExtremeSituation,
  nodeId: 'future:unbounded:001',
  provenance: '',
} as CanonicalGraphNode;

assert.equal(SFI_COGNITIVE_GRAPH_ADMISSION, 'SFI-COGNITIVE-GRAPH-ADMISSION-1.1');
assert.equal(cognitiveNodeAdmission(futureExtremeSituation).admitted, true, 'novel ontology with observed evidence must remain admissible');
assert.equal(cognitiveNodeAdmission(futureInference).admitted, true, 'novel inferred object with method provenance must remain admissible');
assert.equal(cognitiveNodeAdmission(documentaryPublication).admitted, false, 'publication must not become cognitive state by documentary existence');
assert.equal(cognitiveNodeAdmission(provenanceMissing).admitted, false, 'novelty without provenance must not enter the cognitive field');

console.log('PASS · cognitive field is open by ontology and bounded by evidence');
