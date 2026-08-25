# SFI Case Platform Operational 1.0

Status: `OPERATIONAL_BACKEND + CANONICAL_PIPELINE_UI`

This layer makes `SFI_CASE_V1` persistent without creating a separate SaaS for every service profile. The canonical human-facing owner is `/pipeline`; visual park/lens components do not become bounded contexts or storage owners.

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
       ├─ RECORD / OBSERVATION
       ├─ EVIDENCE (internal assessed path only)
       ├─ MODEL / HYPOTHESIS / ANALYSIS
       ├─ INSTRUMENT RUN
       ├─ RECOMMENDATION
       ├─ GOVERNED CASE ACTION
       ├─ INTERVENTION / RETURN
       └─ REPORT
```

The same persistence and lifecycle apply to `SYSTEM_OBSERVATORY`, `AI_IMPLEMENTATION_DIAGNOSTIC`, `AI_ADOPTION_INTEGRATION`, `AI_GOVERNANCE_ASSURANCE`, `SERVICE_OBSERVABILITY`, `CONTRACT_WARRANTY_ASSURANCE`, `TENDER_ASSURANCE`, `ENTERPRISE_MEMORY`, `COGNITIVE_RECONSTRUCTION`, and `CUSTOM_RESEARCH`.

## Tenant boundary

`CLIENT_CASE_MEMORY ≠ SFI_INSTITUTIONAL_MEMORY`.

Commercial sources, records and case objects live in tenant-scoped tables protected by membership-based Row Level Security (RLS). Case Platform does not write client data into `sfi_evidence_ledger`, institutional memory, Cognitive Spine, or ROOT by inheritance.

Institutional admission remains a separate governed process:

```text
CASE RESULT
  → SANITIZATION
  → EPISTEMIC ASSESSMENT
  → INSTITUTIONAL ADMISSION
  → GOVERNANCE
  → CANONICAL SFI RECORD
```

## Role boundary

- `OWNER` / `ADMIN`: read/write case, approve/reject governed case actions.
- `OPERATOR`: read/write case, propose actions, record an observed intervention and RETURN; cannot approve its own authority boundary unless separately OWNER/ADMIN.
- `VIEWER` / `AUDITOR`: read only.
- Institutional ROOT is not implicitly addressable from tenant cases.

This role model is enforced in the repository and database membership boundary, not by UI labels.

## Epistemic boundary

The client-facing object endpoint can create only `RECORD` and `OBSERVATION` objects and registers sources through the source intake path. These remain non-evidence records epistemically. Ordinary tenant UI cannot create `EVIDENCE`, `ANALYSIS`, `GOVERNANCE_DECISION`, or `TRUTH_CLAIM` objects.

`SOURCE ≠ RECORD ≠ EVIDENCE` remains enforced.

Internal assessed paths may create `EVIDENCE` or derived analytical objects only after reference/lineage validation. Instrument runs and derived analytical objects cannot acquire `SOURCE`, `EVIDENCE`, `GOVERNANCE_DECISION`, or `TRUTH_CLAIM` authority by inheritance.

## Case continuity

Case status transitions use the single canonical transition map in `src/core/case-platform/operational.ts`; UI does not maintain a second lifecycle.

```text
CASE
  → SOURCES / RECORDS
  → OBSERVATION / ANALYSIS
  → RECOMMENDATION
  → TENANT GOVERNANCE WHEN REQUIRED
  → OBSERVED INTERVENTION
  → RETURN
  → REPORT / CLOSE
```

Recording `INTERVENTION` is a record of an observed/performed intervention. The platform must not represent it as an external side effect performed by SFI unless an actual governed execution adapter produced that effect and RETURN.

## Instrument readiness

Every service profile declares required sources and allowed instruments. The shared instrument gate blocks execution when required source categories are absent or the instrument is outside the service profile allowlist.

This is a source-completeness gate, not a scientific validity claim.

## Report boundary

Persisted `SFI_REPORT_V1` snapshots have `execution_authority = false` enforced both in code and at the database constraint boundary.

Tenant `OWNER`, `ADMIN`, or `OPERATOR` may generate a report for a case they can write. `VIEWER` and `AUDITOR` may read reports. Claims still pass reference-integrity checks. Report generation neither performs an action nor admits client material into institutional memory.

```text
REPORT ≠ ACTION

RECOMMENDATION
  → TENANT GOVERNANCE
  → ACTION / INTERVENTION PATH
  → RETURN
```

## Operating park

The Cognitive Spine park used in `/pipeline` is a data-driven projection of the selected tenant case. It owns no backend, database table, registry, evidence authority, or executor. The ROOT variant uses the same visual component with institutional read models and ROOT-only controls.

- decorative ambient motion never means execution;
- `LIVE` requires observed data/event state;
- no global agent count is exposed to a tenant case unless a case-scoped execution trace exists;
- no baked image value is treated as runtime truth.

## Deliberate non-goals

- no separate product-specific case databases;
- no direct tenant access to ROOT;
- no direct AI-output-to-evidence promotion;
- no automatic admission into institutional memory;
- no fabricated agent execution;
- no production data reset;
- no second park backend or writer.
