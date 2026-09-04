# WS-02 · TWIN + METHOD LAB

**Mission:** make Cognitive Twin and Method Lab a governed, reproducible experimental system that preserves external cognitive state, lineage, reentry comparison, amendment semantics and strict simulation/observation separation.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Existing owners to inspect

Before implementation inspect:

- current Cognitive Twin core, learning/quarantine and Cognitive Spine materializer;
- `/twin`, `/twin/learning` and ROOT learning review paths;
- `src/lib/method-lab/**`;
- current simulation/replay contracts;
- Cognitive Olympics/reentry tooling if still relevant;
- current Universal Signal/Cognitive Cycle lineage consumed by Twin;
- existing learning events and promotion/rejection writers.

Do not create a second Twin memory store or second Method Lab event universe.

## 2. Target outcome

Twin persists external state such as:

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

Model context may consume this state but does not own it.

Method Lab must support reproducible:

```text
SIMULATION
REPLAY
REENTRY
COUNTERFACTUAL
MODEL COMPARISON
PASSPORT COMPARISON
TWIN COMPARISON
INTERVENTION DESIGN
OBSERVATIONAL
```

without converting experimental output into OBSERVATION.

## 3. Owned implementation domain

Primary ownership:

```text
src/core/cognitive-twin/**
src/lib/method-lab/**
Twin/Method Lab routes and UI
Twin/learning QA/docs
```

Changes to shared runtime contracts require SFI-00 sequencing with WS-01.

## 4. Required functional slices

### Slice A — Twin State Contract

Create/absorb a canonical state projection that can reconstruct:

- what evidence existed at T0;
- what configuration/patterns were active;
- what decision/prediction was produced;
- what later RETURN/outcome occurred;
- what changed afterward.

No raw conversational transcript is required to qualify as Twin state.

### Slice B — Learning Amendment Lineage

Current promotion/rejection remains canonical.

Add explicit non-destructive amendment semantics:

```text
CANDIDATE
→ PROMOTED / REJECTED
→ optional AMENDED_BY / SUPERSEDED_BY
```

Every amendment preserves prior object/event IDs and rationale.

Never silently UPDATE historical meaning.

### Slice C — Experiment Contract

Each experiment must persist:

```text
experimentId
protocolType
hypothesis
T0
subject/system definition
input refs
control
variants
expected signal
falsification condition
stopping rule
RETURN window
model/passport versions
randomness/seed where applicable
execution receipts
result
limitations
```

### Slice D — Reentry Engine

Implement governed reentry of the same case/problem against different cognitive configurations.

Comparison dimensions:

```text
Δattention
Δevidence_selection
Δhypothesis_generation
Δcontradiction_detection
Δuncertainty
Δdecision
Δintervention
Δprediction
Δoutcome
```

The system must distinguish a change caused by model, passport, evidence set, Twin state or experiment configuration where observable.

### Slice E — Method Lab UI

Expose enough UI to:

- choose experiment type;
- select case/evidence/Twin state;
- declare hypothesis/T0/stopping/RETURN terms;
- view variant configuration;
- run allowed experiments;
- compare results;
- inspect lineage;
- export preregistration metadata.

Do not expose a button that implies experimental output has been canonized.

### Slice F — Preregistration Export

Provide a structured export suitable for external registration workflows:

```text
HYPOTHESIS
T0
METHOD
STOPPING TERMS
EXPECTED SIGNAL
RETURN CRITERIA
```

No automatic claim that an OSF registration exists until external receipt exists.

## 5. Required integration with WS-01

When adaptive runtime is available:

- experiments may specify passport sets;
- a run may permit or forbid adaptive capability requests;
- capability/model decisions must be captured in experiment receipts;
- model/provider swaps remain experimental variables, not Twin identity changes.

## 6. Forbidden outcomes

- Twin = long prompt;
- Twin = provider memory;
- destructive learning rewrite;
- simulated output promoted to observation;
- experiment with no T0 or lineage claiming calibration;
- counterfactual presented as historical fact;
- hidden private Twin state emitted into public Discovery Mesh;
- uncontrolled experiment that mutates canon/ROOT authority.

## 7. QA gates

Required new/absorbed gates must prove:

1. same historical learning remains reconstructable after amendment;
2. reentry uses frozen T0 inputs and reports configuration deltas;
3. simulation/replay output cannot become OBSERVED by inheritance;
4. model swap does not overwrite Twin identity/history;
5. Method Lab run has reproducibility receipt;
6. private Twin state does not leak into public routes;
7. promotion/rejection still uses canonical writer.

Retain existing Cognitive Spine, Method Lab, authority, typecheck and build gates.

## 8. Definition of done

WS-02 is complete only when:

- Twin state is explicitly external/model-independent;
- learning can be amended/superseded with lineage;
- Method Lab supports the full experiment taxonomy above;
- same-case reentry comparison is real and reproducible;
- experiment receipts expose model/passport/evidence differences;
- preregistration export is usable without fabricating external registration;
- all gates pass and SFI-00 observes correct behavior after integration.

## 9. Handoff

```text
BASE SHA
BRANCH
COMMITS
FILES CHANGED
MIGRATIONS
EVENTS
EXPERIMENT TYPES IMPLEMENTED
CONTRACT DELTAS
QA
KNOWN DEFECTS
DEPENDENCIES
PR
NEXT SAFE ACTION
```

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-02 · TWIN + METHOD LAB**.

Work only from fresh `Aptymok/system-friction` state and the program documents, especially `docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md`. Inspect existing Twin, Cognitive Spine, learning and Method Lab owners before creating anything.

Implement the maximum current complete architecture: externally persisted Twin state, non-destructive learning amendment/supersession, full experiment contract, reentry engine, comparative metrics, Method Lab UX and preregistration export. Preserve strict `SIMULATION != OBSERVATION` and `MODEL CONTEXT != TWIN MEMORY` boundaries.

Coordinate shared runtime changes through SFI-00/WS-01. Do not create a second Twin store or second experiment subsystem. You may branch/commit/open PRs; you may not merge. No mocks, fake registrations or TODO-based pseudo-completion. Execute QA/typecheck/build and leave a durable handoff.

Proceed now from actual repository state.
