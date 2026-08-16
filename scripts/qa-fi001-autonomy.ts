import assert from 'node:assert/strict';
import { selectStudioAutonomyTransition } from '../src/lib/continuity/studioAutonomyPolicy';

const base = {
  mode: 'FOUNDER_ABSENT_ACTIVE' as const,
  horizonReached: false,
  cognitiveTraceExists: true,
  latestCognitiveAction: 'analyze' as const,
  activeHypothesis: false,
  terminalHypothesis: false,
  postHypothesisEvidenceCount: 0,
  postTerminalEvidenceCount: 0,
  cognitiveAfterTerminal: false,
  hoursSinceTerminal: null,
  recentExecutionFailure: false,
};

assert.equal(selectStudioAutonomyTransition({ ...base, cognitiveTraceExists: false, latestCognitiveAction: null }).action, 'ANALYZE');
assert.equal(selectStudioAutonomyTransition(base).action, 'HYPOTHESIZE');
assert.equal(selectStudioAutonomyTransition({ ...base, activeHypothesis: true, postHypothesisEvidenceCount: 0 }).action, 'WAIT');
assert.equal(selectStudioAutonomyTransition({ ...base, activeHypothesis: true, postHypothesisEvidenceCount: 1 }).action, 'VERIFY');
assert.equal(selectStudioAutonomyTransition({
  ...base,
  terminalHypothesis: true,
  postTerminalEvidenceCount: 1,
  cognitiveAfterTerminal: false,
  hoursSinceTerminal: 1,
}).action, 'ANALYZE');
assert.equal(selectStudioAutonomyTransition({
  ...base,
  terminalHypothesis: true,
  postTerminalEvidenceCount: 1,
  cognitiveAfterTerminal: true,
  hoursSinceTerminal: 2,
}).action, 'WAIT');
assert.equal(selectStudioAutonomyTransition({
  ...base,
  terminalHypothesis: true,
  postTerminalEvidenceCount: 1,
  cognitiveAfterTerminal: true,
  hoursSinceTerminal: 6,
}).action, 'HYPOTHESIZE');
assert.equal(selectStudioAutonomyTransition({ ...base, horizonReached: true }).action, 'CLOSE');
assert.equal(selectStudioAutonomyTransition({ ...base, recentExecutionFailure: true }).action, 'WAIT');
assert.equal(selectStudioAutonomyTransition({ ...base, mode: 'EMERGENCY_HALT' }).action, 'WAIT');
assert.equal(selectStudioAutonomyTransition({ ...base, mode: 'DEGRADED_SAFE' }).action, 'WAIT');

console.log('FI-001 autonomy policy QA: PASS');
