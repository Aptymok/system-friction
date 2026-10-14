# MEM-002 Release and evidence gate (14 October 2026)
Status: NOT PRODUCTION READY — draft PR #753.

## Verified historical state (read-only Supabase inspection)
- 1,097 original events; 150 logbooks; 72 null-root events.
- 734 hash predecessor references connect different logbooks.
- 41 BR events share one predecessor hash, sequences 890–1002.
- These anomalies prohibit declaring pre-cutover logbooks VERIFIED.
- None of the old rows may be updated to force new hashing algorithms.

## Patch scope
- Consolidate legacy writer, governance runtime and thought inhibition through the shared append API.
- Atomic SQL RPC takes a transaction-scoped advisory lock per logbook.
- Caller supplies canonical JSON bytes, RPC checks each critical field and the expected head under lock and computes SHA256 from those bytes.
- Retry only expected-head contention; fail closed on other errors.
- All-record audit reports LEGACY_OR_DIVERGENT; never silently canonicalizes legacy rows.
- Read routes must not represent failed stream as success.

## Mandatory gates before migration/deploy
1. Local isolated PostgreSQL: T1–T7 plus 1,200-row pagination, 20 simultaneous writers, and JSON/Unicode/timezone golden hash fixtures.
2. Validate SQL function signature, grants, pgcrypto/digest presence, time formats and typecheck.
3. Confirm no remaining direct ledger inserts outside atomic RPC, including scripts and external writers.
4. Prove post-history continuity: fresh chain links to prior head without asserting all prior entries are canonical.
5. Confirm deployment order: SQL RPC on active Supabase/Neon write plane before routing app calls.
6. No main merge or production migration without green tests and explicit release authorization.

## Known unresolved issues
- Historical mixed hash formats and cross-logbook heads remain unverified.
- SQL and TypeScript changes are NOT yet proven by integration tests.
- Some read consumers ignore ok and require contract regression tests.
- Advisory lock only protects writers that use RPC; raw INSERT bypasses it.
- RPC requires service role and PostgreSQL digest, grants and time parsing verification.
- C-1 remains blocked until complete verifiable evidence chain.
