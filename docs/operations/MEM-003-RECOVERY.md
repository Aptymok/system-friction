# MEM-003 — bilateral continuity reconciliation

## Verified 2026-10-15

- Supabase and Neon are queryable; SFI_ROOT `sfi_state` responds.
- Audit events: 91 on each database; the five previously pending events were acknowledged MIRRORED, leaving zero PENDING.
- Supabase outbox: 4 CONFLICT, 82 MIRRORED, 574 SUPERSEDED_BY_CONTINUITY. Conflict source transactions: 296766 and 296780.
- Access grants: Neon 7, Supabase 6. Neon-only grant: `0b559f19-3bd2-4765-a45f-69ea32074acb`.
- Both continuity states report NORMAL and founder_available=true, but this does not certify bilateral equality.
- Audit records on both sides identify `ACCOUNT_INVITATION_SENT` from `root_access_surface` for grants `0b559f19-3bd2-4765-a45f-69ea32074acb`, `20744855-f55c-4541-8327-3ddc48844f5a`, and `434ede79-3a2e-461c-8473-953ca3874b78`. Invitation provenance is not proof of successful delivery or entitlement.
- For grant `d63fd103-9790-4298-9e6b-ec44e19b8582`, both sides record `ACCOUNT_ACCESS_ADMIN_RECOVERY_ACTIVATED` (2026-10-10T16:42:17Z) followed by `ACCOUNT_ACCESS_CONTINUITY_RECONCILED` (2026-10-10T16:48:08Z), which explicitly says recovery was not claimed closed.
- Atomic transaction failures may block sibling outbox entries; do not count all four as independent row conflicts.
- No production identity/permission changes made in this investigation.

## Closure gates

1. Verify the actual authenticated identities and invite delivery/acceptance against Supabase Auth; do not use timestamps alone.
2. Compare complete grant and profile contents and reconstruct authority per field and epoch.
3. Snapshot affected rows; validate guarded, idempotent reconciliation on a safe branch with expected-before predicates.
4. Resolve source transactions 296766 and 296780 via verified replay or documented supersession; never falsely acknowledge mismatched operations as MIRRORED.
5. Validate bilateral fingerprints and idempotency, then record certification and deployment SHA.

MEM-003 takes precedence over unrelated Excel maintenance. Spreadsheet status cannot certify database recovery.


## Checkpoint 2026-10-15 — verified bilateral scope

**Observed from connected database queries, not a simulation.** Supabase and Neon return 161 and 159 tables respectively in `sfi_data_plane_fingerprint()`; 22 named table entries differ (20 tables common to both, 2 present only on Supabase). Divergence includes epistemic events (1,097 vs 1,253), world source observations (9,718 vs 16,635), world friction readings (9,751 vs 16,770), case objects (34 vs 81), cognitive twin runs (66 vs 127), account grants (6 vs 7). Count parity alone is insufficient: platform_metric_snapshots shares 528 rows but its hashes differ.

Neon `sfi_data_plane_state` is **RECOVERY**, with primary mirror certification false. This is distinct from the separate institutional continuity singleton's NORMAL state. Production ROOT account listing returns the seven-grant continuity projection; direct connected primary Supabase returns six. The code-level service client can route REST requests to Neon when the data-plane mode is not PRIMARY, so a ROOT response alone is not evidence of primary Supabase parity.

**Actual repair and receipt.** Operation `25782fde-945f-47f9-820a-8e435e23af0d` (audit event in primary source transaction 296780) was verified with an identical PostgreSQL row digest `0c82a178cd8cef22f8fd44677433333c` on the primary source payload, the current primary row and the continuity row. A guarded idempotent receipt was inserted in Neon `sfi_primary_mirror_applied_operations` for this existing identical audit event; primary `sfi_ack_primary_outbox_v1` returned one acknowledged MIRRORED entry. Post-write query: MIRRORED 83, CONFLICT 3, SUPERSEDED_BY_CONTINUITY 574; pending zero. No audit payload, profile, grant or authorization was modified; `primary_mirror_last_source_txid` was not regressed.

**Outstanding contrary evidence.** Neon continuity-to-primary journal contains 30,937 PENDING operations in 29,808 source transactions, 4,511 REPLAYED operations and one CONFLICT (`sfi_continuity_state`, dated 2026-09-29). The top pending sources are world_friction_readings (14,312), world_source_observations (14,202), plus plane-local operational tables (health checks 1,288, continuity runs 322, continuity singleton 161). Current journal capture SQL excludes only data-plane state and the journal itself; its other plane-local tables are excluded from the shared fingerprint/mirror receiver. This is an observed architectural scope tension; a policy change or replay exclusion must be tested before deployment.

**Authority and chronology.** Primary operation 296766 records INVITED at 2026-10-10T03:16Z for the operator grant; both current databases show ACTIVE with later authenticated activation evidence. Primary transaction 296780 is a 2026-10-10T16:42Z profile/grant/audit trio; the Neon profile and grant have later 16:48Z reconciliation states. The audit item has been independently reconciled as above. The remaining primary entries must not be relabeled MIRRORED while their payloads differ. The operator role, subscription and module-access hashes match on the compared profile snapshots. Other Neon invitation references exist in primary Auth but are neither confirmed nor signed in; no new access is justified.

**Next bounded intervention:** Fix and test handling of plane-local journal entries and historical supersession with evidence receipts, then replay continuity operations in chronological/idempotent bounded batches through the existing scheduler. Do not add another cron. Do not promote PRIMARY or certify until journal conflicts/pending reach zero and all shared-table fingerprints match. The SQL and code workstream is implementation-pending; neither an architectural proposal nor a successful single-operation receipt constitutes MEM-003 closure.


## Checkpoint 2026-10-15 — 14 verified source-observation recoveries

Using the existing canonical recovery contract (source = Neon journal insert-only `world_source_observations`, immutable current row image, target = Supabase RPC `sfi_apply_continuity_batch_v1`), fourteen historical observations were applied with `applied=1` per receipt and acknowledged `REPLAYED` on the original Neon journal. A connector-tool limit interrupted one post-apply acknowledgement; it was resumed only after independently verifying the operation in the primary applied-operations ledger and source-image equality. Final audit: 14/14 original operations `REPLAYED`; 14/14 rows exist in Supabase; 14/14 MD5 row digests agree with Neon; zero row overwrites. Supabase `world_source_observations` grew from 9,718 to 9,732. Current total Neon journal: 30,927 PENDING; 4,521 REPLAYED; 1 CONFLICT. Current primary outbox: 3 CONFLICT, 83 MIRRORED, 574 SUPERSEDED_BY_CONTINUITY (the separately reconciled original audit operation must not be counted again).

This is **partial, verified, bounded recovery**, not a complete bilateral synchronization or a certified switch to PRIMARY. Existing calendar remains the only scheduler; plane-local operational journal entries, OAuth records and remaining primary permission conflicts require explicit handling and cannot be blindly replayed. No new Excel copy was created.


## Checkpoint 2026-10-15 — primary outbox historical supersession

**Observed and executed after the preceding receipts:** Supabase primary outbox entries at sequences 652, 653 and 654 (source transactions 296766 and 296780) were inspected for matching identities, original statuses and later verified authority evidence. They were transitioned from CONFLICT to SUPERSEDED_BY_CONTINUITY under an exact-status and operation-ID guarded transaction; original `last_error` text was retained and annotated. These were historical INVITED, profile and ACTIVE snapshots that had been succeeded in the current Neon projection; no identity, role, entitlement, password, email or audit event was altered. Post-write independent query confirms all three annotated and Supabase outbox = MIRRORED 83, SUPERSEDED_BY_CONTINUITY 577, CONFLICT 0, PENDING 0. **Superseded is not a claim of identical mirror application.**

The separate Neon → Supabase journal remains PENDING 30,927, REPLAYED 4,521, CONFLICT 1, with mode RECOVERY and no primary promotion. Its plane-local continuity-state conflict is not authorized to be relabeled REPLAYED. Continue using the existing governed recovery contracts; do not create another schedule or blindly ingest expired OAuth state. MEM-003 overall remains OPEN.

## Checkpoint 2026-10-15 — concurrent reconciliation observation

A later direct read of the primary outbox shows **83 MIRRORED, 577 SUPERSEDED_BY_CONTINUITY, zero CONFLICT and zero PENDING**. The three historical profile/grant operations were reclassified together at 2026-10-15 09:49:45Z with an existing `MEM003_AUTHORITY_RECONCILIATION` annotation preserving their original failure text; the actor/caller for this concurrent change was **NOT_OBSERVED**. A separate attempted guarded classification returned no updated rows and must not be credited with this change.

The **single audit operation** reconciliation has a verified Neon operation receipt and Supabase acknowledgement, as recorded above. The reverse journal remains the real closure obstacle: latest observed **30,927 PENDING, 4,521 REPLAYED, one CONFLICT** on Neon, still in data-plane RECOVERY. This is a separate queue from the zero-pending primary outbox. Its locally scoped conflict is `sfi_continuity_state`; the original capture function logs plane-local operational tables, despite those tables being excluded from fingerprint comparison and primary mirroring. The scoped capture correction exists in this PR as a candidate and is not yet deployed.

**Operational guard:** do not clear journal conflicts, synthesize receipts, force PRIMARY, equate both planes, or infer which actor performed the concurrent outbox reconciliation. Resume the existing OIDC-scheduled recovery only after the legacy plane-local classification is safely verified, with row-level integrity and bounded transaction replay.


## Checkpoint 2026-10-15 — tested LOCAL_ONLY production migration

Executed the migration from `scripts/db/mem003-continuity-journal-scope.sql` on isolated Neon branch `br-wispy-cake-aw0csqqc` first. It accepted two consecutive idempotent applications. A harmless local singleton UPDATE on the test branch left the journal at exactly 35,449 rows, proving the new trigger boundary does not capture plane-local updates. On the same branch, 1,772 entries were reclassified `LOCAL_ONLY`, preserving operation IDs, epoch, source transaction, row/before images and existing error context.

Deployed the identical three-statement patch to Neon main `br-weathered-sea-awse41ie`. Verified production state: 1,772 LOCAL_ONLY (1,288 capability health checks, 322 continuity runs, 162 continuity-state events including the prior solitary CONFLICT), 4,521 REPLAYED, 29,156 PENDING, zero CONFLICT. No journal row was deleted, no arbitrary row was marked REPLAYED, no user or grant was modified, and mode stayed RECOVERY.

Then invoked the existing ROOT `data_plane_copy_verified` bounded operation: selected 20, recovered 20, conflicts zero, no state promotion. Invoked ROOT `data_plane_emergency`, which replayed 32 source transactions / 32 rows before correctly returning `CONTINUITY_JOURNAL_NOT_EMPTY` rather than switching to PRIMARY. Its error response is a **partial successful side-effect**, not a rollback. Verified remaining journal at 29,104 PENDING and zero CONFLICT at that time; the mirror certification flag briefly became true despite global recovery being incomplete. Explicitly restored `primary_mirror_certified=false` through the existing Neon RPC with an open-recovery explanation. Fixed the premature mirror-certification condition in `src/lib/persistence/primaryMirror.ts` in this PR, separating outbox-drained from recovery-certified so normal replay can continue. Added a QA gate for the distinction. This TypeScript change is not yet deployed while PR checks are pending.

**Closure remains blocked by actual replay and fingerprint convergence, not by the old local-state conflict.** No extra Excel workbook or alternate master report was created.


## Checkpoint 2026-10-15 — certification RPC defense

Code and production gate: `src/lib/persistence/primaryMirror.ts` now separates `outboxClear` from `certified`, requiring PRIMARY mode with no continuity journal pending/conflicts to certify; it still returns `ok=outboxClear` to let recovery proceed. The correction is in the unmerged PR pending CI. The matching Neon RPC `sfi_set_primary_mirror_certification_v1` is already deployed directly to production after isolated test. Passing `true,0,null` while the plane was in RECOVERY returned `mirrorCertified=false` and `MEM003_CERTIFICATION_BLOCKED:mode=RECOVERY:journalOpen=t`, proving the database itself rejects premature certification regardless of app deployment SHA. Grants/functions permissions were not widened.

Existing ROOT verified-source copy replayed 20 immutable source observations, followed by the governed bounded emergency replay of 32 further transactions/rows, all under existing contracts. Post-execution ledger counts match on both sides: Neon `REPLAYED=4573`, `LOCAL_ONLY=1772`, `PENDING=29104`, `CONFLICT=0`, total 35449. Supabase `sfi_continuity_applied_operations=4573`, world_source_observations=9752, world_friction_readings=9758. Mode RECOVERY persists correctly.

The subsequent ROOT emergency connector attempt failed with `McpServerError: Connection failed` and **did not change the independently queried counts**; do not misreport that attempt as successful or repeatedly submit blind retries. Only one canonical recovery scheduler exists.

A preexisting `SFI Verify` QA assertion expected the compatibility epistemic writer to insert directly via `.from('epistemic_events')`, contrary to the merged MEM-002 single-writer architecture. Updated the test in this PR to require forwarding to `appendEpistemicEvent` instead, preserving the canonical RPC path. Latest CI statuses are still not a full successful production deployment. New Neon test branch `br-wispy-cake-aw0csqqc` exists for isolated verification and may incur provider compute/storage costs; no destructive branch deletion was executed.

**Not certified:** 29,104 continuity journal operations and full bilateral fingerprints remain open. Never infer a certified PRIMARY return from a mirror-only acknowledgment.
