export const SFI_STUDIO_MCP_CONTRACT = 'SFI-STUDIO-MCP-1.0' as const;
export const SFI_STUDIO_MCP_SERVER_ID = 'org.systemfriction/studio' as const;
export const SFI_STUDIO_MCP_SERVER_VERSION = '1.0.0' as const;
export const SFI_STUDIO_MCP_PROTOCOL_VERSION = '2026-07-28' as const;
export const SFI_STUDIO_MCP_ENDPOINT = '/api/mcp/studio' as const;

type JsonObject = Record<string, unknown>;
type JsonRpcId = string | number | null;
type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: JsonObject;
};

export type StudioMcpDependencyResult = Readonly<{
  status: number;
  body: JsonObject;
}>;

export type StudioMcpDependencies = Readonly<{
  invokeStudioOperation: (operation: StudioOperation, args: JsonObject) => Promise<StudioMcpDependencyResult>;
}>;

export type StudioOperation =
  | 'context'
  | 'list'
  | 'inspect'
  | 'features'
  | 'content'
  | 'analyze'
  | 'ingest_analyze'
  | 'produce';

const EMPTY_INPUT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const);

const OBJECT_ID_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    objectId: { type: 'string', minLength: 1 },
  },
  required: ['objectId'],
  additionalProperties: true,
} as const);

export const SFI_STUDIO_MCP_TOOLS = Object.freeze([
  {
    name: 'studio_context',
    operation: 'context',
    requiredScope: 'studio:read',
    description: 'Read persisted owner-scoped Studio context and lineage. Metadata is context/provenance, not a new observation.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 100 } },
      additionalProperties: false,
    },
  },
  {
    name: 'studio_list',
    operation: 'list',
    requiredScope: 'studio:read',
    description: 'List Studio objects owned by the OAuth principal.',
    inputSchema: {
      type: 'object',
      properties: {
        includeArchived: { type: 'boolean' },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        before: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'studio_inspect',
    operation: 'inspect',
    requiredScope: 'studio:read',
    description: 'Inspect one owner-scoped Studio object.',
    inputSchema: OBJECT_ID_SCHEMA,
  },
  {
    name: 'studio_features',
    operation: 'features',
    requiredScope: 'studio:read',
    description: 'Read persisted analysis features for one owner-scoped Studio object.',
    inputSchema: OBJECT_ID_SCHEMA,
  },
  {
    name: 'studio_content',
    operation: 'content',
    requiredScope: 'studio:content',
    description: 'Obtain a short-lived signed URL for materialized content owned by the OAuth principal.',
    inputSchema: OBJECT_ID_SCHEMA,
  },
  {
    name: 'studio_analyze',
    operation: 'analyze',
    requiredScope: 'studio:run',
    description: 'Run the existing Studio analyzer for one owned audio or video object.',
    inputSchema: {
      type: 'object',
      properties: {
        objectId: { type: 'string', minLength: 1 },
        force: { type: 'boolean' },
      },
      required: ['objectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'studio_ingest_analyze',
    operation: 'ingest_analyze',
    requiredScope: 'studio:run',
    description: 'Ingest exactly one authorized ChatGPT audio attachment into private owner-scoped Studio storage and analyze it.',
    inputSchema: {
      type: 'object',
      properties: {
        openaiFileIdRefs: { type: 'array', minItems: 1, maxItems: 1 },
        analysisAuthorization: { type: 'object' },
        title: { type: 'string', maxLength: 240 },
        force: { type: 'boolean' },
      },
      required: ['openaiFileIdRefs', 'analysisAuthorization'],
      additionalProperties: false,
    },
  },
  {
    name: 'studio_produce',
    operation: 'produce',
    requiredScope: 'studio:run',
    description: 'Produce a bounded owner-scoped Studio audio result from an owned source. Rights transfer and canonical promotion remain false.',
    inputSchema: {
      type: 'object',
      properties: {
        objectId: { type: 'string', minLength: 1 },
        mode: { type: 'string', enum: ['VOICE_MUSICALIZE', 'MASTER_ADJUST'] },
        productionAuthorization: { type: 'object' },
        bpm: { type: 'number', minimum: 60, maximum: 200 },
        key: { type: 'string', maxLength: 24 },
        culturalProfile: { type: 'string', maxLength: 80 },
        instrumentIds: { type: 'object' },
        force: { type: 'boolean' },
      },
      required: ['objectId', 'mode', 'productionAuthorization'],
      additionalProperties: false,
    },
  },
] as const);

export const SFI_STUDIO_MCP_RESOURCES = Object.freeze([
  {
    uri: 'sfi://studio/status',
    name: 'SFI Studio MCP status',
    mimeType: 'application/json',
    description: 'Studio MCP identity, scopes and authority boundary. No owner material is exposed by this resource.',
  },
] as const);

function row(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function requestId(request: JsonRpcRequest): JsonRpcId {
  return typeof request.id === 'string' || typeof request.id === 'number' || request.id === null ? request.id : null;
}

function jsonRpcResult(id: JsonRpcId, result: JsonObject) {
  return { jsonrpc: '2.0' as const, id, result };
}

function jsonRpcError(id: JsonRpcId, code: number, message: string, data?: JsonObject) {
  return {
    jsonrpc: '2.0' as const,
    id,
    error: { code, message, ...(data ? { data } : {}) },
  };
}

function toolResult(payload: JsonObject, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError,
  };
}

function statusPayload() {
  return {
    contract: SFI_STUDIO_MCP_CONTRACT,
    serverId: SFI_STUDIO_MCP_SERVER_ID,
    serverVersion: SFI_STUDIO_MCP_SERVER_VERSION,
    protocolVersion: SFI_STUDIO_MCP_PROTOCOL_VERSION,
    endpoint: SFI_STUDIO_MCP_ENDPOINT,
    oauthScopes: ['studio:read', 'studio:content', 'studio:run'],
    authorityBoundary: {
      ownerBound: true,
      ownerBinding: 'oauth.subjectId = Studio owner_id',
      rightsTransfer: false,
      canonicalPromotionAllowed: false,
      rootAuthorityInherited: false,
      institutionalCanonIncluded: false,
    },
    tools: SFI_STUDIO_MCP_TOOLS.map((tool) => ({
      name: tool.name,
      requiredScope: tool.requiredScope,
    })),
  };
}

function findTool(name: unknown) {
  return typeof name === 'string'
    ? SFI_STUDIO_MCP_TOOLS.find((tool) => tool.name === name) ?? null
    : null;
}

export async function dispatchStudioMcpRequest(
  value: unknown,
  dependencies: StudioMcpDependencies,
): Promise<{ status: number; body: JsonObject }> {
  const request = row(value) as JsonRpcRequest;
  const id = requestId(request);
  const method = typeof request.method === 'string' ? request.method : '';
  const params = row(request.params);

  if (method === 'initialize') {
    return {
      status: 200,
      body: jsonRpcResult(id, {
        protocolVersion: SFI_STUDIO_MCP_PROTOCOL_VERSION,
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: SFI_STUDIO_MCP_SERVER_ID, version: SFI_STUDIO_MCP_SERVER_VERSION },
        instructions: 'SFI Studio is owner-scoped. OAuth subject identity binds Studio ownership; capability never implies ROOT or canon authority.',
      }),
    };
  }

  if (method === 'ping') {
    return { status: 200, body: jsonRpcResult(id, {}) };
  }

  if (method === 'notifications/initialized') {
    return { status: 202, body: {} };
  }

  if (method === 'tools/list') {
    return {
      status: 200,
      body: jsonRpcResult(id, {
        tools: SFI_STUDIO_MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      }),
    };
  }

  if (method === 'resources/list') {
    return { status: 200, body: jsonRpcResult(id, { resources: SFI_STUDIO_MCP_RESOURCES }) };
  }

  if (method === 'resources/read') {
    if (params.uri !== 'sfi://studio/status') {
      return { status: 404, body: jsonRpcError(id, -32002, 'ResourceNotFound', { uri: params.uri ?? null }) };
    }
    const payload = statusPayload();
    return {
      status: 200,
      body: jsonRpcResult(id, {
        contents: [{
          uri: 'sfi://studio/status',
          mimeType: 'application/json',
          text: JSON.stringify(payload),
        }],
      }),
    };
  }

  if (method === 'tools/call') {
    const tool = findTool(params.name);
    if (!tool) {
      return { status: 404, body: jsonRpcError(id, -32601, 'ToolNotAvailable', { name: params.name ?? null }) };
    }

    const args = row(params.arguments);
    const invoked = await dependencies.invokeStudioOperation(tool.operation, args);

    if (invoked.status === 401) {
      return {
        status: 401,
        body: jsonRpcError(id, -32001, 'Unauthorized', {
          requiredScope: tool.requiredScope,
          studio: invoked.body,
        }),
      };
    }

    if (invoked.status === 403) {
      return {
        status: 403,
        body: jsonRpcError(id, -32003, 'Forbidden', {
          requiredScope: tool.requiredScope,
          studio: invoked.body,
        }),
      };
    }

    const isError = invoked.status < 200 || invoked.status >= 300;
    return {
      status: 200,
      body: jsonRpcResult(id, toolResult(invoked.body, isError)),
    };
  }

  return { status: 404, body: jsonRpcError(id, -32601, 'MethodNotFound', { method }) };
}
