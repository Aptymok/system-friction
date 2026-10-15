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
