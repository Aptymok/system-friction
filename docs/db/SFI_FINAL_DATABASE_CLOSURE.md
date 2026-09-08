# SFI FINAL DATABASE CLOSURE

Status: **EVIDENCE_FIRST_PRE_ASSURANCE_RESET**  
Contract: `SFI-FINAL-DATABASE-CLOSURE-1.1`  
Reset classification: `SFI-CANONICAL-RESET-CLASSIFICATION-1.1`  
Supersedes implementation intent of PR #210 and the former terminal-only reset order.

## Decision

Issue #430 and the founder directive of 2026-09-07 change the execution order: the contaminated persistence plane must be snapshotted and cleaned **before** final Human/GPT/API E2E assurance. Final assurance must run against the clean genesis that SFI is expected to operate from, not against QA/telemetry/legacy residue that would be deleted afterward.

This does not authorize an unguarded reset. Destruction remains fail-closed behind an immutable external proof artifact, exact target binding, exhaustive live-table classification, transaction-level schema recheck and explicit reset confirmation.

## Protected World longitudinal evidence plane

The accumulated World observations and hypotheses are not cleanup residue. They are protected institutional evidence. The reset preserves the complete current World longitudinal plane:

- `world_source_observations`
- `world_friction_readings`
- `world_hypotheses`
- `world_hypothesis_outcomes`
- `world_learning_events`
- `worldspect_snapshots`
- `world_vector_cycles`
- `world_vector_observations`
- `world_vector_reports`
- `world_vector_alerts`

All ten are `PRESERVE_DATA` under `SFI-CANONICAL-RESET-CLASSIFICATION-1.1`. Their exact row counts are captured in the V2 evidence snapshot and must be identical after reset. Moving any of these tables into purge is a new preservation-boundary decision requiring explicit sovereign authorization.

## Reset prerequisites

The reset may execute only when all of the following are true:

1. the exact reset implementation HEAD passes its database/reset assurance gates;
2. the live public schema is exhaustively classified with `UNCLASSIFIED=0`;
3. a fresh full PostgreSQL custom-format dump exists;
4. the snapshot includes `schema.sql`, `public-tables.json`, `reset-classification.json`, manifest and SHA-256 evidence;
5. the V2 receipt verifies those persisted bytes;
6. the snapshot host/database matches the exact direct PostgreSQL reset target;
7. the live public-table set still exactly equals the snapshot table set immediately before reset;
8. the complete proof artifact has already been uploaded outside the database and has an artifact ID and digest;
9. no preserved World table depends on a table scheduled for reset;
10. the operator supplies the explicit founder-authorized reset confirmation tokens.

A failure of any condition aborts before deletion. Unexpected FK dependency or transaction invariant failure rolls the destructive transaction back.

## Existing executable reset

The canonical reset remains `scripts/db/reset-sfi-operational-tables.mjs`.

Current confirmation contract:

- `SFI_DB_RESET_CONFIRM=RESET_SFI_CANONICAL`
- `SFI_DB_RESET_MODE=EVIDENCE_FIRST_CANONICAL_RESET`
- `SFI_DB_SNAPSHOT_RECEIPT=<verified V2 receipt path>`
- `SFI_DB_EXTERNAL_ARTIFACT_ID=<already uploaded proof artifact>`
- `SFI_DB_EXTERNAL_ARTIFACT_DIGEST=<artifact digest>`
- direct PostgreSQL connection to the same database represented by the receipt.

The reset does not use dependency-propagating truncation. The protected World plane is locked and count-verified; unexpected dependencies fail closed instead of deleting preserved evidence.

## Classification model

At the current 164-table baseline:

- `PRESERVE_DATA`: 10 tables — full World longitudinal corpus;
- `RESEED_MINIMAL`: 7 tables — minimal profile/tenant/OAuth/account infrastructure;
- `PURGE_DATA`: 147 tables — non-World QA, telemetry, runtime memory, Twin/AMV, governance residue and other operational history selected by the issue #430 policy;
- `UNCLASSIFIED`: must be zero.

A newly appearing public table is never deleted implicitly. It becomes `UNCLASSIFIED` and blocks the reset until intentionally classified.

## Minimal genesis

After the purge, SFI reconstructs only the minimum current operating identity/configuration required to continue:

- one founder ROOT profile from authenticated identity/current authority;
- one SFI account and founder membership/balance;
- one personal tenant and founder ownership membership;
- active founder OAuth client configuration required for the current integration, without authorization-code or usage history;
- one `SFI_CANONICAL_RESET_GENESIS` audit event bound to snapshot hash, external artifact and reset commit.

The retired `seed-sfi-canonical-history.mjs` must not import QA reports, operational patches or runtime events as institutional history.

## Current execution sequence

```text
CURRENT MERGEABLE RESET HEAD
   ↓
exact-head reset/CI assurance
   ↓
merge reset machinery to main
   ↓
create full PostgreSQL V2 evidence snapshot
   ↓
verify hashes + exact target + classification
   ↓
upload immutable proof outside database
   ↓
verify artifact ID + digest
   ↓
explicit founder-authorized canonical reset
   ↓
transactional purge + minimal genesis
   ↓
verify all 10 World counts unchanged
   ↓
verify non-World purge / Auth / ROOT / tenant / OAuth / RLS
   ↓
Human E2E + GPT E2E + API/MCP E2E + persistence/reentry
   ↓
remaining final assurance / Phase E / Phase F
   ↓
RETURN_PASS only if every program criterion passes
```

`FINAL_E2E_AFTER_CLEAN_GENESIS` is therefore an explicit invariant.

## Historical reconstruction

PR #210 contained a reconstruction proposal tied to an older architecture and a prospective genesis date. That implementation is superseded. No old branch, seed manifest, QA report or runtime ledger is silently promoted as canonical history.

The pre-reset database remains recoverable through the immutable PostgreSQL evidence artifact. Recoverability is not the same as importing discarded rows back into live institutional memory.

## Epistemic boundary

A clean database is an operational hygiene state. It does not validate historical claims, turn simulations into observations, prove scientific validity, or promote learning to canon. Conversely, cleaning QA/runtime residue must not destroy the accumulated World observation/hypothesis record that constitutes longitudinal evidence.

## Current state

```text
DATABASE_CLEANUP = EVIDENCE_FIRST_PRE_ASSURANCE_RESET
WORLD_LONGITUDINAL_CORPUS = PRESERVE_DATA
FINAL_E2E = AFTER_CLEAN_GENESIS
RESET_EXECUTED = NO
PR_210_IMPLEMENTATION = SUPERSEDED_BY_CURRENT_ARCHITECTURE
```
