# SFI-DT-INSTRUMENT-01 — Operating Sequence

## Merge order

1. PR 116 — ROOT runtime repair and Atlas foundation.
2. PR 117 — epistemic phase and consent gates.
3. PR 118 — External Evidence Vector.
4. PR 119 — Reference Bank and evidence linkage.
5. PR 120 — governed outcomes and calibration promotion.
6. PR 121 — Phase 0–8 operating UI.

Do not apply later migrations before the code that consumes them is merged.

## Migration order

1. `20260712050000_create_sfi_external_evidence_vector.sql`
2. `20260712060000_create_sfi_reference_bank.sql`
3. `20260712070000_govern_predictive_learning.sql`

All three migrations are additive. Migration 3 installs a database guard: active predictive model parameters cannot be changed outside the governed promotion function.

## First population

Register existing material as cases without inventing outcomes:

- `MEDIUM-WS-001` through `MEDIUM-WS-006` — article cohort.
- `REM618-RELEASE-001` — music release.
- `REM618-INSTAGRAM-001` — social manifestation.
- `REM618-TIKTOK-001` — social manifestation.
- `KXTXR-WEB-001` — website manifestation.
- `KXTXR-BRAND-001` — company/brand cohort.
- `SFI-ROOT-001`, `SFI-STUDIO-001`, `SFI-OBSERVATORY-001`, `SFI-ATLAS-001` — institutional self-observation.
- Audited AI answers — `ai_response` cohort.
- Website audits — website/company cohort.
- Historical or world events — `historical_event`, with a strict T0 information cutoff.

Each registration begins with honest `MISSING` fields. A case is not closed until an observed or explicitly unverifiable outcome is recorded.

## Evidence relations

- `SUPPORTS`: directly supports a measured variable or claim.
- `CONTRADICTS`: directly conflicts with the prediction or interpretation.
- `CONTEXTUALIZES`: describes the field or conditions around T0.
- `VERIFIES_OUTCOME`: establishes the observed result.
- `DOCUMENTS_INTERVENTION`: records what was actually changed.
- `GOVERNS`: records authorization, consent or an ACP decision.
- `RECORDS_ACCESS`: operational access trace such as `me.read`; not phenomenon evidence by itself.

## Consent

Objects classified as `person`, `organization`, or `movement` cannot enter the Reference Bank or prediction layer without consent evidence. This invariant exists in both application logic and database constraints.

## Calibration

- Every outcome may record error from case 1.
- No active model parameter changes automatically.
- Before 30 closed cases, learning state is `ACCUMULATING_CALIBRATION_CORPUS`.
- At 30 closed cases with at least one non-musical case, a `CALIBRATION_CANDIDATE` may be created.
- ROOT must explicitly promote the candidate.
- Promotion freezes the previous model and creates a new version.

Thirty heterogeneous cases demonstrate pipeline generalization; they do not automatically justify sharing one model across incompatible targets. Promotion remains model-key and target specific.
