# SFI-DT-MIHM-CANON-03

Status: adopted addendum
Date: 2026-07-16
Scope: World Vector instrument state

## Decision

World Vector is integrated as the MIHM world-scale instrument under `PHI_WORLD`.

The adapter does not calculate a new world formula. It reads the latest persisted WorldSpect snapshot through `getLatestWorldSpectSnapshot()` and exposes that snapshot through the universal MIHM instrument contract.

## Implementation

- Adapter: `src/lib/mihm/adapters/worldVectorInstrumentAdapter.ts`
- Snapshot source: `src/lib/worldspect/snapshotStore.ts`
- Formula trace reference: `src/lib/worldspect/vector-aggregator.ts#aggregateWorldSpect`
- Combined route: `src/app/api/mihm/state/route.ts`

`/api/mihm/state` now returns:

- `data.runtime`: existing ScoreFriction-derived MIHM runtime, preserved for current consumers.
- `data.instrumentState`: existing systemic instrument state, preserved for consumers added in `SFI-DT-MIHM-CANON-02`.
- `data.instrumentStates.systemic`: ScoreFriction as `PHI_SYSTEMIC`.
- `data.instrumentStates.world`: World Vector as `PHI_WORLD`.

## Current Instrument Coverage

| Instrument | Typed state | Status |
| --- | --- | --- |
| MOP-H | `PHI_PERSONAL` | Implemented, contract applied |
| ScoreFriction | `PHI_SYSTEMIC` | Implemented, contract applied |
| World Vector | `PHI_WORLD` | Implemented, contract applied |
| PPOI | `PHI_PHENOMENOLOGICAL` | Pending PPOI integration review |
| SMLI-P | none | Evidence-only, pending |

## Boundaries

- World Vector remains read-only in this integration.
- No WorldSpect formulas are replaced.
- Missing snapshots stay missing through `homeostaticState: null`.
- `NTI` remains shared vocabulary, not a claim of numeric equivalence between instruments.
- PPOI is still not implemented by this addendum.
