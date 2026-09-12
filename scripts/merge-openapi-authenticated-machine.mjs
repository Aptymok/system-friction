import './merge-openapi-studio-attachments.mjs';
import fs from 'node:fs';
import path from 'node:path';

const openapiPath = path.join(process.cwd(), 'public', 'openapi.json');
const api = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
const canonicalOrigin = 'https://www.systemfriction.org';
const actionDescriptionLimit = 300;
const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

function clipDescription(value) {
  if (typeof value !== 'string' || value.length <= actionDescriptionLimit) return value;
  const head = value.slice(0, actionDescriptionLimit - 3);
  const breakAt = head.lastIndexOf(' ');
  const clipped = (breakAt >= 220 ? head.slice(0, breakAt) : head).trimEnd();
  return `${clipped}...`;
}

api.paths ||= {};

// MCP remains a separate protocol/runtime surface. GPT Actions consumes the
// canonical External Agent OpenAPI only; custom MCP possession-proof headers do
// not belong in the Actions contract.
delete api.paths['/api/mcp/authenticated'];

for (const pathItem of Object.values(api.paths)) {
  if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) continue;
  for (const method of methods) {
    const operation = pathItem[method];
    if (!operation || typeof operation !== 'object') continue;
    if (typeof operation.description === 'string') operation.description = clipDescription(operation.description);
    if (Array.isArray(operation.parameters)) {
      operation.parameters = operation.parameters.filter((parameter) => parameter?.in !== 'header');
      if (operation.parameters.length === 0) delete operation.parameters;
    }
  }
}

api.servers = [{ url: canonicalOrigin }];
if (api.info) api.info.termsOfService = `${canonicalOrigin}/privacy`;
if (api.externalDocs) api.externalDocs.url = `${canonicalOrigin}/privacy`;
const oauth = api.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode;
if (oauth) {
  oauth.authorizationUrl = `${canonicalOrigin}/api/oauth/authorize`;
  oauth.tokenUrl = `${canonicalOrigin}/api/oauth/token`;
}

api['x-sfi-governance'] ||= {};
api['x-sfi-governance'].schemaBinding = 'CANONICAL_GPT_ACTIONS_OPENAPI';
api['x-sfi-governance'].actionDescriptionLimit = actionDescriptionLimit;
api['x-sfi-governance'].gptActions = {
  schema: '/openapi.json',
  oauthSecurityDeclared: Boolean(api.components?.securitySchemes?.sfiOAuth),
  mcpExcluded: true,
  customHeaderParametersExcluded: true,
  separateActionsProjection: false,
};
api['x-sfi-governance'].authenticatedMachineAdapter = {
  contract: 'SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.0',
  endpoint: '/api/mcp/authenticated',
  openApiExposure: 'OUT_OF_BAND_MCP',
  canonicalOpenApi: '/openapi.json',
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
  contract: 'SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.1',
  authenticatedMcpPath: '/api/mcp/authenticated',
  authenticatedMcpOpenApiExposure: 'OUT_OF_BAND_MCP',
  canonicalOpenApi: '/openapi.json',
  gptActionsSchema: '/openapi.json',
  oauthSecurityDeclared: Boolean(api.components?.securitySchemes?.sfiOAuth),
  separateActionsProjection: false,
  actionDescriptionLimit,
}, null, 2));
