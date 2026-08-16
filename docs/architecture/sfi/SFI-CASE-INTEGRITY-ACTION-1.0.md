# SFI Case Integrity & Governed Action 1.0

Status: `OPERATIONAL_BACKEND`

This block closes two gaps in the operational Case Platform: referenced objects must exist with the epistemic role claimed, and a recommendation/report cannot become an intervention without human case authority.

## Reference integrity

Case references are checked against persisted tenant/case objects before internal evidence, assessments, reports and inferred relations are accepted.

```text
sourceRef     → existing SOURCE
recordRef     → existing RECORD-role object
evidenceRef   → existing EVIDENCE
assessmentRef → existing EPISTEMIC_ASSESSMENT
```

Enterprise entity relations may cross cases inside the same tenant, but their endpoint entities must exist in tenant-scoped Case Platform state.

Tender assessment adds a stronger invariant: the requirement must exist in the case and must have been recorded through the frozen-requirement path before evaluation.

## Governed action loop

```text
SFI REPORT
   ↓
RECOMMENDATION
   ↓
CASE ACTION PROPOSAL
   ↓
TENANT HUMAN AUTHORITY (OWNER / ADMIN)
   ├─ REJECT
   └─ APPROVE
        ↓
INTERVENTION RECORD
        ↓
RETURN RECORD
```

The case action decision is not ROOT governance and does not modify institutional truth. It is the commercial/operational human-authority gate for an intervention affecting the tenant system.

The platform records an approved intervention but does not itself perform an external action in this version. Future connectors/adapters must consume only approved proposals.

## Return semantics

A return must reference the recorded intervention. The return is an observation record; it does not automatically prove that the intervention caused the observed outcome.

`RETURN ≠ CAUSAL PROOF`.

## Explicit prohibitions

- report → direct execution;
- recommendation → direct execution;
- PENDING proposal → intervention;
- OPERATOR approval of the proposal;
- direct client creation of ungated RETURN objects;
- case approval → ROOT decision;
- recorded return → automatic causal claim.
