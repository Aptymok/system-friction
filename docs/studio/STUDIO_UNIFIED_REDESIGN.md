# Studio Unified Redesign

## Purpose

Studio is no longer organized around isolated technical modules. Its primary interface follows the complete operational lifecycle of an analyzed object:

`OBJECT → OBSERVATION → SYSTEMIC READING → PROJECTION → DECISION → RETURN`

The redesign changes presentation and workflow only. It does not duplicate or replace the ingestion, multimodal extraction, MIHM, WorldSpect, Cultural Vector, AMV or predictive-learning engines.

## Primary stages

1. **Object** — identity, private source, storage, analysis and pipeline state.
2. **Observation** — observed and derived features, waveform, energy, evidence and explicit absences.
3. **Systemic reading** — world regime, cross-vector tensions, inferred attractors and partial MIHM.
4. **Projection** — field compatibility, predictive run, uncertainty, AMV state and opportunity window.
5. **Decision** — selected route, alternative scenarios, micro-adjustments, verification and guardrails.
6. **Return** — outcome registration, prediction error, evidence requests and learning events.

## Epistemic contract

- Observed values remain distinct from derived values.
- Field compatibility is not acceptance probability.
- Bootstrap predictions are hypotheses with explicit intervals and confidence.
- LLM interpretation cannot rewrite numerical drivers.
- Recommendations are candidate interventions, not executed actions.
- Outcomes update the model only when evidence quality and execution fidelity permit it.
- Prior predictive runs remain immutable historical evidence.

## Technical boundary

The redesign consumes existing APIs and shared engines. Core calculation remains under:

- `src/lib/studio/`
- `src/lib/predictive-engine/`
- `src/lib/amv/`

The principal presentation components are:

- `StudioProductionShell.tsx`
- `StudioSidebar.tsx`
- `StudioHeader.tsx`
- `StudioUnifiedIntelligence.tsx`

## Outcome workflow

The Return stage submits outcomes to the existing predictive endpoint. It records:

- normalized outcome in `[0, 1]`;
- source type and reference;
- source quality;
- intervention fidelity;
- operator context.

The response exposes whether learning was applied, rejected for low quality, rejected as unverifiable or held for review.

## Non-goals

- No mock metrics.
- No second MIHM implementation in React.
- No duplicated predictive model inside Studio.
- No automatic execution of interventions.
- No hiding of missing evidence or uncertainty.
