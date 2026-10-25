# SFI — No replication + Resource Economics (Founder decision)

**Decision date:** 2026-10-25 (CDMX). **Decision authority:** Founder, explicit in conversation. **Status:** Database capture retired in BOTH live providers; GitHub main and working branch edited. **No database deletion, no data purge, no automatic Neon failback.**

## Binding architectural invariants

1. Supabase PRIMARY and Neon are **independent datasets**. Neither is a hot mirror or required to match the other. A difference in object counts/IDs/versions must be disclosed at the point of use, not treated as an operational debt to be repaid with copying.
2. **No cross-provider writes for synchronization**, automatic or manual. No primary-outbox drain, Neon journal replay, capture triggers adding mirror work, mirror certification, fingerprint-driven recovery gate or equality requirement in C02/C07/C20.
3. SFI may use Neon for its **own** explicitly sourced workloads and retained data, never imply that Neon is a backup of Supabase or has the same actor grants, Case objects or historical state. Independent access/authority must be verified per provider. Any later migration requires a separate explicit decision.
4. SFI must meter real costs and usage **without spending more than observing warrants**. Use existing Supabase `usage_ledger` and `sfi_continuity_runs` (ROOT-only, bounded 30-day on-demand reads), Neon total storage measurement only on demand. No new cron, table, provider token or repeated full-table fingerprint probes.
5. Monetary charges and quotas are **UNKNOWN** until an authoritative provider billing/usage feed returns them. Do NOT infer $0 from missing billing records; do NOT assign a USD price from job count or DB size. The Vercel FOCUS billing request during adoption returned `costs_not_found`; currently no verified Vercel charge amounts. Supabase `usage_ledger` contained 0 events at review, while `sfi_continuity_runs` had 202 runs/1,616 capability checks and 4.4 minutes of recorded elapsed time in its latest 30-day window. That runtime duration is NOT invoiceable compute time.
6. C07–C20 criteria must verify local persistence, authorization, RETURN, and accepted evidence **without cross-provider parity**. A report must disclose its actual source/read plane, not invent complete coverage or certified recovery. Historical sync backlogs remain evidence, not tasks to clear.
7. No silent restoration through environment flags or scheduled workflows. The code policy `src/lib/persistence/replicationRetirementPolicy.ts` blocks RPC writers at both clients; heartbeat and operator routes refuse replay. GitHub `sfi-continuity-hourly.yml` no longer contains any synchronization drain calls.

## Executed direct database changes

Only dedicated cross-provider capture trigger functions were replaced, inside each live database, with a body `RETURN COALESCE(NEW, OLD)`. Prior full function DDL is preserved, **not automatically runnable**, under:
- `scripts/db/rollback/20261025_restore_supabase_primary_outbox_capture.sql`
- `scripts/db/rollback/20261025_restore_neon_journal_capture.sql`

Primary: `sfi_capture_primary_data_plane_write()`: 159 original enabled triggers, **0 inserts to outbox** in function body after change.
Neon: `sfi_capture_data_plane_write()`: 167 original enabled triggers, **0 inserts to journal** after change.
The existing outbox/journal rows were not deleted, modified, or falsely marked mirrored/replayed. No access grants, business triggers, authority policies or data tables were removed.

## Acceptance and remaining work

- **Verified**: function body no longer inserts into cross-provider capture log; triggers remain enabled; GitHub workflow drain removed; RPC write policy added to `main` and work branch.
- **Code QA**: `scripts/qa-sfi-no-replication.mjs` and updated `qa-sfi-neon-continuity-heartbeat.ts` assert retired paths; final exact-head GitHub CI is required before claiming a production-ready release.
- **Deployment gap**: existing Vercel deployment may still run an older app bundle until deliberate deployment. Removing GitHub's drain step and disabling capture functions prevents newly captured cross-provider work; verify the final HTTP endpoints after deployment. Do not claim full app update on GitHub push alone.
- **Financial gap**: billing totals unknown; the on-demand ROOT observation now reads existing bounded unit ledger and continuity runs, but cannot claim provider actual charges until billing data is accessible. No 30-day charge amount should be invented.
- **Failover gap**: Neon cannot be promoted as if it holds PRIMARY's complete data. Separately design backups, recovery points, and manual export/import only upon new explicit authorization.
- **Additional dedicated update**: do not interpret stored `primaryMirrorCertified` or historic 52-row outbox as a mandate for reconciliation. Existing read-model language must be reviewed and reclassified as historical if shown to clients.

**Rollback is not automatic** because reinstating mirroring contradicts the binding founder decision. No production SQL shall be applied from rollback files without new explicit authorization.
