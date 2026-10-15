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
