import { createHash } from 'node:crypto';

import {
  cognitivePassportForCapability,
  type SfiCapabilityHistoryEntry,
  type SfiCapabilityRequest,
} from '../sfi/cognitive-runtime/capabilityBroker';
import {
  SFI_CAPABILITY_GRANT_CONTRACT,
  effectiveCapabilityGrantState,
  validatePublicCapabilityGrantShape,
  type SfiPublicCapabilityGrant,
} from '../sfi/cognitive-runtime/capabilityGrant';
import type { SfiAuthorityClass } from '../sfi/cognitive-runtime/cognitivePassportRegistry';

export const SFI_AUTHENTICATED_MACHINE_ADAPTER_CONTRACT = 'SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.0' as const;
export const SFI_AUTHENTICATED_MACHINE_SERVER_ID = 'org.systemfriction/authenticated' as const;
export const SFI_AUTHENTICATED_MACHINE_SERVER_VERSION = '1.0.0' as const;
export const SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION = '2026-07-28' as const;
export const SFI_AUTHENTICATED_MACHINE_ENDPOINT = '/api/mcp/authenticated' as const;
export const SFI_AUTHENTICATED_MACHINE_GATE = 'SFI-AUTHENTICATED-GOVERNED-MACHINE-1.0' as const;

export const SFI_MACHINE_AUTHORIZATION_RESERVED = 'SFI_MACHINE_AUTHORIZATION_RESERVED' as const;
export const SFI_MACHINE_AUTHORIZATION_DENIED = 'SFI_MACHINE_AUTHORIZATION_DENIED' as const;
export const SFI_MACHINE_EXECUTION_OBSERVED = 'SFI_MACHINE_EXECUTION_OBSERVED' as const;

const INVOKE_CAPABILITY_ACTION = 'INVOKE_CAPABILITY' as const;
const REQUIRED_EXECUTION_SCOPE = 'execute' as const;
const AUTHORITY_ORDER: Record<SfiAuthorityClass, number> = {
  READ: 0,
  RECOMMEND: 1,
  WRITE_INTERNAL: 2,
  EXECUTE_REVERSIBLE: 3,
  EXECUTE_EXTERNAL: 4,
  IRREVERSIBLE: 5,
  CANON: 6,
};
const SENSITIVITY_ORDER: Record<string, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  RESTRICTED: 2,
  CONFIDENTIAL: 3,
  SECRET: 4,
};
const FORBIDDEN_SECRET_KEY = /^(?:nonce|rawNonce|serviceRole|service_role|clientSecret|client_secret|accessToken|access_token|bearerToken|bearer_token|apiKey|api_key|privateKey|private_key)$/i;

type JsonObject = Record<string, unknown>;
type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: JsonObject;
};

export type SfiAuthenticatedMachinePrincipal = Readonly<{
  subjectId: string;
  actorId: string;
  clientId: string;
  tenantId: string;
  scopes: string[];
  authMethod: 'oauth';
}>;

export type SfiAuthenticatedMachineEventInput = {
  eventId?: string;
  eventName: string;
  epistemicClass: 'derived' | 'observed';
  confidence: number;
  occurredAt: string;
  source: { sourceId: string; sourceType: string };
  logbookId: string;
  lineage: string[];
  payload: JsonObject;
};

export type SfiAuthenticatedMachineDependencies = {
  readHistory: () => Promise<SfiCapabilityHistoryEntry[]>;
  appendEvent: (event: SfiAuthenticatedMachineEventInput) => Promise<
    | { ok: true; eventId: string }
    | { ok: false; error: string }
  >;
  executeCognitive: (
    execution: JsonObject,
    principal: SfiAuthenticatedMachinePrincipal,
  ) => Promise<{ status: number; body: JsonObject }>;
  now: () => Date;
};

type MachineAuthorization = {
  grantId: string;
  principal: string;
  client: string;
  scope: string;
  resource: string;
  action: typeof INVOKE_CAPABILITY_ACTION;
  capabilityId: string;
  trajectoryId: string;
  stepId: string;
  confirmation: boolean;
  returnExpectation: 'PASSPORT';
};

type ValidatedAuthorization = {
  authorization: MachineAuthorization;
  grant: SfiPublicCapabilityGrant;
  request: SfiCapabilityRequest;
  admissionEventId: string;
  requestEventId: string;
  parentGrant: SfiPublicCapabilityGrant | null;
  returnContract: {
    required: boolean;
    condition: string | null;
    falsificationCondition: string | null;
  };
};

const AUTHORIZATION_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    grantId: { type: 'string', minLength: 1 },
    principal: { type: 'string', minLength: 1, description: 'OAuth subject id copied from the authenticated principal.' },
    client: { type: 'string', minLength: 1, description: 'OAuth client id bound into the access token.' },
    scope: { type: 'string', const: REQUIRED_EXECUTION_SCOPE },
    resource: { type: 'string', minLength: 1 },
    action: { type: 'string', const: INVOKE_CAPABILITY_ACTION },
    capabilityId: { type: 'string', minLength: 1 },
    trajectoryId: { type: 'string', minLength: 1 },
    stepId: { type: 'string', minLength: 1 },
    confirmation: { type: 'boolean' },
    returnExpectation: { type: 'string', const: 'PASSPORT' },
  },
  required: [
    'grantId',
    'principal',
    'client',
    'scope',
    'resource',
    'action',
    'capabilityId',
    'trajectoryId',
    'stepId',
    'confirmation',
    'returnExpectation',
  ],
  additionalProperties: false,
} as const);

export const SFI_AUTHENTICATED_MACHINE_TOOLS = Object.freeze([
  {
    name: 'invoke_cognitive_capability',
    description: 'Invoke one existing canonical cognitive execution contract through the existing governed runtime. OAuth execute scope and an ACTIVE SFI-CAPABILITY-GRANT-1.0 are both required; neither model capability nor Broker admission alone authorizes execution.',
    inputSchema: {
      type: 'object',
      properties: {
        authorization: AUTHORIZATION_SCHEMA,
        execution: {
          type: 'object',
          description: 'Canonical SFI manual cognitive execution request. agentId must equal authorization.capabilityId.',
          properties: {
            agentId: { type: 'string', minLength: 1 },
            purpose: { type: 'string', minLength: 1 },
            anchors: { type: 'array' },
            targets: { type: 'array' },
          },
          required: ['agentId', 'purpose', 'anchors', 'targets'],
          additionalProperties: true,
        },
      },
      required: ['authorization', 'execution'],
      additionalProperties: false,
    },
  },
] as const);

export const SFI_AUTHENTICATED_MACHINE_RESOURCES = Object.freeze([
  {
    uri: 'sfi://authenticated-machine/status',
    name: 'SFI authenticated governed machine adapter status',
    mimeType: 'application/json',
    description: 'Contract and authority boundary only. It exposes no grants, private state, credentials, ROOT data, or canonical promotion surface.',
  },
] as const);

function row(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].sort();
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function authority(value: unknown): SfiAuthorityClass | null {
  return typeof value === 'string' && value in AUTHORITY_ORDER ? value as SfiAuthorityClass : null;
}

function authorityAtOrBelow(actual: SfiAuthorityClass, ceiling: SfiAuthorityClass) {
  return AUTHORITY_ORDER[actual] <= AUTHORITY_ORDER[ceiling];
}

function sensitivityAtLeast(actual: string, floor: string) {
  const actualRank = SENSITIVITY_ORDER[actual.toUpperCase()];
  const floorRank = SENSITIVITY_ORDER[floor.toUpperCase()];
  if (actualRank === undefined || floorRank === undefined) return actual === floor;
  return actualRank >= floorRank;
}

function hasForbiddenSecretKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenSecretKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as JsonObject).some(([key, nested]) => FORBIDDEN_SECRET_KEY.test(key) || hasForbiddenSecretKey(nested));
}

function publicGrant(value: unknown): SfiPublicCapabilityGrant | null {
  const candidate = row(value);
  const authorityCeiling = authority(candidate.authorityCeiling);
  const state = candidate.state === 'ACTIVE' || candidate.state === 'REVOKED' || candidate.state === 'EXPIRED'
    ? candidate.state
    : null;
  const parentGrantId = candidate.parentGrantId === null ? null : text(candidate.parentGrantId);
  const confirmationRequired = bool(candidate.confirmationRequired);
  if (
    !authorityCeiling
    || !state
    || confirmationRequired === null
    || (candidate.parentGrantId !== null && !parentGrantId)
  ) return null;

  const grant: SfiPublicCapabilityGrant = {
    grantId: text(candidate.grantId),
    principal: text(candidate.principal),
    trajectoryId: text(candidate.trajectoryId),
    stepId: text(candidate.stepId),
    capabilityId: text(candidate.capabilityId),
    resource: text(candidate.resource),
    allowedActions: strings(candidate.allowedActions),
    authorityCeiling,
    issuedAt: text(candidate.issuedAt),
    expiresAt: text(candidate.expiresAt),
    confirmationRequired,
    sensitivity: text(candidate.sensitivity),
    parentGrantId,
    state,
  };
  return validatePublicCapabilityGrantShape(grant).length === 0 ? grant : null;
}

function capabilityRequest(value: unknown): SfiCapabilityRequest | null {
  const candidate = row(value);
  const urgency = candidate.urgency === 'LOW' || candidate.urgency === 'NORMAL' || candidate.urgency === 'HIGH' || candidate.urgency === 'BLOCKING'
    ? candidate.urgency
    : null;
  const parentStepId = candidate.parentStepId === null ? null : text(candidate.parentStepId);
  if (!urgency || (candidate.parentStepId !== null && !parentStepId)) return null;
  const request: SfiCapabilityRequest = {
    requestId: text(candidate.requestId),
    trajectoryId: text(candidate.trajectoryId),
    parentStepId,
    requestedByCapabilityId: text(candidate.requestedByCapabilityId),
    requestedCapabilityId: text(candidate.requestedCapabilityId),
    reason: text(candidate.reason),
    requiredInputs: strings(candidate.requiredInputs),
    availableEvidenceRefs: strings(candidate.availableEvidenceRefs),
    requestedOutputs: strings(candidate.requestedOutputs),
    urgency,
    requestedAt: text(candidate.requestedAt),
  };
  if (
    !request.requestId
    || !request.trajectoryId
    || !request.requestedByCapabilityId
    || !request.requestedCapabilityId
    || !request.reason
    || !Number.isFinite(new Date(request.requestedAt).getTime())
  ) return null;
  return request;
}

function eventPayload(entry: SfiCapabilityHistoryEntry) {
  return row(entry.payload);
}

function eventGrant(entry: SfiCapabilityHistoryEntry) {
  return publicGrant(eventPayload(entry).grant);
}

function eventCarriesGrantId(entry: SfiCapabilityHistoryEntry, grantId: string) {
  const payload = eventPayload(entry);
  const grant = row(payload.grant);
  const metadata = row(payload.metadata);
  const refs = row(metadata.refs);
  const capabilityGrant = row(refs.capabilityGrant);
  return text(payload.grantId) === grantId
    || text(grant.grantId) === grantId
    || text(capabilityGrant.grantId) === grantId;
}

function grantAdmission(history: SfiCapabilityHistoryEntry[], grantId: string) {
  return [...history].reverse().find((entry) => entry.eventName === 'SFI_CAPABILITY_ADMITTED' && eventGrant(entry)?.grantId === grantId) ?? null;
}

function requestForAdmission(history: SfiCapabilityHistoryEntry[], admission: SfiCapabilityHistoryEntry) {
  const admissionPayload = eventPayload(admission);
  const requestId = text(admissionPayload.requestId);
  const requestHash = text(admissionPayload.requestHash);
  const event = [...history].reverse().find((entry) => {
    if (entry.eventName !== 'SFI_CAPABILITY_REQUESTED') return false;
    const payload = eventPayload(entry);
    const request = capabilityRequest(payload.request);
    return request?.requestId === requestId && text(payload.requestHash) === requestHash;
  }) ?? null;
  const request = event ? capabilityRequest(eventPayload(event).request) : null;
  return { event, request };
}

function parentBoundaryReasons(
  child: SfiPublicCapabilityGrant,
  request: SfiCapabilityRequest,
  parent: SfiPublicCapabilityGrant,
  history: SfiCapabilityHistoryEntry[],
  now: Date,
) {
  const reasons: string[] = [];
  const parentState = effectiveCapabilityGrantState(parent, now, history);
  if (parentState !== 'ACTIVE') reasons.push(`PARENT_GRANT_NOT_ACTIVE:${parentState}`);
  if (parent.principal !== request.requestedByCapabilityId || parent.capabilityId !== request.requestedByCapabilityId) reasons.push('PARENT_GRANT_PRINCIPAL_MISMATCH');
  if (!parent.allowedActions.includes('REQUEST_CHILD_CAPABILITY')) reasons.push('PARENT_CHILD_REQUEST_NOT_ALLOWED');
  if (child.parentGrantId !== parent.grantId) reasons.push('PARENT_GRANT_LINEAGE_MISMATCH');
  if (child.trajectoryId !== parent.trajectoryId) reasons.push('CHILD_TRAJECTORY_EXPANSION');
  if (child.resource !== parent.resource) reasons.push('CHILD_RESOURCE_EXPANSION');
  if (!child.allowedActions.every((action) => parent.allowedActions.includes(action))) reasons.push('CHILD_ACTION_EXPANSION');
  if (!authorityAtOrBelow(child.authorityCeiling, parent.authorityCeiling)) reasons.push('CHILD_AUTHORITY_EXPANSION');
  if (new Date(child.expiresAt).getTime() > new Date(parent.expiresAt).getTime()) reasons.push('CHILD_EXPIRY_EXPANSION');
  if (parent.confirmationRequired && !child.confirmationRequired) reasons.push('CHILD_CONFIRMATION_WEAKENED');
  if (!sensitivityAtLeast(child.sensitivity, parent.sensitivity)) reasons.push('CHILD_SENSITIVITY_WEAKENED');
  return reasons;
}

function replayDetected(history: SfiCapabilityHistoryEntry[], grantId: string) {
  const terminalEvents = new Set([
    SFI_MACHINE_AUTHORIZATION_RESERVED,
    SFI_MACHINE_EXECUTION_OBSERVED,
    'SFI_AGENT_EXECUTED',
    'SFI_AGENT_SKIPPED',
  ]);
  return history.some((entry) => terminalEvents.has(entry.eventName) && eventCarriesGrantId(entry, grantId));
}

function machineAuthorization(value: unknown): MachineAuthorization | null {
  const candidate = row(value);
  const confirmation = bool(candidate.confirmation);
  if (confirmation === null) return null;
  if (candidate.action !== INVOKE_CAPABILITY_ACTION || candidate.returnExpectation !== 'PASSPORT') return null;
  return {
    grantId: text(candidate.grantId),
    principal: text(candidate.principal),
    client: text(candidate.client),
    scope: text(candidate.scope),
    resource: text(candidate.resource),
    action: INVOKE_CAPABILITY_ACTION,
    capabilityId: text(candidate.capabilityId),
    trajectoryId: text(candidate.trajectoryId),
    stepId: text(candidate.stepId),
    confirmation,
    returnExpectation: 'PASSPORT',
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function validateAuthorization(
  authorizationValue: unknown,
  execution: JsonObject,
  principal: SfiAuthenticatedMachinePrincipal,
  history: SfiCapabilityHistoryEntry[],
  now: Date,
): { ok: true; value: ValidatedAuthorization } | { ok: false; reasons: string[]; grantId: string | null } {
  const authorization = machineAuthorization(authorizationValue);
  const candidate = row(authorizationValue);
  const grantId = authorization?.grantId || text(candidate.grantId) || null;
  const reasons: string[] = [];

  if (!authorization) return { ok: false, reasons: ['AUTHORIZATION_ENVELOPE_INVALID'], grantId };
  if (!authorization.grantId) reasons.push('GRANT_ID_REQUIRED');
  if (authorization.principal !== principal.subjectId) reasons.push('OAUTH_PRINCIPAL_MISMATCH');
  if (authorization.client !== principal.clientId) reasons.push('OAUTH_CLIENT_MISMATCH');
  if (authorization.scope !== REQUIRED_EXECUTION_SCOPE || !principal.scopes.includes(REQUIRED_EXECUTION_SCOPE)) reasons.push('OAUTH_SCOPE_MISMATCH');
  if (principal.tenantId !== 'sfi') reasons.push('INSTITUTIONAL_TENANT_REQUIRED');
  if (hasForbiddenSecretKey({ authorization: authorizationValue, execution })) reasons.push('SECRET_OR_RAW_NONCE_IN_MACHINE_PAYLOAD');

  const admission = authorization.grantId ? grantAdmission(history, authorization.grantId) : null;
  const grant = admission ? eventGrant(admission) : null;
  if (!admission || !grant) reasons.push('ACTIVE_CAPABILITY_GRANT_REQUIRED');
  if (!admission || !grant) return { ok: false, reasons: unique(reasons), grantId };

  const admissionPayload = eventPayload(admission);
  if (admissionPayload.disposition !== 'ADMIT' || admissionPayload.executionAllowed !== true) reasons.push('BROKER_ADMIT_REQUIRED');
  if (admissionPayload.authorizationAllowedAtIssue !== true) reasons.push('GRANT_NOT_AUTHORIZED_AT_ISSUE');
  if (admissionPayload.grantContract !== SFI_CAPABILITY_GRANT_CONTRACT) reasons.push('GRANT_CONTRACT_MISMATCH');
  if (text(admissionPayload.requestedCapabilityId) !== grant.capabilityId) reasons.push('BROKER_CAPABILITY_MISMATCH');

  const requestLineage = requestForAdmission(history, admission);
  if (!requestLineage.event || !requestLineage.request) reasons.push('CAPABILITY_REQUEST_LINEAGE_REQUIRED');
  if (!requestLineage.event || !requestLineage.request) return { ok: false, reasons: unique(reasons), grantId };
  const request = requestLineage.request;

  if (grant.principal !== grant.capabilityId) reasons.push('GRANT_CAPABILITY_PRINCIPAL_MISMATCH');
  if (grant.capabilityId !== authorization.capabilityId) reasons.push('GRANT_CAPABILITY_MISMATCH');
  if (text(execution.agentId) !== authorization.capabilityId) reasons.push('EXECUTION_CAPABILITY_MISMATCH');
  if (grant.trajectoryId !== authorization.trajectoryId || request.trajectoryId !== authorization.trajectoryId) reasons.push('GRANT_TRAJECTORY_MISMATCH');
  if (grant.stepId !== authorization.stepId || (request.parentStepId && request.parentStepId !== authorization.stepId)) reasons.push('GRANT_STEP_MISMATCH');
  if (grant.resource !== authorization.resource) reasons.push('GRANT_RESOURCE_MISMATCH');
  if (!grant.allowedActions.includes(authorization.action)) reasons.push('GRANT_ACTION_NOT_ALLOWED');

  const effectiveState = effectiveCapabilityGrantState(grant, now, history);
  if (effectiveState !== 'ACTIVE') reasons.push(`GRANT_NOT_ACTIVE:${effectiveState}`);
  if (replayDetected(history, grant.grantId)) reasons.push('GRANT_REPLAY_DETECTED');
  if (grant.confirmationRequired && authorization.confirmation !== true) reasons.push('UNSATISFIED_GRANT_CONFIRMATION');

  const requesterPassport = cognitivePassportForCapability(request.requestedByCapabilityId);
  const requestedPassport = cognitivePassportForCapability(request.requestedCapabilityId);
  if (!requesterPassport || !requestedPassport) reasons.push('COGNITIVE_PASSPORT_UNAVAILABLE');
  if (requesterPassport && !authorityAtOrBelow(grant.authorityCeiling, requesterPassport.authority.ceiling)) reasons.push('GRANT_EXCEEDS_REQUESTER_PASSPORT_AUTHORITY');
  if (requestedPassport && !authorityAtOrBelow(grant.authorityCeiling, requestedPassport.authority.ceiling)) reasons.push('GRANT_EXCEEDS_REQUESTED_PASSPORT_AUTHORITY');

  let parentGrant: SfiPublicCapabilityGrant | null = null;
  if (grant.parentGrantId) {
    const parentAdmission = grantAdmission(history, grant.parentGrantId);
    parentGrant = parentAdmission ? eventGrant(parentAdmission) : null;
    if (!parentGrant) reasons.push('PARENT_GRANT_LINEAGE_REQUIRED');
    else reasons.push(...parentBoundaryReasons(grant, request, parentGrant, history, now));
  }

  if (reasons.length > 0 || !requestedPassport) return { ok: false, reasons: unique(reasons), grantId };
  return {
    ok: true,
    value: {
      authorization,
      grant,
      request,
      admissionEventId: admission.eventId ?? '',
      requestEventId: requestLineage.event.eventId ?? '',
      parentGrant,
      returnContract: requestedPassport.return,
    },
  };
}

function requestId(value: unknown): JsonRpcId {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = (value as JsonObject).id;
  return typeof id === 'string' || typeof id === 'number' || id === null ? id : null;
}

function isRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as JsonObject;
  return candidate.jsonrpc === '2.0' && typeof candidate.method === 'string';
}

function response(id: JsonRpcId, result: unknown) {
  return { jsonrpc: '2.0' as const, id, result };
}

function error(id: JsonRpcId, code: number, message: string, data: JsonObject) {
  return { jsonrpc: '2.0' as const, id, error: { code, message, data } };
}

function adapterStatus() {
  return {
    contract: SFI_AUTHENTICATED_MACHINE_ADAPTER_CONTRACT,
    gate: SFI_AUTHENTICATED_MACHINE_GATE,
    serverId: SFI_AUTHENTICATED_MACHINE_SERVER_ID,
    serverVersion: SFI_AUTHENTICATED_MACHINE_SERVER_VERSION,
    protocolVersion: SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION,
    endpoint: SFI_AUTHENTICATED_MACHINE_ENDPOINT,
    oauth: {
      required: true,
      clientBindingRequired: true,
      requiredExecutionScope: REQUIRED_EXECUTION_SCOPE,
      staticTokenExecutionAllowed: false,
    },
    grant: {
      contract: SFI_CAPABILITY_GRANT_CONTRACT,
      activeRequired: true,
      rawNonceAccepted: false,
      replayAllowed: false,
      authorityExpansionAllowed: false,
      parentExpansionAllowed: false,
    },
    execution: {
      plane: 'EXISTING_CANONICAL_COGNITIVE_RUNTIME',
      availableTools: SFI_AUTHENTICATED_MACHINE_TOOLS.map((tool) => tool.name),
      externalSideEffects: false,
      canonicalPromotion: false,
      returnFabrication: false,
    },
    publicBoundary: {
      publicMcpServerSeparate: true,
      privateStatePublicByInheritance: false,
      externalRepresentationIsCanon: false,
    },
  };
}

function safeAuthorizationProjection(
  authorization: MachineAuthorization,
  grant: SfiPublicCapabilityGrant | null,
) {
  return {
    principal: authorization.principal,
    client: authorization.client,
    scope: authorization.scope,
    grantId: authorization.grantId,
    capabilityId: authorization.capabilityId,
    resource: authorization.resource,
    action: authorization.action,
    trajectoryId: authorization.trajectoryId,
    stepId: authorization.stepId,
    authorityCeiling: grant?.authorityCeiling ?? null,
    expiresAt: grant?.expiresAt ?? null,
    parentGrantId: grant?.parentGrantId ?? null,
    confirmationSatisfied: authorization.confirmation,
  };
}

function reservationEventId(grantId: string) {
  const digest = createHash('sha256').update(`${SFI_AUTHENTICATED_MACHINE_ADAPTER_CONTRACT}:${grantId}`).digest('hex');
  return `sfi-machine-grant-use-${digest.slice(0, 40)}`;
}

async function persistDenial(
  deps: SfiAuthenticatedMachineDependencies,
  principal: SfiAuthenticatedMachinePrincipal,
  authorizationValue: unknown,
  reasons: string[],
  grantId: string | null,
) {
  const authorization = machineAuthorization(authorizationValue);
  return deps.appendEvent({
    eventName: SFI_MACHINE_AUTHORIZATION_DENIED,
    epistemicClass: 'derived',
    confidence: 1,
    occurredAt: deps.now().toISOString(),
    source: { sourceId: principal.actorId, sourceType: 'authenticated_machine_adapter' },
    logbookId: 'BR',
    lineage: [grantId].filter((value): value is string => Boolean(value)),
    payload: {
      contract: SFI_AUTHENTICATED_MACHINE_ADAPTER_CONTRACT,
      decision: 'DENY',
      reasons,
      principal: principal.subjectId,
      client: principal.clientId,
      scope: authorization?.scope ?? null,
      grantId,
      capabilityId: authorization?.capabilityId ?? null,
      resource: authorization?.resource ?? null,
      action: authorization?.action ?? null,
      authorityExpanded: false,
      canonicalPromotionAllowed: false,
      rawNoncePersisted: false,
    },
  });
}

export async function dispatchAuthenticatedMachineRequest(
  payload: unknown,
  principal: SfiAuthenticatedMachinePrincipal,
  deps: SfiAuthenticatedMachineDependencies,
): Promise<{ status: number; body: JsonObject }> {
  const id = requestId(payload);
  if (!isRequest(payload)) return { status: 400, body: error(id, -32600, 'Invalid Request', { reason: 'INVALID_JSON_RPC_REQUEST' }) };

  if (payload.method === 'initialize') {
    return {
      status: 200,
      body: response(id, {
        protocolVersion: SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION,
        serverInfo: { name: SFI_AUTHENTICATED_MACHINE_SERVER_ID, version: SFI_AUTHENTICATED_MACHINE_SERVER_VERSION },
        capabilities: { tools: {}, resources: {} },
        authority: adapterStatus(),
      }),
    };
  }
  if (payload.method === 'tools/list') {
    return { status: 200, body: response(id, { tools: SFI_AUTHENTICATED_MACHINE_TOOLS }) };
  }
  if (payload.method === 'resources/list') {
    return { status: 200, body: response(id, { resources: SFI_AUTHENTICATED_MACHINE_RESOURCES }) };
  }
  if (payload.method === 'resources/read') {
    const uri = text(row(payload.params).uri);
    if (uri !== 'sfi://authenticated-machine/status') return { status: 404, body: error(id, -32004, 'ResourceNotFound', { uri }) };
    return {
      status: 200,
      body: response(id, {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(adapterStatus()) }],
      }),
    };
  }
  if (payload.method !== 'tools/call') return { status: 404, body: error(id, -32601, 'Method not found', { method: payload.method }) };

  const params = row(payload.params);
  const name = text(params.name);
  const args = row(params.arguments);
  if (name !== 'invoke_cognitive_capability') return { status: 404, body: error(id, -32602, 'Unknown tool', { name }) };
  const authorizationValue = args.authorization;
  const execution = row(args.execution);
  const history = await deps.readHistory();
  const validation = validateAuthorization(authorizationValue, execution, principal, history, deps.now());

  if (!validation.ok) {
    const receipt = await persistDenial(deps, principal, authorizationValue, validation.reasons, validation.grantId);
    if (!receipt.ok) {
      return {
        status: 503,
        body: error(id, -32053, 'AuthorizationReceiptPersistenceFailed', {
          reasons: [...validation.reasons, 'LINEAGE_RECEIPT_PERSISTENCE_FAILED'],
          authorizationAllowed: false,
        }),
      };
    }
    const replay = validation.reasons.includes('GRANT_REPLAY_DETECTED');
    return {
      status: replay ? 409 : 403,
      body: error(id, replay ? -32049 : -32043, replay ? 'GrantReplayDenied' : 'AuthorizationDenied', {
        reasons: validation.reasons,
        authorizationAllowed: false,
        receiptEventId: receipt.eventId,
      }),
    };
  }

  const authorized = validation.value;
  const reservation = await deps.appendEvent({
    eventId: reservationEventId(authorized.grant.grantId),
    eventName: SFI_MACHINE_AUTHORIZATION_RESERVED,
    epistemicClass: 'derived',
    confidence: 1,
    occurredAt: deps.now().toISOString(),
    source: { sourceId: principal.actorId, sourceType: 'authenticated_machine_adapter' },
    logbookId: 'BR',
    lineage: unique([
      authorized.grant.grantId,
      authorized.admissionEventId,
      authorized.requestEventId,
      authorized.parentGrant?.grantId ?? '',
    ]),
    payload: {
      contract: SFI_AUTHENTICATED_MACHINE_ADAPTER_CONTRACT,
      decision: 'AUTHORIZE_ONCE',
      grantContract: SFI_CAPABILITY_GRANT_CONTRACT,
      authorization: safeAuthorizationProjection(authorized.authorization, authorized.grant),
      brokerAdmissionEventId: authorized.admissionEventId,
      requestEventId: authorized.requestEventId,
      authorityExpanded: false,
      canonicalPromotionAllowed: false,
      rawNoncePersisted: false,
      returnExpectation: authorized.returnContract,
    },
  });

  if (!reservation.ok) {
    return {
      status: 409,
      body: error(id, -32049, 'GrantReservationFailedClosed', {
        reasons: ['GRANT_REPLAY_OR_RESERVATION_CONFLICT'],
        authorizationAllowed: false,
      }),
    };
  }

  const executionResult = await deps.executeCognitive(execution, principal);
  const executionBody = row(executionResult.body);
  const executionRow = row(executionBody.execution);
  const executed = executionResult.status >= 200 && executionResult.status < 300 && executionBody.ok === true && executionRow.executed !== false;

  const executionReceipt = await deps.appendEvent({
    eventName: SFI_MACHINE_EXECUTION_OBSERVED,
    epistemicClass: 'observed',
    confidence: 1,
    occurredAt: deps.now().toISOString(),
    source: { sourceId: principal.actorId, sourceType: 'authenticated_machine_adapter' },
    logbookId: 'BR',
    lineage: unique([
      authorized.grant.grantId,
      authorized.admissionEventId,
      authorized.requestEventId,
      reservation.eventId,
      text(executionRow.id),
    ]),
    payload: {
      contract: SFI_AUTHENTICATED_MACHINE_ADAPTER_CONTRACT,
      grantId: authorized.grant.grantId,
      reservationEventId: reservation.eventId,
      executionId: text(executionRow.id) || null,
      capabilityId: authorized.grant.capabilityId,
      resource: authorized.grant.resource,
      action: authorized.authorization.action,
      executed,
      underlyingStatus: executionResult.status,
      authorityCeiling: authorized.grant.authorityCeiling,
      externalSideEffectExecuted: false,
      canonicalPromotionAllowed: false,
      modelAuthorityExpansionAllowed: false,
      rawNoncePersisted: false,
      returnExpectation: authorized.returnContract,
      returnStatus: authorized.returnContract.required ? 'EXPECTED_NOT_FABRICATED' : 'NOT_REQUIRED_BY_PASSPORT',
    },
  });

  if (!executionReceipt.ok) {
    return {
      status: 503,
      body: error(id, -32053, 'ExecutionReceiptPersistenceFailed', {
        authorizationAllowed: true,
        executionOccurred: executed,
        reservationEventId: reservation.eventId,
        reasons: ['EXECUTION_RECEIPT_PERSISTENCE_FAILED'],
      }),
    };
  }

  return {
    status: executionResult.status,
    body: response(id, {
      content: [{ type: 'text', text: JSON.stringify(executionResult.body) }],
      structuredContent: {
        ...executionResult.body,
        machineAuthorization: {
          contract: SFI_AUTHENTICATED_MACHINE_ADAPTER_CONTRACT,
          grantContract: SFI_CAPABILITY_GRANT_CONTRACT,
          authorizationAllowed: true,
          grant: {
            ...safeAuthorizationProjection(authorized.authorization, authorized.grant),
            state: 'ACTIVE',
          },
          lineage: {
            requestEventId: authorized.requestEventId,
            admissionEventId: authorized.admissionEventId,
            reservationEventId: reservation.eventId,
            executionReceiptEventId: executionReceipt.eventId,
          },
          returnExpectation: authorized.returnContract,
          returnStatus: authorized.returnContract.required ? 'EXPECTED_NOT_FABRICATED' : 'NOT_REQUIRED_BY_PASSPORT',
          authorityExpansionAllowed: false,
          canonicalPromotionAllowed: false,
        },
      },
      isError: !executed,
    }),
  };
}
