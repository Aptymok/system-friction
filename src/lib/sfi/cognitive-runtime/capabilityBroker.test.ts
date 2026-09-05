import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  SFI_CAPABILITY_AUTHORITY_GATE,
  SFI_CAPABILITY_REQUEST_CONTRACT,
  SFI_RUNTIME_ADAPTIVE_CAPABILITY_GATE,
  capabilityRequestHash,
  evaluateCapabilityRequest,
  type SfiCapabilityHistoryEntry,
  type SfiCapabilityRequest,
} from './capabilityBroker';
import { requestCognitiveCapability } from './capabilityRuntime';
import { selectCognitiveAutomations } from './automationSelector';
import type { KernelContext } from './kernelContext';

function context(overrides: Partial<KernelContext> = {}): KernelContext {
  return {
    cycleId: 'trajectory-1',
    logbookId: 'logbook-1',
    taskId: 'task-1',
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
    requestId: 'request-1',
    trajectoryId: 'trajectory-1',
    parentStepId: 'step-parent',
    requestedByCapabilityId: 'meta_orchestrator',
    requestedCapabilityId: 'risk_agent',
    reason: 'Need an independent bounded downside analysis before continuing the trajectory.',
    requiredInputs: [],
    availableEvidenceRefs: [],
    requestedOutputs: ['RECOMMENDATION'],
    urgency: 'NORMAL',
    requestedAt: '2026-09-05T06:45:00.000Z',
    ...overrides,
  };
}

function evaluate(
  req: SfiCapabilityRequest,
  overrides: Partial<Parameters<typeof evaluateCapabilityRequest>[0]> = {},
) {
  return evaluateCapabilityRequest({
    request: req,
    context: context(),
    history: [],
    depth: 1,
    remainingInvocationBudget: 1,
    ...overrides,
  });
}

test('contract and QA gates are the frozen R2-A identifiers', () => {
  assert.equal(SFI_CAPABILITY_REQUEST_CONTRACT, 'SFI-CAPABILITY-REQUEST-1.0');
  assert.equal(SFI_RUNTIME_ADAPTIVE_CAPABILITY_GATE, 'SFI-RUNTIME-ADAPTIVE-CAPABILITY-1.0');
  assert.equal(SFI_CAPABILITY_AUTHORITY_GATE, 'SFI-CAPABILITY-AUTHORITY-1.0');
});

test('ADMIT is possible only through the governed broker and remains request-scoped', () => {
  const decision = evaluate(request());
  assert.equal(decision.disposition, 'ADMIT');
  assert.equal(decision.executionAllowed, true);
  assert.equal(decision.authorityBoundary, 'CAPABILITY_REQUEST_IS_NOT_AUTHORIZATION');
  assert.ok(decision.reasons.includes('CANONICAL_PASSPORT_VERIFIED'));
  assert.ok(decision.reasons.includes('AUTHORITY_CEILING_VERIFIED'));
});

test('DENY rejects unknown capability, forbidden resource scope and authority escalation', () => {
  assert.equal(evaluate(request({ requestedCapabilityId: 'not_registered' })).disposition, 'DENY');

  const forbidden = evaluate(request({ requiredInputs: ['service_role'] }));
  assert.equal(forbidden.disposition, 'DENY');
  assert.ok(forbidden.reasons.includes('INPUT_OUTSIDE_CAPABILITY_SCOPE:service_role'));

  const authority = evaluate(request({
    requestedByCapabilityId: 'field_observer',
    requestedCapabilityId: 'risk_agent',
  }));
  assert.equal(authority.disposition, 'DENY');
  assert.ok(authority.reasons.some((reason) => reason.startsWith('AUTHORITY_CEILING_EXCEEDED:READ:RECOMMEND')));
});

test('DEFER enforces depth and invocation bounds without executing', () => {
  const depth = evaluate(request(), { depth: 3 });
  assert.equal(depth.disposition, 'DEFER');
  assert.equal(depth.executionAllowed, false);
  assert.ok(depth.reasons.includes('MAX_DEPTH_REACHED:3:2'));

  const budget = evaluate(request(), { remainingInvocationBudget: 0 });
  assert.equal(budget.disposition, 'DEFER');
  assert.equal(budget.executionAllowed, false);
  assert.ok(budget.reasons.includes('CAPABILITY_INVOCATION_BUDGET_EXHAUSTED'));
});

test('ALREADY_SATISFIED closes a request when trajectory state already contains the capability result', () => {
  const decision = evaluate(request(), { alreadySatisfiedCapabilityIds: ['risk_agent'] });
  assert.equal(decision.disposition, 'ALREADY_SATISFIED');
  assert.equal(decision.executionAllowed, false);
});

test('HUMAN_AUTHORITY_REQUIRED preserves source human-confirmation requirements', () => {
  const decision = evaluate(request({
    requestedCapabilityId: 'project_execution_manager',
    requestedOutputs: ['RECOMMENDATION'],
  }));
  assert.equal(decision.disposition, 'HUMAN_AUTHORITY_REQUIRED');
  assert.equal(decision.executionAllowed, false);
  assert.ok(decision.reasons.includes('REQUESTED_CAPABILITY_REQUIRES_HUMAN_CONFIRMATION'));
});

test('EVIDENCE_REQUIRED cannot be bypassed by missing refs or model output', () => {
  const missing = evaluate(request({
    requestedCapabilityId: 'reality_calibration',
    requestedOutputs: ['RECOMMENDATION'],
  }));
  assert.equal(missing.disposition, 'EVIDENCE_REQUIRED');
  assert.ok(missing.reasons.includes('REQUIRED_EVIDENCE_CLASS_MISSING:RETURN'));

  const inferenceContext = context({
    evidence: [{
      id: 'model-output-1',
      source: 'model',
      confidence: 1,
      payload: { epistemicClass: 'INFERENCE', text: 'The outcome probably occurred.' },
    }],
  });
  const inferred = evaluateCapabilityRequest({
    request: request({
      requestedCapabilityId: 'reality_calibration',
      availableEvidenceRefs: ['model-output-1'],
      requestedOutputs: ['RECOMMENDATION'],
    }),
    context: inferenceContext,
    depth: 1,
    remainingInvocationBudget: 1,
  });
  assert.equal(inferred.disposition, 'EVIDENCE_REQUIRED');
  assert.ok(inferred.reasons.includes('REQUIRED_EVIDENCE_CLASS_MISSING:RETURN'));

  const returnContext = context({
    evidence: [{
      id: 'return-1',
      source: 'observed-return',
      confidence: 1,
      payload: { epistemicClass: 'RETURN', observation: 'Observed outcome.' },
    }],
  });
  const admitted = evaluateCapabilityRequest({
    request: request({
      requestedCapabilityId: 'reality_calibration',
      availableEvidenceRefs: ['return-1'],
      requestedOutputs: ['RECOMMENDATION'],
    }),
    context: returnContext,
    depth: 1,
    remainingInvocationBudget: 1,
  });
  assert.equal(admitted.disposition, 'ADMIT');
});

test('equivalent request hashing is order-insensitive for set-like fields and duplicate requests terminate', () => {
  const first = request({
    requiredInputs: ['a', 'b'],
    availableEvidenceRefs: ['e2', 'e1'],
    requestedOutputs: ['RECOMMENDATION', 'INFERENCE'],
  });
  const equivalent = request({
    requestId: 'request-2',
    requiredInputs: ['b', 'a'],
    availableEvidenceRefs: ['e1', 'e2'],
    requestedOutputs: ['INFERENCE', 'RECOMMENDATION'],
  });
  assert.equal(capabilityRequestHash(first), capabilityRequestHash(equivalent));

  const hash = capabilityRequestHash(first);
  const history: SfiCapabilityHistoryEntry[] = [
    {
      eventId: 'event-request',
      eventName: 'SFI_CAPABILITY_REQUESTED',
      payload: { request: first, requestHash: hash },
    },
    {
      eventId: 'event-admit',
      eventName: 'SFI_CAPABILITY_ADMITTED',
      payload: { requestId: first.requestId, requestHash: hash, disposition: 'ADMIT' },
    },
  ];
  const duplicate = evaluate(equivalent, { history });
  assert.equal(duplicate.disposition, 'DEFER');
  assert.equal(duplicate.deduplicated, true);
  assert.equal(duplicate.executionAllowed, false);
  assert.ok(duplicate.reasons.includes('DUPLICATE_ADMITTED_REQUEST_WITHOUT_EXECUTION_RECEIPT'));
});

test('a durable execution receipt makes an equivalent request ALREADY_SATISFIED', () => {
  const first = request();
  const equivalent = request({ requestId: 'request-next' });
  const hash = capabilityRequestHash(first);
  const history: SfiCapabilityHistoryEntry[] = [
    { eventId: 'request-event', eventName: 'SFI_CAPABILITY_REQUESTED', payload: { request: first, requestHash: hash } },
    { eventId: 'admit-event', eventName: 'SFI_CAPABILITY_ADMITTED', payload: { requestHash: hash, disposition: 'ADMIT' } },
    {
      eventId: 'receipt-event',
      eventName: 'SFI_CAPABILITY_EXECUTION_RECEIPT',
      payload: { requestHash: hash, executed: true, executionStatus: 'EXECUTED' },
    },
  ];
  const duplicate = evaluate(equivalent, { history });
  assert.equal(duplicate.disposition, 'ALREADY_SATISFIED');
  assert.equal(duplicate.deduplicated, true);
  assert.equal(duplicate.executionAllowed, false);
});

test('runtime vertical persists request/disposition and calls the existing executor only after ADMIT', async () => {
  const appended: Array<{ eventName?: string; payload?: unknown; lineage?: string[] }> = [];
  let executions = 0;
  const runtime = await requestCognitiveCapability(
    { request: request(), context: context(), depth: 1, remainingInvocationBudget: 1 },
    {
      readHistory: async () => [],
      appendEvent: async (event) => {
        appended.push(event as typeof appended[number]);
        return { ok: true, eventId: `event-${appended.length}` };
      },
      executeAgent: async (agentId, ctx) => {
        executions += 1;
        return { agentId, executed: true, context: ctx, executedAt: '2026-09-05T06:46:00.000Z' };
      },
    },
  );

  assert.equal(runtime.decision.disposition, 'ADMIT');
  assert.equal(runtime.executed, true);
  assert.equal(executions, 1);
  assert.equal(appended[0]?.eventName, 'SFI_CAPABILITY_REQUESTED');
  assert.equal(appended[1]?.eventName, 'SFI_CAPABILITY_ADMITTED');
  assert.equal((appended[0]?.payload as Record<string, unknown>).executionAllowed, false);
  assert.equal((appended[1]?.payload as Record<string, unknown>).executionAllowed, true);
  assert.deepEqual(runtime.executionReceipt, {
    eventName: 'SFI_AGENT_EXECUTED',
    executionId: 'request-1',
    capabilityId: 'risk_agent',
  });
});

test('denied runtime request has zero execution authority', async () => {
  let executions = 0;
  const appended: string[] = [];
  const runtime = await requestCognitiveCapability(
    {
      request: request({ requestedCapabilityId: 'not_registered' }),
      context: context(),
    },
    {
      readHistory: async () => [],
      appendEvent: async (event) => {
        appended.push(String(event.eventName));
        return { ok: true, eventId: `event-${appended.length}` };
      },
      executeAgent: async (agentId, ctx) => {
        executions += 1;
        return { agentId, executed: true, context: ctx, executedAt: '2026-09-05T06:46:00.000Z' };
      },
    },
  );
  assert.equal(runtime.decision.disposition, 'DENY');
  assert.equal(runtime.executed, false);
  assert.equal(executions, 0);
  assert.deepEqual(appended, ['SFI_CAPABILITY_REQUESTED', 'SFI_CAPABILITY_DENIED']);
});

test('deduplicated runtime request terminates without event or execution amplification', async () => {
  const req = request();
  const hash = capabilityRequestHash(req);
  let executions = 0;
  let appends = 0;
  const runtime = await requestCognitiveCapability(
    { request: request({ requestId: 'request-2' }), context: context() },
    {
      readHistory: async () => [
        { eventId: 'request-event', eventName: 'SFI_CAPABILITY_REQUESTED', payload: { request: req, requestHash: hash } },
        { eventId: 'admit-event', eventName: 'SFI_CAPABILITY_ADMITTED', payload: { requestHash: hash, disposition: 'ADMIT' } },
      ],
      appendEvent: async () => {
        appends += 1;
        return { ok: true, eventId: `unexpected-${appends}` };
      },
      executeAgent: async (agentId, ctx) => {
        executions += 1;
        return { agentId, executed: true, context: ctx, executedAt: '2026-09-05T06:46:00.000Z' };
      },
    },
  );
  assert.equal(runtime.decision.deduplicated, true);
  assert.equal(runtime.executed, false);
  assert.equal(executions, 0);
  assert.equal(appends, 0);
});

test('explicit and auto selection remain unchanged and no Slice C/D/E owners are introduced', () => {
  const explicitContext = context({ metadata: { requestedAgents: ['risk_agent'] } });
  const explicit = selectCognitiveAutomations(explicitContext);
  assert.equal(explicit.mode, 'explicit');
  assert.deepEqual(explicit.automationIds, ['risk_agent']);

  const autoContext = context({ metadata: { question: 'What evidence is available?' } });
  const auto = selectCognitiveAutomations(autoContext);
  assert.equal(auto.mode, 'auto');
  assert.ok(auto.automationIds.includes('field_observer'));
  assert.ok(auto.automationIds.includes('evidence_hunter'));

  const broker = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/cognitive-runtime/capabilityBroker.ts'), 'utf8');
  const runtime = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/cognitive-runtime/capabilityRuntime.ts'), 'utf8');
  const combined = `${broker}\n${runtime}`;
  assert.doesNotMatch(combined, /taskGraphBuilder|providerRouter|SfiCapabilityGrant|sfi_capability_grants|createServiceSupabaseClient/);
  assert.doesNotMatch(combined, /service[_-]?role.*(key|secret|token)/i);
});
