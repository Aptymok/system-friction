import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boundedNodesOfNodes,
  projectExternalRealityGraph,
  projectInstitutionalDiscoveryMesh,
  projectPropagationGraph,
} from './institutionalDiscoveryMesh';

const nodes = [
  {
    id: '1', node_id: 'person:a', label: 'Connector A', ontology_type: 'PERSON',
    attributes: { geography: ['NYC'], relationState: 'ACTIVE', capabilityControlled: ['Audience'], epistemicClass: 'OBSERVED' },
    lineage: ['evidence:person-a'], updated_at: '2026-09-09T10:00:00.000Z',
  },
  {
    id: '2', node_id: 'institution:b', label: 'Institution B', ontology_type: 'INSTITUTION',
    attributes: { geography: ['Manhattan'], relationState: 'QUALIFIED', capabilityControlled: ['Research'], epistemicClass: 'OBSERVED' },
    lineage: ['evidence:institution-b'], updated_at: '2026-09-09T10:00:00.000Z',
  },
  {
    id: '3', node_id: 'program:c', label: 'Program C', ontology_type: 'PROGRAM',
    attributes: { geography: ['New York'], capabilityControlled: ['Capital'], epistemicClass: 'OBSERVED' },
    lineage: ['evidence:program-c'], updated_at: '2026-09-09T10:00:00.000Z',
  },
];

const edges = [
  {
    id: 'e1', edge_id: 'person:a->institution:b', source_node_id: 'person:a', target_node_id: 'institution:b', relation: 'INTRODUCED_SFI_TO',
    attributes: { epistemicClass: 'OBSERVED', evidenceRefs: ['evidence:intro'], founderForced: false },
    updated_at: '2026-09-09T11:00:00.000Z',
  },
  {
    id: 'e2', edge_id: 'institution:b->program:c', source_node_id: 'institution:b', target_node_id: 'program:c', relation: 'CONTROLS_ACCESS_TO',
    attributes: { epistemicClass: 'OBSERVED', evidenceRefs: ['evidence:control'] },
    updated_at: '2026-09-09T11:00:00.000Z',
  },
  {
    id: 'e3', edge_id: 'person:a->program:c:generic', source_node_id: 'person:a', target_node_id: 'program:c', relation: 'connected_to',
    attributes: { epistemicClass: 'OBSERVED', evidenceRefs: ['evidence:generic'] },
    updated_at: '2026-09-09T11:00:00.000Z',
  },
];

test('External Reality Graph retains only typed semantic nodes and edges', () => {
  const graph = projectExternalRealityGraph(nodes, edges);
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, 2);
  assert.equal(graph.edges.some((edge) => edge.edgeId.includes('generic')), false);
  assert.equal(graph.boundary.genericConnectedToEdgesCountAsSemanticEvidence, false);
});

test('nodes-of-nodes exposes observed reachability without converting paths into access claims', () => {
  const graph = projectExternalRealityGraph(nodes, edges);
  const paths = boundedNodesOfNodes(graph, 'person:a');
  assert.ok(paths.paths.some((path) => path.nodeIds.join('>') === 'person:a>institution:b>program:c'));
  assert.match(paths.boundary, /does not imply access/i);
});

test('publication is exposure only; later discovery stages require explicit semantic state', () => {
  const propagation = projectPropagationGraph([
    {
      id: 't1', object_ref: 'publication:note-001', relation: 'PUBLICATION', platform: 'systemfriction.org', source_uri: 'https://systemfriction.org/publications/note-001',
      observed_at: '2026-09-09T12:00:00.000Z', evidence_refs: ['evidence:publish'], semantic_state: {}, payload: {},
    },
    {
      id: 't2', object_ref: 'publication:note-001', relation: 'OBSERVED_STATE', platform: 'external-search', source_uri: null,
      observed_at: '2026-09-09T13:00:00.000Z', evidence_refs: ['evidence:retrieval'], semantic_state: { discoveryStage: 'DISCOVERY', externalNodeId: 'institution:b' }, payload: {},
    },
  ]);
  assert.equal(propagation.events[0].stage, 'EXPOSURE');
  assert.equal(propagation.events[1].stage, 'DISCOVERY');
  assert.equal(propagation.trajectories[0].highestObservedStage, 'DISCOVERY');
  assert.equal(propagation.boundary.publicationDoesNotImplyDiscovery, true);
});

test('founder-forced introductions cannot satisfy PULL', () => {
  const forcedEdges = edges.map((edge) => edge.edge_id === 'person:a->institution:b'
    ? { ...edge, attributes: { ...edge.attributes, founderForced: true } }
    : edge);
  const mesh = projectInstitutionalDiscoveryMesh({ graphNodes: nodes, graphEdges: forcedEdges, trajectoryEvents: [] });
  assert.equal(mesh.convergence.pullEdges.length, 0);
  assert.equal(mesh.convergence.minimumEvidenceGateSatisfied, false);
  assert.equal(mesh.convergence.boundary.founderForcedOutreachCannotCountAsPull, true);
});

test('Manhattan remains an attractor lens and an unsatisfied gate is not promoted', () => {
  const mesh = projectInstitutionalDiscoveryMesh({ graphNodes: nodes, graphEdges: edges, trajectoryEvents: [] });
  assert.equal(mesh.boundary.attractorIsLensNotOntology, true);
  assert.equal(mesh.convergence.attractor.key, 'MANHATTAN_OBJECTIVE');
  assert.equal(mesh.convergence.minimumEvidenceGateSatisfied, false);
  assert.equal(mesh.convergence.disposition, 'INSUFFICIENT_EVIDENCE_FOR_MINIMUM_GATE');
});
