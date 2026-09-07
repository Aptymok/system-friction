import fs from 'node:fs';
import path from 'node:path';

const openapiPath = path.join(process.cwd(), 'public', 'openapi.json');
const api = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

api.paths ||= {};
api.paths['/api/mcp/authenticated'] = {
  post: {
    operationId: 'sfiAuthenticatedGovernedMachineAdapter',
    summary: 'Authenticated governed SFI machine adapter',
    description: 'Authenticated MCP/JSON-RPC adapter over the existing SFI OAuth/scoped gateway and canonical cognitive execution owner. tools/call requires OAuth execute scope plus an ACTIVE SFI-CAPABILITY-GRANT-1.0 and transient proof of the grant nonce. Broker admission, model capability, or scope possession alone do not authorize execution. The adapter cannot promote canon or execute external side effects.',
    tags: ['Machine Interfaces'],
    security: [{ sfiOAuth: ['execute'] }],
    parameters: [{
      name: 'X-SFI-Capability-Grant-Nonce',
      in: 'header',
      required: false,
      schema: { type: 'string', minLength: 1 },
      description: 'Required for tools/call only. Trusted machine clients present the ephemeral grant nonce transiently; the server hashes it immediately against the persisted nonceHash and never places the raw nonce in JSON, persistence, browser state, execution context, or model context.',
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
        description: 'MCP JSON-RPC response. Successful tools/call responses include grant and lineage receipts but never a raw nonce or OAuth credential.',
        content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
      },
      '401': { description: 'Missing or invalid OAuth/scoped gateway credential.' },
      '403': { description: 'OAuth binding, grant possession/state, scope, resource, action, authority ceiling, parent grant, or confirmation policy denied.' },
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
console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.0',
  path: '/api/mcp/authenticated',
  oauthScope: 'execute',
  grantContract: 'SFI-CAPABILITY-GRANT-1.0',
  grantProof: 'TRANSIENT_HEADER_HASHED_SERVER_SIDE',
}, null, 2));
