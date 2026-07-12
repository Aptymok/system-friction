# SFI Predictive Learning Engine

## Purpose

This engine is the independent prediction, interpretation, verification and calibration layer for System Friction Institute. It is not owned by Studio, ROOT, Observatory, Field, ScoreFriction or AMV. Those surfaces are adapters and consumers.

The canonical cycle is:

```text
OBSERVE
→ BUILD FEATURE VECTOR
→ PREDICT WITH INTERVAL
→ AMV INTERPRETS WITHOUT CHANGING NUMBERS
→ REQUEST MISSING EVIDENCE
→ TEST OR HOLD
→ REGISTER OUTCOME
→ QUANTIFY ERROR
→ EXPLAIN FAILURE
→ UPDATE OR REJECT LEARNING
→ PRESERVE BEFORE/AFTER STATE
→ PREDICT AGAIN
```

## What is artificial intelligence here

The engine deliberately separates two forms of intelligence.

### Quantitative prediction

A versioned model produces:

- a probability or normalized continuous estimate;
- lower and upper bounds;
- confidence;
- feature contributions;
- calibration status;
- missing evidence requests;
- a verification rule and due date.

The initial model is a declared prior. It is not presented as empirically calibrated until enough verified outcomes exist.

### AMV interpretation

AMV receives the immutable numerical output and explains:

- the strongest drivers;
- contradictions and tensions;
- missing evidence;
- epistemic risk;
- drift risk;
- the next reversible test;
- why a prediction failed after the outcome returns.

AMV may use the configured LLM provider router. The LLM cannot alter the prediction, interval, feature vector, error or parameter update. If no provider is available or JSON is invalid, the deterministic interpretation remains valid.

## Persistent state

The migration creates:

- `sfi_predictive_models`: versioned parameters, priors, metrics and status;
- `sfi_predictive_runs`: immutable prediction snapshots and AMV assessments;
- `sfi_predictive_evidence_requests`: explicit evidence gaps;
- `sfi_predictive_outcomes`: observed return values and source quality;
- `sfi_predictive_learning_events`: error, before state, delta, after state and AMV post-mortem.

Existing `sfi_prediction_entries` and `sfi_prediction_verifications` remain valid. The new engine does not delete or rewrite them. They can be linked through `legacy_prediction_entry_id` when a domain adapter needs the legacy truth protocol.

## Calibration and permission to be wrong

A model must be allowed to predict before it is calibrated, but the interface must show its state:

- `BOOTSTRAP_UNCALIBRATED`: fewer than 10 verified outcomes;
- `LEARNING`: 10–29 verified outcomes;
- `CALIBRATED`: at least 30 verified outcomes without drift thresholds;
- `DRIFT_WARNING`: accumulated Brier or bias exceeds the declared limits;
- `FROZEN`: updates are disabled.

Error is measured for every evaluable binary outcome:

```text
residual = predicted - actual
absolute_error = |residual|
brier = residual²
```

Online updates use a small, quality-weighted logistic gradient. Weights and intercepts are clipped. A single case cannot radically rewrite the model.

Learning is applied only when:

- an observable outcome exists;
- source quality is VERIFIED or sufficiently strong OBSERVED evidence;
- intervention fidelity is adequate;
- the model is ACTIVE;
- the case is not blocked by severe drift requiring review.

Learning is rejected when evidence is declared, inferred, unverifiable or below the quality threshold. Rejected events are still recorded.

## Failure classes

The engine distinguishes:

- `WITHIN_EXPECTED_ERROR`;
- `OVERPREDICTION`;
- `UNDERPREDICTION`;
- `MISSING_EVIDENCE_BIAS`;
- `INTERVENTION_FIDELITY_FAILURE`;
- `MODEL_OR_FIELD_DRIFT`;
- `UNVERIFIABLE_OUTCOME`.

AMV explains these classes using the actual residual and evidence state. It must not invent a psychological or cultural cause that is absent from the stored context.

## Evidence return and versioning

When requested evidence is fulfilled:

1. the evidence request is marked `FULFILLED`;
2. the original run remains unchanged;
3. a new run is generated with the evidence and optional feature value;
4. the original run becomes `SUPERSEDED`;
5. the new run records `supersedesRunId` in its context.

This prevents retrospective rewriting.

## Automatic reconciliation

Vercel runs `/api/cron/predictive-engine` daily. It:

- marks expired OPEN or WAITING_EVIDENCE runs as `DUE`;
- raises open evidence requests to HIGH priority;
- does not invent or close outcomes;
- records the reconciliation in the SFI logbook.

Configure `PREDICTIVE_ENGINE_CRON_SECRET` or reuse `CRON_SECRET`.

## APIs

### Create a prediction

`POST /api/predictive-engine/predict`

Required:

- `scope`;
- `subjectType`;
- `subjectId`;
- `features[]`.

Optional:

- model and target keys;
- evidence;
- context;
- verification rule;
- return window.

### Read a run

`GET /api/predictive-engine/runs/:id`

Returns the immutable run, evidence requests, outcomes and learning events. Ownership or founder authority is required.

### Fulfil evidence and repredict

`POST /api/predictive-engine/runs/:id/evidence`

May include a normalized `featureValue` and confidence. It generates a new run and supersedes the previous one.

### Register outcome and learn

`POST /api/predictive-engine/runs/:id/outcome`

The payload must include source type and source quality. `actualValue` must be normalized to `[0,1]` for current binary models.

### Health

`GET /api/predictive-engine/health`

Founder-only aggregate status: runs, due returns, verified outcomes, applied learning and calibration metrics.

## Studio adapter

Studio field projection is the first domain adapter. After WorldSpect, Cultural Vector, object features and partial MIHM are calculated, it creates a `studio_field_response_v1` predictive run.

The target is `field_response_30d`, defined as a normalized response observable, not an automatic claim of taste or acceptance. The verification rule requires exposure-comparable outcome evidence within 30 days.

Studio can continue operating if the predictive tables are not yet migrated. Its projection response includes a `PREDICTIVE_ENGINE_UNAVAILABLE` warning rather than failing the object analysis.

## AMV integration

AMV exposes the `predictive-engine` scope. It observes:

- active models;
- due predictions;
- verified outcomes;
- applied updates;
- drift warnings;
- calibration state.

AMV is the meta-observer and interpreter. The predictive engine owns numerical state and mathematical updates.

## Cross-site adoption rule

Every module must call the shared library or generic API. No route may create a private probability formula or self-learning table.

A domain adapter must provide:

1. normalized features with confidence and evidence IDs;
2. a named observable target;
3. a predeclared verification rule;
4. a return window;
5. an outcome normalizer;
6. source-quality and intervention-fidelity values.

Recommended adapter order:

1. Studio — implemented;
2. ScoreFriction cultural hypotheses;
3. Field interventions and returns;
4. ROOT governance proposals;
5. World Vector regime transitions;
6. Observatory sanitized read-only projections.

Observatory must never expose private subject IDs, raw evidence, model parameters or user-owned outcomes.

## Non-claims

- The model does not learn from its own generated prose.
- LLM output is not ground truth.
- A prior-based prediction is not calibrated probability.
- A due prediction is not a failed prediction.
- A single error does not invalidate the model.
- A parameter update is not automatically a better model; metrics and future outcomes must confirm improvement.
