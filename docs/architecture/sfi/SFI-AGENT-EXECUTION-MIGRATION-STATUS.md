# SFI Agent Execution Migration — Status

**Control issue:** #347  
**Foundation PR:** #348  
**Architecture:** ADR-SFI-AGENT-EXECUTION-003  
**Current phase:** M0 — Foundation / contract plane  
**State:** IN MIGRATION — NOT YET MERGED

## Why this file exists

This is the small operational index for the migration. It does not replace the ADR or issue; it records which layer owns each capability while the migration is incremental.

## Canonical ownership matrix

| Concern | Canonical owner | M0 state |
|---|---|---|
| Agent identity / mandate | existing Agent Passport + converged registry | REUSED |
| Agent runtime execution | `src/lib/sfi/cognitive-runtime` | REUSED + EXTENDED |
| Agent-specific input contract | `executionContracts.ts` | ADDED |
| Manual ROOT execution | `/api/root/cognitive-runtime` | EXTENDED, legacy adapter retained |
| Execution trace writer | existing epistemic event writer | REUSED, NO SECOND WRITER |
| Execution persistence | `epistemic_events` | REUSED |
| LLM interpretation | existing agent LLM client | REUSED + COVERAGE EXPOSED |
| Cognitive Spine | existing `src/core/cognitive-spine` | UNCHANGED OWNER |
| Governance gate | existing SFI AI governance policy | REUSED; contextual expansion is M2 |
| Agent dossier UI | ROOT / Cognitive Spine projection | M3, NOT CREATED IN M0 |
| Execution read model | derived from canonical events | M1; NO NEW TABLE IN M0 |
| Token/cost telemetry | runtime/provider observation | M5; NOT OBSERVED remains missing |
| Report claim lineage | existing report/evidence architecture | M4 expansion |

## M0 exit conditions

M0 is not complete until:

- every registered cognitive agent resolves to one typed Execution Contract;
- Cross Impact rejects one-target manual requests;
- Cross Impact does not manufacture coupling magnitude from target/source counts;
- canonical manual requests carry purpose, anchors and targets;
- legacy single-target requests normalize visibly rather than remaining the conceptual contract;
- execution identity/contract/request lineage reaches the existing canonical event writer;
- context supplied, existing evidence references and public source candidates remain distinguishable;
- prompt/context bounding is observable;
- canonical architecture preflight, typecheck and build pass.

## Next migration boundary

M1 adds the **Execution Record reader** and multidimensional **Agent State** projection over canonical events. It must not introduce another writer or infer unobserved state. The required visible distinctions are:

```text
LAST INTERACTION != LAST EXECUTION != LAST CURRENT INFERENCE
INFRASTRUCTURE STATE != WORK STATE != EPISTEMIC STATE != AUTHORITY STATE
```

Only after M1 is stable should M2 contextual governance and M3 the contract-driven ROOT/Cognitive Spine dossier become the user-facing default.
