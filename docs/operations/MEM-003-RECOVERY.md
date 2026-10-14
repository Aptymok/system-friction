# MEM-003 — bilateral continuity reconciliation

## Verified 2026-10-14

- Neon and Supabase each retain 91 audit events after six non-destructive bilateral inserts.
- Five primary outbox entries from transaction 296907 were successfully replayed through the Neon receiver (`alreadyApplied=5`) and acknowledged MIRRORED; pending backlog fell to zero.
- Four original conflicts remain, in source transactions 296766 and 296780.
- Neon has 7 access grants; Supabase has 6. Neon has later updates to at least three shared grants and one shared profile.
- Do not overwrite access grants or roles based only on timestamps: require an authority determination and current authentication reconciliation.
- An atomic batch error from one entry propagates to its sibling operations; siblings are blocked, not independently proven conflicting.

## Closure gates

1. Reconstruct the authority epoch and authenticate the canonical grants/profiles against the identity provider.
2. Reconcile all six grant/profile differences by primary key, preserving before/after evidence.
3. Replay or explicitly supersede source transactions 296766 and 296780 with a documented authority decision; never falsely acknowledge a mismatched operation as mirrored.
4. Compare all table fingerprints and event lineage across both stores; validate replay idempotency and recovery certification.
5. Record verification evidence and deployment SHA.
