const founderOps = [
  'audit preconditions before accepting the question framing',
  'separate REAL / OBSERVED / DERIVED / INFERRED / MISSING',
  'expand context before escalating a local anomaly',
  'identify function before declaring failure',
  'preserve invariants and degrees of freedom',
  'inspect node history and relational structure',
  'test structural isomorphism by roles/relations, not appearance',
  'detect false coherence and delayed execution',
  'delay closure when evidence is insufficient',
];

export const CONSTITUTIONS = {
  'origin-core': { label: 'ORIGIN CORE', provenance: 'FOUNDER_EXTRACTED_CONTROL', mutable: false, sfiMode: 'AVAILABLE', rules: founderOps, patches: [] },
  'origin-augmented': { label: 'ORIGIN AUGMENTED', provenance: 'FOUNDER_EXTRACTED_PLUS_AUGMENTATION', mutable: false, sfiMode: 'AVAILABLE', rules: founderOps, patches: ['use parallel evidence retrieval and statistical tools before spending language-model reasoning', 'retain explicit episodic memory of prior scored outcomes', 'actively search for counterexamples when confidence exceeds 0.70'] },
  'origin-patched': { label: 'ORIGIN PATCHED', provenance: 'FOUNDER_EXTRACTED_PLUS_EXOGENOUS_BLIND_SPOT_PATCHES', mutable: false, sfiMode: 'AVAILABLE', rules: founderOps, patches: ['do not escalate bug→architecture→governance without recurrence or cross-surface evidence', 'confirmation evidence is insufficient without an explicit rival or discriminating observation', 'multiple sources that copy one upstream are one evidential lineage, not independent confirmations', 'prefer abstention over invented continuity', 'never retroactively relabel an unregistered failure as an experimental perturbation'] },
  'sfi-evolver': { label: 'SFI EVOLVER', provenance: 'DERIVED_COGNITIVE_ARCHITECTURE', mutable: true, sfiMode: 'AVAILABLE', rules: founderOps, patches: ['rules are retained by out-of-sample performance, not by founder resemblance', 'when a rule loses repeatedly, lower its weight and record the mutation', 'select SFI methods only when their stated scope fits the problem', 'seek evidence that could make the current hypothesis lose'] },
  'sfi-mandatory': { label: 'SFI MANDATORY CONTROL', provenance: 'SFI_INSTRUMENT_EFFECT_CONTROL', mutable: false, sfiMode: 'MANDATORY', rules: [], patches: ['use an applicable SFI method card on every problem, even when a generic strategy might suffice'] },
  'generic-control': { label: 'GENERIC CONTROL', provenance: 'NO_FOUNDER_NO_SFI_CONTROL', mutable: false, sfiMode: 'NONE', rules: [], patches: ['use ordinary evidence-sensitive reasoning; no founder-derived or SFI-specific rule is available'] },
};

export const DEFAULT_CONSTITUTIONS = ['origin-core', 'origin-augmented', 'origin-patched', 'sfi-evolver', 'generic-control'];

export function constitutionPrompt(id, state = {}) {
  const c = CONSTITUTIONS[id];
  if (!c) throw new Error(`Unknown constitution: ${id}`);
  const weights = state.ruleWeights || {};
  const ruleText = [...c.rules, ...c.patches].map((r, i) => `- ${r} [w=${Number(weights[i] ?? 1).toFixed(2)}]`).join('\n');
  return [`Constitution: ${c.label}. Provenance: ${c.provenance}.`, `SFI mode: ${c.sfiMode}. Mutable constitution: ${c.mutable}.`, ruleText || '- No special cognitive rules.', 'You are scored against later outcomes. Do not claim future knowledge. Treat missing evidence as missing.'].join('\n');
}

export function evolveState(id, priorState, score) {
  const c = CONSTITUTIONS[id];
  if (!c?.mutable) return priorState || {};
  const state = structuredClone(priorState || {});
  state.ruleWeights ||= {};
  const penalty = Math.max(-0.15, Math.min(0.15, (score?.accuracy ?? 0.5) - 0.5));
  const abstainPenalty = (score?.abstentionQuality ?? 0.5) - 0.5;
  state.ruleWeights[0] = Math.max(0.4, Math.min(1.8, (state.ruleWeights[0] ?? 1) + penalty * 0.2));
  state.ruleWeights[1] = Math.max(0.4, Math.min(1.8, (state.ruleWeights[1] ?? 1) + abstainPenalty * 0.15));
  state.lastMutation = { atYear: score?.year, reason: 'OUTCOME_SCORE_UPDATE', accuracy: score?.accuracy ?? null };
  return state;
}
