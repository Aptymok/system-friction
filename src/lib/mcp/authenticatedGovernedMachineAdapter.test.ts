import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SFI_AUTHENTICATED_MACHINE_ADAPTER_CONTRACT,
  SFI_MACHINE_AUTHORIZATION_DENIED,
  SFI_MACHINE_AUTHORIZATION_RESERVED,
  SFI_MACHINE_EXECUTION_OBSERVED,
  dispatchAuthenticatedMachineRequest,
  type SfiAuthenticatedMachineDependencies,
  type SfiAuthenticatedMachineEventInput,
  type SfiAuthenticatedMachinePrincipal,
} from './authenticatedGovernedMachineAdapter';
import type { SfiCapabilityHistoryEntry, SfiCapabilityRequest } from '../sfi/cognitive-runtime/capabilityBroker';
import type { SfiPublicCapabilityGrant } from '../sfi/cognitive-runtime/capabilityGrant';

const NOW = new Date('2026-09-07T01:00:00.000Z');

function principal(overrides: Partial<SfiAuthenticatedMachinePrincipal> = {}): SfiAuthenticatedMachinePrincipal {
  return {
    subjectId: 'user-1',
    actorId: 'institutional:user-1',
    clientId: 'client-1',
    tenantId: 'sfi',
    scopes: ['observe', 'execute'],
    authMethod: 'oauth',
    ...overrides,
  };
}

function request(overrides: Partial<SfiCapabilityRequest> = {}): SfiCapabilityRequest {
  return {
    requestId: 'request-1',
    trajectoryId: 'trajectory-1',
    parentStepId: 'step-1',
    requestedByCapabilityId: 'meta_orchestrator',
    requestedCapabilityId: 'risk_agent',
    reason: 'Bounded governed risk analysis is required.',
    requiredInputs: [],
    availableEvidenceRefs: [],
    requestedOutputs: ['RECOMMENDATION'],
    urgency: 'NORMAL',
    requestedAt: NOW.toISOString(),
    ...overrides,
  };
}

function grant(overrides: Partial<SfiPublicCapabilityGrant> = {}): SfiPublicCapabilityGrant {
  return {
    grantId: 'grant-1',
    principal: 'risk_agent',
    trajectoryId: 'trajectory-1',
    stepId: 'step-1',
    capabilityId: 'risk_agent',
    resource: 'trajectory:trajectory-1',
    allowedActions: ['INVOKE_CAPABILITY', 'REQUEST_CHILD_CAPABILITY'],
    authorityCeiling: 'RECOMMEND',
    issuedAt: new Date(NOW.getTime() - 60_000).toISOString(),
    expiresAt: new Date(NOW.getTime() + 300_000).toISOString(),
    confirmationRequired: false,
    sensitivity: 'INTERNAL',
    parentGrantId: null,
    state: 'ACTIVE',
    ...overrides,
  };
}

function admissionHistory(options: {
  grant?: SfiPublicCapabilityGrant;
  request?: SfiCapabilityRequest;
  extra?: SfiCapabilityHistoryEntry[];
} = {}): SfiCapabilityHistoryEntry[] {
  const req = options.request ?? request();
  const issuedGrant = options.grant ?? grant();
  return [
    {
      eventId: 'request-event-1',
      eventName: 'SFI_CAPABILITY_REQUESTED',
      payload: {
        request: req,
        requestHash: 'request-hash-1',
        authorizationAllowed: false,
      },
    },
    {
      eventId: 'admission-event-1',
      eventName: 'SFI_CAPABILITY_ADMITTED',
      payload: {
        requestId: req.requestId,
        requestHash: 'request-hash-1',
        disposition: 'ADMIT',
        executionAllowed: true,
        authorizationAllowedAtIssue: true,
        requestedByCapabilityId: req.requestedByCapabilityId,
        requestedCapabilityId: req.requestedCapabilityId,
        grantContract: 'SFI-CAPABILITY-GRANT-1.0',
        grant: issuedGrant,
      },
    },
    ...(options.extra ?? []),
  ];
}

function call(overrides: Record<string, unknown> = {}) {
  const base = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'invoke_cognitive_capability',
      arguments: {
        authorization: {
          grantId: 'grant-1',
          principal: 'user-1',
          client: 'client-1',
          scope: 'execute',
          resource: 'trajectory:trajectory-1',
          action: 'INVOKE_CAPABILITY',
          capabilityId: 'risk_agent',
          trajectoryId: 'trajectory-1',
          stepId: 'step-1',
          confirmation: true,
          returnExpectation: 'PASSPORT',
        },
        execution: {
          agentId: 'risk_agent',
          purpose: 'Assess bounded risk.',
          anchors: [],
          targets: [],
        },
      },
    },
  };
  const params = base.params as Record<string, any>;
  const overrideParams = (overrides.params ?? {}) as Record<string, any>;
  const overrideArgs = (overrideParams.arguments ?? {}) as Record<string, any>;
  return {
    ...base,
    ...overrides,
    params: {
      ...params,
      ...overrideParams,
      arguments: {
        ...params.arguments,
        ...overrideArgs,
        authorization: {
          ...params.arguments.authorization,
          ...(overrideArgs.authorization ?? {}),
        },
        execution: {
          ...params.arguments.execution,
          ...(overrideArgs.execution ?? {}),
        },
      },
    },
  };
}

function harness(history: SfiCapabilityHistoryEntry[]) {
  const events: SfiAuthenticatedMachineEventInput[] = [];
  let executions = 0;
  const deps: SfiAuthenticatedMachineDependencies = {
    readHistory: async () => history,
    appendEvent: async (event) => {
      events.push(event);
      return { ok: true, eventId: event.eventId ?? `event-${events.length}` };
    },
    executeCognitive: async (execution) => {
      executions += 1;
      assert.equal(execution.agentId, 'risk_agent');
      assert.equal('authorization' in execution, false);
      return {
        status: 200,
        body: { ok: true, execution: { id: 'execution-1', executed: true } },
      };
    },
    now: () => NOW,
  };
  return { deps, events, executions: () => executions };
}

function errorReasons(body: Record<string, any>) {
  return (body.error?.data?.reasons ?? []) as string[];
}

test('ACTIVE grant + OAuth principal/client/scope binding executes once through injected canonical owner', async () => {
  const h = harness(admissionHistory());
  const result = await dispatchAuthenticatedMachineRequest(call(), principal(), h.deps);
  assert.equal(result.status, 200);
  assert.equal(h.executions(), 1);
  assert.deepEqual(h.events.map((event) => event.eventName), [SFI_MACHINE_AUTHORIZATION_RESERVED, SFI_MACHINE_EXECUTION_OBSERVED]);
  assert.equal(h.events[0]?.payload.rawNoncePersisted, false);
  assert.equal(h.events[1]?.payload.externalSideEffectExecuted, false);
  const machine = (result.body as any).result.structuredContent.machineAuthorization;
  assert.equal(machine.contract, SFI_AUTHENTICATED_MACHINE_ADAPTER_CONTRACT);
  assert.equal(machine.authorizationAllowed, true);
  assert.equal(machine.authorityExpansionAllowed, false);
});

test('missing grant fails closed and persists denial without executing', async () => {
  const h = harness([]);
  const result = await dispatchAuthenticatedMachineRequest(call(), principal(), h.deps);
  assert.equal(result.status, 403);
  assert.ok(errorReasons(result.body as any).includes('ACTIVE_CAPABILITY_GRANT_REQUIRED'));
  assert.equal(h.executions(), 0);
  assert.equal(h.events[0]?.eventName, SFI_MACHINE_AUTHORIZATION_DENIED);
});

test('OAuth principal, client, scope and institutional tenant are independently fail-closed', async () => {
  for (const [payload, boundPrincipal, reason] of [
    [call({ params: { arguments: { authorization: { principal: 'other-user' } } } }), principal(), 'OAUTH_PRINCIPAL_MISMATCH'],
    [call({ params: { arguments: { authorization: { client: 'other-client' } } } }), principal(), 'OAUTH_CLIENT_MISMATCH'],
    [call(), principal({ scopes: ['observe'] }), 'OAUTH_SCOPE_MISMATCH'],
    [call(), principal({ tenantId: 'user:user-1' }), 'INSTITUTIONAL_TENANT_REQUIRED'],
  ] as const) {
    const h = harness(admissionHistory());
    const result = await dispatchAuthenticatedMachineRequest(payload, boundPrincipal, h.deps);
    assert.equal(result.status, 403);
    assert.ok(errorReasons(result.body as any).includes(reason));
    assert.equal(h.executions(), 0);
  }
});

test('resource, capability, trajectory and step must match the canonical grant lineage', async () => {
  for (const [authorization, execution, reason] of [
    [{ resource: 'trajectory:other' }, {}, 'GRANT_RESOURCE_MISMATCH'],
    [{ capabilityId: 'context_builder' }, {}, 'GRANT_CAPABILITY_MISMATCH'],
    [{}, { agentId: 'context_builder' }, 'EXECUTION_CAPABILITY_MISMATCH'],
    [{ trajectoryId: 'other' }, {}, 'GRANT_TRAJECTORY_MISMATCH'],
    [{ stepId: 'other' }, {}, 'GRANT_STEP_MISMATCH'],
  ] as const) {
    const h = harness(admissionHistory());
    const result = await dispatchAuthenticatedMachineRequest(call({ params: { arguments: { authorization, execution } } }), principal(), h.deps);
    assert.equal(result.status, 403);
    assert.ok(errorReasons(result.body as any).includes(reason));
    assert.equal(h.executions(), 0);
  }
});

test('expired and revoked grants are not ACTIVE', async () => {
  const expired = grant({ expiresAt: NOW.toISOString() });
  const expiredHarness = harness(admissionHistory({ grant: expired }));
  const expiredResult = await dispatchAuthenticatedMachineRequest(call(), principal(), expiredHarness.deps);
  assert.ok(errorReasons(expiredResult.body as any).includes('GRANT_NOT_ACTIVE:EXPIRED'));
  assert.equal(expiredHarness.executions(), 0);

  const revokedHarness = harness(admissionHistory({ extra: [{
    eventId: 'revoked-1',
    eventName: 'SFI_CAPABILITY_GRANT_REVOKED',
    payload: { grantId: 'grant-1', state: 'REVOKED' },
  }] }));
  const revokedResult = await dispatchAuthenticatedMachineRequest(call(), principal(), revokedHarness.deps);
  assert.ok(errorReasons(revokedResult.body as any).includes('GRANT_NOT_ACTIVE:REVOKED'));
  assert.equal(revokedHarness.executions(), 0);
});

test('replay is rejected from existing execution or machine reservation lineage', async () => {
  for (const replayEvent of [
    { eventId: 'machine-reserved', eventName: SFI_MACHINE_AUTHORIZATION_RESERVED, payload: { grantId: 'grant-1' } },
    { eventId: 'agent-executed', eventName: 'SFI_AGENT_EXECUTED', payload: { metadata: { refs: { capabilityGrant: { grantId: 'grant-1' } } } } },
  ]) {
    const h = harness(admissionHistory({ extra: [replayEvent] }));
    const result = await dispatchAuthenticatedMachineRequest(call(), principal(), h.deps);
    assert.equal(result.status, 409);
    assert.ok(errorReasons(result.body as any).includes('GRANT_REPLAY_DETECTED'));
    assert.equal(h.executions(), 0);
  }
});

test('grant authority is revalidated against requester and requested Cognitive Passports', async () => {
  const expanded = grant({ authorityCeiling: 'WRITE_INTERNAL' });
  const h = harness(admissionHistory({ grant: expanded }));
  const result = await dispatchAuthenticatedMachineRequest(call(), principal(), h.deps);
  const reasons = errorReasons(result.body as any);
  assert.ok(reasons.includes('GRANT_EXCEEDS_REQUESTER_PASSPORT_AUTHORITY'));
  assert.ok(reasons.includes('GRANT_EXCEEDS_REQUESTED_PASSPORT_AUTHORITY'));
  assert.equal(h.executions(), 0);
});

test('child grant cannot exceed an ACTIVE parent grant', async () => {
  const child = grant({ parentGrantId: 'parent-grant' });
  const parent = grant({
    grantId: 'parent-grant',
    principal: 'meta_orchestrator',
    capabilityId: 'meta_orchestrator',
    stepId: 'parent-step',
    authorityCeiling: 'READ',
    allowedActions: ['INVOKE_CAPABILITY', 'REQUEST_CHILD_CAPABILITY'],
    parentGrantId: null,
  });
  const history = admissionHistory({ grant: child, extra: [{
    eventId: 'parent-admission',
    eventName: 'SFI_CAPABILITY_ADMITTED',
    payload: {
      disposition: 'ADMIT',
      executionAllowed: true,
      authorizationAllowedAtIssue: true,
      grantContract: 'SFI-CAPABILITY-GRANT-1.0',
      grant: parent,
    },
  }] });
  const h = harness(history);
  const result = await dispatchAuthenticatedMachineRequest(call(), principal(), h.deps);
  assert.ok(errorReasons(result.body as any).includes('CHILD_AUTHORITY_EXPANSION'));
  assert.equal(h.executions(), 0);
});

test('confirmation requirement fails closed until explicitly satisfied', async () => {
  const h = harness(admissionHistory({ grant: grant({ confirmationRequired: true }) }));
  const denied = await dispatchAuthenticatedMachineRequest(call({ params: { arguments: { authorization: { confirmation: false } } } }), principal(), h.deps);
  assert.ok(errorReasons(denied.body as any).includes('UNSATISFIED_GRANT_CONFIRMATION'));
  assert.equal(h.executions(), 0);
});

test('raw nonce and credential-shaped fields are rejected before model/runtime context', async () => {
  const h = harness(admissionHistory());
  const result = await dispatchAuthenticatedMachineRequest(call({
    params: { arguments: { execution: { parameters: { nonce: 'raw-one-time-secret' } } } },
  }), principal(), h.deps);
  assert.ok(errorReasons(result.body as any).includes('SECRET_OR_RAW_NONCE_IN_MACHINE_PAYLOAD'));
  assert.equal(h.executions(), 0);
});

test('model/provider metadata does not influence authority and does not block an otherwise valid grant', async () => {
  const h = harness(admissionHistory());
  const result = await dispatchAuthenticatedMachineRequest(call({
    params: { arguments: { execution: { parameters: { model: 'provider-model-name', reasoning: 'high' } } } },
  }), principal(), h.deps);
  assert.equal(result.status, 200);
  assert.equal(h.executions(), 1);
});

test('reservation persistence failure fails closed before execution', async () => {
  const h = harness(admissionHistory());
  h.deps.appendEvent = async (event) => event.eventName === SFI_MACHINE_AUTHORIZATION_RESERVED
    ? { ok: false, error: 'duplicate_or_store_unavailable' }
    : { ok: true, eventId: 'other' };
  const result = await dispatchAuthenticatedMachineRequest(call(), principal(), h.deps);
  assert.equal(result.status, 409);
  assert.equal(h.executions(), 0);
  assert.equal((result.body as any).error.message, 'GrantReservationFailedClosed');
});
