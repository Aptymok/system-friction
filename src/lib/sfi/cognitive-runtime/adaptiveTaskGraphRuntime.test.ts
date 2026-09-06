import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateCapabilityRequest, type SfiCapabilityRequest } from './capabilityBroker';
import {
  addTaskGraphEdge,
  evaluateAdaptiveStopInvariant,
  executeAdaptiveCapabilityRequestsForNode,
  reserveTaskGraphInvocation,
  transitionTaskGraphNode,
  validateTaskGraphTransition,
} from './adaptiveTaskGraphRuntime';
import { buildTaskGraph } from './taskGraphBuilder';
import type { KernelContext } from './kernelContext';

function context(): KernelContext {
  return {
    cycleId: 'trajectory-adaptive', logbookId: 'logbook-adaptive', taskId: 'task-adaptive', currentEvent: 'SFI_TASK_CREATED',
    evidence: [], hypotheses: [], contradictions: [], simulations: [], predictions: [], risks: [], opportunities: [], metadata: {},
  };
}

function graph() {
  return buildTaskGraph({
    taskId: 'task-adaptive', requiredAgents: ['risk_agent'], executionOrder: ['meta_orchestrator', 'risk_agent'],
    missingInputs: [], readiness: 1, selectionMode: 'explicit', selectionReasons: { risk_agent: ['explicit_request'] },
  });
}

function request(overrides: Partial<SfiCapabilityRequest> = {}): SfiCapabilityRequest {
  return {
    requestId: 'adaptive-request-1', trajectoryId: 'trajectory-adaptive', parentStepId: 'parent',
    requestedByCapabilityId: 'meta_orchestrator', requestedCapabilityId: 'risk_agent', reason: 'bounded adaptive analysis',
    requiredInputs: [], availableEvidenceRefs: [], requestedOutputs: ['RECOMMENDATION'], urgency: 'NORMAL',
    requestedAt: '2026-09-06T14:00:00.000Z', ...overrides,
  };
}

test('adaptive node transition contract rejects impossible regression and preserves terminal history', () => {
  const g = graph();
  const node = g.nodes.find((item) => item.capabilityId === 'risk_agent')!;
  assert.equal(validateTaskGraphTransition('PLANNED', 'ADMITTED'), true);
  assert.equal(validateTaskGraphTransition('ADMITTED', 'RUNNING'), true);
  assert.equal(validateTaskGraphTransition('RUNNING', 'COMPLETED'), true);
  assert.equal(validateTaskGraphTransition('RUNNING', 'WAITING_EVIDENCE'), true);
  assert.equal(validateTaskGraphTransition('RUNNING', 'WAITING_AUTHORITY'), true);
  assert.equal(validateTaskGraphTransition('RUNNING', 'FAILED'), true);
  transitionTaskGraphNode(g, node.nodeId, 'ADMITTED');
  transitionTaskGraphNode(g, node.nodeId, 'RUNNING');
  transitionTaskGraphNode(g, node.nodeId, 'COMPLETED');
  assert.throws(() => transitionTaskGraphNode(g, node.nodeId, 'RUNNING'), /TASK_GRAPH_STATE_TRANSITION_FORBIDDEN/);
  assert.equal(g.nodes.find((item) => item.nodeId === node.nodeId)?.state, 'COMPLETED');
});

test('cycle-closing edges fail closed', () => {
  const g = graph();
  const root = g.nodes.find((item) => item.capabilityId === 'meta_orchestrator')!;
  const child = g.nodes.find((item) => item.capabilityId === 'risk_agent')!;
  assert.throws(() => addTaskGraphEdge(g, { from: child.nodeId, to: root.nodeId, relation: 'SUPPLIES' }), /TASK_GRAPH_CYCLE_EDGE_BLOCKED/);
});

test('trajectory invocation budget cannot reset or exceed its persisted graph ceiling', () => {
  const g = graph();
  g.invocationBudget.max = 2; g.invocationBudget.used = 1; g.invocationBudget.remaining = 1;
  assert.equal(reserveTaskGraphInvocation(g, g.nodes[0].nodeId), true);
  assert.deepEqual(g.invocationBudget, { max: 2, used: 2, remaining: 0 });
  assert.equal(reserveTaskGraphInvocation(g, g.nodes[0].nodeId), false);
  assert.equal(g.stop.stopped, true);
});

test('stop invariant requires no information, no state mutation and no unresolved required capability', () => {
  assert.equal(evaluateAdaptiveStopInvariant({ informationChanged: false, stateChanged: false, unresolvedRequiredCapabilities: 0 }).stop, true);
  assert.equal(evaluateAdaptiveStopInvariant({ informationChanged: true, stateChanged: false, unresolvedRequiredCapabilities: 0 }).stop, false);
  assert.equal(evaluateAdaptiveStopInvariant({ informationChanged: false, stateChanged: true, unresolvedRequiredCapabilities: 0 }).stop, false);
  assert.equal(evaluateAdaptiveStopInvariant({ informationChanged: false, stateChanged: false, unresolvedRequiredCapabilities: 1 }).stop, false);
});

test('broker blocks equivalent pending work, ancestor recurrence and depth expansion without authority elevation', () => {
  const ctx = context();
  const req = request();
  const base = { request: req, context: ctx, history: [], depth: 1, remainingInvocationBudget: 1 } as const;
  const pending = evaluateCapabilityRequest({ ...base, pendingCapabilityIds: ['risk_agent'] });
  assert.equal(pending.disposition, 'DEFER');
  assert.equal(pending.executionAllowed, false);
  const cycle = evaluateCapabilityRequest({ ...base, ancestorCapabilityIds: ['risk_agent'] });
  assert.equal(cycle.disposition, 'DENY');
  assert.ok(cycle.reasons.includes('DENY_CYCLE:ANCESTOR_CAPABILITY_REPEAT'));
  const depth = evaluateCapabilityRequest({ ...base, depth: 3 });
  assert.equal(depth.disposition, 'DEFER');
  assert.ok(depth.reasons.includes('MAX_DEPTH_REACHED:3:2'));
});

test('adaptive graph cannot create executable child work without Broker ADMIT', async () => {
  const ctx = context();
  const g = graph();
  const parent = g.nodes.find((item) => item.capabilityId === 'meta_orchestrator')!;
  const req = request({ requestedCapabilityId: 'opportunity_agent' });
  ctx.metadata = { taskGraph: g, capabilityRequests: [req] };
  let executions = 0;
  const result = await executeAdaptiveCapabilityRequestsForNode({
    context: ctx, parentNodeId: parent.nodeId, parentCapabilityId: 'meta_orchestrator',
    requestCapability: async (input) => {
      executions += 1;
      const decision = evaluateCapabilityRequest({ request: input.request, context: input.context, history: [], depth: input.depth, remainingInvocationBudget: input.remainingInvocationBudget, pendingCapabilityIds: ['opportunity_agent'] });
      return { request: input.request, decision, context: input.context, executed: false, requestEventId: null, dispositionEventId: null, executionReceipt: null };
    },
  });
  assert.equal(executions, 1);
  assert.equal(result.executedCapabilityIds.length, 0);
  assert.equal(result.graph.nodes.some((node) => node.requestId === req.requestId), false);
});
