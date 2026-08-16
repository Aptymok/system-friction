# SFI-DT-FAILURE-LEDGER-1.0

Status: **FROZEN FORMAT / OPEN ENTRIES**

Every confirmatory failure must be recorded without changing the protocol to rescue the result.

| Code | Class | Meaning | Confirmatory effect |
| --- | --- | --- | --- |
| `TARGET_NOT_REGISTERED` | protocol | naturalistic target/cutoff not pre-registered | EXP-001 cannot start |
| `TARGET_COMMITMENT_MISMATCH` | integrity | reveal does not match commitment | run invalid |
| `CONTEXT_RECEIPT_INTEGRITY_MISMATCH` | integrity | frozen context receipt does not re-hash | run invalid |
| `TARGET_TIMING_NOT_OBSERVED` | epistemic | target lacks post-cutoff observed-event proof | run blocked |
| `EVIDENCE_RECEIPT_INTEGRITY_MISMATCH` | integrity | evaluation receipt does not re-hash | scoring prohibited |
| `EMPIRICAL_BOUNDARY_PROBE_MISSING` | evidence | no qualifying observed/verified boundary switch probe | boundary validation blocked |
| `MODEL_PROVIDER_UNAVAILABLE` | infrastructure | frozen provider unavailable before prediction | no valid prediction; retry permitted after restoration |
| `MODEL_MISMATCH` | protocol | configured/actual model differs from manifest | run aborts before valid prediction |
| `PROMPT_CONTRACT_DRIFT` | protocol | prompt/system hash differs from frozen manifest | run invalid |
| `BUILD_RATE_LIMIT` | external infrastructure | preview deployment blocked by external quota | record only; not a scientific result |
| `CANONICAL_STORE_READ_FAILED` | infrastructure | required evidence/context store unreadable | run blocked until restored |

## Entry template

Each entry must record timestamp, experiment ID, arm, blind run ID when available, failure code, observed symptom, affected hash/receipt, remediation, whether a valid prediction existed, and whether rerun is permitted by the frozen stopping rule.

## Initial state

At protocol freeze there are no EXP-001 result failures recorded. Target registration remains the next pre-experimental dependency, not an instrument failure.
