# MEM-002 — Writer inventory and non-destructive convergence

Status: draft; no live schema verified; no integration tests executed.

## Writers
- `src/lib/events/eventStore.ts`: canonical event hash, scoped `logbook_id` head, but read stream is fail-open and capped at 500; head-read/insert is not transactional.
- `src/core/memory/epistemicEventWriter.ts`: now a compatibility facade delegating to canonical append in PR #753; verify consumer compatibility before merge.
- `src/lib/governance/governanceRuntime.ts`: **additional direct writer**, with global unscoped head; `recordBlindModePolicyBlock` and `recordAcpSeen` use **different hash material even within the same file**. Must converge before claiming single writer.

## Canonical class vocabulary
`packages/events/src/schema.ts` and `20260828111500_converge_epistemic_event_contract_and_concurrency.sql` enumerate the same 13 classes. The earlier May migration lists seven classes; do not infer the deployed constraint from the earliest migration alone. The August migration is fail-closed on noncanonical legacy classes.

## Critical gates
1. Verify `actor_id`/`node_id` exist in live schema before merge (or remove their unconditional insertion).
2. Check TypeScript compilation of adapter: `Partial<SFIEvent>` call, return shape and `EpistemicEventRow` casting.
3. Audit historical `hash_self` provenance by writer; never recompute or overwrite legacy rows. Versioned verification must precede mixing in the same logbook.
4. Replace governance direct insert paths with canonical append preserving `policy_decisions`, `logbook_regime`, and `processEpistemicEvent` behavior; use canonical receipt and actual persisted `created_at`.
5. Implement fail-closed stream and complete pagination; test T1–T7 in disposable Postgres.
6. Establish atomic per-logbook concurrency control; uniqueness of `event_id` alone is insufficient.
7. No production writes, deploys, schema changes or merge until gates are met.

## P12 cross-reference
Inventory: `SFI_MEMORIA_INSTITUCIONAL_MAESTRA_CONTINUITY_003_P12.xlsx`, tab `27_P12_YEAR_END_INVENTORY`, rows `P12-COLLAB-001` through `P12-INV-001`. Contributions of Claude and Gemini are attributed as design inputs, not independent verified code changes.
