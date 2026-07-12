# Studio Field Projection v2

## Purpose

Studio must not require the operator to translate System Friction terminology before receiving a useful result. The default flow is now:

`object -> observed features -> partial MIHM vector -> longitudinal world state -> cross-vector tensions -> inferred attractors -> field compatibility -> opportunity window -> strategy routes -> micro-adjustments -> verification`

User input is optional. It can select a route or add personal constraints, but it does not gate diagnosis or projection.

## What the projection says

The projection reports:

1. The current regime of the CULTURAL, MEMETIC and AFFECTIVE field.
2. Directional or magnitude tensions between those vectors.
3. One or more system-inferred attractors.
4. The object's partial MIHM vector using every available variable.
5. A field compatibility score and confidence.
6. A conditional opportunity window with explicit exit conditions.
7. Three strategic routes:
   - integrate with the field;
   - preserve the object as a counter-signal;
   - optimize technically without changing direction.
8. Specific micro-adjustments and measurable verification steps.
9. Automatic guardrails derived from observed invariants.

## MIHM behavior

A missing final IHG does not block use of the measured MIHM vector. Studio shows all available variables and their provenance. Missing variables remain missing rather than being imputed as if they were observed.

The final IHG remains unissued when the canonical core is incomplete. This limitation is visible in the technical trace, but it no longer prevents field projection or scenario generation.

## Compatibility is not acceptance

`FIELD_COMPATIBILITY_NOT_ACCEPTANCE` compares only dimensions shared by the object and the observed field. Current mappings include:

- formal friction to AFFECTIVE pressure as a declared formal proxy;
- formal coherence to CULTURAL pressure as a declared formal proxy;
- semantic recurrence to MEMETIC pressure when semantic evidence exists.

Every dimension states whether it is a semantic comparison or a formal proxy.

The UI may display a compatibility percentage, but `acceptanceProbability` remains `null` until empirical outcome calibration exists.

## Acceptance calibration

A minimum viable calibration requires at least 30 comparable releases; 100 or more are recommended. Each case must persist:

- object and version;
- MIHM vector at release;
- WorldSpect and Cultural Vector state at release;
- release time, channel and audience definition;
- normalized exposure or impressions;
- plays/views and completion;
- saves, shares and repeat consumption;
- qualitative response labels;
- 7-day and 30-day outcomes.

Compatibility can be upgraded to an acceptance estimate only after out-of-sample validation on comparable cases with normalized exposure. Until then, any numeric acceptance probability would be fabricated.

## Opportunity window

The opportunity window is heuristic and conditional. It uses:

- dominant vector direction;
- slope magnitude;
- sample count;
- WorldSpect confidence;
- object-field compatibility band.

It always includes exit conditions. It is not a promise that the cultural state will remain unchanged for the full interval.

## Automatic guardrails

Studio derives guardrails from available measurements, for example:

- duration tolerance;
- maximum permitted loss of dynamic range;
- spectral-centroid tolerance;
- no increase in clipping;
- maximum permitted reduction of Phi or C_s.

The user may add personal constraints in ordinary language, but does not need to know the term "prohibited effect".

## Persistence semantics

Projection routes are persisted as scenarios in `studio_interventions` with status `SCENARIO_NOT_EXECUTED`. No route is treated as executed, successful or accepted until an outcome is recorded.
