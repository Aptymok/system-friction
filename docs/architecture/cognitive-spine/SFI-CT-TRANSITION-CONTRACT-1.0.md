# SFI-CT-TRANSITION-CONTRACT-1.0

Status: FROZEN
Version: 1.0
Date: 2026-08-16

## Purpose

Define the semantic contract for an explicit transition between two immutable System Friction Institute (SFI) cognitive-state snapshots.

A transition records how the projected institutional state changed under declared admitted inputs and versioned rules. It does not assert causal relations unless an independent causal relation has been established elsewhere.

## Artifact envelope

```ts
type CognitiveTransitionArtifact = {
  transitionId: string
  createdAt: string
  runtimeMetadata?: {
    runtime?: 'local' | 'worker' | 'vercel' | 'other'
    runtimeJobId?: string
    workerId?: string
    requestId?: string
  }
  semanticPayload: CognitiveTransitionSemanticPayload
  transitionHash: string
}
```

## Semantic transition payload

```ts
type CognitiveTransitionSemanticPayload = {
  fromSnapshotHash: string
  toSnapshotHash: string

  transitionInputs: string[]
  admittedSourceRefs: string[]
  admittedEpistemicRefs: string[]

  sourceDelta: DeltaRecord
  epistemicDelta: DeltaRecord
  cognitiveStateDelta: DeltaRecord
  governanceDelta: DeltaRecord

  addedRefs: string[]
  removedRefs: string[]
  changedRefs: string[]
  unchangedCriticalRefs: string[]

  projectorVersion: string
  policyVersion: string
  schemaVersion: string
}

type DeltaRecord = {
  changed: boolean
  refs: string[]
  summary?: string
}
```

## Four non-equivalent deltas

### SOURCE DELTA
Canonical records available to the projection changed.

### EPISTEMIC DELTA
Admissibility, classification, independence, support, invalidation, or claim-evidence relationships changed.

### COGNITIVE STATE DELTA
The deterministic institutional projection changed.

### GOVERNANCE DELTA
A governed decision, authorization, restriction, freeze, or governed canon state changed.

No delta implies another.

Examples:

```text
SOURCE DELTA          YES
EPISTEMIC DELTA       NO
COGNITIVE STATE DELTA NO
GOVERNANCE DELTA      NO
```

A new record entered, but it did not change assessed knowledge or the projected state.

```text
SOURCE DELTA          NO
EPISTEMIC DELTA       YES
COGNITIVE STATE DELTA YES
GOVERNANCE DELTA      NO
```

No new record arrived, but an existing relation was invalidated, re-assessed, or otherwise changed under the epistemic plane.

## Causality prohibition

The transition contract must use terms such as:

- `transitionInputs`
- `admittedSourceRefs`
- `admittedEpistemicRefs`
- `associatedDelta`
- `attributableComputationalInputs`

It must not use `causedBy` unless the referenced relation is separately supported as a causal relation.

`ENTERED TRANSITION ≠ CAUSED CHANGE IN THE WORLD`

## Semantic hash

`transitionHash` is computed from canonical serialization of `semanticPayload` only.

It must not depend on artifact metadata such as `transitionId`, `createdAt`, job identifiers, worker identifiers, request identifiers, filesystem location, or deployment substrate.

At minimum, the semantic identity covers:

```text
fromSnapshotHash
toSnapshotHash
transitionInputs
admittedSourceRefs
admittedEpistemicRefs
sourceDelta
epistemicDelta
cognitiveStateDelta
governanceDelta
addedRefs
removedRefs
changedRefs
unchangedCriticalRefs
projectorVersion
policyVersion
schemaVersion
```

## Canonical serialization

All semantically unordered arrays are sorted deterministically and deduplicated. Object keys, timestamps, null semantics, and numeric representation follow the same canonical serialization rules as the snapshot contract.

## Immutability

A sealed transition record is immutable. Corrections produce a new transition artifact or a reconstruction under the original contract; they do not silently rewrite a prior semantic transition.

## Reconstruction requirement

Given the same `fromSnapshotHash`, `toSnapshotHash`, admitted inputs, four delta records, versions, schema, and canonical serialization, reconstruction must yield the same `transitionHash` independent of whether it runs locally, on a persistent worker, or behind Vercel.

## Failure behavior

If either snapshot hash cannot be resolved, required admitted inputs are missing, or the four delta classes cannot be represented without collapsing semantics, the transition must fail or be marked explicitly incomplete. Narrative gap-filling is prohibited.