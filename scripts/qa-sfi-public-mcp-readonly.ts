import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  canonicalObjectKey,
  canonicalUrlFor,
  type SfiCanonicalObjectRecord,
  type SfiCanonicalObjectType,
} from '../src/lib/discovery/canonicalObjectRegistry';
import { SFI_EVIDENCE_CAPSULE_CONTRACT } from '../src/lib/discovery/publicSemanticProjection';
import { SFI_PUBLIC_PROFILE } from '../src/lib/public/institutionProfile';
import {
  SFI_PUBLIC_MCP_AUTHORITY,
  SFI_PUBLIC_MCP_DEFERRED_TOOLS,
  SFI_PUBLIC_MCP_GATE,
  SFI_PUBLIC_MCP_PROTOCOL_VERSION,
  SFI_PUBLIC_MCP_RESOURCES,
  SFI_PUBLIC_MCP_SERVER_ID,
  SFI_PUBLIC_MCP_TOOLS,
  dispatchPublicMcpRequest,
  getPublicCanonicalObject,
  publicCanonicalObjectProjections,
  publicEvidenceForCanonicalObjects,
  searchPublicCanonicalObjects,
  validatePublicMcpHttpEnvelope,
} from '../src/lib/mcp/publicMcpServer';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
const routeSource = read('src/app/api/mcp/public/route.ts');
const serverSource = read('src/lib/mcp/publicMcpServer.ts');
const evidenceOwnerSource = read('src/lib/discovery/publicSemanticProjection.ts');

function fixture(objectType: SfiCanonicalObjectType, suffix: string): SfiCanonicalObjectRecord {
  const slug = `mcp-${suffix}`;
  const sourceRef = `source:mcp:${suffix}`;
  return {
    contract: SFI_CANONICAL_OBJECT_CONTRACT,
    id: `sfi-mcp-${suffix}`,
    objectKey: canonicalObjectKey(objectType, slug),
    objectType,
    slug,
    canonicalUrl: canonicalUrlFor(objectType, slug),
    title: `MCP ${objectType} ${suffix}`,
    summary: `Deterministic ${objectType} public MCP fixture ${suffix}.`,
    bodyRef: null,
    epistemicState: objectType === 'RETURN' || objectType === 'OBSERVATION' ? 'OBSERVED' : 'DECLARED',
    version: '1.0.0',
    language: 'en',
    authors: ['System Friction Institute'],
    methods: [],
    relatedObjects: [],
    sourceRefs: [sourceRef],
    publicState: 'PUBLIC',
    license: 'CC BY 4.0',
    createdAt: '2026-09-06T00:00:00.000Z',
    updatedAt: '2026-09-06T00:00:00.000Z',
    entity: {
      entityId: SFI_PUBLIC_PROFILE.institution.entityId,
      relation: objectType === 'RETURN' || objectType === 'OBSERVATION' ? 'OBSERVED_BY' : 'PUBLISHED_BY',
    },
    publication: { state: 'PUBLISHED', explicit: true },
    eligibility: { privacyClass: 'PUBLIC', publicEligible: true, securityEligible: true },
    rights: { state: 'OPEN' },
    evidenceIdentity: { state: 'VALID', refs: [sourceRef] },
    limitations: [],
    missing: [],
  };
}

function evidenceArgs(record: SfiCanonicalObjectRecord, overrides: Record<string, unknown> = {}) {
  const observed = record.epistemicState === 'OBSERVED';
  return {
    identifier: record.id,
    capsuleId: `capsule:${record.id}`,
    claim: `Public evidence claim for ${record.id}`,
    evidenceRefs: [...record.evidenceIdentity.refs],
    origin: observed ? 'OBSERVATION' : 'DECLARED',
    ...(observed ? { observedAt: '2026-09-06T00:01:00.000Z' } : { producedAt: '2026-09-06T00:01:00.000Z' }),
    ...overrides,
  };
}

function request(method: string, params: Record<string, unknown> = {}) {
  return {
    jsonrpc: '2.0' as const,
    id: `qa-${method}`,
    method,
    params: {
      ...params,
      _meta: {
        'io.modelcontextprotocol/protocolVersion': SFI_PUBLIC_MCP_PROTOCOL_VERSION,
        'io.modelcontextprotocol/clientInfo': { name: 'sfi-qa', version: '1.0.0' },
        'io.modelcontextprotocol/clientCapabilities': {},
      },
    },
  };
}

async function main() {
  assert.equal(SFI_PUBLIC_MCP_GATE, 'SFI-PUBLIC-MCP-READONLY-1.0', 'readonly_gate_id_drift');
  assert.equal(SFI_PUBLIC_MCP_SERVER_ID, 'org.systemfriction/public', 'server_id_drift');
  assert.equal(SFI_PUBLIC_MCP_PROTOCOL_VERSION, '2026-07-28', 'protocol_version_drift');
  assert.equal(SFI_PUBLIC_MCP_AUTHORITY, 'PUBLIC_READ_ONLY', 'public_authority_drift');
  assert.equal(SFI_EVIDENCE_CAPSULE_CONTRACT, 'SFI-EVIDENCE-CAPSULE-1.0', 'upstream_evidence_contract_drift');

  const toolNames = SFI_PUBLIC_MCP_TOOLS.map((tool) => tool.name);
  assert.deepEqual(toolNames, [
    'get_institution',
    'search_concepts',
    'get_concept',
    'search_methods',
    'get_method',
    'search_instruments',
    'get_public_evidence',
    'get_public_return',
    'get_public_research',
    'get_epistemic_contract',
    'get_public_world_state',
  ], 'available_tool_contract_drift');

  const forbiddenCapabilityPattern = /(?:^|[_-])(write|propose|execute|root|twin|private|governance)(?:$|[_-])/i;
  for (const tool of SFI_PUBLIC_MCP_TOOLS) {
    assert.equal(forbiddenCapabilityPattern.test(tool.name), false, `forbidden_public_tool:${tool.name}`);
  }

  assert.deepEqual(SFI_PUBLIC_MCP_DEFERRED_TOOLS.map((tool) => tool.name), [
    'get_public_capabilities',
  ], 'deferred_tool_contract_drift');
  assert.ok(SFI_PUBLIC_MCP_DEFERRED_TOOLS.every((tool) => tool.state === 'UNAVAILABLE'), 'deferred_tools_must_be_unavailable');
  assert.equal(toolNames.includes('get_public_capabilities' as never), false, 'unavailable_capability_tool_must_not_be_listed');
  assert.ok(toolNames.includes('get_public_evidence'), 'integrated_evidence_tool_must_be_listed');

  const publicConcept = fixture('CONCEPT', 'public-concept');
  const privateConcept = fixture('CONCEPT', 'private-concept');
  privateConcept.publicState = 'PRIVATE';
  privateConcept.publication.state = 'DRAFT';
  privateConcept.eligibility.privacyClass = 'PRIVATE';
  privateConcept.eligibility.publicEligible = false;
  privateConcept.eligibility.securityEligible = false;

  const projections = publicCanonicalObjectProjections([publicConcept, privateConcept]);
  assert.deepEqual(projections.map((item) => item.id), [publicConcept.id], 'private_canonical_object_leaked');
  assert.deepEqual(searchPublicCanonicalObjects('CONCEPT', '', [publicConcept, privateConcept]).map((item) => item.id), [publicConcept.id], 'private_search_leak');
  assert.equal(getPublicCanonicalObject('CONCEPT', privateConcept.id, [publicConcept, privateConcept]), null, 'private_get_leak');

  const publicReport = fixture('REPORT', 'evidence-public');
  const acceptedEvidence = publicEvidenceForCanonicalObjects(evidenceArgs(publicReport), [publicReport]);
  assert.ok(acceptedEvidence, 'evidence_owner_adapter_return_missing');
  assert.equal(acceptedEvidence?.sourceContract, SFI_EVIDENCE_CAPSULE_CONTRACT, 'evidence_owner_contract_not_projected');
  assert.equal(acceptedEvidence?.disposition, 'PUBLISH', 'valid_owner_disposition_not_preserved');
  assert.equal((acceptedEvidence?.capsule as { contract?: string } | null)?.contract, SFI_EVIDENCE_CAPSULE_CONTRACT, 'capsule_not_created_by_ws03_contract');

  const blockedEvidence = publicEvidenceForCanonicalObjects(evidenceArgs(publicReport, {
    evidenceRefs: ['source:mcp:not-validated'],
  }), [publicReport]);
  assert.equal(blockedEvidence?.state, 'BLOCK', 'owner_block_not_reflected');
  assert.equal(blockedEvidence?.capsule, null, 'blocked_capsule_leaked');
  assert.ok((blockedEvidence?.reasons as string[]).includes('EVIDENCE_REF_NOT_VALIDATED'), 'owner_block_reason_not_preserved');

  for (const epistemicState of ['SIMULATED', 'DERIVED'] as const) {
    const modeled = fixture('REPORT', `modeled-${epistemicState.toLowerCase()}`);
    modeled.epistemicState = epistemicState;
    const modeledEvidence = publicEvidenceForCanonicalObjects(evidenceArgs(modeled, {
      origin: 'OBSERVATION',
      observedAt: '2026-09-06T00:02:00.000Z',
      producedAt: undefined,
    }), [modeled]);
    assert.equal(modeledEvidence?.state, 'BLOCK', `${epistemicState.toLowerCase()}_became_observed_evidence`);
    assert.ok((modeledEvidence?.reasons as string[]).includes('OBSERVATION_ORIGIN_REQUIRES_OBSERVED_STATE'), `${epistemicState.toLowerCase()}_origin_state_congruence_not_owned`);
    assert.equal(modeledEvidence?.capsule, null, `${epistemicState.toLowerCase()}_capsule_leaked`);
  }

  const missingReport = fixture('REPORT', 'missing-report');
  missingReport.epistemicState = 'MISSING';
  missingReport.sourceRefs = ['source:mcp:missing-evidence', 'source:mcp:missing-required-field'];
  missingReport.evidenceIdentity = { state: 'VALID', refs: ['source:mcp:missing-evidence'] };
  missingReport.missing = [{
    field: 'sample_size',
    reason: 'The public source does not disclose sample size.',
    sourceRef: 'source:mcp:missing-required-field',
  }];
  const missingProjection = publicCanonicalObjectProjections([missingReport])[0];
  assert.equal(missingProjection.epistemicState, 'MISSING', 'missing_state_rewritten');
  assert.deepEqual(missingProjection.missing, missingReport.missing, 'missing_lineage_rewritten');
  const missingEvidence = publicEvidenceForCanonicalObjects(evidenceArgs(missingReport), [missingReport]);
  assert.equal(missingEvidence?.state, 'BLOCK', 'missing_became_evidence');
  assert.ok((missingEvidence?.reasons as string[]).includes('MISSING_STATE_CANNOT_BE_EVIDENCE_CAPSULE'), 'missing_owner_block_reason_missing');
  assert.equal(missingEvidence?.capsule, null, 'missing_capsule_leaked');

  const privateEvidence = publicEvidenceForCanonicalObjects(evidenceArgs(privateConcept), [privateConcept]);
  assert.equal(privateEvidence?.state, 'AVAILABLE', 'private_lookup_must_not_be_recast_as_unavailable');
  assert.equal(privateEvidence?.found, false, 'private_object_existence_leaked');
  assert.equal(privateEvidence?.capsule, null, 'private_capsule_leaked');

  const emptyEvidence = publicEvidenceForCanonicalObjects({
    identifier: 'sfi-object-not-present',
    capsuleId: 'capsule:empty',
    claim: 'No matching public object.',
    evidenceRefs: ['source:none'],
    origin: 'DECLARED',
    producedAt: '2026-09-06T00:03:00.000Z',
  }, []);
  assert.equal(emptyEvidence?.state, 'AVAILABLE', 'empty_authoritative_evidence_source_must_not_be_unavailable');
  assert.equal(emptyEvidence?.found, false, 'empty_authoritative_evidence_source_false_positive');
  assert.equal(JSON.stringify(emptyEvidence).includes('UNAVAILABLE'), false, 'empty_authoritative_evidence_source_recast_unavailable');

  assert.deepEqual(searchPublicCanonicalObjects('CONCEPT'), [], 'empty_authoritative_registry_must_be_available_empty');

  const validEnvelope = request('tools/call', { name: 'search_concepts', arguments: { q: 'test' } });
  assert.deepEqual(validatePublicMcpHttpEnvelope({
    protocolVersion: SFI_PUBLIC_MCP_PROTOCOL_VERSION,
    method: 'tools/call',
    name: 'search_concepts',
  }, validEnvelope), [], 'valid_modern_mcp_envelope_rejected');
  assert.ok(validatePublicMcpHttpEnvelope({
    protocolVersion: SFI_PUBLIC_MCP_PROTOCOL_VERSION,
    method: 'tools/call',
    name: 'different_tool',
  }, validEnvelope).includes('NAME_HEADER_MISMATCH'), 'header_body_name_mismatch_not_blocked');

  const dependencies = {
    readPublicWorldState: async () => ({ state: 'unused' }),
  };

  const discover = await dispatchPublicMcpRequest(request('server/discover'), dependencies);
  const discoverText = JSON.stringify(discover);
  assert.ok(discoverText.includes(SFI_PUBLIC_MCP_SERVER_ID), 'discover_server_identity_missing');
  assert.ok(discoverText.includes(SFI_PUBLIC_MCP_PROTOCOL_VERSION), 'discover_protocol_missing');
  assert.equal(/execute|propose|ROOT|Twin/.test(discoverText), false, 'discover_metadata_expands_authority');

  const listedTools = await dispatchPublicMcpRequest(request('tools/list'), dependencies);
  const listedToolsText = JSON.stringify(listedTools);
  for (const name of toolNames) assert.ok(listedToolsText.includes(name), `listed_tool_missing:${name}`);
  for (const deferred of SFI_PUBLIC_MCP_DEFERRED_TOOLS) assert.equal(listedToolsText.includes(deferred.name), false, `deferred_tool_listed:${deferred.name}`);

  const emptyEvidenceViaMcp = await dispatchPublicMcpRequest(request('tools/call', {
    name: 'get_public_evidence',
    arguments: {
      identifier: 'sfi-object-not-present',
      capsuleId: 'capsule:empty-mcp',
      claim: 'No matching canonical public object.',
      evidenceRefs: ['source:none'],
      origin: 'DECLARED',
      producedAt: '2026-09-06T00:04:00.000Z',
    },
  }), dependencies);
  const emptyEvidenceViaMcpText = JSON.stringify(emptyEvidenceViaMcp);
  assert.ok(emptyEvidenceViaMcpText.includes('"state":"AVAILABLE"'), 'mcp_empty_evidence_not_available');
  assert.ok(emptyEvidenceViaMcpText.includes('"found":false'), 'mcp_empty_evidence_found_drift');
  assert.equal(emptyEvidenceViaMcpText.includes('UNAVAILABLE'), false, 'mcp_empty_evidence_false_unavailable');

  const deferredCapabilities = await dispatchPublicMcpRequest(request('tools/call', {
    name: 'get_public_capabilities',
    arguments: {},
  }), dependencies);
  const deferredCapabilitiesText = JSON.stringify(deferredCapabilities);
  assert.ok(deferredCapabilitiesText.includes('UNAVAILABLE'), 'public_capability_projection_must_remain_unavailable');
  assert.ok(deferredCapabilitiesText.includes('NO_AUTHORITATIVE_PUBLIC_CAPABILITY_PROJECTION'), 'public_capability_unavailable_reason_drift');
  assert.equal(deferredCapabilitiesText.includes('"count":0'), false, 'unavailable_capability_projection_must_not_be_false_zero');

  const blockedExecution = await dispatchPublicMcpRequest(request('tools/call', {
    name: 'execute',
    arguments: {},
  }), dependencies);
  assert.ok(JSON.stringify(blockedExecution).includes('TOOL_NOT_AVAILABLE'), 'execution_name_not_blocked');

  for (const forbiddenName of ['write', 'propose', 'execute', 'root', 'private_twin']) {
    const blocked = await dispatchPublicMcpRequest(request('tools/call', {
      name: forbiddenName,
      arguments: {},
    }), dependencies);
    assert.ok(JSON.stringify(blocked).includes('TOOL_NOT_AVAILABLE'), `forbidden_tool_not_blocked:${forbiddenName}`);
  }

  const unavailableWorld = await dispatchPublicMcpRequest(request('tools/call', {
    name: 'get_public_world_state',
    arguments: {},
  }), {
    readPublicWorldState: async () => { throw new Error('synthetic unavailable'); },
  });
  const unavailableWorldText = JSON.stringify(unavailableWorld);
  assert.ok(unavailableWorldText.includes('"state":"UNAVAILABLE"'), 'world_unavailable_state_missing');
  assert.equal(unavailableWorldText.includes('"worldState":0'), false, 'unavailable_world_must_not_be_zero');

  const statusResource = await dispatchPublicMcpRequest(request('resources/read', {
    uri: 'sfi://mcp/status',
  }), dependencies);
  const statusText = JSON.stringify(statusResource);
  for (const deferred of SFI_PUBLIC_MCP_DEFERRED_TOOLS) assert.ok(statusText.includes(deferred.name), `deferred_status_missing:${deferred.name}`);
  assert.ok(statusText.includes('PUBLIC_READ_ONLY'), 'status_authority_boundary_missing');
  assert.ok(statusText.includes(SFI_EVIDENCE_CAPSULE_CONTRACT), 'status_evidence_owner_contract_missing');

  assert.deepEqual(SFI_PUBLIC_MCP_RESOURCES.map((resource) => resource.uri), [
    'sfi://institution',
    'sfi://epistemic-contract',
    'sfi://canonical/objects',
    'sfi://research',
    'sfi://world-state',
    'sfi://mcp/status',
  ], 'resource_contract_drift');

  // The route is a POST-only adapter. It owns no credentials, persistence, authority, or parallel backend.
  assert.ok(routeSource.includes("from '@/lib/mcp/publicMcpServer'"), 'route_must_delegate_to_public_mcp_core');
  assert.ok(routeSource.includes('readGovernedPublicObservatoryState'), 'route_must_reuse_governed_public_world_reader');
  assert.equal(/export\s+(?:async\s+)?function\s+(GET|PUT|PATCH|DELETE)\b/.test(routeSource), false, 'non_post_route_surface_detected');

  const implementationSource = `${serverSource}\n${routeSource}`;
  for (const forbidden of [
    'capabilityBroker',
    'cognitivePassportRegistry',
    'externalAuth',
    '/api/external/v1/execute',
    '/api/external/v1/propose',
    "from('epistemic_events')",
    'createServiceSupabaseClient',
    'service_role',
    '.insert(',
    '.update(',
    '.delete(',
  ]) assert.equal(implementationSource.includes(forbidden), false, `forbidden_public_mcp_dependency:${forbidden}`);

  assert.ok(serverSource.includes("from '../discovery/canonicalObjectRegistry'"), 'canonical_object_owner_not_reused');
  assert.ok(serverSource.includes("from '../discovery/publicSemanticProjection'"), 'ws03_evidence_capsule_owner_not_reused');
  assert.ok(serverSource.includes('evidenceCapsuleDisposition(record, request)'), 'ws03_evidence_disposition_not_delegated');
  assert.ok(serverSource.includes('evidenceCapsuleForCanonicalObject(record, request)'), 'ws03_evidence_materialization_not_delegated');
  assert.ok(evidenceOwnerSource.includes("SFI_EVIDENCE_CAPSULE_CONTRACT = 'SFI-EVIDENCE-CAPSULE-1.0'"), 'ws03_evidence_contract_owner_missing');
  assert.equal(serverSource.includes('export const SFI_EVIDENCE_CAPSULE_CONTRACT'), false, 'evidence_capsule_contract_duplicated');
  assert.equal(serverSource.includes('function evidenceCapsuleDisposition('), false, 'evidence_capsule_disposition_duplicated');
  assert.equal(serverSource.includes('function evidenceCapsuleForCanonicalObject('), false, 'evidence_capsule_materializer_duplicated');
  for (const ws03OwnedRule of [
    'PUBLICABILITY_RIGHTS_NOT_CLEARED',
    'PUBLICABILITY_GOVERNANCE_NOT_PUBLICABLE',
    'MISSING_STATE_CANNOT_BE_EVIDENCE_CAPSULE',
    'RETURN_REQUIRES_REALITY_OBSERVATION',
    'MODEL_OUTPUT_CANNOT_BE_OBSERVATION',
  ]) assert.equal(serverSource.includes(ws03OwnedRule), false, `ws03_epistemic_rule_duplicated:${ws03OwnedRule}`);

  assert.ok(serverSource.includes("from '../public/institutionProfile'"), 'institution_profile_owner_not_reused');
  assert.ok(serverSource.includes("from '../research/researchGraphProjection'"), 'research_projection_owner_not_reused');
  assert.equal(serverSource.includes('export const SFI_CANONICAL_OBJECT_REGISTRY ='), false, 'canonical_registry_duplicated');
  assert.equal(serverSource.includes('export const SFI_PUBLIC_PROFILE ='), false, 'institution_profile_duplicated');

  console.log(JSON.stringify({
    contract: SFI_PUBLIC_MCP_GATE,
    serverId: SFI_PUBLIC_MCP_SERVER_ID,
    protocolVersion: SFI_PUBLIC_MCP_PROTOCOL_VERSION,
    authority: SFI_PUBLIC_MCP_AUTHORITY,
    availableTools: toolNames,
    unavailableTools: SFI_PUBLIC_MCP_DEFERRED_TOOLS,
    evidenceCapsuleContract: SFI_EVIDENCE_CAPSULE_CONTRACT,
    resources: SFI_PUBLIC_MCP_RESOURCES.map((resource) => resource.uri),
    evidenceOwnerConsumption: 'PASS',
    duplicateEvidenceOwner: 'PASS',
    canonicalRegistryEmptyIsAvailable: true,
    privateLeakage: 'PASS',
    missingEvidenceBoundary: 'PASS',
    modeledObservationBoundary: 'PASS',
    unavailableNotZero: 'PASS',
    writeProposeExecuteAbsence: 'PASS',
    publicCapabilityProjection: 'UNAVAILABLE',
    rootTwinBoundary: 'PASS',
    persistenceDelta: 'NONE',
    authorityDelta: 'NONE',
    status: 'PASS',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
