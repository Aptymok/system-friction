import './merge-openapi-studio-attachments.mjs';
import fs from 'node:fs';
import path from 'node:path';

const openapiPath = path.join(process.cwd(), 'public', 'openapi.json');
const api = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

api.paths ||= {};
api.paths['/api/mcp/authenticated'] = {
  post: {
    operationId: 'sfiAuthenticatedGovernedMachineAdapter',
    summary: 'Authenticated governed SFI machine adapter',
    description: 'Authenticated MCP/JSON-RPC adapter for governed SFI machine clients. Executable tools/call requires OAuth execute scope, an ACTIVE SFI-CAPABILITY-GRANT-1.0 and possession proof. The adapter cannot promote canon or execute external side effects.',
    tags: ['Machine Interfaces'],
    security: [{ sfiOAuth: ['execute'] }],
    parameters: [{
      name: 'X-SFI-Capability-Grant-Nonce',
      in: 'header',
      required: false,
      schema: { type: 'string', minLength: 1 },
      description: 'Transient possession proof for MCP tools/call. The runtime hashes it server-side; it is never persisted or returned.',
    }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['jsonrpc', 'method'],
            properties: {
              jsonrpc: { type: 'string', const: '2.0' },
              id: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }] },
              method: {
                type: 'string',
                enum: ['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read'],
              },
              params: { type: 'object', additionalProperties: true },
            },
            additionalProperties: false,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'MCP JSON-RPC response with bounded result or error data.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                jsonrpc: { type: 'string' },
                id: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }] },
                result: { type: 'object', properties: {}, additionalProperties: true },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'number' },
                    message: { type: 'string' },
                    data: { type: 'object', properties: {}, additionalProperties: true },
                  },
                  additionalProperties: true,
                },
              },
              additionalProperties: false,
            },
          },
        },
      },
      '401': { description: 'Missing or invalid OAuth/scoped gateway credential.' },
      '403': { description: 'OAuth, grant, possession proof, scope, resource, action or authority ceiling denied.' },
      '409': { description: 'Grant replay or one-time reservation conflict.' },
      '503': { description: 'Required authorization/execution lineage receipt could not be persisted; operation fails closed.' },
    },
    'x-sfi-contract': 'SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.0',
    'x-sfi-authority-boundary': {
      discoveryIsExecution: false,
      publicReadIsAuthenticatedExecution: false,
      requestIsAuthorization: false,
      brokerAdmitIsExecutionAuthorization: false,
      modelCapabilityIsAuthority: false,
      activeEphemeralGrantRequired: true,
      grantPossessionProofRequired: true,
      authorityExpansionAllowed: false,
      canonicalPromotionAllowed: false,
      externalSideEffectsExposed: false,
    },
  },
};

api['x-sfi-governance'] ||= {};
api['x-sfi-governance'].authenticatedMachineAdapter = {
  contract: 'SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.0',
  endpoint: '/api/mcp/authenticated',
  oauthClientBindingRequired: true,
  grantContract: 'SFI-CAPABILITY-GRANT-1.0',
  grantStateRequired: 'ACTIVE',
  grantProof: 'TRANSIENT_RAW_NONCE_HEADER -> SHA256 -> persisted nonceHash comparison',
  rawNonceAcceptedOnlyAsTransientMachineHeader: true,
  rawNonceInJson: false,
  rawNoncePersisted: false,
  rawNonceInBrowserOrModelContext: false,
  publicMcpUnchanged: '/api/mcp/public',
  executionOwner: 'SFI-MANUAL-COGNITIVE-EXECUTION-1.1 -> runtimeAgentExecutor -> agentExecutionMap',
  eventOwner: 'epistemic_events',
  externalPublicationReceipt: null,
};

fs.writeFileSync(openapiPath, `${JSON.stringify(api, null, 2)}\n`);

// This is the final projection step for the GPT Actions-facing OpenAPI. It
// removes Action-unsupported header parameters and enforces parser limits
// without changing the underlying MCP runtime authorization contract.
await import('./merge-openapi-actions-compat.mjs');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.0',
  path: '/api/mcp/authenticated',
  oauthScope: 'execute',
  grantContract: 'SFI-CAPABILITY-GRANT-1.0',
  grantProof: 'TRANSIENT_HEADER_HASHED_SERVER_SIDE',
  actionsProjection: 'SFI-GPT-ACTIONS-OPENAPI-COMPAT-1.0',
}, null, 2));
