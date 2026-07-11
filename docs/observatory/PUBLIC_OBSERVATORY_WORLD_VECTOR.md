# Public Observatory · World Vector

`/observatory` is the public reading surface of System Friction Institute.

## Public contract

The surface exposes only:

1. Current World Spectrum Vector.
2. Active domain vectors and their evidence state.
3. Longitudinal observation derived from persisted WorldSpect snapshots.
4. Current tensions and vector directions.
5. The Daily Reading by System Friction Institute.
6. Provenance, degraded sources and epistemic limits.

It does not expose governance, ROOT, operator commands, internal proposals, private memory, account data or execution controls.

## Evidence rules

- Numeric charts use persisted observations only.
- No synthetic spark lines.
- No geographic node is rendered unless the source includes real regional metadata.
- Missing regional evidence remains explicitly unavailable; zero is not treated as an observation.
- The Daily Reading is an institutional interpretation and is labeled as such.
- Every interpretation keeps the observation date, source confidence and known limits visible.

## Longitudinal horizon

The default horizon is 90 days, capped by the persisted snapshots available in `worldspect_snapshots`. The interface displays the actual number of observations and does not interpolate missing days.
