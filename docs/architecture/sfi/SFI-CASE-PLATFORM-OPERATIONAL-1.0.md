# SFI Case Platform Operational 1.0

Status: `OPERATIONAL_BACKEND`

This layer makes `SFI_CASE_V1` persistent without creating a separate SaaS for every service profile.

## Runtime topology

```text
AUTHENTICATED USER
       ↓
TENANT MEMBERSHIP
       ↓
SFI_CASE_V1
       ↓
TENANT-SCOPED CASE OBJECTS
       ├─ SOURCE
       ├─ RECORD
       ├─ OBSERVATION
       ├─ EVIDENCE (internal assessed path only)
       ├─ MODEL / HYPOTHESIS / ANALYSIS
       ├─ INSTRUMENT RUN
       ├─ RECOMMENDATION
       ├─ INTERVENTION / RETURN
       └─ REPORT
```

The same persistence and lifecycle apply to `SYSTEM_OBSERVATORY`, `AI_IMPLEMENTATION_DIAGNOSTIC`, `AI_ADOPTION_INTEGRATION`, `AI_GOVERNANCE_ASSURANCE`, `SERVICE_OBSERVABILITY`, `CONTRACT_WARRANTY_ASSURANCE`, `TENDER_ASSURANCE`, `ENTERPRISE_MEMORY`, `COGNITIVE_RECONSTRUCTION`, and `CUSTOM_RESEARCH`.

## Tenant boundary

`CLIENT_CASE_MEMORY ≠ SFI_INSTITUTIONAL_MEMORY`.

Commercial sources, records and case objects live in tenant-scoped tables protected by membership-based Row Level Security (RLS). Operational V1 does not write client data into `sfi_evidence_ledger`, institutional memory, Cognitive Spine, or ROOT.

Institutional admission remains a separate governed process:

```text
CASE RESULT
  → SANITIZATION
  → EPISTEMIC ASSESSMENT
  → INSTITUTIONAL ADMISSION
  → GOVERNANCE
  → CANONICAL SFI RECORD
```

## Epistemic boundary

The client-facing object endpoint can create only `RECORD`, `OBSERVATION`, and `RETURN` objects. These remain `RECORD` epistemically. It cannot create evidence, analysis, governance decisions, or truth claims.

`SOURCE ≠ RECORD ≠ EVIDENCE` remains enforced.

Instrument runs and derived analytical objects cannot acquire `SOURCE`, `EVIDENCE`, `GOVERNANCE_DECISION`, or `TRUTH_CLAIM` authority by inheritance.

## Instrument readiness

Every service profile declares required sources and allowed instruments. The shared instrument gate blocks execution when required source categories are absent or the instrument is outside the service profile allowlist.

This is a source-completeness gate, not a scientific validity claim.

## Report boundary

Persisted `SFI_REPORT_V1` snapshots have `execution_authority = false` enforced both in code and at the database constraint boundary.

Report generation is institutional in Operational V1. Reading remains tenant-scoped.

```text
REPORT
  ≠ ACTION

RECOMMENDATION
  → GOVERNANCE
  → ACTION ADAPTER
  → INTERVENTION
  → RETURN
```

## Deliberate non-goals

- no Observatory screen design;
- no dashboard design;
- no production database reset;
- no automatic admission into institutional memory;
- no direct tenant access to ROOT;
- no direct AI-output-to-evidence promotion;
- no separate product-specific case databases.
