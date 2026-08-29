import { readFileSync, writeFileSync } from 'node:fs';

const path = 'public/openapi.json';
const manifestPath = 'src/app/api/external/v1/manifest/route.ts';
const api = JSON.parse(readFileSync(path, 'utf8'));
const manifestSource = readFileSync(manifestPath, 'utf8');
const canonicalVersion = manifestSource.match(/version:\s*'([^']+)'/)?.[1] ?? null;
if (!canonicalVersion || !/^\d+\.\d+\.\d+$/.test(canonicalVersion)) {
  throw new Error('SFI_OPENAPI_CANONICAL_MANIFEST_VERSION_MISSING');
}
api.info ??= {};
api.info.version = canonicalVersion;
const oauth = api.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode;
if (!oauth?.scopes) throw new Error('SFI_OPENAPI_OAUTH_SCOPES_MISSING');
api.components ??= {};
api.components.schemas ??= {};
api.paths ??= {};

oauth.scopes['cases:read'] = 'Read SFI cases available to the authenticated subject through active tenant membership.';
oauth.scopes['cases:write'] = 'Create and populate bounded SFI Case Platform records through authenticated tenant membership.';

api.components.schemas.CaseWorkspaceRequest = {
  type: 'object',
  additionalProperties: false,
  required: ['operation'],
  properties: {
    operation: {
      type: 'string',
      enum: ['list', 'read', 'intake_plan', 'create', 'add_source', 'add_object', 'transition', 'reports'],
    },
    draft: {
      type: 'object',
      additionalProperties: true,
      description: 'Pre-case draft used by intake_plan. SFI returns only unresolved questions and does not create a case.',
    },
    caseId: { type: 'string' },
    tenantId: { type: ['string', 'null'] },
    clientId: { type: ['string', 'null'] },
    serviceProfileId: { type: 'string' },
    subject: { type: 'string' },
    scope: { type: 'string' },
    systemBoundaryRef: { type: 'object', additionalProperties: true },
    temporalWindow: { type: 'object', additionalProperties: true },
    source: { type: 'object', additionalProperties: true },
    kind: { type: 'string' },
    canonicalRef: { type: 'object', additionalProperties: true },
    sourceRefs: { type: 'array', items: { type: 'object', additionalProperties: true } },
    recordRefs: { type: 'array', items: { type: 'object', additionalProperties: true } },
    payload: { type: 'object', additionalProperties: true },
    observedAt: { type: ['string', 'null'] },
    status: { type: 'string' },
  },
};

api.paths['/api/external/v1/cases'] = {
  post: {
    operationId: 'operateSfiCaseWorkspace',
    summary: 'Plan, read, create and populate tenant-scoped SFI Case Platform cases',
    description: 'User-bound OAuth adapter over the existing Case Platform. Call intake_plan first when case context is incomplete; it returns only unresolved questions. Operations use cases:read or cases:write internally. This route cannot accept evidence, make governance decisions, authorize intervention, record observed RETURN, or create truth claims.',
    security: [{ sfiOAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CaseWorkspaceRequest' },
        },
      },
    },
    responses: {
      '200': { description: 'Case read, intake plan or transition result' },
      '201': { description: 'Case, source or bounded case object persisted' },
      '400': { description: 'Invalid or authority-forbidden case operation' },
      '409': { description: 'Case creation is missing required intake context' },
      '401': { description: 'Missing or insufficient cases scope' },
      '403': { description: 'User-bound OAuth required or tenant access forbidden' },
      '404': { description: 'Case not found in an accessible tenant' },
    },
  },
};

api['x-sfi-governance'] ??= {};
api['x-sfi-governance'].caseWorkspaceBoundary =
  'Case Platform access is subject-bound and tenant-scoped. intake_plan creates no case. cases:write can create SOURCE/RECORD/INFERENCE/EPISTEMIC_ASSESSMENT objects only within the adapter allowlist; it cannot mint accepted EVIDENCE, GOVERNANCE_DECISION, INTERVENTION, RETURN or TRUTH_CLAIM authority.';

writeFileSync(path, `${JSON.stringify(api, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, openapi: path, caseWorkspace: true, intakePlan: true, version: api.info?.version ?? null, versionSource: 'external-manifest' }));