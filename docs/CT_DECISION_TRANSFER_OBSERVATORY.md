# Cognitive Twin Decision Transfer Observatory

Status: Phase II experimental instrumentation inside canonical `src/core/cognitive-twin/reentry`  
Schema: `SFI-CT-DECISION-TRANSFER-1.0`  
Epistemic boundary: measurement of computational reconstruction and transfer fidelity. It does not establish consciousness, identity, intention, or subjective experience.

## Observable object

The observable object is not "the mind". It is the persistence, transformation and reuse of decision operations across time, contexts and observers.

The instrument operates on decision traces containing:

- observed disposition (`PROPOSE`, `REQUEST_EVIDENCE`, `ESCALATE`, `WITHHOLD`, `ARCHIVE_ONLY`),
- operations used,
- variables treated as relevant,
- conditions explicitly rejected,
- conditions that would change the decision,
- domain,
- provenance / epistemic class,
- evidence references.

The instrument compares a withheld trace with a reconstruction and keeps final-outcome fidelity separate from structural fidelity.

## Phase II question

> Can longitudinally extracted decision structure reconstruct a withheld decision, transfer across domains, identify decision boundaries, and improve over lower-structure baselines without converting simulation into evidence?

This is not another laboratory, another memory system, or another authority layer. It is an evaluator over existing traces and governed Cognitive Twin infrastructure.

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
2. A simulation may exercise the instrument but cannot validate its own cognitive claim.
3. Candidate or terminal memory must remain excluded from blind holdout reconstruction unless the experiment protocol explicitly includes it as a treatment arm.
4. High final-decision accuracy is insufficient when structural fidelity is low.
5. Counterexamples are required before a stable pattern can become a rule candidate.
6. At least one decision-boundary probe is required for `STABLE_PATTERN`; at least two for `RULE_CANDIDATE`.
7. A `RULE_CANDIDATE` cannot acquire authority, mutate canon, or self-apply.
8. Every observed or verified contribution must preserve evidence references and lineage.

## Existing persistence; no new table required

Initial integration reuses current Cognitive Twin infrastructure.

### `sfi_cognitive_twin_evaluations`

Recommended mapping:

- `test_key`: `decision_transfer:<operation_key>`
- `test_version`: `SFI-CT-DECISION-TRANSFER-1.0`
- `outcome`: `PASS | FAIL | BLOCKED | NOT_RUN`
- `observed_result`: serialized `DecisionTransferEvaluation`
- `evidence_refs`: union of holdout traces, verified contrast and observed counterfactual probes

### `sfi_cognitive_twin_runs`

Use for the execution envelope and exact input snapshot. The execution model may propose a reconstruction, but an independent evaluation must score it.

### Canonical institutional memory

The instrument does not write directly to canonical memory. Any resulting experience or pattern must pass through the governed institutional memory pipeline backed by `sfi_amv_memory`; historical `sfi_cognitive_twin_memory` remains read-only fallback and is not a new write target.

## Experimental flow

```text
OBSERVED DECISION / EVENT
        |
        v
Decision trace extraction
        |
        +--> operations
        +--> relevant variables
        +--> rejected conditions
        +--> decision-change conditions
        |
        v
BLIND reconstruction
        |
        v
Decision Transfer Observatory
        |
        +--> holdout fidelity
        +--> cross-domain recurrence
        +--> counterexamples
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
        |
        v
canonical institutional memory when approved
```

## Required benchmark arms

Phase II should compare at least:

- `B0`: base model,
- `B1`: base model + raw history,
- `B2`: base model + memory,
- `B3`: base model + decision traces,
- `B4`: base model + decision traces + patterns,
- `B5`: base model + traces + patterns + constraints + exceptions,
- `CT`: full governed Cognitive Twin.

The key claim is not that the Twin reproduces a person. The falsifiable claim is narrower: structured longitudinal decision traces preserve transferable functional information when they improve withheld-decision reconstruction and boundary prediction over appropriate baselines.
