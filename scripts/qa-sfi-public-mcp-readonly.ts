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
  searchPublicCanonicalObjects,
  validatePublicMcpHttpEnvelope,
} from '../src/lib/mcp/publicMcpServer';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
const routeSource = read('src/app/api/mcp/public/route.ts');
const serverSource = read('src/lib/mcp/publicMcpServer.ts');

function fixture(objectType: SfiCanonicalObjectType, suffix: string): SfiCanonicalObjectRecord {
  const slug = `mcp-${suffix}`;
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
    sourceRefs: [`source:mcp:${suffix}`],
    publicState: 'PUBLIC',
    license: 'CC BY 4.0',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    entity: {
      entityId: SFI_PUBLIC_PROFILE.institution.entityId,
      relation: objectType === 'RETURN' || objectType === 'OBSERVATION' ? 'OBSERVED_BY' : 'PUBLISHED_BY',
    },
    publication: { state: 'PUBLISHED', explicit: true },
    eligibility: { privacyClass: 'PUBLIC', publicEligible: true, securityEligible: true },
    rights: { state: 'OPEN' },
    limitations: [],
    missing: [],
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

  const toolNames = SFI_PUBLIC_MCP_TOOLS.map((tool) => tool.name);
  assert.deepEqual(toolNames, [
    'get_institution',
    'search_concepts',
    'get_concept',
    'search_methods',
    'get_method',
    'search_instruments',
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
    'get_public_evidence',
    'get_public_capabilities',
  ], 'deferred_tool_contract_drift');
  assert.ok(SFI_PUBLIC_MCP_DEFERRED_TOOLS.every((tool) => tool.state === 'UNAVAILABLE'), 'deferred_tools_must_be_unavailable');
  assert.equal(toolNames.includes('get_public_evidence' as never), false, 'unavailable_evidence_tool_must_not_be_listed');
  assert.equal(toolNames.includes('get_public_capabilities' as never), false, 'unavailable_capability_tool_must_not_be_listed');

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

  const missingReport = fixture('REPORT', 'missing-report');
  missingReport.epistemicState = 'MISSING';
  missingReport.sourceRefs = ['source:mcp:missing-required-field'];
  missingReport.missing = [{
    field: 'sample_size',
    reason: 'The public source does not disclose sample size.',
    sourceRef: 'source:mcp:missing-required-field',
  }];
  const missingProjection = publicCanonicalObjectProjections([missingReport])[0];
  assert.equal(missingProjection.epistemicState, 'MISSING', 'missing_state_rewritten');
  assert.deepEqual(missingProjection.missing, missingReport.missing, 'missing_lineage_rewritten');

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

  const discover = await dispatchPublicMcpRequest(request('server/discover'), {
    readPublicWorldState: async () => ({ state: 'unused' }),
  });
  const discoverText = JSON.stringify(discover);
  assert.ok(discoverText.includes(SFI_PUBLIC_MCP_SERVER_ID), 'discover_server_identity_missing');
  assert.ok(discoverText.includes(SFI_PUBLIC_MCP_PROTOCOL_VERSION), 'discover_protocol_missing');
  assert.equal(/execute|propose|ROOT|Twin/.test(discoverText), false, 'discover_metadata_expands_authority');

  const listedTools = await dispatchPublicMcpRequest(request('tools/list'), {
    readPublicWorldState: async () => ({ state: 'unused' }),
  });
  const listedToolsText = JSON.stringify(listedTools);
  for (const name of toolNames) assert.ok(listedToolsText.includes(name), `listed_tool_missing:${name}`);
  for (const deferred of SFI_PUBLIC_MCP_DEFERRED_TOOLS) assert.equal(listedToolsText.includes(deferred.name), false, `deferred_tool_listed:${deferred.name}`);

  const deferredEvidence = await dispatchPublicMcpRequest(request('tools/call', {
    name: 'get_public_evidence',
    arguments: {},
  }), {
    readPublicWorldState: async () => ({ state: 'unused' }),
  });
  const deferredEvidenceText = JSON.stringify(deferredEvidence);
  assert.ok(deferredEvidenceText.includes('UNAVAILABLE'), 'deferred_evidence_must_fail_closed');
  assert.equal(deferredEvidenceText.includes('"count":0'), false, 'unavailable_evidence_must_not_be_false_zero');

  const blockedExecution = await dispatchPublicMcpRequest(request('tools/call', {
    name: 'execute',
    arguments: {},
  }), {
    readPublicWorldState: async () => ({ state: 'unused' }),
  });
  assert.ok(JSON.stringify(blockedExecution).includes('TOOL_NOT_AVAILABLE'), 'execution_name_not_blocked');

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
  }), {
    readPublicWorldState: async () => ({ state: 'unused' }),
  });
  const statusText = JSON.stringify(statusResource);
  for (const deferred of SFI_PUBLIC_MCP_DEFERRED_TOOLS) assert.ok(statusText.includes(deferred.name), `deferred_status_missing:${deferred.name}`);
  assert.ok(statusText.includes('PUBLIC_READ_ONLY'), 'status_authority_boundary_missing');

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
    resources: SFI_PUBLIC_MCP_RESOURCES.map((resource) => resource.uri),
    canonicalRegistryEmptyIsAvailable: true,
    privateLeakage: 'PASS',
    missingObservationBoundary: 'PASS',
    unavailableNotZero: 'PASS',
    writeProposeExecuteAbsence: 'PASS',
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
