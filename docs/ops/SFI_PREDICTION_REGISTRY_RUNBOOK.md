# SFI Prediction Registry Runbook

## Purpose

Prediction Registry preserves ROOT-governed hypotheses as timestamped evidence memory. Its core rule is: without a prediction registered before perturbation, the result is not predictive evidence; it is retrospective observation.

## Table

The live table is `public.sfi_prediction_entries`, created by `supabase/migrations/20260629100000_create_sfi_prediction_entries.sql`.

Direct table access is revoked from `anon` and `authenticated`. RLS is enabled and service-role access is the only direct database policy. Application routes must still enforce ROOT before writes or private reads.

## APIs

- `GET /api/sfi/predictions/health`: non-sensitive health, table availability, counts when safe, blocker reasons and agent status.
- `GET /api/sfi/predictions`: ROOT-only private list.
- `POST /api/sfi/predictions`: ROOT-only create.
- `GET /api/sfi/predictions/[hypothesisId]`: ROOT-only private detail.
- `PATCH /api/sfi/predictions/[hypothesisId]/returns`: ROOT-only return-window update.

## ROOT flow

1. Operator captures signal through WB-001 or `/operator/field`.
2. ROOT opens `/root/predictions/new`.
3. ROOT registers the explicit prediction before perturbation.
4. Perturbation is applied.
5. ROOT records returns at 72h, 7d, 30d and 90d.
6. Agents classify evidence state and return windows.
7. Atlas waits until evidence matures.

## Evidence rule

If `perturbation_applied_at` is absent or later than `prediction_registered_at`, the entry is classified as:

- `estado_observacion = registrada_pre_perturbacion`
- `is_predictive_evidence = true`
- `evidence_state = PENDING`

If the prediction is registered after perturbation, the entry is classified as:

- `estado_observacion = retrospective_observation`
- `is_predictive_evidence = false`
- `evidence_state = OBSERVED` when supporting evidence exists, otherwise `UNCERTAIN`

Retrospective entries must never be labeled predictive evidence.

## Evidence states

Allowed evidence states are `PENDING`, `OBSERVED`, `VERIFIED`, `DEGRADED`, `UNCERTAIN` and `ARCHIVED`.

Allowed observation states are `pendiente`, `registrada_pre_perturbacion`, `retrospective_observation`, `observed`, `verified`, `degraded`, `uncertain` and `archived`.

No claim should be stronger than its evidence state.

## Return windows

Return windows are `72h`, `7d`, `30d` and `90d`. The Return Window Agent detects pending, due, complete and overdue windows. It does not auto-fill results.

## Agent boundaries

Evidence State Agent may compute predictive versus retrospective classification, prediction matched, prediction failed, evidence degraded and requires refinement.

Return Window Agent may compute pending, due, complete and overdue windows.

Agents must not rewrite phenotypes, rewrite protocols, promote Atlas entries, publish claims, close cycles or act as ROOT.

## What Phase 02 does not do

- no public prediction browsing
- no participant-submitted DB writes
- no automatic publishing
- no Atlas promotion
- no protocol mutation
- no phenotype mutation
- no self-modifying agents
- no diagnosis tooling

## Next phase

Phase 03 can prepare Atlas learning and refinement proposal agents. Those agents may propose Atlas candidates or protocol refinements, but ROOT must approve any promotion or mutation.
