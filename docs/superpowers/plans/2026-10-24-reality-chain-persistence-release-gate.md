# Reality Chain — atomic closure release readiness (2026-10-24)

**Current disposition: BLOCKED FOR PRODUCTION.** This is an evidence-based deployment gate, not a claim that all of Reality Chain is nonfunctional. No database writes or migrations were executed.

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

## Scope of demonstrated testing

- #837 integrates #835 reconstruction and Passport, #832 tenant-scoped ingest, #834 inspector and #836 temporal reconciliation.
- Existing PGlite tests exercise isolated SQL migration, atomic writer/revision, stale closure, authorization and administrative closure.
- **Not yet demonstrated:** two actual independent PostgreSQL sessions with concurrent writes and closure; mirror replay with user triggers disabled; a fresh primary mirror certificate; or live KXTXR Passport persistence.
- `scripts/reality_chain/migration_release_gate.mjs` provides only a fail-closed advisory readiness check; it does not apply DDL, expand privileges, grant approval or certify a production release.

## Required release sequence

1. Restore and independently verify `PRIMARY` mode with current mirror certification, transport and queue parity. No forced authority promotion.
2. Verify base schema, trigger interactions and RPC privileges read-only in both providers.
3. Test migration on an isolated PostgreSQL environment with **two independent sessions**: concurrent child insert vs closure, stale revision, rollback, report readback and rejected post-closure writes.
4. Verify bounded recovery/replay on an isolated pair, including disabled user triggers and post-replay consistency.
5. Obtain explicit human approval for actual schema modification and any cost, with migration order, rollback path and maintenance window.
6. Apply only after authorization, then read back both providers and perform one authorized KXTXR Case Platform → report → Passport trial.

## Read-only inspection SQL

```sql
select to_regprocedure('public.sfi_close_case_atomic_v1(uuid,uuid,text,bigint,jsonb)')::text as close_rpc,
       to_regprocedure('public.sfi_record_case_object_atomic_v1(uuid,uuid,jsonb,text,jsonb)')::text as object_rpc,
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='sfi_cases' and column_name='closure_revision') as has_revision;
```

Preserve source PRs #832/#834/#835/#836 and the Discovery 800 branch. No promotion of incomplete evidence or fabricated RETURN.
