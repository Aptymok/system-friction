import type { ContinuityMode } from './contracts';

export type StudioAutonomyAction =
  | 'ANALYZE'
  | 'HYPOTHESIZE'
  | 'VERIFY'
  | 'WAIT'
  | 'CLOSE';

export type StudioAutonomyPolicyInput = {
  mode: ContinuityMode;
  horizonReached: boolean;
  cognitiveTraceExists: boolean;
  latestCognitiveAction: 'analyze' | 'generate_hypothesis' | 'verify' | null;
  activeHypothesis: boolean;
  terminalHypothesis: boolean;
  postHypothesisEvidenceCount: number;
  postTerminalEvidenceCount: number;
  cognitiveAfterTerminal: boolean;
  hoursSinceTerminal: number | null;
  recentExecutionFailure: boolean;
};

export type StudioAutonomyDecision = {
  action: StudioAutonomyAction;
  reason: string;
};

const MIN_HOURS_BETWEEN_TERMINAL_HYPOTHESIS_AND_NEXT = 6;

export function selectStudioAutonomyTransition(input: StudioAutonomyPolicyInput): StudioAutonomyDecision {
  if (input.mode === 'EMERGENCY_HALT') {
    return { action: 'WAIT', reason: 'EMERGENCY_HALT forbids autonomous cognitive execution.' };
  }

  if (input.mode === 'DEGRADED_SAFE' || input.mode === 'RECOVERY') {
    return { action: 'WAIT', reason: `${input.mode} allows observation of state but not autonomous epistemic progression.` };
  }

  if (input.horizonReached) {
    return { action: 'CLOSE', reason: 'The declared FI-001 longitudinal horizon has been reached.' };
  }

  if (input.recentExecutionFailure) {
    return { action: 'WAIT', reason: 'A recent autonomous execution failed; bounded backoff prevents a retry loop.' };
  }

  if (!input.cognitiveTraceExists) {
    return { action: 'ANALYZE', reason: 'No cognitive observation exists for the experiment object.' };
  }

  if (input.activeHypothesis) {
    if (input.postHypothesisEvidenceCount > 0) {
      return { action: 'VERIFY', reason: 'An active hypothesis has independent evidence recorded after its creation.' };
    }
    return { action: 'WAIT', reason: 'The active hypothesis has no post-hypothesis evidence; verification would be circular.' };
  }

  if (input.terminalHypothesis) {
    if (!input.cognitiveAfterTerminal && input.postTerminalEvidenceCount > 0) {
      return { action: 'ANALYZE', reason: 'New evidence exists after the terminal hypothesis and has not yet been cognitively observed.' };
    }

    if ((input.hoursSinceTerminal ?? 0) < MIN_HOURS_BETWEEN_TERMINAL_HYPOTHESIS_AND_NEXT) {
      return { action: 'WAIT', reason: 'The last hypothesis is terminal; cooldown prevents repetitive hypothesis churn.' };
    }

    if (input.cognitiveAfterTerminal) {
      return { action: 'HYPOTHESIZE', reason: 'Post-terminal evidence has been observed and the hypothesis cooldown has elapsed.' };
    }

    return { action: 'WAIT', reason: 'A terminal hypothesis exists but no new independent evidence is available.' };
  }

  if (input.latestCognitiveAction === 'analyze') {
    return { action: 'HYPOTHESIZE', reason: 'Observation is persisted and no active hypothesis exists; hypothesis formation is the next reversible epistemic transition.' };
  }

  if (input.latestCognitiveAction === 'generate_hypothesis') {
    return { action: 'WAIT', reason: 'The prior hypothesis-generation pass produced no active persisted hypothesis; do not regenerate without new evidence.' };
  }

  return { action: 'ANALYZE', reason: 'The object has cognitive history but no safe downstream state can be inferred without a fresh observation.' };
}
