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
api.info['x-sfi-action-revision'] = 'case-intake-required-v2';
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
    systemBoundaryId: {
      type: 'string',
      description: 'Preferred GPT Action transport field for systemBoundaryRef.id. SFI reconstructs the canonical nested boundary internally.',
    },
    systemBoundaryVersion: {
      type: ['string', 'null'],
      description: 'Optional transport field for systemBoundaryRef.version.',
    },
    systemBoundaryHash: {
      type: ['string', 'null'],
      description: 'Optional transport field for systemBoundaryRef.hash.',
    },
    systemBoundaryRef: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        version: { type: ['string', 'null'] },
        hash: { type: ['string', 'null'] },
      },
      description: 'Canonical nested system boundary. Flat systemBoundary* fields are preferred for GPT Action transport and remain backward-compatible with this object.',
    },
    temporalMode: { type: 'string', description: 'Preferred flat transport alias for temporalWindow.mode.' },
    temporalBasis: { type: 'string', description: 'Preferred flat transport alias for temporalWindow.basis.' },
    temporalStart: { type: ['string', 'null'], description: 'Preferred flat transport alias for temporalWindow.start.' },
    temporalEnd: { type: ['string', 'null'], description: 'Preferred flat transport alias for temporalWindow.end.' },
    temporalCutoff: { type: 'string', description: 'Preferred flat transport alias for temporalWindow.cutoff.' },
    temporalTimezone: { type: ['string', 'null'], description: 'Preferred flat transport alias for temporalWindow.timezone.' },
    temporalReconstructionAsOf: { type: ['string', 'null'], description: 'Preferred flat transport alias for temporalWindow.reconstructionAsOf.' },
    temporalHorizon: { type: ['string', 'null'], description: 'Preferred flat transport alias for temporalWindow.horizon.' },
    temporalWindow: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mode: { type: 'string' },
        basis: { type: 'string' },
        start: { type: ['string', 'null'] },
        end: { type: ['string', 'null'] },
        cutoff: { type: 'string' },
        timezone: { type: ['string', 'null'] },
        reconstructionAsOf: { type: ['string', 'null'] },
        horizon: { type: ['string', 'null'] },
      },
      description: 'Canonical nested temporal window. Flat temporal* fields are preferred for GPT Action transport and remain backward-compatible with this object.',
    },
    source: { type: 'object', additionalProperties: true },
    kind: { type: 'string' },
    canonicalRefId: {
      type: 'string',
      description: 'Preferred GPT Action transport field for canonicalRef.id when operation=add_object.',
    },
    canonicalRefVersion: { type: ['string', 'null'] },
    canonicalRefHash: { type: ['string', 'null'] },
    canonicalRef: { type: 'object', additionalProperties: true },
    sourceRefs: { type: 'array', items: { type: 'object', additionalProperties: true } },
    recordRefs: { type: 'array', items: { type: 'object', additionalProperties: true } },
    payload: { type: 'object', additionalProperties: true },
    observedAt: { type: ['string', 'null'] },
    status: { type: 'string' },
  },
};

api.components.schemas.CaseResolvedTransportRequest = {
  type: 'object',
  additionalProperties: false,
  required: ['serviceProfileId', 'subject', 'scope', 'systemBoundaryId', 'temporalCutoff'],
  properties: {
    tenantId: { type: ['string', 'null'] },
    clientId: { type: ['string', 'null'] },
    serviceProfileId: { type: 'string' },
    subject: { type: 'string' },
    scope: { type: 'string' },
    systemBoundaryId: { type: 'string' },
    systemBoundaryVersion: { type: ['string', 'null'] },
    systemBoundaryHash: { type: ['string', 'null'] },
    temporalMode: { type: ['string', 'null'] },
    temporalBasis: { type: ['string', 'null'] },
    temporalStart: { type: ['string', 'null'] },
    temporalEnd: { type: ['string', 'null'] },
    temporalCutoff: { type: 'string' },
    temporalTimezone: { type: ['string', 'null'] },
    temporalReconstructionAsOf: { type: ['string', 'null'] },
    temporalHorizon: { type: ['string', 'null'] },
  },
};

api.components.schemas.CaseObjectTransportRequest = {
  type: 'object',
  additionalProperties: false,
  required: ['caseId', 'kind', 'canonicalRefId', 'payload'],
  properties: {
    caseId: { type: 'string' },
    kind: {
      type: 'string',
      enum: ['RECORD', 'OBSERVATION', 'SYSTEM_MODEL', 'HYPOTHESIS', 'ANALYSIS', 'RECOMMENDATION', 'REPORT', 'UNRESOLVED_QUESTION', 'CONTRADICTION'],
    },
    canonicalRefId: { type: 'string' },
    canonicalRefVersion: { type: ['string', 'null'] },
    canonicalRefHash: { type: ['string', 'null'] },
    sourceRefIds: { type: 'array', items: { type: 'string' } },
    recordRefIds: { type: 'array', items: { type: 'string' } },
    payload: { type: 'object', additionalProperties: true },
    observedAt: { type: ['string', 'null'] },
  },
};

api.paths['/api/external/v1/cases'] = {
  post: {
    operationId: 'operateSfiCaseWorkspace',
    summary: 'Plan, read, create and populate tenant-scoped SFI Case Platform cases',
    description: 'OAuth Case Platform adapter. Prefer flat systemBoundary*, temporal* and canonicalRef* transport fields. Cannot admit evidence, govern, intervene, record RETURN, or create truth claims.',
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

api.paths['/api/external/v1/cases/intake'] = {
  post: {
    operationId: 'planSfiCaseIntake',
    summary: 'Resolve required Case Platform intake before creation',
    description: 'Dedicated GPT Action with required boundary and cutoff transport fields. Returns intake readiness plus safe transport diagnostics. Creates no case, evidence, intervention, RETURN or truth claim.',
    security: [{ sfiOAuth: ['cases:read'] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CaseResolvedTransportRequest' },
        },
      },
    },
    responses: {
      '200': { description: 'Resolved intake plan and transport diagnostics' },
      '400': { description: 'Conflicting or invalid transport fields' },
      '401': { description: 'Missing or insufficient cases:read scope' },
      '403': { description: 'User-bound OAuth required' },
    },
  },
};

api.paths['/api/external/v1/cases/create'] = {
  post: {
    operationId: 'createSfiCaseFromResolvedIntake',
    summary: 'Create one Case Platform case from resolved required intake',
    description: 'Dedicated GPT Action for case creation after intake readiness. Reconstructs canonical boundary and temporal contracts from required flat fields. Does not create accepted evidence, intervention, RETURN or truth.',
    security: [{ sfiOAuth: ['cases:write'] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CaseResolvedTransportRequest' },
        },
      },
    },
    responses: {
      '201': { description: 'Case created from resolved intake' },
      '400': { description: 'Conflicting or invalid transport fields' },
      '409': { description: 'Required intake context remains incomplete' },
      '401': { description: 'Missing or insufficient cases:write scope' },
      '403': { description: 'User-bound OAuth required or tenant access forbidden' },
    },
  },
};

api.paths['/api/external/v1/cases/object'] = {
  post: {
    operationId: 'addSfiCaseObject',
    summary: 'Persist one bounded Case object through required flat transport',
    description: 'Dedicated GPT Action for Case objects. canonicalRefId is required and reconstructed inside SFI. Cannot create accepted evidence, governance, intervention, RETURN or truth claims.',
    security: [{ sfiOAuth: ['cases:write'] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CaseObjectTransportRequest' },
        },
      },
    },
    responses: {
      '201': { description: 'Bounded Case object persisted' },
      '400': { description: 'Invalid or authority-forbidden object request' },
      '401': { description: 'Missing or insufficient cases:write scope' },
      '403': { description: 'User-bound OAuth required or tenant access forbidden' },
      '404': { description: 'Case not found in an accessible tenant' },
    },
  },
};

api.components.schemas.CognitiveRuntimeObjectRef = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id'],
  properties: {
    kind: { type: 'string', enum: ['CASE', 'PROJECT', 'EVIDENCE', 'CYCLE', 'NODE', 'ANALYSIS_SESSION'] },
    id: { type: 'string' },
    label: { type: ['string', 'null'] },
  },
};

api.components.schemas.CognitiveRuntimeExecutionRequest = {
  type: 'object',
  additionalProperties: true,
  required: ['operation', 'agentId', 'purpose', 'anchors', 'targets'],
  properties: {
    operation: { type: 'string', enum: ['execute'] },
    agentId: { type: 'string' },
    purpose: { type: 'string' },
    anchors: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/CognitiveRuntimeObjectRef' } },
    targets: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/CognitiveRuntimeObjectRef' } },
    evidenceIds: { type: 'array', items: { type: 'string' } },
    sourceUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
    timeRange: { type: ['object', 'null'], additionalProperties: true },
    direction: { type: ['string', 'null'], enum: ['A_TO_B', 'B_TO_A', 'BIDIRECTIONAL', 'EXPLORE', null] },
    parameters: { type: 'object', additionalProperties: true },
    requestedOutputs: { type: 'array', items: { type: 'string' } },
    governanceContext: { type: 'object', additionalProperties: true },
  },
};

api.paths['/api/external/v1/cognitive-runtime'] = {
  get: {
    operationId: 'readSfiCognitiveRuntimeExecutions',
    summary: 'Read versioned execution-centric cognitive-agent contracts, state and execution history',
    description: 'Institutional read adapter over the canonical cognitive runtime and immutable execution event projection. Context, inference, telemetry and authority boundaries remain explicit.',
    'x-sfi-scope': 'observe',
    security: [{ sfiOAuth: ['observe'] }],
    parameters: [
      { name: 'agentId', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'executionId', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 200 } },
    ],
    responses: {
      '200': { description: 'Execution contracts/runtime list or one exact agent execution dossier' },
      '401': { description: 'Missing or insufficient observe scope' },
      '404': { description: 'Agent not found' },
      '409': { description: 'Execution Contract unavailable' },
    },
  },
  post: {
    operationId: 'executeSfiCognitiveAgentContract',
    summary: 'Execute one typed cognitive-agent contract through the canonical runtime',
    description: 'Requires user-bound institutional OAuth, execute scope and tenant sfi. Legacy single-target request fields are rejected. Execution cannot self-approve proposals, admit evidence, perform external irreversible action, record RETURN, promote learning or promote canon.',
    'x-sfi-scope': 'execute',
    security: [{ sfiOAuth: ['execute'] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CognitiveRuntimeExecutionRequest' },
        },
      },
    },
    responses: {
      '200': { description: 'Governed cognitive execution result' },
      '400': { description: 'Invalid typed execution request or legacy request shape' },
      '401': { description: 'Missing or insufficient execute scope' },
      '403': { description: 'User-bound institutional OAuth required' },
      '404': { description: 'Agent or authorized target not found' },
      '409': { description: 'Execution Contract unavailable' },
    },
  },
};

api['x-sfi-governance'] ??= {};
api['x-sfi-governance'].caseWorkspaceBoundary =
  'Case Platform access is subject-bound and tenant-scoped. intake_plan creates no case. cases:write can create SOURCE/RECORD/INFERENCE/EPISTEMIC_ASSESSMENT objects only within the adapter allowlist; it cannot mint accepted EVIDENCE, GOVERNANCE_DECISION, INTERVENTION, RETURN or TRUTH_CLAIM authority.';
api['x-sfi-governance'].cognitiveRuntimeBoundary =
  'The cognitive runtime API reuses canonical Execution Contracts and the existing execution event writer. observe is read-only; execute requires user-bound institutional OAuth. Context is not evidence, inference is not observation, model capability does not expand authority, and execution cannot imply approval, RETURN, learning or canon.';

writeFileSync(path, `${JSON.stringify(api, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  openapi: path,
  caseWorkspace: true,
  intakePlan: true,
  flatCaseTransportAliases: true,
  dedicatedRequiredCaseActions: true,
  dedicatedRequiredCaseObjectAction: true,
  actionRevision: api.info?.['x-sfi-action-revision'] ?? null,
  cognitiveRuntime: true,
  cognitiveRuntimeContract: 'SFI-EXTERNAL-COGNITIVE-RUNTIME-1.0',
  version: api.info?.version ?? null,
  versionSource: 'external-manifest',
}));