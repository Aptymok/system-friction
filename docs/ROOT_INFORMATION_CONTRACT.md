# ROOT Information Consumption Contract

ROOT is the founder-only governance console of System Friction Institute. It does not own domain data and must not manufacture a second copy of FIELD, STUDIO, WorldSpect, AMV or prediction state. ROOT consumes canonical persisted state and exposes governed actions.

## Layer contracts

### Signals
Consumes: `worldspect_snapshots`, `world_vector_observations`, canonical system-state observations and current instrument warnings.
Shows: observed signal, time, source, confidence, persistence and contradictory evidence.
Must not show: narrative drafts as observations, fallback metrics or decorative signals.

### Evidence
Consumes: `root_evidence_entries`, `sfi_evidence_ledger`, `epistemic_events`, canonical graph nodes and edges.
Shows: provenance, lineage, epistemic class, verification state and relationships.
Must not infer a relationship when no persisted edge exists.

### Hypotheses and predictions
Consumes: `sfi_predictive_models`, `sfi_predictive_runs`, evidence requests, outcomes and learning events.
Shows: hypothesis, horizon, expected observations, contradictory observations, confidence, outcome and calibration.
Must not treat an open prediction as a verified fact.

### Memory
Consumes: `sfi_amv_memory` and canonical institutional-memory events.
Shows: recurrence, source events, validation state and retrieval context.
Must not equate ingestion with verification.

### Attractors and ejectors
Consumes: persisted AMV attractors/ejectors, phenomenon evidence and longitudinal returns.
Shows: direction, persistence, supporting observations, contradiction and affected variables.
Must not create visual attractors only to fill the field.

### Agents
Consumes: `SFI_COGNITIVE_AGENT_REGISTRY`, real agentic capabilities, runtime execution traces and provider state.
Shows: every registered agent, its purpose, layer, authority, availability, missing capability, last execution and provider when observed.
Must not use subsystem rows as a substitute for the agent inventory.

### History
Consumes: audit events, governed proposals, mutations, execution events, prediction outcomes and learning events.
Shows: chronological institutional changes and their audit references.
Must not mix unpersisted UI actions into institutional history.

### Governance
Consumes: action proposals, mutation queue, evidence requirements, risk declarations, approvals and audit events.
Shows only decisions that genuinely require founder authorization.
Observation, calibration and ordinary institutional learning do not require recurring founder validation.

## Canonical distinction

- **Subsystem**: World Vector, evidence graph, AMV, predictive engine, telemetry and cognitive runtime.
- **Agent**: a registered cognitive or agentic capability that observes, reconstructs, simulates, projects, decides, reports or learns.
- **Execution**: a trace of an agent or governed capability running.

These three concepts must never share the same counter.
