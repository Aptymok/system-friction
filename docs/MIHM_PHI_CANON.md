# MIHM Phi Canon

**Decision date:** 2026-08-06  
**Status:** CANONICAL  
**Authority:** System Friction Institute / ACP  
**Contract:** `src/lib/mihm/phiContract.ts`

## Constitutive decision

MIHM is the meta-methodological framework. Phi is not one universal score. It is a family of method-scoped indices that share a normalized range but preserve different observed objects, dimensions, temporal windows, formulas and semantic meanings.

No arithmetic comparison, average or substitution between Phi indices is valid unless a separate, versioned cross-instrument interpretation method is approved.

## Canonical family

| Symbol | Method | Object/dimension | Meaning |
|---|---|---|---|
| `PHI_H` / `Φ_H` | MOP-H | Human/session | State of one identified person within one identified session. |
| `PHI_S` / `Φ_S` | ScoreFriction | Bounded system/object | Continuity state of one delimited artifact, signal or system. |
| `PHI_F` / `Φ_F` | PPOI | Longitudinal phenomenon | Normalized persistence state of one phenomenon with accumulated evidence. |
| `PHI_W` / `Φ_W` | World Vector / WorldSpect | World context | Contextual world-state index. In v1 it is the typed alias of WSI. |
| `PHI_SFI` / `Φ_SFI` | SFI Institutional | System Friction Institute | Institutional homeostatic state of SFI for one timestamped snapshot. |

All canonical Phi outputs use a `0–1` scale. Equal numeric values do not imply equal meaning across methods.

## Formula and scale decisions

### Φ_H

MOP-H retains its specialized personal/session formula. It is not the institutional SFI Math Core and must never be aggregated globally across people.

### Φ_S

ScoreFriction retains its feature-to-variable derivation, but IHG, NTI, LDI and ξ are resolved through the versioned SFI Math Core to obtain Φ_S and `F_S = 1 − Φ_S`. The previous weighted Phi and independent friction formulas are legacy and cannot generate new canonical readings.

### Φ_F

PPOI persists a weighted composite on a `0–5` scale. Canonical Φ_F is:

`Φ_F = clamp01(PPOI_COMPOSITE / 5)`

The raw composite remains preserved and visible. Normalization does not convert PPOI into institutional health; it only gives the phenomenon index a consistent output range.

### Φ_W

WorldSpect produces WSI and NTI from declared external sources and domains. In the current formula version, Φ_W is the typed alias of WSI. This relationship must remain disclosed until a different calibrated world homeostasis formula is approved.

### Φ_SFI

Φ_SFI is reserved exclusively for the institution. It is calculated from an identified `sfi_indicator_snapshots` record through the SFI Math Core:

`Φ_SFI = clamp01((IHG × NTI) / (1 + LDI) + ξ)`

`F_S = clamp01(1 − Φ_SFI)`

If ξ is unavailable, `ξ = 0.03` may be used only with `THIN` status and an explicit warning. If IHG, NTI or LDI are unavailable, Φ_SFI is `MISSING`; plausible defaults are prohibited.

## Legacy names and storage fields

The following names remain unambiguous aliases for migration and historical reproducibility only:

- `PHI_PERSONAL` → `PHI_H`
- `PHI_SYSTEMIC` → `PHI_S`
- `PHI_PHENOMENOLOGICAL` → `PHI_F`
- `PHI_WORLD` → `PHI_W`

`PHI_SF` is not an unambiguous alias. Historical asset and measurement records use it for a bounded object, where it migrates to `PHI_S`. Historical institutional records use it for System Friction Institute, where it migrates to `PHI_SFI`. Migration requires the object and instrument context; a blind global rename is prohibited.

The reduced kernel metric formerly called `phi` is not a member of the canonical Phi family. It is constituted as `REDUCED_KERNEL_CONTINUITY`; the `phi` property remains only as a temporary compatibility alias and must carry `canonicalPhi: false`.

Legacy identifiers are not accepted for new canonical records.

## Prohibitions

1. Do not average Φ_H, Φ_S, Φ_F, Φ_W and Φ_SFI.
2. Do not display the latest personal or phenomenon reading as institutional state.
3. Do not label a 0–5 PPOI composite as Phi without normalization.
4. Do not use WSI as institutional Φ_SFI.
5. Do not generate institutional values from constants when evidence is absent.
6. Do not let a model, interface or adapter change a formula silently.
7. Do not promote a legacy reading without formula version and provenance.
8. Do not migrate `PHI_SF` without object and instrument context.
9. Do not present a heuristic continuity estimate as canonical Phi.

## Presentation contract

Every displayed Phi must expose:

- canonical symbol;
- method;
- observed object;
- dimension;
- scale;
- formula reference and version;
- timestamp;
- epistemic status;
- confidence;
- warnings;
- evidence or source lineage.

This document resolves the former ambiguity by constitution: MIHM unifies the grammar of observation; it does not collapse distinct objects into one number.
