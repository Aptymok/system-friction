# SFI-CT-PERSON-INSTITUTION-GATE-1.0

Status: FROZEN
Version: 1.0
Date: 2026-08-16

## Constitutional rule

`PERSON_CT ≠ SFI-CT`.

**Personal cognitive content does not become institutional state by inheritance.**

A person-level Cognitive Twin may represent regularities, candidate memories, decisions, dispositions, or modelled cognitive structure of a person. Those representations are not automatically positions, knowledge, evidence, policy, or memory of System Friction Institute (SFI).

## Required transition

```text
PERSON_CT
   ↓
candidate contribution
   ↓
institutional intake
   ↓
provenance capture
   ↓
epistemic assessment
   ↓
admissibility / evidence relationships
   ↓
governance where required
   ↓
CANONICAL EVENT / RECORD
   ↓
possible future SFI-CT projection
```

The forbidden shortcut is:

```text
PERSON_CT REPRESENTS X
        ↓
SFI-CT REPRESENTS X
```

by inheritance alone.

## Candidate contribution contract

A candidate contribution should be representable with fields equivalent to:

```ts
type PersonCtInstitutionCandidate = {
  candidateId: string
  personCtId: string
  sourceSnapshotId?: string
  sourceSnapshotHash?: string
  contentRef: string
  contributionKind: string
  provenanceRefs: string[]
  declaredEpistemicClass?: string
  submittedAt: string
  requestedInstitutionalUse?: string
}
```

The candidate is an intake object, not an institutional truth claim.

## Intake outcomes

Institutional intake must result in one explicit outcome:

- `REJECTED`
- `RECORDED_NON_EVIDENTIARY`
- `ADMITTED_AS_CANDIDATE`
- `ADMITTED_WITH_EPISTEMIC_RELATION`
- `BLOCKED_PENDING_EVIDENCE`
- `REQUIRES_GOVERNANCE`

Exact implementation enums may differ, but the semantics must preserve the distinction between recording a contribution and accepting its content as institutionally supported.

## Founder-specific constraint

Founder provenance does not bypass this gate. A founder-level or ROOT-level person CT does not become SFI institutional state merely because the represented person holds institutional authority.

`GOVERNANCE AUTHORITY ≠ EPISTEMIC INHERITANCE`

## Independence constraint

Multiple derivatives of one person-level representation do not become independent institutional evidence by being copied into multiple surfaces, summaries, runs, or artifacts.

Ancestry must remain resolvable through the gate.

## Governance constraint

ROOT may authorize the institutional use of a candidate where policy permits, but ROOT cannot transform a personal inference into an observation, create source independence, or erase person-level provenance.

## SFI-CT projection constraint

The Cognitive State Projector may only include a person-derived institutional record when that record has already passed through the institutional intake/epistemic path and is visible under the active projection profile.

The projector never performs the gate implicitly.

## Experimental constraint

Person-level Cognitive Twins used as experimental treatment objects must remain isolatable from SFI-CT live state. A frozen experimental person-CT snapshot cannot silently inherit subsequent institutional state.

## Auditability

For every person-derived institutional object, SFI must be able to reconstruct:

```text
person CT origin
candidate contribution
institutional intake outcome
epistemic assessment
canonical record, if any
future snapshot inclusion, if any
```

If this chain cannot be reconstructed, the object must be marked with a provenance gap rather than narratively assumed to be institutionally valid.