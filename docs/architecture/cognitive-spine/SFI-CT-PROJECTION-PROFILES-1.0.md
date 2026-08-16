# SFI-CT-PROJECTION-PROFILES-1.0

Status: FROZEN
Version: 1.0
Date: 2026-08-16

## Purpose

Define how a sealed System Friction Institute (SFI) cognitive snapshot may be exposed to different operational surfaces without making Cognitive Twin (CT) context mandatory or universal.

`CT AVAILABLE ≠ CT CONSUMED`.

A projection profile controls visibility over an already-produced immutable snapshot. It does not create new epistemic judgments and does not mutate the snapshot.

## Profile contract

Each profile must declare:

```ts
type CognitiveProjectionProfile = {
  profileId: string
  version: string
  surface: string
  allowedRefKinds: string[]
  deniedRefKinds: string[]
  fieldVisibilityRules: Record<string, unknown>
  blindedByDefault: boolean
  purpose: string
}
```

A profile is versioned. Historical execution provenance must reference the exact profile version used.

## Baseline profiles

### ROOT_GOVERNANCE_CONTEXT_V1

Purpose: provide governed institutional context for ROOT deliberation while preserving the distinction between epistemic state and governance authority.

May expose, as permitted:
- active hypotheses and statuses
- contradictions
- approved decisions and precedents
- verification and return debt
- freezes and blocked questions
- relevant temporal deltas
- provenance and uncertainty

Must not allow ROOT to mutate epistemic class through the projection mechanism.

### FIELD_CASE_CONTEXT_V1

Purpose: expose only case-relevant prior institutional context where prior knowledge is operationally justified.

Must support `ctSnapshotConsumed = false` for blinded observation modes.

### FIELD_BLINDED_OBSERVATION_V1

Purpose: explicitly prevent prior CT context from influencing capture when expectation contamination is a methodological risk.

The snapshot may be recorded as available for provenance, but not exposed to the observer/execution.

### STUDIO_OBJECT_CONTEXT_V1

Purpose: expose object-specific temporal history, prior decisions, version relationships, approved relevant memory, and provenance without granting Studio authority over institutional truth.

### LAB_EXPERIMENT_CONTEXT_V1

Purpose: consume only the exact context declared by a protocol. Frozen experiments must bind to an exact snapshot hash, source cutoff, projector version, policy version, schema version, and profile version.

No live CT advancement may silently enter a frozen experimental run.

### LAB_BLINDED_V1

Purpose: execute a protocol arm without CT context while retaining explicit provenance that an operational CT state existed but was not consumed.

### WORLDSPECT_CONTEXT_V1

Purpose: compare external observations/signals with prior institutional state without converting expectation into observation or evidence.

### ATLAS_TEMPORAL_CONTEXT_V1

Purpose: expose lineage, temporal transitions, and graph relationships needed to inspect trajectories. Atlas may represent relationships but does not promote their epistemic class.

### LIBRARY_IMPACT_CONTEXT_V1

Purpose: expose which formalized artifacts, decisions, or records are associated with later cognitive-state transitions. Association is not automatically causality.

### RUNTIME_GENERAL_CONTEXT_V1

Purpose: provide a bounded, shared snapshot-derived context to the Cognitive Runtime. All participating agents in one execution must receive the same sealed semantic cut unless a protocol explicitly declares differentiated visibility.

The Runtime and individual agents must not independently query live CT state mid-execution to enrich the same run.

## Consumption trace

Every execution that can access CT must persist or emit an auditable record equivalent to:

```ts
type CtConsumptionTrace = {
  ctSnapshotAvailable: string | null
  ctSnapshotConsumed: boolean
  snapshotHash?: string
  projectionProfile?: string
  profileVersion?: string
  consumptionReason?: string
}
```

## Selective consumption rule

The Cognitive Spine is universally available where operationally connected and universally traceable, but selectively consumed.

No surface is required to consume CT merely because CT exists.

## Deployment independence

Projection profiles are semantic configuration, not Vercel configuration. The same profile must be usable by:

- local/offline CLI execution
- a persistent institutional worker/server
- batch experimental runners
- local model/Ollama pipelines
- Vercel API routes
- UI clients consuming already-produced state

A Vercel route may request or expose a projection. It must not become the only place where projection semantics exist.

## Runtime placement guidance

Recommended execution placement:

```text
LOCAL / OFFLINE
- CPRT reconstruction
- historical replay
- experiment batches
- local-model runs
- development fixtures

PERSISTENT WORKER / OWN SERVER
- long-running projection/reconstruction
- scheduled institutional processing
- high-volume lineage resolution
- provider-heavy cognitive execution

VERCEL
- UI
- authentication / authorization edge
- thin APIs
- bounded orchestration
- status / observability endpoints
```

This is an operational recommendation, not a semantic distinction. Identical contractual inputs must yield identical semantic outputs regardless of substrate.

## Prohibitions

A profile must not:

- upgrade epistemic class
- create evidence
- invent independence
- alter canonical records
- mutate the sealed snapshot
- grant a surface authority it does not otherwise possess
- silently switch from frozen to live CT state
- hide whether CT context was consumed