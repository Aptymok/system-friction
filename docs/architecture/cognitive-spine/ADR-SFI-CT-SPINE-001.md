# ADR-SFI-CT-SPINE-001 — SFI Cognitive Spine

Status: FROZEN FOR IMPLEMENTATION
Version: 1.0
Date: 2026-08-16

## Decision

System Friction Institute (SFI) will treat the institutional Cognitive Twin as a longitudinal cognitive spine, not as a sovereign store, universal middleware, or source of truth.

The Cognitive Spine is defined as a temporal graph of immutable cognitive-state snapshots and explicit transitions derived reproducibly from institutional canonical records and already-assessed epistemic relationships.

`SFI-CT = (S, Δ, L)`

- `S`: immutable cognitive-state snapshots.
- `Δ`: explicit state-transition records.
- `L`: lineage across records, epistemic assessments, snapshots, executions, decisions, interventions, and returns.

## Constitutional separations

```text
RECORD ≠ EVIDENCE
EVIDENCE / EPISTEMIC ASSESSMENT ≠ COGNITIVE STATE
COGNITIVE STATE ≠ COGNITIVE EXECUTION
COGNITIVE EXECUTION ≠ GOVERNANCE
GOVERNANCE ≠ TRUTH
ARTIFACT IDENTITY ≠ SEMANTIC IDENTITY
CT AVAILABLE ≠ CT CONSUMED
```

## Architectural flow

```text
WORLD
  ↓
OBSERVATION
  ↓
CANONICAL EVENT PLANE
  ↓
EPISTEMIC RELATION / POLICY PLANE
  ↓
COGNITIVE STATE PROJECTOR
  ↓
IMMUTABLE COGNITIVE SNAPSHOT
  ├─ CT AVAILABLE
  └─ CT CONSUMED? yes / no
          ↓
COGNITIVE EXECUTION
          ↓
DECISION TRACE
          ↓
ROOT
  governance authority
          ↓
INTERVENTION
          ↓
WORLD
          ↓
OBSERVED RETURN
          ↓
CANONICAL EVENT
          ↓
NEXT COGNITIVE STATE
```

## Parts that conform the whole

The architecture is composed of ten distinct parts. They may share infrastructure, but their responsibilities must not collapse.

### 1. Observation adapters
Capture observations or returns from Field, Studio, WorldSpect, Laboratory, external providers, manual institutional intake, or other governed surfaces. They do not establish truth merely by observing.

### 2. Canonical Event Plane
Holds admissible institutional records of what was observed, declared, executed, decided, returned, invalidated, or otherwise recorded. A canonical event is not automatically evidence for a claim.

### 3. Epistemic Relation / Policy Plane
Owns epistemic judgment: classification, admissibility, claim-evidence relationships, independence, invalidation, and policy-versioned epistemic status. This plane exists outside the Cognitive State Projector.

### 4. Cognitive State Projector
A deterministic operator that reads already-assessed state and performs temporal cutoff, reference resolution, ancestry resolution, deduplication, visibility filtering, deterministic derived summaries, canonical serialization, hashing, and sealing. It must not create new epistemic judgments.

### 5. Cognitive State Snapshot + Temporal Graph
Stores or materializes immutable `CT-vN` semantic states and transition records. Snapshot identity is semantic and reproducible; artifact metadata may differ across reconstructions.

### 6. Cognitive Execution Consumers
Runtime, Field, Studio, Laboratory, Atlas, Library, WorldSpect, or future processes may consume a sealed snapshot through an explicit projection profile. Consumption is selective and traceable, never assumed.

### 7. Decision Trace
Records which snapshot was available, whether it was consumed, the profile used, the execution/model/template context, operations, alternatives, proposal, and provenance needed for reconstruction.

### 8. ROOT Governance Boundary
ROOT retains institutional governance authority over approvals, freezes, interventions, and reserved actions. ROOT cannot promote epistemic class by decree, manufacture independence, erase lineage, or convert governance into truth.

### 9. Intervention / Return Loop
Authorized actions re-enter the world. Their observed returns become new canonical records through the normal observation and epistemic process before they can affect a future snapshot.

### 10. Person → Institution Gate + Verification
Person-level Cognitive Twins can submit candidate contributions, but personal cognitive content never becomes institutional state by inheritance. Cognitive Provenance Reconstruction Tests (CPRT-A and CPRT-B) are required to prove state reconstruction and decision provenance.

## Runtime and deployment decision

The Cognitive Spine is runtime-agnostic. Its semantic core must not depend on Vercel, Next.js request lifecycle, or any single hosted provider.

Required execution topology:

```text
PURE CORE
contracts · canonical serialization · projector · hashing · CPRT logic
        │
        ├── LOCAL / OFFLINE CLI OR RESEARCH WORKER
        ├── LONG-RUNNING OWN WORKER / SERVER
        └── VERCEL THIN API / UI ADAPTERS
```

Vercel may expose UI, authenticated APIs, lightweight orchestration, and bounded serverless jobs. It is not the constitutional execution substrate of the Spine.

Long-running reconstruction, large historical replays, experimental batches, local-model execution, provider-heavy jobs, or tasks requiring filesystem/GPU/process persistence should be runnable outside Vercel from the same contracts.

The canonical semantic result must be identical regardless of execution substrate when the contractual inputs are identical.

## Experimental isolation

Operational SFI-CT may evolve continuously. A registered experiment must consume a frozen snapshot, projector version, policy version, schema version, profile, source cutoff, and semantic hash.

```text
SFI-CT LIVE: v144 → v145 → v146 ...
EXP-001:     CT-v143 🔒
```

An experiment never silently consumes the live SFI-CT state.

## Person CT boundary

`PERSON_CT ≠ SFI-CT`.

Personal cognitive content enters institutional state only through an explicit intake path with provenance, epistemic assessment, admissibility, evidence relations where applicable, and governance where required.

## Implementation gates

```text
NO RUNTIME CONSUMPTION UNTIL CPRT-A = PASS.
NO "SFI COGNITIVE SPINE INTEGRATED" UNTIL CPRT-B = PASS.
```

## Reopening criteria

This frozen decision may be reopened only for:

1. Contradiction in the contract.
2. Demonstrated non-reproducibility.
3. Epistemic leak.
4. Security or integrity defect.

Implementation convenience is not a reopening criterion.

## Explicit non-decisions

This ADR does not declare SFI-CT conscious, autonomous, sovereign, infallible, or equivalent to a person-level twin. It does not require all SFI operations to consume CT context. It does not require Vercel for state reconstruction or execution. It does not create a new source of truth.