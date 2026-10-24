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
- **Current note:** the earlier two-database replay and case/object/audit row-digest gaps were resolved in disposable PostgreSQL CI, as documented below. Still not demonstrated: provider-restored full-snapshot parity, full integrated report persistence/readback, a fresh global PRIMARY mirror certificate, or live KXTXR Passport persistence.
- `scripts/reality_chain/migration_release_gate.mjs` provides only a fail-closed advisory readiness check; it does not apply DDL, expand privileges, grant approval or certify a production release.


## 2026-10-24 — Intervention 5: outbox capture + guarded replay

- **PASS** GitHub Actions `40118630935`: the canonical Case Platform writer in disposable PostgreSQL emitted outbox rows via the repository's original `20260921081000_systemic_primary_data_plane_outbox.sql` trigger. The test invoked `sfi_claim_primary_outbox_batch_v1()` and passed that **actual captured transaction** to the actual Neon mirror receiver SQL on a separate disposable database. Whole-row digests for case, object and audit matched; retry remained idempotent; conflict rollback and user-trigger restoration passed.
- Shared `src/lib/persistence/realityChainReplayBatch.mjs` is imported by the primary mirror runtime and exposed to existing tests through a re-export. It requires a valid same-transaction case parent revision snapshot when a migrated `closure_revision` parent is detected, or when the deployment explicitly enables `SFI_RC_REPLAY_REQUIRE_PARENT_SNAPSHOT=true`. Invalid batches go to the **CONFLICT** outcome and cannot be silently acknowledged as mirrored. Ordinary legacy case and unrelated table batches remain compatible without that flag.
- **Important negative coverage boundary**: a child-only batch created on a migrated source contains no parent to signal schema readiness. Automatic detection cannot safely infer a migration from that packet alone. The explicit strict flag MUST be enabled only after reviewed migrations and isolated replay verification; live release checklist MUST verify that deployment configuration and not infer it from this PR.
- The test still does **not** use production Supabase/Neon credentials, and no production data-plane mode switch or database DDL has been authorized.
- The complete last-head CI result must be checked independently. A previous green test does not imply every subsequent code commit is green.

## 2026-10-24 — C02: Independent PostgreSQL fingerprint paging validation

**Result: ISOLATED_TESTS_PASS / PRODUCTION_ACTIVATION_BLOCKED.** This section supersedes the earlier statements that isolated two-provider replay and digest checks were not yet demonstrated. Both provider replay and real SQL fingerprint paging now have isolated CI receipts. No production schema changes or primary promotion have been made.

- **Exact-source CI:** [GitHub Actions run 40129282841](https://github.com/Aptymok/system-friction/actions/runs/40129282841), commit `2407da83c684d5be185c7da5a4336998e0bfcee6`, PASS. [`scripts/reality_chain/qa-two-provider-fingerprint-pages.mjs`](https://github.com/Aptymok/system-friction/blob/work/reality-chain-integration-20261024/scripts/reality_chain/qa-two-provider-fingerprint-pages.mjs) runs against **two independent disposable PostgreSQL 17 servers**, not two schemas in one cluster.
- **Exact table semantics:** original `sfi_data_plane_fingerprint_v2()` SQL extracted from `scripts/db/mem003-continuity-journal-scope.sql`, compared with new `sfi_data_plane_fingerprint_page_v1(text,integer)` on each server over **165** matching public tables. Pages=22/provider, bounded page size=8. Measured fixture enumerations were 23.19 ms (source) and 23.22 ms (target); not a production latency benchmark.
- **Nine proven negative/positive tests:** identical 165-table catalog, excluded data-plane-local state, active-vs-expired OAuth rows, canonical `platform_metric_snapshots` numeric scale, late row-hash mismatch and correction, extra/missing table, semantic authority comparison allowing *only separately verified* administrative timestamp changes, invalid cursor/limit and late transport failure/pagination cap, final restored parity.
- **Existing Case Platform tests also remain PASS** within the same run: real two-session closure atomicity; real outbox capture, two-database target replay, idempotent retry, parent revision and object/audit content digests.
- **Read-only production inventory** at 2026-10-24 20:41 UTC: Supabase project `nwrmbkgsnrhdscnsyoko` and Neon project `misty-thunder-56295044` each showed exactly **161** in-scope public tables and `sfi_data_plane_fingerprint_v2()` present. **Both were missing** `sfi_data_plane_fingerprint_page_v1(text,integer)`. Both catalog counts match; that is *not* row-level provider parity.
- **SFI_ROOT read-only status** `2026-10-24T20:41:37.635Z`: mode `RECOVERY`, effective mirror certificate `false`, reason `NOT_PRIMARY`, recorded `SUPABASE_TRANSPORT_UNAVAILABLE`, journal pending 5 (OAuth codes 2, Cognitive Twin runs 1, WorldSpect snapshots 1, epistemic events 1), conflicts 0, protected pending 0, primary outbox pending 0. Independent direct SQL reads succeeded while SFI server health reported transport unavailable: these are different surfaces, not proof of REST operability.
- **Production blocker:** the production RPCs on **BOTH** providers are absent, and primary REST reachability/safe journal drain have not been independently demonstrated. Applying migration `20261023095000_sfi_fingerprint_paged_transport_v1.sql` on both providers is an additive but real **production DDL and SECURITY DEFINER/grant change**, requiring *specific human authorization*. Do **not** call `recoverPrimaryDataPlane`, force PRIMARY or mark mirror certified using this CI result.
- **Reversible deployment procedure after authorization:** (1) test direct primary REST API credentials and Neon Data API JWT route from their server runtime, without logging secrets; (2) capture authorized schema and grant preflight in both providers; (3) stage additive RPC identically, using existing migration tooling; (4) verify `pg_get_functiondef`/EXPLAIN and role execute restrictions, compare 161+ tables with bounded reads; (5) address/replay journal conflicts through existing authority rules, independently check non-atomic parity and global certification; (6) perform recovery only after release gate passes; (7) smoke check Case Platform + Timeline + Passport and record version/rollback. Any rollback of an installed RPC must be separately reviewed for active dependencies; do not blindly drop it.
- **Decision:** C02 code-and-isolation portion COMPLETE, provider activation BLOCKED on approval plus current REST/transport state, journal reconciliation and certification; issue #839 is the operative ledger. Continue other read-only/isolated blocks while C02 production sub-gate remains blocked.

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
