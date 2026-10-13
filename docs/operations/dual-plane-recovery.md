# SFI dual-plane recovery — implementation boundary

## Target
Supabase is the authoritative normal write plane. Neon is a bounded contingency plane. A single writer per logical operation is mandatory. Neither database's table count alone certifies consistency.

## Current status
The accompanying workflow is a **read-only weekly audit**, not a synchronization or failover implementation. It is intentionally proposed in a branch and does not alter production or enable any cron until merged.

## Required gates before replay
1. Inventory real route-to-database dependencies and actual operation journal schemas.
2. Establish a verified snapshot / point-in-time restore for both planes.
3. Establish replay ownership, source epoch, stable operation IDs, ordering and idempotency.
4. Inspect and resolve conflicts without last-write-wins or blanket truncation.
5. Dry-run replay on an isolated restored environment and compare keys and canonical row digests.
6. Require governance approval for promotion, automatic failover, and production replay.
7. On recovery, quiesce contingency writes, reconcile forward, verify receipts, then restore Supabase authority.

## Weekly acceptance
Publish an artifact recording source counts, missing tables and divergence; fail closed on missing secrets or inaccessible planes. Do not claim parity from count equality. Add key-level comparison and recovery drill receipts before using the label CERTIFIED.

## Security
Do not expose connection strings or row contents in audit artifacts. Keep the job's GitHub token read-only. Restrict database credentials to SELECT-only audit roles. Do not use service-role keys in client-side code.
