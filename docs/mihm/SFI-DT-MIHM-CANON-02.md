# SFI-DT-MIHM-CANON-02

Status: adopted decision
Date: 2026-07-15
Scope: MIHM instrument hierarchy

## Decision

MIHM is treated as a meta-model, not as one universal equation. It defines the shared vocabulary and exchange grammar used by instruments. Each instrument keeps its own mathematics because each instrument observes a different object.

The shared grammar is:

`Instrument -> Variables -> Homeostatic state -> Confidence -> Trajectory -> Prediction -> Timestamp`

The equation behind a homeostatic state belongs to the instrument that produced it.

## Instrument Levels

- Level 0: MIHM as meta-model. It defines variables such as IHG, NTI, LDI, Fs, Er and Omega.
- Level 1: Instruments. MOP-H observes personal sessions, ScoreFriction observes systemic cultural vectors, PPOI observes persistent phenomena, World Vector observes macro-state, and SMLI-P is evidence-only.
- Level 2: Typed homeostatic states. The implementation uses stable ASCII identifiers: `PHI_PERSONAL`, `PHI_SYSTEMIC`, `PHI_PHENOMENOLOGICAL`, and `PHI_WORLD`.
- Unified layer: only the exchange contract is unified. Equations are not unified.

## Current Implementation Map

| Instrument | Object | Typed state | Current status | Location |
| --- | --- | --- | --- | --- |
| MOP-H | Person or dyad session | `PHI_PERSONAL` | Implemented and wrapped | `src/lib/moph/moph-math.ts` |
| ScoreFriction | Cultural/systemic vectors | `PHI_SYSTEMIC` | Implemented and wrapped | `src/lib/evaluator/derivedMihmRuntime.ts` |
| World Vector | Macro-world state | `PHI_WORLD` | Candidate, read path exists | `src/lib/observatory/public/readPublicObservatoryState.ts` |
| PPOI | Persistent phenomenon | `PHI_PHENOMENOLOGICAL` | Not integrated in this ZIP | pending PPOI candidate |
| SMLI-P | Multimodal signals | none | Evidence-only | pending |

## Implementation Constraints

- Do not replace `moph-math.ts`.
- Do not replace `derivedMihmRuntime.ts`.
- Do not normalize all instruments into one numeric equation.
- Do not label evidence-only instruments as homeostatic-state producers.
- Do preserve formula traceability with `formulaRef`.
- Do preserve `MISSING` or `null` when an instrument cannot emit a reading.

## Open Questions

- The source process that writes `worldspect_snapshots` must be verified before `PHI_WORLD` is declared fully implemented.
- PPOI and SMLI-P still require their own compatibility review before integration.
- A future Level 3 may compare trajectories across instruments, but it must not rewrite instrument equations.
