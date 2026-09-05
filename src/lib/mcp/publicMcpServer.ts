import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  SFI_CANONICAL_OBJECT_REGISTRY,
  publicProjectionForCanonicalObject,
  validateCanonicalObjectRegistry,
  type SfiCanonicalObjectRecord,
  type SfiCanonicalObjectType,
  type SfiCanonicalPublicProjection,
} from '../discovery/canonicalObjectRegistry';
import { SFI_PUBLIC_PROFILE } from '../public/institutionProfile';
import {
  researchGraphProjectionForCanonicalObjects,
  type SfiResearchProjectableObjectType,
} from '../research/researchGraphProjection';

export const SFI_PUBLIC_MCP_GATE = 'SFI-PUBLIC-MCP-READONLY-1.0' as const;
export const SFI_PUBLIC_MCP_SERVER_ID = 'org.systemfriction/public' as const;
export const SFI_PUBLIC_MCP_SERVER_VERSION = '1.0.0' as const;
export const SFI_PUBLIC_MCP_PROTOCOL_VERSION = '2026-07-28' as const;
export const SFI_PUBLIC_MCP_AUTHORITY = 'PUBLIC_READ_ONLY' as const;
export const SFI_PUBLIC_MCP_ENDPOINT = '/api/mcp/public' as const;

const PUBLIC_CACHE_TTL_MS = 300_000;
const DYNAMIC_CACHE_TTL_MS = 30_000;

type JsonRpcId = string | number | null;
type JsonObject = Record<string, unknown>;
type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: JsonObject;
};

export type SfiPublicMcpDependencies = Readonly<{
  readPublicWorldState: () => Promise<unknown>;
}>;

export type SfiPublicMcpHttpHeaders = Readonly<{
  protocolVersion: string | null;
  method: string | null;
  name: string | null;
}>;

export type SfiPublicMcpDeferredTool = Readonly<{
  name: 'get_public_evidence' | 'get_public_capabilities';
  state: 'UNAVAILABLE';
  reason: string;
}>;

export const SFI_PUBLIC_MCP_DEFERRED_TOOLS: readonly SfiPublicMcpDeferredTool[] = Object.freeze([
  {
    name: 'get_public_evidence',
    state: 'UNAVAILABLE',
    reason: 'PUBLIC_EVIDENCE_CAPSULE_OWNER_NOT_AVAILABLE_AT_BASELINE',
  },
  {
    name: 'get_public_capabilities',
    state: 'UNAVAILABLE',
    reason: 'NO_AUTHORITATIVE_PUBLIC_CAPABILITY_PROJECTION',
  },
]);

const EMPTY_INPUT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const);

const SEARCH_INPUT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    q: { type: 'string', description: 'Optional case-insensitive query over the canonical public title, summary, id, key, or slug.' },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
  },
  additionalProperties: false,
} as const);

const GET_INPUT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    identifier: { type: 'string', minLength: 1, description: 'Canonical object id, object key, slug, or canonical URL.' },
  },
  required: ['identifier'],
  additionalProperties: false,
} as const);

export const SFI_PUBLIC_MCP_TOOLS = Object.freeze([
  {
    name: 'get_institution',
    description: 'Read the canonical public System Friction Institute profile projection.',
    inputSchema: EMPTY_INPUT_SCHEMA,
  },
  {
    name: 'search_concepts',
    description: 'Search explicitly public canonical CONCEPT objects.',
    inputSchema: SEARCH_INPUT_SCHEMA,
  },
  {
    name: 'get_concept',
    description: 'Read one explicitly public canonical CONCEPT object.',
    inputSchema: GET_INPUT_SCHEMA,
  },
  {
    name: 'search_methods',
    description: 'Search explicitly public canonical METHOD objects.',
    inputSchema: SEARCH_INPUT_SCHEMA,
  },
  {
    name: 'get_method',
    description: 'Read one explicitly public canonical METHOD object.',
    inputSchema: GET_INPUT_SCHEMA,
  },
  {
    name: 'search_instruments',
    description: 'Search explicitly public canonical INSTRUMENT objects.',
    inputSchema: SEARCH_INPUT_SCHEMA,
  },
  {
    name: 'get_public_return',
    description: 'Read one explicitly public canonical RETURN object.',
    inputSchema: GET_INPUT_SCHEMA,
  },
  {
    name: 'get_public_research',
    description: 'Read the governed public Research Graph projection over canonical public objects.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string' },
        type: {
          type: 'string',
          enum: ['METHOD', 'INSTRUMENT', 'DATASET', 'REPORT', 'PAPER', 'SOFTWARE', 'RELEASE', 'RETURN', 'PUBLICATION'],
        },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_epistemic_contract',
    description: 'Read the public epistemic classes, lifecycle, and invariant projection.',
    inputSchema: EMPTY_INPUT_SCHEMA,
  },
  {
    name: 'get_public_world_state',
    description: 'Read the existing governed public Observatory world-state projection.',
    inputSchema: EMPTY_INPUT_SCHEMA,
  },
] as const);

export type SfiPublicMcpToolName = (typeof SFI_PUBLIC_MCP_TOOLS)[number]['name'];

export const SFI_PUBLIC_MCP_RESOURCES = Object.freeze([
  {
    uri: 'sfi://institution',
    name: 'System Friction Institute public profile',
    mimeType: 'application/json',
    description: 'Canonical public institution profile projection.',
  },
  {
    uri: 'sfi://epistemic-contract',
    name: 'SFI public epistemic contract',
    mimeType: 'application/json',
    description: 'Public epistemic classes, lifecycle, and invariants.',
  },
  {
    uri: 'sfi://canonical/objects',
    name: 'SFI public canonical objects',
    mimeType: 'application/json',
    description: 'Only explicitly public canonical object projections.',
  },
  {
    uri: 'sfi://research',
    name: 'SFI public Research Graph',
    mimeType: 'application/json',
    description: 'Governed research projection over canonical public objects.',
  },
  {
    uri: 'sfi://world-state',
    name: 'SFI governed public world state',
    mimeType: 'application/json',
    description: 'Current governed public Observatory state; absence remains unavailable rather than zero.',
  },
  {
    uri: 'sfi://mcp/status',
    name: 'SFI public MCP status',
    mimeType: 'application/json',
    description: 'Server identity, authority boundary, available tools, and explicit unavailable tools.',
  },
] as const);

const TOOL_NAMES = new Set<string>(SFI_PUBLIC_MCP_TOOLS.map((tool) => tool.name));
const RESOURCE_URIS = new Set<string>(SFI_PUBLIC_MCP_RESOURCES.map((resource) => resource.uri));
const DEFERRED_BY_NAME = new Map<string, SfiPublicMcpDeferredTool>(SFI_PUBLIC_MCP_DEFERRED_TOOLS.map((tool) => [tool.name, tool]));

function row(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function boundedLimit(value: unknown, fallback = 25): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

function publicInstitutionProjection() {
  return {
    contract: SFI_PUBLIC_PROFILE.contract,
    institution: SFI_PUBLIC_PROFILE.institution,
    operatingPrinciple: SFI_PUBLIC_PROFILE.operatingPrinciple,
    instruments: SFI_PUBLIC_PROFILE.instruments,
    lifecycle: SFI_PUBLIC_PROFILE.lifecycle,
    epistemicClasses: SFI_PUBLIC_PROFILE.epistemicClasses,
    invariants: SFI_PUBLIC_PROFILE.invariants,
    publicSurfaces: SFI_PUBLIC_PROFILE.publicSurfaces,
  };
}

function publicEpistemicProjection() {
  return {
    sourceContract: SFI_PUBLIC_PROFILE.contract,
    lifecycle: SFI_PUBLIC_PROFILE.lifecycle,
    epistemicClasses: SFI_PUBLIC_PROFILE.epistemicClasses,
    invariants: SFI_PUBLIC_PROFILE.invariants,
    boundary: {
      modelOutputIsObservation: false,
      simulationIsObservation: false,
      missingRemainsMissing: true,
      externalRepresentationIsCanon: false,
    },
  };
}

export function publicCanonicalObjectProjections(
  records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY,
): SfiCanonicalPublicProjection[] {
  const errors = validateCanonicalObjectRegistry(records);
  if (errors.length > 0) throw new Error(`INVALID_CANONICAL_OBJECT_SOURCE:${errors.join('|')}`);

  return records
    .map((record) => publicProjectionForCanonicalObject(record))
    .filter((projection): projection is SfiCanonicalPublicProjection => projection !== null)
    .sort((left, right) => left.objectKey.localeCompare(right.objectKey));
}

export function searchPublicCanonicalObjects(
  objectType: SfiCanonicalObjectType,
  query = '',
  records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY,
  limit = 25,
): SfiCanonicalPublicProjection[] {
  const normalizedQuery = query.trim().toLowerCase();
  const bounded = boundedLimit(limit);

  return records
    .filter((record) => record.objectType === objectType)
    .map((record) => ({ record, projection: publicProjectionForCanonicalObject(record) }))
    .filter((entry): entry is { record: SfiCanonicalObjectRecord; projection: SfiCanonicalPublicProjection } => entry.projection !== null)
    .filter(({ record, projection }) => {
      if (!normalizedQuery) return true;
      return [
        record.id,
        record.objectKey,
        record.slug,
        record.canonicalUrl,
        projection.title,
        projection.summary,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    })
    .sort((left, right) => left.record.objectKey.localeCompare(right.record.objectKey))
    .slice(0, bounded)
    .map(({ projection }) => projection);
}

export function getPublicCanonicalObject(
  objectType: SfiCanonicalObjectType,
  identifier: string,
  records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY,
): SfiCanonicalPublicProjection | null {
  const normalized = identifier.trim();
  if (!normalized) return null;

  const record = records.find((candidate) => candidate.objectType === objectType && [
    candidate.id,
    candidate.objectKey,
    candidate.slug,
    candidate.canonicalUrl,
  ].includes(normalized));
  return record ? publicProjectionForCanonicalObject(record) : null;
}

function publicMcpStatus(records: readonly SfiCanonicalObjectRecord[] = SFI_CANONICAL_OBJECT_REGISTRY) {
  return {
    serverId: SFI_PUBLIC_MCP_SERVER_ID,
    serverVersion: SFI_PUBLIC_MCP_SERVER_VERSION,
    protocolVersion: SFI_PUBLIC_MCP_PROTOCOL_VERSION,
    endpoint: SFI_PUBLIC_MCP_ENDPOINT,
    authority: SFI_PUBLIC_MCP_AUTHORITY,
    sourceContract: SFI_CANONICAL_OBJECT_CONTRACT,
    canonicalRegistry: {
      available: validateCanonicalObjectRegistry(records).length === 0,
      publicObjectCount: publicCanonicalObjectProjections(records).length,
    },
    availableTools: SFI_PUBLIC_MCP_TOOLS.map((tool) => tool.name),
    unavailableTools: SFI_PUBLIC_MCP_DEFERRED_TOOLS,
    restrictions: [
      'PUBLIC_CANONICAL_READS_ONLY',
      'NO_PRIVATE_STATE',
      'NO_AUTHORITY_INHERITANCE',
      'NO_CANON_MUTATION',
    ],
  };
}

function completeResult<T extends JsonObject>(payload: T) {
  return {
    resultType: 'complete',
    ...payload,
  } as const;
}

function toolResult(payload: JsonObject) {
  return completeResult({
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: false,
  });
}

function jsonRpcResult(id: JsonRpcId, result: JsonObject) {
  return { jsonrpc: '2.0' as const, id, result };
}

function jsonRpcError(id: JsonRpcId, code: number, message: string, data?: JsonObject) {
  return {
    jsonrpc: '2.0' as const,
    id,
    error: {
      code,
      message,
      ...(data ? { data } : {}),
    },
  };
}

function requestId(request: JsonRpcRequest): JsonRpcId {
  return typeof request.id === 'string' || typeof request.id === 'number' || request.id === null ? request.id : null;
}

function searchResult(type: SfiCanonicalObjectType, args: JsonObject) {
  const q = text(args.q);
  const limit = boundedLimit(args.limit);
  const items = searchPublicCanonicalObjects(type, q, SFI_CANONICAL_OBJECT_REGISTRY, limit);
  return {
    available: true,
    sourceContract: SFI_CANONICAL_OBJECT_CONTRACT,
    objectType: type,
    query: q || null,
    count: items.length,
    items,
  };
}

function getResult(type: SfiCanonicalObjectType, args: JsonObject) {
  const identifier = text(args.identifier);
  if (!identifier) return null;
  const object = getPublicCanonicalObject(type, identifier);
  return {
    available: true,
    sourceContract: SFI_CANONICAL_OBJECT_CONTRACT,
    objectType: type,
    identifier,
    found: object !== null,
    object,
  };
}

function publicResearch(args: JsonObject) {
  const graph = researchGraphProjectionForCanonicalObjects();
  const q = text(args.q).toLowerCase();
  const requestedType = text(args.type) as SfiResearchProjectableObjectType | '';
  const limit = boundedLimit(args.limit);
  const items = graph.nodes
    .filter((node) => !requestedType || node.objectType === requestedType)
    .filter((node) => !q || [node.canonicalObjectId, node.canonicalObjectKey, node.canonicalUrl, node.title, node.summary]
      .some((value) => value.toLowerCase().includes(q)))
    .slice(0, limit);
  const selectedIds = new Set(items.map((node) => node.canonicalObjectId));
  const relationships = graph.relationships.filter((edge) => selectedIds.has(edge.fromCanonicalObjectId) && selectedIds.has(edge.toCanonicalObjectId));

  return {
    available: true,
    contract: graph.contract,
    sourceContract: graph.sourceContract,
    count: items.length,
    items,
    relationships,
  };
}

async function callTool(
  name: string,
  args: JsonObject,
  dependencies: SfiPublicMcpDependencies,
): Promise<JsonObject | null> {
  switch (name as SfiPublicMcpToolName) {
    case 'get_institution':
      return toolResult({ available: true, institution: publicInstitutionProjection() });
    case 'search_concepts':
      return toolResult(searchResult('CONCEPT', args));
    case 'get_concept': {
      const result = getResult('CONCEPT', args);
      return result ? toolResult(result) : null;
    }
    case 'search_methods':
      return toolResult(searchResult('METHOD', args));
    case 'get_method': {
      const result = getResult('METHOD', args);
      return result ? toolResult(result) : null;
    }
    case 'search_instruments':
      return toolResult(searchResult('INSTRUMENT', args));
    case 'get_public_return': {
      const result = getResult('RETURN', args);
      return result ? toolResult(result) : null;
    }
    case 'get_public_research':
      return toolResult(publicResearch(args));
    case 'get_epistemic_contract':
      return toolResult({ available: true, epistemicContract: publicEpistemicProjection() });
    case 'get_public_world_state': {
      try {
        const worldState = await dependencies.readPublicWorldState();
        return toolResult({ available: true, state: 'AVAILABLE', worldState });
      } catch {
        return toolResult({
          available: false,
          state: 'UNAVAILABLE',
          reason: 'PUBLIC_WORLD_STATE_UNAVAILABLE',
        });
      }
    }
    default:
      return null;
  }
}

async function resourcePayload(uri: string, dependencies: SfiPublicMcpDependencies): Promise<JsonObject | null> {
  switch (uri) {
    case 'sfi://institution':
      return { available: true, institution: publicInstitutionProjection() };
    case 'sfi://epistemic-contract':
      return { available: true, epistemicContract: publicEpistemicProjection() };
    case 'sfi://canonical/objects': {
      const objects = publicCanonicalObjectProjections();
      return {
        available: true,
        sourceContract: SFI_CANONICAL_OBJECT_CONTRACT,
        count: objects.length,
        objects,
      };
    }
    case 'sfi://research':
      return publicResearch({});
    case 'sfi://world-state':
      try {
        return { available: true, state: 'AVAILABLE', worldState: await dependencies.readPublicWorldState() };
      } catch {
        return { available: false, state: 'UNAVAILABLE', reason: 'PUBLIC_WORLD_STATE_UNAVAILABLE' };
      }
    case 'sfi://mcp/status':
      return publicMcpStatus();
    default:
      return null;
  }
}

function subjectForRequest(request: JsonRpcRequest): string | null {
  const params = row(request.params);
  if (request.method === 'tools/call') return text(params.name) || null;
  if (request.method === 'resources/read') return text(params.uri) || null;
  return null;
}

export function validatePublicMcpHttpEnvelope(
  headers: SfiPublicMcpHttpHeaders,
  request: JsonRpcRequest,
): string[] {
  const errors: string[] = [];
  if (headers.protocolVersion !== SFI_PUBLIC_MCP_PROTOCOL_VERSION) errors.push('PROTOCOL_VERSION_MISMATCH');
  if (headers.method !== request.method) errors.push('METHOD_HEADER_MISMATCH');

  const subject = subjectForRequest(request);
  if (subject !== null) {
    if (headers.name !== subject) errors.push('NAME_HEADER_MISMATCH');
  } else if (headers.name) {
    errors.push('UNEXPECTED_NAME_HEADER');
  }

  const meta = row(row(request.params)._meta);
  if (text(meta['io.modelcontextprotocol/protocolVersion']) !== SFI_PUBLIC_MCP_PROTOCOL_VERSION) {
    errors.push('META_PROTOCOL_VERSION_MISMATCH');
  }
  return errors;
}

export function isPublicMcpRequest(value: unknown): value is JsonRpcRequest {
  const candidate = row(value);
  return candidate.jsonrpc === '2.0'
    && typeof candidate.method === 'string'
    && candidate.method.trim().length > 0
    && (typeof candidate.id === 'undefined' || candidate.id === null || typeof candidate.id === 'string' || typeof candidate.id === 'number')
    && (typeof candidate.params === 'undefined' || (candidate.params !== null && typeof candidate.params === 'object' && !Array.isArray(candidate.params)));
}

export async function dispatchPublicMcpRequest(
  request: JsonRpcRequest,
  dependencies: SfiPublicMcpDependencies,
) {
  const id = requestId(request);
  const params = row(request.params);

  switch (request.method) {
    case 'server/discover':
      return jsonRpcResult(id, completeResult({
        supportedVersions: [SFI_PUBLIC_MCP_PROTOCOL_VERSION],
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: SFI_PUBLIC_MCP_SERVER_ID, version: SFI_PUBLIC_MCP_SERVER_VERSION },
        instructions: 'Public authoritative reads only. Missing and unavailable states remain explicit. The server does not mutate institutional state.',
        ttlMs: PUBLIC_CACHE_TTL_MS,
        cacheScope: 'public',
      }));

    case 'tools/list':
      return jsonRpcResult(id, completeResult({
        tools: SFI_PUBLIC_MCP_TOOLS,
        ttlMs: PUBLIC_CACHE_TTL_MS,
        cacheScope: 'public',
      }));

    case 'tools/call': {
      const name = text(params.name);
      const args = row(params.arguments);
      const deferred = DEFERRED_BY_NAME.get(name);
      if (deferred) {
        return jsonRpcResult(id, toolResult({
          available: false,
          state: deferred.state,
          reason: deferred.reason,
          tool: deferred.name,
        }));
      }
      if (!TOOL_NAMES.has(name)) return jsonRpcError(id, -32602, 'Invalid params', { reason: 'TOOL_NOT_AVAILABLE' });
      const result = await callTool(name, args, dependencies);
      if (!result) return jsonRpcError(id, -32602, 'Invalid params', { reason: 'REQUIRED_TOOL_ARGUMENT_MISSING' });
      return jsonRpcResult(id, result);
    }

    case 'resources/list':
      return jsonRpcResult(id, completeResult({
        resources: SFI_PUBLIC_MCP_RESOURCES,
        ttlMs: PUBLIC_CACHE_TTL_MS,
        cacheScope: 'public',
      }));

    case 'resources/read': {
      const uri = text(params.uri);
      if (!RESOURCE_URIS.has(uri)) return jsonRpcError(id, -32602, 'Invalid params', { reason: 'RESOURCE_NOT_AVAILABLE' });
      const payload = await resourcePayload(uri, dependencies);
      if (!payload) return jsonRpcError(id, -32602, 'Invalid params', { reason: 'RESOURCE_NOT_AVAILABLE' });
      return jsonRpcResult(id, completeResult({
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(payload),
        }],
        ttlMs: uri === 'sfi://world-state' ? DYNAMIC_CACHE_TTL_MS : PUBLIC_CACHE_TTL_MS,
        cacheScope: 'public',
      }));
    }

    default:
      return jsonRpcError(id, -32601, 'Method not found');
  }
}
