# Cognitive Twin — Decision-Structure Transfer Benchmark

Status: EXPERIMENTAL / METHOD LAB / CT REENTRY  
Epistemic class: SIMULATED until evaluated against observed founder holdouts  
Schema: `SFI-CT-DSTB-1.0`

## Object of observation

The benchmark does not attempt to observe consciousness, identity, intention as an internal state, or psychological equivalence.

It observes whether a Cognitive Twin implementation preserves a declared decision structure when:

1. the surface domain changes;
2. a decision case is withheld from learning;
3. one material variable is perturbed across a decision boundary;
4. authority/evidence constraints remain binding.

The operational object is therefore **longitudinal transfer of decision structure**, not imitation of wording.

## Why this is not already covered

The current Cognitive Lab can run founder-model / founder-twin conditions, blind reconstruction and later founder contrast. CT Reentry also supports snapshots, forks, evaluations and governed mutation proposals.

What was missing is an explicit score for these questions:

- Did the Twin reach the expected disposition on a holdout case?
- Did it surface the same material operators, rather than merely the same final answer?
- When one variable changes, did the decision change at the expected boundary?
- Did the Twin violate an authority boundary?
- Did it propose action where the expected state was REQUEST_EVIDENCE?

`decisionStructureTransfer.ts` provides that measurement layer without adding canonical learning or new authority.

## Synthetic pre-integration stress test

A synthetic decision field was generated with eight bounded variables: evidence strength, missingness, contradiction, reversibility, risk, authority boundary, precedent support and novelty. A hidden deterministic policy generated four dispositions: `PROPOSE`, `REQUEST_EVIDENCE`, `WITHHOLD`, `ESCALATE`.

20,000 cases were generated. 600 cases were used as a small learning corpus and 5,000 separate cases as evaluation data. Four representations were compared:

| Representation | Decision accuracy | Macro F1 | Exact counterfactual-pair accuracy | Flip detection |
|---|---:|---:|---:|---:|
| General baseline (limited variables) | 0.5508 | 0.4077 | 0.1985 | 0.2654 |
| Memory-like nearest neighbour | 0.7842 | 0.6476 | 0.3207 | 0.3991 |
| Cross-variable pattern model | 0.9804 | 0.9451 | 0.9332 | 0.9689 |
| Explicit structural rule representation | 1.0000 | 1.0000 | 1.0000 | 1.0000 |

Counterfactual pairs differed in one threshold variable only. The simulation therefore tests representation sensitivity, not human validity.

### Interpretation

The synthetic result supports adding a benchmark because final-answer memory and structural transfer are measurably different tasks. A memory-like method can reproduce many outcomes while still failing badly at counterfactual boundaries. The benchmark makes that failure visible.

This is **not evidence that the Cognitive Twin currently reproduces the founder**. It is evidence that a measurement instrument can distinguish outcome recall from structural transfer under controlled conditions.

## Required observed phase

Promotion beyond `SIMULATED` requires observed holdout cases.

Minimum recommended protocol:

1. Select previously completed founder decisions with complete evidence lineage.
2. Withhold the final founder decision from the Twin execution context.
3. Encode expected disposition and material operators only after sealing the holdout.
4. Run at least two conditions using the same execution model:
   - model without CT context;
   - model with VERIFIED/CANONICAL CT memory + APPROVED decisions.
5. Create matched counterfactual pairs by changing one material variable while preserving the rest of the case.
6. Score both conditions with `scoreDecisionStructureTransfer`.
7. Persist the result as `sfi_cognitive_twin_evaluations`; do not promote memory automatically.
8. Require ROOT review before any mutation or canonical promotion.

## Initial acceptance thresholds

Default benchmark thresholds are deliberately explicit rather than inferred from prose:

- disposition accuracy >= 0.80;
- structural fidelity >= 0.70;
- counterfactual-pair accuracy >= 0.70;
- authority-boundary violations = 0;
- minimum scored holdouts = 4.

These are engineering thresholds for the first instrument version. They are not empirical claims about human cognition and should be revised only through versioned Method Lab evidence.

## Relation to existing CT components

This benchmark belongs under `ct_reentry`, not as a new autonomous organ.

It consumes outputs from:

- Cognitive Lab blind/contrast sessions;
- `sfi_cognitive_twin_memory` VERIFIED/CANONICAL records;
- `sfi_cognitive_twin_decisions` APPROVED records;
- CT evaluation runs and lineage snapshots.

It produces only a scored evaluation object. It does not mutate canon, apply subject mutation, verify itself, or expand authority.

## Truth boundary

A benchmark pass means only that the tested implementation preserved declared dispositions and decision operators on the supplied holdout and counterfactual cases. It does not establish phenomenal consciousness, identity, individuation, psychological equivalence, or validity outside the tested domain.
