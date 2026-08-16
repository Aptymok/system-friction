# SFI-CT-INVARIANTS-1.0

Status: FROZEN
Version: 1.0
Date: 2026-08-16

These invariants are constitutional constraints for the System Friction Institute (SFI) Cognitive Spine.

## I-01 — The world is not a canonical store

The world, an observation, and an institutional record are distinct objects.

`WORLD ≠ OBSERVATION ≠ CANONICAL RECORD ≠ CT PROJECTION`

## I-02 — Canonical record is not reality

A canonical record represents an admissible institutional record under stated conditions. Its existence does not make its content an ontological truth.

## I-03 — Event is not evidence

A canonical event is not automatically evidence for a claim. Evidence status depends on explicit epistemic assessment and relationships.

## I-04 — Canonical sources exist outside CT

The Cognitive Twin (CT) may reference and project canonical sources. It does not own them and cannot rewrite their historical meaning by projection.

## I-05 — CT state is a projection, not a second canonical store

A cognitive snapshot is a versioned, reproducible projection of already-assessed institutional state under an explicit cutoff, projector, policy, profile, schema, and canonical serialization.

## I-06 — Projector creates no new epistemic judgments

The Cognitive State Projector may select, resolve, deduplicate, summarize deterministically, serialize, hash, and seal. It may not independently decide that a record is observed, verified, independent, invalid, or stronger evidence than previously assessed.

## I-07 — CT consumption is explicit

`CT AVAILABLE ≠ CT CONSUMED`.

A cognitive execution that consumes CT must record the snapshot identifier, semantic hash, projection profile, and consumption flag. Operations may deliberately run blinded or without CT context.

## I-08 — Repetition does not create evidence

Repeated storage, rendering, summarization, or reuse of the same ancestral information does not increase the count of independent evidence.

## I-09 — Derivation does not upgrade epistemic class or independence

A derivative object cannot upgrade the epistemic class, admissibility, support, or independence of its own ancestral sources merely by derivation.

## I-10 — Ancestral self-validation is prohibited

No snapshot or derivative descendant may independently validate its own ancestral claim.

`NO DERIVATIVE DESCENDANT CAN INDEPENDENTLY VALIDATE ITS OWN ANCESTRAL CLAIM.`

## I-11 — ROOT governs action, not truth

ROOT has institutional governance authority. ROOT may authorize, reject, defer, freeze, approve interventions, and apply reserved governance actions. ROOT may not create observational independence, erase provenance, rewrite lineage history, or promote epistemic class by decree.

`GOVERNANCE AUTHORITY ≠ EPISTEMIC AUTHORITY`

## I-12 — Personal state is not institutional state by inheritance

`PERSON_CT ≠ SFI-CT`.

Personal cognitive content must pass through institutional intake and the ordinary epistemic/governance path before it can become an admissible institutional record used by a future SFI-CT snapshot.

`PERSONAL COGNITIVE CONTENT DOES NOT BECOME INSTITUTIONAL STATE BY INHERITANCE.`

## I-13 — Live operational CT is distinct from frozen experimental CT

Operational SFI-CT may advance. A registered experiment must remain bound to its declared frozen snapshot and exact versions/cutoff/profile/hash unless the protocol explicitly permits otherwise.

## I-14 — Artifact identity is distinct from semantic identity

A snapshot or transition may be reconstructed into a new physical artifact at a later time. Audit metadata may differ, but identical contractual semantic content must yield the identical semantic hash.

## I-15 — Same semantic inputs produce the same snapshot hash

The following equality is contractual:

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

No runtime-specific metadata may alter semantic identity.

## I-16 — Source, epistemic, cognitive, and governance deltas remain distinct

The transition system must preserve four non-equivalent delta classes:

- SOURCE DELTA — available canonical records changed.
- EPISTEMIC DELTA — admissibility, classification, independence, support, invalidation, or claim relationships changed.
- COGNITIVE STATE DELTA — the projected institutional cognitive state changed.
- GOVERNANCE DELTA — a governed decision, authorization, restriction, freeze, or governed canon state changed.

A change in one does not imply a change in the others.

## I-17 — Transition inputs are not causal claims

Transition records may identify admitted inputs and computationally attributable transition inputs. They must not use `causedBy` unless a separate valid causal relation has actually been established.

## I-18 — Execution substrate does not define semantic state

The same contractual inputs must produce the same semantic snapshot whether the projector runs locally, in a persistent worker, or behind a Vercel adapter. Hosting substrate is operational metadata, not part of epistemic or semantic identity.

## Failure rule

Any implementation that violates an invariant must fail explicitly, degrade explicitly, or be rejected. It must never silently reinterpret the invariant.