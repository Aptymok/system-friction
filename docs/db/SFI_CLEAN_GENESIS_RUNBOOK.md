# SFI · CLEAN GENESIS RUNBOOK

**Contract:** SFI-CLEAN-GENESIS-1.0  
**World-day origin:** 2026-06-02 UTC = Day 1  
**Reconstructed history end:** 2026-08-11 UTC = Day 71  
**Prospective clean genesis:** 2026-08-12 UTC = Day 72

## Objective

Reset the operational/database residue accumulated during development without erasing the provenance-rich history required to preserve longitudinal World observation. Reconstruct only what current System Friction Institute (SFI) can derive from explicit evidence, then continue prospectively from one clean genesis.

## Survives the reset

- identity, access, permissions, billing and ROOT/ACP authority;
- `sfi_world_day_ledger`;
- `world_source_observations`;
- `worldspect_snapshots`;
- repository canon, migrations and executable contracts.

These are preserved because they carry either institutional authority or provenance-rich temporal/source history.

## Does not survive the reset

Operational/runtime rows are cleared, including:

- Field cases, hypotheses, interventions, returns and outcomes;
- Studio sessions, objects, uploads and derived analysis;
- Method Lab executions;
- Cognitive Twin runtime memory, decisions, evaluations and runs;
- predictions, attractors, ejectors, PPOI runtime and AMV runtime;
- graph projections and evidence ledgers;
- governance/audit/test proposal runtime;
- generated reports/commercial runtime;
- derived or parallel World interpretation: friction readings, hypotheses, outcomes, learning, World Vector cycles/observations/reports/alerts, Observatory learning/events, kernel cycles, ROOT observation events and SFI indicator snapshots.

No quarantine state is part of this clean-start procedure. A row is either protected by an explicit source/authority rule, deleted as operational/derived state, or reconstructed from surviving evidence.

## Historical reconstruction seed

The seed is idempotent and requires explicit confirmation.

It creates:

- Day 1 through Day 71 as UTC time coordinates;
- Day 72 as `PROSPECTIVE_GENESIS / LIVE_EMPTY`;
- 50 source-backed historical SFI artifact/provenance records;
- 12 source-backed merged software-convergence milestones from GitHub.

A day with no seeded evidence remains `TIME_COORDINATE_ONLY`. This means only that no qualifying historical object was reconstructed for that date. It does **not** mean SFI was inactive that day.

Historical evidence is written as `IMPORTED_PROVENANCE`. The seed does not synthesize or backdate `epistemic_events` and does not create Field returns, Method Lab results, governance approvals or external actions.

## Derived reconstruction

After the provenance seed:

1. rebuild the canonical evidence graph from seeded evidence;
2. sync ROOT evidence into Cognitive Twin candidate memory;
3. sync preserved WorldSpect snapshots into Twin context while retaining their observed/derived/simulated boundary;
4. do not recreate Field, Method Lab or governance history unless a real persisted source supports it.

## Execution order

```bash
npm run db:export
npm run db:cleanup:plan
npm run db:proof:export

SFI_DB_RESET_CONFIRM=CLEAN_RUNTIME_AFTER_VERIFIED_PROOF npm run db:reset:sfi

SFI_HISTORY_SEED_CONFIRM=RECONSTRUCT_SFI_HISTORY npm run db:seed:sfi

SFI_HISTORY_RECONSTRUCT_CONFIRM=REBUILD_DERIVED_SFI_HISTORY npm run db:reconstruct:sfi

npm run db:verify:sfi
```

The reset script has additional export/proof gates and may require their existing environment confirmations. Do not bypass them except through the explicit reviewer override already implemented and recorded by that script.

## Truth boundary

A successful clean genesis means:

- the application/runtime is starting from a deliberate clean operational state;
- legitimate World-source history remains addressable;
- selected historical SFI artifacts have provenance records;
- derivable graph/Twin context has been reconstructed using current code;
- Day 72 is the first prospective day of the clean runtime.

It does **not** mean that historical claims were scientifically validated, that old simulations became observations, that past software merges prove production execution, or that future SFI results are predetermined.
