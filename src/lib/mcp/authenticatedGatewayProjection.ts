export const SFI_AUTHENTICATED_GATEWAY_PROJECTION_CONTRACT = 'SFI-AUTHENTICATED-GATEWAY-PROJECTION-1.0' as const;
export const SFI_AUTHENTICATED_GATEWAY_TOOL_NAME = 'invoke_sfi_gateway_operation' as const;

type HttpMethod = 'GET' | 'POST';
type JsonObject = Record<string, unknown>;

export type SfiAuthenticatedGatewayInvocation = {
  operationId: string;
  body?: JsonObject;
  query?: Record<string, string | number | boolean | null | undefined>;
  pathParams?: Record<string, string>;
};

type GatewayOperationDefinition = {
  operationId: string;
  method: HttpMethod;
  path: string;
  scope: string | ((input: SfiAuthenticatedGatewayInvocation) => string);
  summary: string;
};

function bodyOperation(input: SfiAuthenticatedGatewayInvocation) {
  const value = input.body?.operation;
  return typeof value === 'string' ? value.trim() : '';
}

function labScope(input: SfiAuthenticatedGatewayInvocation) {
  const operation = bodyOperation(input);
  if (operation === 'state' || operation === 'report') return 'lab:read';
  if (operation === 'persist') return 'lab:write';
  if (operation === 'run') return 'lab:run';
  return 'lab:read';
}

function caseScope(input: SfiAuthenticatedGatewayInvocation) {
  const operation = bodyOperation(input);
  if (['list', 'read', 'reports', 'intake_plan'].includes(operation)) return 'cases:read';
  if (['create', 'add_source', 'add_object', 'transition'].includes(operation)) return 'cases:write';
  return 'cases:read';
}

const DEFINITIONS = [
  { operationId: 'readSfiConsole', method: 'GET', path: '/api/external/v1/console', scope: 'observe', summary: 'Read the compact governed SFI machine console.' },
  { operationId: 'getSfiExecutionContract', method: 'POST', path: '/api/external/v1/execution-contract', scope: 'observe', summary: 'Get the SFI measurement contract for one declared object.' },
  { operationId: 'persistSfiStructuredResult', method: 'POST', path: '/api/external/v1/result', scope: 'lab:write', summary: 'Persist a sanitized structured derived result through the canonical gateway.' },
  { operationId: 'readSfiOpenCycles', method: 'GET', path: '/api/external/v1/signal', scope: 'observe', summary: 'Read universal open cycles or one cycle history.' },
  { operationId: 'processSfiSignal', method: 'POST', path: '/api/external/v1/signal', scope: 'lab:write', summary: 'Run or advance one governed signal cycle.' },
  { operationId: 'observeSfi', method: 'POST', path: '/api/external/v1/observe', scope: 'observe', summary: 'Read one allowlisted governed SFI state surface.' },
  { operationId: 'proposeSfiAction', method: 'POST', path: '/api/external/v1/propose', scope: 'propose', summary: 'Submit a governed institutional action proposal.' },
  { operationId: 'proposeSfiEvidenceCandidate', method: 'POST', path: '/api/external/v1/evidence-candidates', scope: 'propose', summary: 'Register a traceable working source candidate.' },
  { operationId: 'executeAuthorizedSfiAction', method: 'POST', path: '/api/external/v1/execute', scope: 'execute', summary: 'Dispatch an already-authorized queued proposal.' },
  { operationId: 'recordSfiProposalReturn', method: 'POST', path: '/api/external/v1/proposal-return', scope: 'execute', summary: 'Record an observed return for an already-queued proposal.' },
  { operationId: 'operateSfiLab', method: 'POST', path: '/api/external/v1/lab', scope: labScope, summary: 'Read, persist or run institutional Method Lab according to operation scope.' },
  { operationId: 'operateSfiCaseWorkspace', method: 'POST', path: '/api/external/v1/cases', scope: caseScope, summary: 'Operate the tenant-scoped Case Platform through its canonical adapter.' },
  { operationId: 'planSfiCaseIntake', method: 'POST', path: '/api/external/v1/cases/intake', scope: 'cases:read', summary: 'Resolve required Case Platform intake before creation.' },
  { operationId: 'createSfiCaseFromResolvedIntake', method: 'POST', path: '/api/external/v1/cases/create', scope: 'cases:write', summary: 'Create a case from resolved intake.' },
  { operationId: 'addSfiCaseObjectJson', method: 'POST', path: '/api/external/v1/cases/object', scope: 'cases:write', summary: 'Persist one bounded Case object.' },
  { operationId: 'readSfiCase', method: 'POST', path: '/api/external/v1/cases/read', scope: 'cases:read', summary: 'Read one tenant-scoped case.' },
  { operationId: 'transitionSfiCaseV2', method: 'POST', path: '/api/external/v1/cases/transition', scope: 'cases:write', summary: 'Apply one bounded non-intervention case transition.' },
  { operationId: 'readSfiCognitiveRuntimeExecutions', method: 'GET', path: '/api/external/v1/cognitive-runtime', scope: 'observe', summary: 'Read cognitive runtime contracts and execution history.' },
  { operationId: 'getSfiCognitiveBootstrap', method: 'GET', path: '/api/external/v1/bootstrap', scope: 'observe', summary: 'Hydrate the governed cognitive bootstrap.' },
  { operationId: 'decideSfiGovernanceProposal', method: 'POST', path: '/api/external/v1/governance/proposals/{proposalId}/decision', scope: 'governance:decide', summary: 'Accept or deny one proposal through the existing sovereign ROOT decision route.' },
] as const satisfies readonly GatewayOperationDefinition[];

const BY_OPERATION = new Map<string, GatewayOperationDefinition>(
  DEFINITIONS.map((definition) => [definition.operationId, definition]),
);

export const SFI_AUTHENTICATED_GATEWAY_OPERATION_IDS = Object.freeze(
  DEFINITIONS.map((definition) => definition.operationId),
);

export const SFI_AUTHENTICATED_GATEWAY_TOOL = Object.freeze({
  name: SFI_AUTHENTICATED_GATEWAY_TOOL_NAME,
  description: 'Invoke one allowlisted canonical SFI External Agent Gateway operation using the same user-bound OAuth credential. The MCP adapter adds no authority, cannot call arbitrary URLs, and reuses the gateway route so scope, tenant, ROOT, queue, evidence and RETURN boundaries remain authoritative.',
  inputSchema: {
    type: 'object',
    properties: {
      operationId: {
        type: 'string',
        enum: SFI_AUTHENTICATED_GATEWAY_OPERATION_IDS,
        description: 'Canonical allowlisted SFI gateway operation id.',
      },
      body: {
        type: 'object',
        description: 'JSON request body for POST operations. Use the canonical gateway/OpenAPI contract for this operation.',
        additionalProperties: true,
      },
      query: {
        type: 'object',
        description: 'Optional query parameters for GET operations.',
        additionalProperties: { type: ['string', 'number', 'boolean', 'null'] },
      },
      pathParams: {
        type: 'object',
        description: 'Required only for dynamic allowlisted routes such as decideSfiGovernanceProposal ({ proposalId }).',
        additionalProperties: { type: 'string' },
      },
    },
    required: ['operationId'],
    additionalProperties: false,
  },
} as const);

export function authenticatedGatewayOperationDefinition(operationId: string) {
  return BY_OPERATION.get(operationId) ?? null;
}

export function requiredScopeForAuthenticatedGatewayInvocation(input: SfiAuthenticatedGatewayInvocation) {
  const definition = authenticatedGatewayOperationDefinition(input.operationId);
  if (!definition) return null;
  return typeof definition.scope === 'function' ? definition.scope(input) : definition.scope;
}

function interpolatePath(path: string, input: SfiAuthenticatedGatewayInvocation) {
  return path.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = input.pathParams?.[key]?.trim();
    if (!value) throw new Error(`SFI_GATEWAY_PATH_PARAM_REQUIRED:${key}`);
    return encodeURIComponent(value);
  });
}

export function buildAuthenticatedGatewayRequest(input: SfiAuthenticatedGatewayInvocation) {
  const definition = authenticatedGatewayOperationDefinition(input.operationId);
  if (!definition) throw new Error('SFI_GATEWAY_OPERATION_NOT_ALLOWED');
  const scope = requiredScopeForAuthenticatedGatewayInvocation(input);
  if (!scope) throw new Error('SFI_GATEWAY_SCOPE_UNRESOLVED');
  return {
    operationId: definition.operationId,
    method: definition.method,
    path: interpolatePath(definition.path, input),
    scope,
    body: input.body ?? {},
    query: input.query ?? {},
    summary: definition.summary,
  };
}
