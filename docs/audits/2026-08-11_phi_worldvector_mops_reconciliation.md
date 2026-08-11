# SFI reconciliation audit · Phi / World Vector / MOP-S

Date: 2026-08-11
Status: repository audit; this document does not create new scientific validation.

## Phi formulas

The current repository does not define one universal Phi formula. `docs/MIHM_PHI_CANON.md` and `src/lib/mihm/phiContract.ts` constitute a method-scoped family: PHI_H, PHI_S, PHI_F, PHI_W and PHI_SFI. Numeric equality across methods does not imply semantic equivalence and cross-method arithmetic substitution is prohibited.

`calculatePhiH` is MOP-H/session-specific. `calculatePhiSfi` is the SFI/ScoreFriction math-core family used under method-specific object contracts. `calculateCField = IHG * (1-LDI) * (1-0.35*NTI)` remains a separate field-continuity metric with registry id `c_field`; it is not a canonical Phi member.

Therefore the former statement "three unreconciled Phi formulas" is no longer an active canonical conflict in the current runtime. A future code path that labels `c_field` as Phi, substitutes PHI_H for PHI_SFI, or compares Phi values across methods would re-open the conflict and must fail QA.

## World Vector domains

The executable WorldSpect contract currently declares ten observation domains:

CULTURAL, ECONOMY, GEO_DIGITAL, GEOPOLITICAL, BIO, CLIMATE, INSTITUTIONAL, MEMETIC, TECH, AFFECTIVE.

No current executable/canonical registry was found in the audited main tree that declares a required seven-domain `E,C,P,S,T,I,B` World Vector contract. The ten-domain taxonomy is therefore the current source of truth for WorldSpect observation.

This does not prove that a historical seven-dimensional theoretical schema never existed. If recovered, it must be introduced as a separately named theoretical layer and mapped explicitly to WorldSpect rather than silently renaming or collapsing the ten observed domains.

## MOP-S

Before this reconciliation, the active tree exposed only `MOPS_BASELINE` as EXPERIMENTAL in the Cognitive Olympics method cards. The planned MEDIA / CHANNEL / BOUNDARY distinction was not represented as an executable contract.

`src/lib/mops/contract.ts` now registers those three experimental protocol scopes and the P0-A/B/C design while preserving the boundary that the sequence persistence → boundary → cadence → contextual decoupling is an experimental hypothesis, not an established law. Kavak can be an applied case only when supported by lawful evidence and is not treated as the conceptual origin or validation of MOP-S.

## Priority decision

1. Phi: resolved at the contract/canon level; monitor by QA, not a current blocking discrepancy.
2. World Vector: no current code conflict; do not invent a seven-to-ten mapping without the missing theoretical contract.
3. MOP-S: incomplete integration was real; register experimental protocol family now, validate later through controlled P0 work.
