# Reality Chain — atomic closure release readiness (2026-10-24)

**Current disposition: BLOCKED FOR PRODUCTION.** This is an evidence-based deployment gate, not a claim that all of Reality Chain is nonfunctional. No production-provider database writes or migrations were executed; disposable PostgreSQL CI fixtures were migrated and mutated.

## Read-only provider inventory

| Check | Supabase | Neon |
|---|---|---|
| Case Platform base tables | Present | Present |
| `sfi_cases.closure_revision` | Absent | Absent |
| `sfi_close_case_atomic_v1(...)` | Absent | Absent |
| `sfi_record_case_object_atomic_v1(...)` | Absent | Absent |
| Case revision triggers | Absent | Absent |

Supabase migration registry lists 37 migrations; neither version `20260909080500` nor `20261023123624` appears. This does not establish Neon migration history.

At `2026-10-24T16:18:01.183Z`, read-only SFI_ROOT `data_plane_status` reported `mode=RECOVERY`, `primaryMirrorCertified=false`, `primaryErrorCode=SUPABASE_TRANSPORT_UNAVAILABLE`, journal pending/conflicts/protected pending `0/0/0`, primary outbox pending/conflicts `0/0`, and mirror certificate reason `NOT_PRIMARY`.

Supabase metadata reads succeeded despite this recorded data-plane error: the status is **not** proof that Supabase remains unreachable. Empty queues are **not** proof of primary parity.

At `2026-10-24T17:35:53.497Z`, SFI_ROOT remained in `RECOVERY` with a non-certified mirror and two new pending journal entries for `sfi_oauth_authorization_codes` (zero conflicts). Do not treat the earlier empty journal as a current-state assertion.

## Scope of demonstrated testing

- #837 integrates #835 reconstruction and Passport, #832 tenant-scoped ingest, #834 inspector and #836 temporal reconciliation.
- Existing PGlite tests exercise isolated SQL migration, atomic writer/revision, stale closure, authorization and administrative closure.
- **Demonstrated:** GitHub Actions PostgreSQL 17 isolated concurrency with two independent connections; one session holds a canonical object-write lock while the other attempts closure. The stale close is rejected after lock release. Post-close object writes fail, administrative closure/audit rollback is atomic, and client RPC grants remain restricted. See workflow `Reality Chain Isolated PostgreSQL Concurrency`, successful run `40116281073`.
- **Demonstrated negative replay finding:** on isolated PostgreSQL, a child row inserted with user triggers suppressed leaves `sfi_cases.closure_revision` unchanged. Log marker: `REPLAY_REVISION_BLIND_SPOT_OBSERVED`. The real Neon receiver `scripts/db/neon-primary-mirror-receiver.sql` also uses `ALTER TABLE ... DISABLE TRIGGER USER` while applying source snapshots; therefore the parent case row, including its revision, must be copied and independently verified.
- **Added fail-closed validation:** `scripts/reality_chain/verify_replay_batch.mjs` assesses that child mutations carry valid case revision snapshots within a source transaction, accounting for multiple parent updates. It is exercised by CI but is **not yet integrated into the production replay path**. The release gate now also requires real parent-revision and content-digest parity receipts.
- **Still not demonstrated:** actual two-provider replay on an isolated restored pair; source/target case revision and field-level digests after replay; report persistence/readback on the full integrated server; a fresh global primary mirror certificate; or live KXTXR Passport persistence.
- `scripts/reality_chain/migration_release_gate.mjs` provides only a fail-closed advisory readiness check; it does not apply DDL, expand privileges, grant approval or certify a production release.

## Required release sequence

1. Restore and independently verify `PRIMARY` mode with current mirror certification, transport and queue parity. No forced authority promotion.
2. Verify base schema, trigger interactions and RPC privileges read-only in both providers.
3. **Completed for the isolated two-session concurrency subset:** lock, stale revision, rollback and rejected post-closure writes. Separately verify report persistence/readback.
4. **Still required:** full bounded recovery/replay on an isolated pair, including disabled user triggers, bundled parent case revision snapshot, independent row digest parity, all child tables, and post-replay consistency. The missing-parent negative check has already reproduced.
5. Obtain explicit human approval for actual schema modification and any cost, with migration order, rollback path and maintenance window.
6. Apply only after authorization, then read back both providers and perform one authorized KXTXR Case Platform → report → Passport trial.

## Read-only inspection SQL

```sql
select to_regprocedure('public.sfi_close_case_atomic_v1(uuid,uuid,text,bigint,jsonb)')::text as close_rpc,
       to_regprocedure('public.sfi_record_case_object_atomic_v1(uuid,uuid,jsonb,text,jsonb)')::text as object_rpc,
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='sfi_cases' and column_name='closure_revision') as has_revision;
```

Preserve source PRs #832/#834/#835/#836 and the Discovery 800 branch. No promotion of incomplete evidence or fabricated RETURN.
