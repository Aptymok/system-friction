# SFI-DT EXP-001 — CURRENT FREEZE

Status: **EXPERIMENTALLY_FROZEN**  
Contract: `SFI-DT-EXP-001-FREEZE-1.0`  
Registration: **AWAITING_NATURALISTIC_TARGET**

## Purpose

This document preserves the scientifically relevant portion of legacy PR #220 on top of the current System Friction Institute (SFI) architecture.

The old branch is intentionally not merged or rebased wholesale. Its UI/API wiring predates the current Cognitive Spine and SFI Core contracts. Only the experimental design that remains epistemically compatible is retained.

## Claim boundary

`N_subject = 1`.

A valid EXP-001 run may report performance of the frozen Decision Transfer instrument on one naturalistic target under the declared arm matrix.

It does not establish:

- phenomenal consciousness;
- subjective experience;
- human identity continuity;
- equivalence to a human mind;
- population generalization;
- causal superiority of the Cognitive Twin architecture;
- universal structural weights or thresholds.

## Frozen arms

| Arm | Information available |
| --- | --- |
| `B0_BASE` | current case + admissible current evidence |
| `B1_RAW_HISTORY` | B0 + temporally admissible raw history |
| `B2_MEMORY` | B1 + verified/canonical memory |
| `B3_CDT` | B2 + prior admissible Decision Transfer traces |
| `B4_PATTERNS` | B3 + recurrent patterns |
| `B5_RULE_STRUCTURE` | B4 + approved rule/constraint/exception structure |
| `CT_FULL` | B5 + governed operating-state/context machinery |

Primary comparison:

`CT_FULL - B5_RULE_STRUCTURE`

Primary endpoint:

`validated_structural_fidelity`

## Frozen structural weights

```text
disposition           0.45
operations            0.25
relevant variables    0.15
rejected conditions   0.05
decision-change cues  0.10
```

The weights sum to 1.0 and cannot be modified after target registration without invalidating the confirmatory run.

## Epistemic boundary

Only canonically grounded `OBSERVED` and `VERIFIED_CONTRAST` material may satisfy confirmatory validation conditions.

`SIMULATED`, `DERIVED`, and `INFERRED` material remains diagnostic.

Missing empirical evidence remains missing. It is represented as `BLOCKED` or `null`, never converted into a favorable score.

No Decision Transfer result may automatically:

- promote a cognitive rule;
- mutate canonical memory;
- expand authority;
- become institutional truth.

## Confirmatory execution boundary

Before a confirmatory EXP-001 score can exist:

1. a naturalistic target must be registered before reveal;
2. the target must be proven post-cutoff;
3. the exact context must be frozen before reveal;
4. the context receipt and target timing proof must verify;
5. the qualifying evidence pool must be frozen before scoring;
6. manual support/counterexample/boundary counts may not constitute confirmatory evidence;
7. the scoring output remains a governed derived assessment.

Until those conditions are satisfied:

`EXP-001 CONFIRMATORY EXECUTION = BLOCKED`

## Current implementation relationship

Current `main` already contains the active Decision Transfer evaluator, blind reconstruction protocol, canonical context materialization, target timing proof, Cognitive Spine isolation and associated QA.

This freeze binds the scientific experiment to those current contracts instead of restoring the stale branch implementation from PR #220.

## Port disposition of PR #220

Preserved:

- experimental arm matrix;
- primary endpoint and contrast;
- claim boundary;
- structural weights;
- empirical-vs-diagnostic evidence distinction;
- pre-target registration requirement;
- evidence-pool-before-scoring requirement;
- fail-closed `BLOCKED` semantics;
- no automatic rule/memory promotion.

Not ported:

- stale route/UI patches;
- a second workflow dedicated only to the old branch;
- old implementation details that conflict with current Cognitive Spine isolation;
- old commit hashes as current executable truth.

## Current state

```text
SFI_DT_EXP_001 = EXPERIMENTALLY_FROZEN
TARGET_REGISTRATION = AWAITING_NATURALISTIC_TARGET
CONFIRMATORY_RUN = BLOCKED_UNTIL_TARGET
PR_220 = SUPERSEDED_AFTER_PORT
```
