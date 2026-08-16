# SFI-CT-SNAPSHOT-CONTRACT-1.0

Status: FROZEN
Version: 1.0
Date: 2026-08-16

## Purpose

Define the semantic and audit contract for an immutable System Friction Institute (SFI) Cognitive State Snapshot (`CT-vN`).

A snapshot is not a canonical store and is not the Cognitive Twin as a whole. It is a reproducible computational projection of institutionally admissible state at a declared temporal cutoff.

## Artifact envelope

Operational metadata identifies the physical reconstruction or persisted artifact. It is not part of semantic identity unless explicitly promoted into the semantic payload by a future contract version.

```ts
type CognitiveSnapshotArtifact = {
  snapshotId: string
  createdAt: string
  reconstructedAt?: string
  runtimeMetadata?: {
    runtime?: 'local' | 'worker' | 'vercel' | 'other'
    runtimeJobId?: string
    workerId?: string
    requestId?: string
  }
  semanticPayload: CognitiveSnapshotSemanticPayload
  snapshotHash: string
}
```

## Semantic payload

```ts
type CognitiveSnapshotSemanticPayload = {
  sourceCutoff: string
  projectorVersion: string
  policyVersion: string
  projectionProfile: string
  schemaVersion: string

  eventRefs: string[]
  evidenceRefs: string[]
  hypothesisRefs: string[]
  memoryRefs: string[]
  decisionRefs: string[]
  contradictionRefs: string[]
  freezeRefs: string[]
  questionRefs: string[]
  personCtRefs: string[]

  operatingMode: unknown
  temporalState: unknown
  verificationDebt: unknown
  derivedState: unknown

  sourceManifest: SourceManifestEntry[]
  sourceHashes: SourceHashEntry[]
  epistemicStateRefs: string[]
  lineageRoot: string
}

type SourceManifestEntry = {
  ref: string
  sourceKind: string
  sourceVersion?: string
  sourceHash: string
}

type SourceHashEntry = {
  ref: string
  hash: string
}
```

Exact implementation types may narrow `unknown` values, but they must not change the frozen semantics without a schema-version increment.

## Semantic hash

`snapshotHash` is computed from the canonical serialization of `semanticPayload` only.

It MUST NOT depend on:

- `snapshotId`
- `createdAt`
- `reconstructedAt`
- `runtimeJobId`
- `workerId`
- `requestId`
- random UUIDs
- filesystem paths
- array insertion order
- JSON object key order
- deployment provider

## Canonical serialization

Before hashing, the semantic payload must be canonically serialized.

Required rules:

1. Stable object-key ordering.
2. Deterministic ordering for all semantically unordered reference arrays.
3. Deterministic duplicate elimination.
4. Timestamp normalization to the contractually defined UTC representation.
5. Stable `null` versus absent-field semantics.
6. Deterministic numeric representation.
7. No random identifiers inside semantic content unless the identifier itself is a canonical referenced identity.
8. No generation-time values inside semantic content unless they are source facts already present in the canonical manifest.
9. Derived metrics must be deterministic functions of already-assessed state.
10. Canonical serialization version must be covered by `schemaVersion` or another explicit version field before behavior can change.

## Determinism requirement

```text
same canonical source manifest
+ same source hashes
+ same source cutoff
+ same epistemic state
+ same projector version
+ same policy version
+ same projection profile
+ same schema version
+ same canonical serialization
=
same semantic snapshotHash
```

This property must hold across local, persistent-worker, and Vercel execution substrates.

## Projector prohibition

The snapshot may contain deterministic summaries of already-assessed state. The projector must not create new epistemic judgments while producing them.

Allowed examples:

```text
verificationDebt = 12
activeContradictions = 4
independentLineageRoots = 7
```

Forbidden example:

```text
7 referenced records exist
therefore claim X becomes VERIFIED
```

## Availability and consumption

Snapshot existence does not imply consumption.

Any downstream execution that has access to a snapshot must be able to record:

```ts
{
  ctSnapshotAvailable: string | null
  ctSnapshotConsumed: boolean
  snapshotHash?: string
  projectionProfile?: string
}
```

A blinded execution may deliberately set `ctSnapshotConsumed = false`.

## Immutability

A materialized snapshot is immutable. Corrections to sources or epistemic assessments produce a future snapshot or a reconstruction result under the original cutoff/version contract; they do not mutate the historic semantic payload in place.

## Reconstruction

A future reconstruction may have different artifact metadata but MUST yield the same `snapshotHash` when the semantic inputs and versioned rules are identical.

## Failure behavior

If required source hashes, cutoff semantics, epistemic state, projector version, policy version, profile, schema, or canonical serialization cannot be resolved, snapshot production must fail or emit an explicit non-final/incomplete status. It must not fabricate missing state.