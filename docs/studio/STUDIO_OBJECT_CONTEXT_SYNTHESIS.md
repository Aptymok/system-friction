# Studio Object–Context Synthesis

## Purpose

This layer answers a different question from extraction.

Extraction asks: **what measurable structure exists in the object?**

Object–context synthesis asks:

1. What can be stated from the object evidence?
2. How does the object relate to persisted Cultural / Memetic / Affective WorldSpect trajectories?
3. Which MIHM variables are actually measurable, which are only proxies, and which remain missing?
4. Is there a reversible minimum perturbation candidate that preserves a declared attractor?
5. What signal would verify or falsify that candidate?

The synthesis must not infer cultural meaning from acoustic form alone.

## Required separation

### Object evidence

Derived only from persisted `studio_object_features`, modality tables, time coordinates, checksums and evidence traces.

### World context

Derived from the current World Vector read model and persisted WorldSpect snapshots. Studio does not refresh WorldSpect during render or synthesis.

### MIHM

Each variable declares:

- value or `MISSING`;
- evidence IDs;
- explanation;
- warnings;
- whether the value is a modality-specific proxy.

The canonical MIHM variable set is:

- `F_s` systemic friction;
- `D_i` interaction density;
- `G_f` friction gradient;
- `C_s` systemic coherence;
- `D_cog` cognitive phase displacement;
- `E_r` relational energy;
- `V_i` intentional vector;
- `I_mc` multichannel interaction;
- `Phi` jump potential;
- `R_sem` semantic recurrence;
- `C_sem` semantic coherence.

An IHG value is not emitted unless all six core variables are measured:

`F_s`, `D_i`, `E_r`, `C_s`, `D_cog`, `G_f`.

For an isolated audio file, `E_r`, `D_cog` and `V_i` normally remain missing. Therefore the valid result is usually a **partial MIHM reading**, not a final IHG.

## Declared attractor gate

A perturbation must not be generated unless the operator declares what must be preserved or reached.

Context fields:

- declared attractor;
- desired shift;
- target audience or field;
- prohibited effects.

Without a declared attractor, Studio can describe the object and produce a partial diagnostic, but leverage and intervention remain blocked.

## Minimum perturbation contract

A candidate must include:

- exact scope;
- target variable;
- minimum reversible change;
- properties to preserve;
- expected measurable signal;
- verification window;
- falsification criterion;
- evidence IDs;
- rationale.

A candidate is not an executed intervention. It is inserted in `studio_interventions` with status `queued` and payload status `CANDIDATE_NOT_EXECUTED`.

## Current calibrated audio rules

### Clipping pressure

If `clipping_risk > 0.0015`, propose reducing gain or limiter input by 1–2 dB without changing composition or arrangement.

Verification: clipping falls below the threshold without materially reducing dynamic range.

### Low dynamic contrast

If `dynamic_range_db < 5`, propose one local contrast window rather than a global rewrite.

Verification: dynamic range increases by at least 2 dB without increasing clipping.

### High friction and low coherence

If partial MIHM observes high `F_s` and low `C_s`, target only the highest-gradient transition.

Verification: `C_s` increases or `F_s` decreases without reducing `Phi`.

### No threshold crossed

Return `NO_CHANGE_REQUIRED`. Preservation and continued observation are valid actions.

## Cultural relation

Audio form alone cannot establish whether an object is culturally aligned, oppositional, timely or effective.

For audio, WorldSpect is displayed as longitudinal context and the relation remains `INDETERMINATE` until additional semantic or reception evidence exists, such as:

- lyrics or transcript;
- declared intention;
- target audience;
- distribution context;
- reactions, saves, shares, completion or retention;
- return/outcome evidence.

Text or community objects may receive a limited formal relation when a compatible observed feature, such as recurrence, can be compared with at least three persisted snapshots. This remains alignment of a measured dimension, not proof of causal impact.

## Persistence

The synthesis persists:

- a complete trace in `studio_evidence_traces`;
- a hypothesis in `studio_hypotheses` when a testable statement exists;
- an intervention candidate in `studio_interventions` only when a calibrated leverage rule is crossed;
- synthesis references in `studio_objects.metadata.objectContextSynthesis`.

## Non-claims

Studio does not claim:

- that acoustic brightness equals affect;
- that density equals cultural relevance;
- that alignment predicts success;
- that a hypothesis is verified before an outcome;
- that a queued intervention was executed;
- that a partial MIHM reading is a final IHG.
