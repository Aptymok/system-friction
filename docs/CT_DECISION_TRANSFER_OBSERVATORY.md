# Cognitive Twin Decision Transfer Observatory

Status: experimental instrumentation inside `ct_reentry`  
Schema: `SFI-CT-DECISION-TRANSFER-1.0`  
Epistemic boundary: measurement of computational reconstruction and transfer fidelity. It does not establish consciousness, identity, intention, or subjective experience.

## Why this exists

The Cognitive Relational Lab already performs blind reconstruction, founder contrast, divergence analysis and candidate learning. CT Reentry already supports evaluations, holdout, regression and governed mutation proposals. What was missing was an explicit instrument for a narrower question:

> Does a previously observed cognitive operation persist across domains, reconstruct a withheld decision, and predict which contextual perturbation would change that decision?

This is not another laboratory and not another memory system. It is an evaluator over existing traces.

## Observable object

The observable object is not "the mind". The instrument operates on decision traces containing:

- observed disposition (`PROPOSE`, `REQUEST_EVIDENCE`, `ESCALATE`, `WITHHOLD`, `ARCHIVE_ONLY`),
- operations used,
- variables treated as relevant,
- conditions explicitly rejected,
- conditions that would change the decision,
- domain,
- provenance / epistemic class,
- evidence references.

The instrument compares a withheld trace with a reconstruction and keeps outcome fidelity separate from structural fidelity.

## Measurements

`evaluateDecisionHoldout` reports:

- exact decision accuracy,
- operation Jaccard similarity,
- relevant-variable Jaccard similarity,
- rejected-condition similarity,
- counterfactual-cue similarity,
- structural fidelity,
- per-domain results,
- missing predictions as failures rather than silently dropping them.

`evaluateCounterfactualProbes` reports:

- expected decision switches,
- detected switches,
- target-disposition accuracy,
- false-switch rate,
- observed/verified probes separately from simulated probes.

`evaluateOperationPromotion` implements the maturity path:

`CANDIDATE -> RECURRENT -> CROSS_DOMAIN -> CONTRASTED -> STABLE_PATTERN -> RULE_CANDIDATE`

It never returns `RULE`. Rule/canon promotion remains governed and founder-reserved.

## Anti-circularity rules

1. `SIMULATED` and `INFERRED` occurrences do not count toward operation promotion.
2. A simulation may test the instrument but cannot validate its own cognitive claim.
3. Candidate memory must remain excluded from blind holdout reconstruction, consistent with Cognitive Relational Lab behavior.
4. A high final-decision accuracy is insufficient if structural fidelity is low.
5. Counterexamples are required before a stable pattern can become a rule candidate.
6. At least one decision-boundary probe is required for `STABLE_PATTERN`; at least two for `RULE_CANDIDATE`.
7. A `RULE_CANDIDATE` cannot acquire authority, mutate canon, or self-apply.

## Existing persistence; no new table required

Initial integration intentionally reuses current Cognitive Twin infrastructure:

### `sfi_cognitive_twin_evaluations`

Recommended mapping:

- `test_key`: `decision_transfer:<operation_key>`
- `test_version`: `SFI-CT-DECISION-TRANSFER-1.0`
- `outcome`: `PASS | FAIL | BLOCKED | NOT_RUN`
- `observed_result`: serialized `DecisionTransferEvaluation`
- `evidence_refs`: union of holdout traces, founder contrast and observed counterfactual probes

### `sfi_cognitive_twin_runs`

Use for the execution envelope and exact input snapshot. The execution model may propose a reconstruction, but an independent evaluation must score it.

### `sfi_cognitive_twin_memory`

No direct automatic write from this instrument. A result may become a candidate experience only after the existing governed contrast/persistence path.

## Source flow

```text
FOUNDER / OBSERVED EVENT
        |
        v
Cognitive Relational Lab
        |
        +--> BLIND_TWIN reconstruction
        |
        +--> later FOUNDER_READING
        |
        +--> DIVERGENCE
        |
        v
Decision Transfer Observatory
        |
        +--> holdout fidelity
        +--> cross-domain recurrence
        +--> counterexample requirement
        +--> counterfactual boundary probes
        |
        v
sfi_cognitive_twin_evaluations
        |
        v
CANDIDATE / RULE_CANDIDATE only
        |
        v
ROOT / governed review
```

## What this adds to CT

Before this layer, CT could store approved decisions and memory, perform blind relational analysis, compare that analysis with founder reading, and propose reversible mutations after repeated evaluation failure.

This layer adds a falsifiable bridge between those capabilities:

1. reconstruct a withheld decision;
2. measure whether the same operation transfers to another domain;
3. test where the decision changes under a controlled perturbation;
4. preserve counterexamples instead of treating them as noise;
5. refuse to promote simulated recurrence as observed cognitive structure.

That makes "transfer of cognitive structure" an observable engineering hypothesis rather than a narrative property of the Twin.
