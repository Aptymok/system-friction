# SFI FINAL DATABASE CLOSURE

Status: **RESERVED_FINAL_OPERATION**  
Contract: `SFI-FINAL-DATABASE-CLOSURE-1.0`  
Supersedes implementation intent of PR #210 without executing a production reset now.

## Decision

The operational database cleanup is deliberately **not executed during active construction**.

System Friction Institute (SFI) still has operational surfaces, Case Platform adapters, observatories and service-profile delivery paths to build. Resetting the production database before that construction is complete would destroy useful development-state evidence and then immediately recreate runtime residue.

The cleanup therefore occurs once, at the terminal construction boundary.

## Terminal trigger

The reset may be executed only when all of the following are true:

1. the active construction block is declared complete;
2. no open schema-changing or runtime-migration pull request remains;
3. `main` passes SFI Verify, typecheck, production build and security checks;
4. a current database export exists;
5. a current cleanup classification plan exists;
6. a full PostgreSQL evidence snapshot receipt exists and verifies against the exact target database;
7. a successful full-cycle proof receipt exists and has been reviewed;
8. the protected-table inventory has been reviewed against the then-current architecture;
9. the operator explicitly supplies the destructive-reset confirmation tokens.

## Existing executable reset

The canonical reset remains `scripts/db/reset-sfi-operational-tables.mjs`.

It is intentionally fail-closed. It requires:

- `SFI_DB_RESET_CONFIRM=RESET_SFI_OPERATIONAL`
- `SFI_DB_RESET_MODE=CLEAN_RUNTIME_AFTER_VERIFIED_PROOF`
- `SFI_DB_SNAPSHOT_RECEIPT=<verified receipt path>`
- a prior `db:export`
- a prior cleanup plan
- a full-cycle proof receipt or an explicitly reviewed proof override

The reset verifies that the evidence snapshot belongs to the same Supabase project/database before deleting operational rows.

## Preservation rule

The terminal operation preserves only what the then-current canonical inventory classifies as authority, identity, access, billing, source/provenance or otherwise constitutionally protected state.

Everything else must be classified as one of:

- `PRESERVE_CANONICAL`
- `RECONSTRUCT_FROM_SOURCE`
- `DELETE_OPERATIONAL`
- `REVIEW_REQUIRED`

No `CASCADE` cleanup is authorized merely for convenience.

## Historical reconstruction

PR #210 contained a historical reconstruction proposal tied to an older architecture and an older prospective-genesis date. That branch is not mergeable against current `main` and must not be rebased wholesale.

If a terminal clean genesis is still desired, its world-day origin, preserved source stores and reconstruction rules must be regenerated from the **then-current** architecture and actual persisted source evidence. Old dates and seed manifests are not automatically canonical.

## Terminal sequence

```text
CURRENT MAIN
   ↓
freeze construction
   ↓
export database
   ↓
classify cleanup
   ↓
create + verify evidence snapshot
   ↓
export/review full-cycle proof
   ↓
review protected inventory
   ↓
explicit destructive confirmation
   ↓
operational reset
   ↓
reconstruct only derivable state
   ↓
verify database
   ↓
SFI Verify / typecheck / build / security
   ↓
FINAL CLEAN RUNTIME
```

## Epistemic boundary

A clean database is an operational hygiene state. It does not validate historical claims, convert simulations into observations, prove scientific validity or create institutional truth.

## Current state

```text
DATABASE_CLEANUP = RESERVED_FINAL_OPERATION
PRODUCTION_RESET_NOW = PROHIBITED
PR_210_IMPLEMENTATION = SUPERSEDED_BY_CURRENT_ARCHITECTURE
```
