# SFI-CT-CPRT-1.0

Status: FROZEN
Version: 1.0
Date: 2026-08-16

## Purpose

Define the Cognitive Provenance Reconstruction Tests (CPRT) that determine whether the System Friction Institute (SFI) Cognitive Spine is reproducible and whether its use in cognitive execution is provenance-complete.

Two tests are mandatory and distinct.

---

# CPRT-A — Cognitive State Reconstruction

## Question

Given a historical cognitive-state snapshot, can SFI reconstruct exactly the institutionally admissible information universe and produce the identical semantic snapshot hash?

## Required reconstruction inputs

```text
source manifest
source hashes
source cutoff
epistemic state / assessed relationships
projector version
policy version
projection profile
schema version
canonical serialization rules
```

## Required assertions

```text
PROJECTOR VERSION       PASS
POLICY VERSION          PASS
SOURCE CUTOFF           PASS
SOURCE MANIFEST         PASS
SOURCE HASHES           PASS
EPISTEMIC STATE         PASS
PROJECTION PROFILE      PASS
SCHEMA VERSION          PASS
CANONICAL SERIALIZATION PASS
SNAPSHOT RECONSTRUCTED  PASS
SNAPSHOT HASH MATCH     PASS
```

## Deterministic equality

```text
same canonical source manifest
+ same source hashes
+ same source cutoff
+ same epistemic state
+ same projector version
+ same policy version
+ same projection profile
+ same schema version
+ same canonical serialization
=
same semantic snapshotHash
```

## Cross-substrate requirement

At minimum, CPRT-A must be executable without Vercel. The reference implementation must be runnable from a local or persistent-worker context.

A valid cross-substrate test should be able to compare, where infrastructure is available:

```text
LOCAL RESULT HASH
WORKER RESULT HASH
VERCEL-ADAPTER RESULT HASH
```

All must match for identical contractual inputs.

## Gate

```text
NO RUNTIME CONSUMPTION UNTIL CPRT-A = PASS.
```

Passing CPRT-A declares:

`STATE INFRASTRUCTURE READY`

It does not declare the Cognitive Spine integrated into institutional cognition.

---

# CPRT-B — Decision Provenance Reconstruction

## Question

Given a historical cognitive execution or institutional decision path, can SFI reconstruct which cognitive state was available, whether it was consumed, how execution proceeded, what governance occurred, what intervention followed, what return was observed, and how the next state changed?

## Required reconstruction chain

```text
T-2 projector / policy / schema / profile versions
T-1 canonical source cutoff
T0  cognitive snapshot
T1  observations available
T2  admissible evidence / epistemic relations
T3  memory visible
T4  active hypotheses
T5  constraints / rules / exceptions / freezes
T6  cognitive operations executed
T7  alternatives / rejection conditions
T8  proposal produced
T9  ROOT decision
T10 intervention / action
T11 observed return
T12 next-state transition / delta
```

## Required provenance assertions

```text
SNAPSHOT AVAILABLE      PASS
SNAPSHOT CONSUMED FLAG  PASS
SNAPSHOT HASH           PASS
PROJECTION PROFILE      PASS
EXECUTION ID            PASS
MODEL / SUBSTRATE INFO  PASS when applicable
PROMPT / TEMPLATE HASH  PASS when applicable
OPERATIONS              PASS
ALTERNATIVES            PASS
PROPOSAL                PASS
ROOT ACTION             PASS
INTERVENTION            PASS
RETURN                  PASS
TRANSITION              PASS
ANCESTRY                PASS
EPISTEMIC CLASSES       PASS
HASH CHAIN              PASS
```

## Reproducibility distinction

`STATE REPRODUCIBILITY` is mandatory.

`MODEL OUTPUT REPRODUCIBILITY` is a separate property and depends on the model substrate, model version, parameters, prompt/template, seed support, and execution environment.

CPRT-B must not fail state provenance merely because a probabilistic model cannot reproduce byte-identical text years later, provided the exact historical execution output and its provenance were preserved.

## Failure classification

A failed reconstruction must be classified rather than narratively repaired.

Allowed high-level classes:

- `STATE_FAILURE`
- `EXECUTION_FAILURE`
- `GOVERNANCE_CHOICE`
- `INTERVENTION_FAILURE`
- `WORLD_MODEL_MISMATCH`
- `RETURN_OBSERVATION_FAILURE`
- `PROVENANCE_GAP`
- `SECURITY_INTEGRITY_FAILURE`

A provenance gap is preserved as debt. It is not filled retrospectively with an inferred story.

## Gate

```text
NO "SFI COGNITIVE SPINE INTEGRATED" UNTIL CPRT-B = PASS.
```

Passing CPRT-B declares:

`COGNITIVE SPINE INTEGRATED`

only for the implementation scope actually covered by the test.

---

# Sampling and regression

Once implemented, CPRT should support both:

1. deterministic fixture-based regression tests; and
2. reconstruction of randomly selected historical decisions with sufficient preserved provenance.

A future continuous audit may sample historical decisions periodically, but the semantic test logic must remain runnable locally and must not depend on Vercel cron infrastructure.

# Non-goals

CPRT does not prove that SFI's beliefs are true, that a model reasoned correctly, or that an intervention was optimal. It proves reconstruction, semantic identity, and provenance completeness within the declared contract.