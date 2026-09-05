# WS-02 · TWIN + METHOD LAB · R3

**Slice:** TWIN AMENDMENT LINEAGE + GENERAL EXPERIMENT CONTRACT  
**Baseline:** `0b97fdb277eb4af0a537a60837ceb76658199c20`  
**Branch:** `ws02/r3-twin-amendment-experiment-contract`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Owner preflight

R3 reuses the owners already present in `main`:

- Cognitive Twin contracts and state: `src/core/cognitive-twin/**`;
- transversal immutable lineage: `epistemic_events` through `src/core/memory/epistemicEventWriter.ts`;
- existing Twin persistence: `sfi_cognitive_twin_*` remains unchanged;
- Method Lab contract owner: `src/lib/method-lab/**`;
- Method Lab persistence: existing converged `sfi_lab_analyses`;
- existing ROOT/governance promotion and decision writers remain canonical.

No second Twin memory store, second Method Lab event universe, second event writer or new database table is introduced.

## 2. Twin state contract

`SFI-COGNITIVE-TWIN-STATE-1.0` represents one explicit transition containing:

```text
state(t0)
available evidence(t0)
attention configuration(t0)
decision(t0)
prediction(t0)
world vector(t0)
method configuration(t0)
outcome(t1)
error
contradiction
delta cognition
state(t1)
```

The transition records T0/T1 timestamps, explicit evidence refs and prior lineage refs. An outcome at T1 is rejected unless it carries outcome evidence refs. The contract boundary is `MODEL_CONTEXT_IS_NOT_TWIN_MEMORY`.

Persistence appends `cognitive_twin.state.transition_recorded` to the existing `epistemic_events` owner. It does not update historical Twin state and does not mutate canon.

## 3. Learning amendment lineage

`SFI-COGNITIVE-TWIN-LEARNING-LINEAGE-1.0` implements:

```text
CANDIDATE -> ACCEPTED
CANDIDATE -> REJECTED
LEARNING_A -> SUPERSEDED_BY -> LEARNING_B
```

All transitions are append-only epistemic events.

Fail-closed rules:

- learning ID must begin as a recorded CANDIDATE;
- ACCEPTED/REJECTED requires explicit `authorityRef` and rationale;
- a candidate may receive one decision;
- only an ACCEPTED learning may be superseded;
- the superseding learning must also already be ACCEPTED;
- self-supersession is rejected;
- an already superseded learning cannot be superseded again by this contract;
- `ACCEPTED != CANON`;
- `canonicalMutation = false`;
- `destructiveRewrite = false`.

This layer does not replace the existing canonical ROOT/founder-rule writer. It records governed learning lineage and preserves every prior event ID/hash.

## 4. General experiment contract

`SFI-METHOD-LAB-EXPERIMENT-1.0` extends the existing Method Lab contract owner without replacing `SFI-METHOD-LAB-RUN-1.0` or existing protocol implementations.

First-class experiment types:

```text
SIMULATION
REPLAY
REENTRY
COUNTERFACTUAL
MODEL_COMPARISON
PASSPORT_COMPARISON
TWIN_COMPARISON
INTERVENTION_DESIGN
OBSERVATIONAL
```

Preregistration requires:

```text
METHOD
HYPOTHESIS
T0
POPULATION / SYSTEM
INPUTS
CONTROL
VARIANTS
EXPECTED SIGNAL
FALSIFICATION
STOPPING RULE
RETURN WINDOW
```

Every represented run contains:

```text
PREREGISTERED
EXECUTED
RESULT
CONTRAST
LIMITATIONS
REPRODUCIBILITY_RECEIPT
```

The contract is representation/persistence infrastructure. It does not add autonomous execution for all experiment types in this slice.

## 5. Preregistration semantics

Preregistrations are inserted into the existing `sfi_lab_analyses` owner using deterministic IDs:

```text
method-lab:prereg:<experimentId>
```

The stored record includes a SHA-256 definition hash. Existing preregistration rows are reread and hash-checked before a run may be appended. The implementation uses INSERT, never UPDATE/UPSERT/DELETE, so a conflicting preregistration ID fails rather than silently changing T0, hypothesis, method, falsification or stopping terms.

This is internal SFI preregistration. No OSF registration or external registration receipt is asserted.

## 6. Run and RETURN semantics

Runs append to `sfi_lab_analyses` as:

```text
method-lab:run:<runId>
```

For any experiment other than `OBSERVATIONAL`, RESULT cannot carry `OBSERVED` epistemic class.

A CONTRAST with status `AVAILABLE` requires a `realityReturn` with:

```text
source = REALITY
observedAt
evidenceRefs
outcome
```

Therefore:

```text
SIMULATION != OBSERVATION
PREDICTION preserves T0
RETURN comes from observable reality
```

A simulation/model/replay/counterfactual result cannot become an observation by inheritance.

## 7. Persistence / RLS

Persistence delta: **NONE**.

No migration is added. Existing RLS remains authoritative:

- `epistemic_events` remains the immutable institutional event owner;
- `sfi_lab_analyses` remains the converged Method Lab owner;
- existing `owner_id` / authenticated-owner-read semantics remain unchanged;
- institutional rows continue through governed server-side writers.

RLS delta: **NONE**.

## 8. Authority and contract boundaries

Authority delta: **NONE**.

The slice cannot:

- mutate canon;
- promote learning into canon;
- create real-world intervention execution authority;
- convert experiment output into observation;
- create provider/model-specific authority;
- bypass ROOT/governance promotion writers.

Shared frozen program contract delta: **NONE**. The implementation adds owned WS-02 subcontracts beneath existing frozen invariants.

## 9. QA / gates

The slice is absorbed into existing SFI Verify jobs rather than adding a competing workflow.

`SFI-TWIN-AMENDMENT-LINEAGE-1.0` is enforced inside:

```text
scripts/qa-sfi-cognitive-twin-reentry.ts
```

It proves the T0/T1 contract, evidence requirement, model-context boundary, governed ACCEPTED/REJECTED, authority requirement, non-self supersession, accepted-only supersession, canonical separation and append-only event behavior.

`SFI-METHOD-LAB-EXPERIMENT-CONTRACT-1.0` is enforced inside:

```text
scripts/qa-sfi-method-lab-convergence.ts
```

It proves all nine experiment types, all required preregistration/run fields, simulation/observation separation, REALITY-only RETURN contrast, immutable preregistration semantics, shared-store reuse and absence of destructive persistence.

Existing typecheck/build and all other SFI Verify gates remain mandatory.

## 10. Explicitly deferred

Not implemented in this slice:

- OSF external registration;
- broad Twin/Method Lab UI redesign;
- Runtime DAG;
- MCP;
- Discovery;
- Audio;
- autonomous execution for the general experiment taxonomy;
- real-world intervention writer.

## 11. Rollback

Rollback consists only of reverting the WS-02 R3 code/docs changes. There is no schema rollback because the slice introduces no migration and no new persistence owner.
