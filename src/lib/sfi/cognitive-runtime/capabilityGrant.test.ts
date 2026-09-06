import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateCapabilityRequest,
  type SfiCapabilityHistoryEntry,
  type SfiCapabilityRequest,
} from './capabilityBroker';
import {
  SFI_CAPABILITY_GRANT_CONTRACT,
  SFI_CAPABILITY_GRANT_EXPIRY_GATE,
  SFI_CAPABILITY_GRANT_REPLAY_GATE,
  SFI_CAPABILITY_GRANT_REVOCATION_GATE,
  SFI_CAPABILITY_GRANT_REVOKED,
  SFI_CAPABILITY_GRANT_SCOPE_GATE,
  capabilityGrantNonceHash,
  capabilityGrantParentFromContext,
  capabilityGrantRevocationPayload,
  effectiveCapabilityGrantState,
  issueEphemeralCapabilityGrant,
  publicCapabilityGrant,
  validateCapabilityGrantUse,
  type SfiPublicCapabilityGrant,
} from './capabilityGrant';
import { requestCognitiveCapability } from './capabilityRuntime';
import type { KernelContext } from './kernelContext';

const NOW = new Date('2026-09-06T23:40:00.000Z');

function context(overrides: Partial<KernelContext> = {}): KernelContext {
  return {
    cycleId: 'trajectory-grant',
    logbookId: 'logbook-grant',
    taskId: 'task-grant',
    currentEvent: 'SFI_TASK_CREATED',
    evidence: [],
    hypotheses: [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: {},
    ...overrides,
  };
}

function request(overrides: Partial<SfiCapabilityRequest> = {}): SfiCapabilityRequest {
  return {
    requestId: 'grant-request-1',
    trajectoryId: 'trajectory-grant',
    parentStepId: 'step-parent',
    requestedByCapabilityId: 'meta_orchestrator',
    requestedCapabilityId: 'risk_agent',
    reason: 'Bounded risk analysis is required before the trajectory continues.',
    requiredInputs: [],
    availableEvidenceRefs: [],
    requestedOutputs: ['RECOMMENDATION'],
    urgency: 'NORMAL',
    requestedAt: NOW.toISOString(),
    ...overrides,
  };
}

function admitted(req: SfiCapabilityRequest = request()) {
  return evaluateCapabilityRequest({
    request: req,
    context: context(),
    history: [],
    depth: 1,
    remainingInvocationBudget: 2,
  });
}

function issue(overrides: Parameters<typeof issueEphemeralCapabilityGrant>[0] = {
  request: request(),
  decision: admitted(),
  context: context(),
  now: NOW,
}) {
  return issueEphemeralCapabilityGrant(overrides);
}

function requireGrant(result: ReturnType<typeof issueEphemeralCapabilityGrant>) {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reasons.join('|'));
  return result.grant;
}

function parentGrant(overrides: Partial<SfiPublicCapabilityGrant> = {}): SfiPublicCapabilityGrant {
  return {
    grantId: 'parent-grant',
    principal: 'meta_orchestrator',
    trajectoryId: 'trajectory-grant',
    stepId: 'root-step',
    capabilityId: 'meta_orchestrator',
    resource: 'trajectory:trajectory-grant',
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

test('frozen grant contract carries scoped canonical fields with passport-bounded TTL and authority', () => {
  assert.equal(SFI_CAPABILITY_GRANT_CONTRACT, 'SFI-CAPABILITY-GRANT-1.0');
  assert.equal(SFI_CAPABILITY_GRANT_SCOPE_GATE, 'SFI-CAPABILITY-GRANT-SCOPE-1.0');
  assert.equal(SFI_CAPABILITY_GRANT_EXPIRY_GATE, 'SFI-CAPABILITY-GRANT-EXPIRY-1.0');
  assert.equal(SFI_CAPABILITY_GRANT_REPLAY_GATE, 'SFI-CAPABILITY-GRANT-REPLAY-1.0');
  assert.equal(SFI_CAPABILITY_GRANT_REVOCATION_GATE, 'SFI-CAPABILITY-GRANT-REVOCATION-1.0');

  const grant = requireGrant(issue());
  assert.equal(grant.principal, 'risk_agent');
  assert.equal(grant.trajectoryId, 'trajectory-grant');
  assert.equal(grant.stepId, 'step-parent');
  assert.equal(grant.capabilityId, 'risk_agent');
  assert.equal(grant.resource, 'trajectory:trajectory-grant');
  assert.deepEqual(grant.allowedActions, ['INVOKE_CAPABILITY', 'REQUEST_CHILD_CAPABILITY']);
  assert.equal(grant.authorityCeiling, 'RECOMMEND');
  assert.equal(grant.confirmationRequired, false);
  assert.equal(grant.sensitivity, 'INTERNAL');
  assert.equal(grant.parentGrantId, null);
  assert.equal(grant.state, 'ACTIVE');
  assert.ok(grant.nonce.length > 0);
  assert.equal(new Date(grant.expiresAt).getTime() - new Date(grant.issuedAt).getTime(), 600_000);
});

test('request or model capability cannot mint authorization without Broker ADMIT', () => {
  const req = request({ requestedByCapabilityId: 'field_observer', requestedCapabilityId: 'risk_agent' });
  const denied = evaluateCapabilityRequest({
    request: req,
    context: context(),
    history: [],
    depth: 1,
    remainingInvocationBudget: 1,
  });
  assert.equal(denied.disposition, 'DENY');
  assert.ok(denied.reasons.some((reason) => reason.startsWith('AUTHORITY_CEILING_EXCEEDED:READ:RECOMMEND')));
  const result = issueEphemeralCapabilityGrant({ request: req, decision: denied, context: context(), now: NOW });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.reasons.includes('BROKER_ADMISSION_REQUIRED'));
});

test('expiration is deterministic and fails closed at expiresAt', () => {
  const grant = requireGrant(issue());
  const active = validateCapabilityGrantUse({
    grant,
    request: request(),
    history: [],
    now: new Date(NOW.getTime() + 599_999),
  });
  assert.equal(active.ok, true);
  assert.equal(active.effectiveState, 'ACTIVE');

  const expired = validateCapabilityGrantUse({
    grant,
    request: request(),
    history: [],
    now: new Date(NOW.getTime() + 600_000),
  });
  assert.equal(expired.ok, false);
  assert.equal(expired.effectiveState, 'EXPIRED');
  assert.ok(expired.reasons.includes('GRANT_NOT_ACTIVE:EXPIRED'));
});

test('revocation uses epistemic lineage and fails closed without mutating the frozen grant object', () => {
  const grant = requireGrant(issue());
  const revocation = capabilityGrantRevocationPayload({
    grantId: grant.grantId,
    reason: 'Scope is no longer required.',
    revokedBy: 'governed_runtime',
    revokedAt: new Date(NOW.getTime() + 1_000).toISOString(),
  });
  const history: SfiCapabilityHistoryEntry[] = [{
    eventId: 'revocation-event',
    eventName: SFI_CAPABILITY_GRANT_REVOKED,
    payload: revocation,
  }];
  assert.equal(effectiveCapabilityGrantState(publicCapabilityGrant(grant), new Date(NOW.getTime() + 2_000), history), 'REVOKED');
  const use = validateCapabilityGrantUse({ grant, request: request(), history, now: new Date(NOW.getTime() + 2_000) });
  assert.equal(use.ok, false);
  assert.ok(use.reasons.includes('GRANT_NOT_ACTIVE:REVOKED'));
  assert.equal(grant.state, 'ACTIVE');
});

test('child grants preserve parent lineage and cannot expand resource, actions, authority, expiry, confirmation or sensitivity', () => {
  const req = request();
  const parent = parentGrant();
  const child = requireGrant(issueEphemeralCapabilityGrant({
    request: req,
    decision: admitted(req),
    context: context(),
    parentGrant: parent,
    history: [],
    now: NOW,
  }));
  assert.equal(child.parentGrantId, parent.grantId);
  assert.equal(child.resource, parent.resource);
  assert.ok(child.allowedActions.every((action) => parent.allowedActions.includes(action)));
  assert.equal(child.authorityCeiling, 'RECOMMEND');
  assert.ok(new Date(child.expiresAt).getTime() <= new Date(parent.expiresAt).getTime());

  const lowAuthorityParent = parentGrant({ authorityCeiling: 'READ' });
  const expanded = issueEphemeralCapabilityGrant({
    request: req,
    decision: admitted(req),
    context: context(),
    parentGrant: lowAuthorityParent,
    history: [],
    now: NOW,
  });
  assert.equal(expanded.ok, false);
  if (!expanded.ok) assert.ok(expanded.reasons.includes('CHILD_AUTHORITY_EXPANSION'));

  const noDelegation = issueEphemeralCapabilityGrant({
    request: req,
    decision: admitted(req),
    context: context(),
    parentGrant: parentGrant({ allowedActions: ['INVOKE_CAPABILITY'] }),
    history: [],
    now: NOW,
  });
  assert.equal(noDelegation.ok, false);
  if (!noDelegation.ok) assert.ok(noDelegation.reasons.includes('PARENT_CHILD_REQUEST_NOT_ALLOWED'));

  const wrongResource = issueEphemeralCapabilityGrant({
    request: req,
    decision: admitted(req),
    context: context(),
    parentGrant: parentGrant({ resource: 'trajectory:other' }),
    history: [],
    now: NOW,
  });
  assert.equal(wrongResource.ok, false);
  if (!wrongResource.ok) assert.ok(wrongResource.reasons.includes('CHILD_RESOURCE_EXPANSION'));
});

test('nonce replay is detected from the existing SFI_AGENT_EXECUTED receipt plane', () => {
  const grant = requireGrant(issue({
    request: request(),
    decision: admitted(),
    context: context(),
    now: NOW,
    nonce: 'one-time-nonce',
    grantId: 'grant-replay',
  }));
  const nonceHash = capabilityGrantNonceHash(grant.nonce);
  const history: SfiCapabilityHistoryEntry[] = [{
    eventId: 'execution-receipt',
    eventName: 'SFI_AGENT_EXECUTED',
    payload: {
      metadata: {
        refs: {
          capabilityGrant: {
            grantId: grant.grantId,
            nonceHash,
          },
        },
      },
    },
  }];
  const replay = validateCapabilityGrantUse({ grant, request: request(), history, now: NOW });
  assert.equal(replay.ok, false);
  assert.ok(replay.reasons.includes('GRANT_REPLAY_DETECTED'));
});

test('grant authority is rechecked at use and cannot exceed either requester or requested passport ceiling', () => {
  const grant = requireGrant(issue());
  const escalated = { ...grant, authorityCeiling: 'WRITE_INTERNAL' as const };
  const result = validateCapabilityGrantUse({ grant: escalated, request: request(), history: [], now: NOW });
  assert.equal(result.ok, false);
  assert.ok(result.reasons.includes('GRANT_EXCEEDS_REQUESTER_PASSPORT_AUTHORITY'));
  assert.ok(result.reasons.includes('GRANT_EXCEEDS_REQUESTED_PASSPORT_AUTHORITY'));
});

test('public grant projection strips raw nonce and context parent reconstruction never requires it', () => {
  const grant = requireGrant(issue());
  const projection = publicCapabilityGrant(grant);
  assert.equal('nonce' in projection, false);
  const ctx = context({
    metadata: {
      capabilityGrant: {
        contract: SFI_CAPABILITY_GRANT_CONTRACT,
        ...projection,
        nonceHash: capabilityGrantNonceHash(grant.nonce),
      },
    },
  });
  assert.deepEqual(capabilityGrantParentFromContext(ctx), projection);
});

test('runtime emits grant lineage inside the existing request/disposition plane and executes only after grant validation', async () => {
  const appended: Array<{ eventName?: string; payload?: unknown }> = [];
  let executions = 0;
  const result = await requestCognitiveCapability(
    { request: request(), context: context(), depth: 1, remainingInvocationBudget: 2 },
    {
      readHistory: async () => [],
      appendEvent: async (event) => {
        appended.push(event);
        return { ok: true as const, eventId: `event-${appended.length}` };
      },
      executeAgent: async (agentId, executingContext) => {
        executions += 1;
        assert.equal(agentId, 'risk_agent');
        const grantMetadata = executingContext.metadata.capabilityGrant as Record<string, unknown>;
        assert.equal(grantMetadata.capabilityId, 'risk_agent');
        assert.equal(grantMetadata.authorityCeiling, 'RECOMMEND');
        assert.equal('nonce' in grantMetadata, false);
        assert.equal(typeof grantMetadata.nonceHash, 'string');
        return { agentId, executed: true, context: executingContext, executedAt: NOW.toISOString() };
      },
      now: () => NOW,
    },
  );
  assert.equal(executions, 1);
  assert.equal(result.executed, true);
  assert.equal(result.authorizationAllowed, true);
  assert.equal('nonce' in (result.grant ?? {}), false);
  assert.deepEqual(appended.map((event) => event.eventName), ['SFI_CAPABILITY_REQUESTED', 'SFI_CAPABILITY_ADMITTED']);
  const disposition = appended[1]?.payload as Record<string, unknown>;
  const persistedGrant = disposition.grant as Record<string, unknown>;
  assert.equal(disposition.executionAllowed, true);
  assert.equal(disposition.authorizationAllowedAtIssue, true);
  assert.equal('nonce' in persistedGrant, false);
  assert.equal(typeof disposition.nonceHash, 'string');
});

test('grant implementation is model-independent, reuses event persistence and introduces no raw credential/table owner', () => {
  const grantSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/cognitive-runtime/capabilityGrant.ts'), 'utf8');
  const runtimeSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/cognitive-runtime/capabilityRuntime.ts'), 'utf8');
  const executorSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts'), 'utf8');
  const workstream = fs.readFileSync(path.join(process.cwd(), 'docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md'), 'utf8');
  const combined = `${grantSource}\n${runtimeSource}`;
  assert.doesNotMatch(combined, /providerRouter|agentLlmClient|getLlmOperationPlan|modelRequirements/);
  assert.doesNotMatch(combined, /sfi_capability_grants|createServiceSupabaseClient/);
  assert.match(runtimeSource, /eventStore/);
  assert.match(workstream, /`epistemic_events` remains the transversal event\/lineage owner/);
  assert.match(executorSource, /'capabilityGrant'/);
  assert.doesNotMatch(runtimeSource, /service[_-]?role.*(key|secret|token)/i);
});