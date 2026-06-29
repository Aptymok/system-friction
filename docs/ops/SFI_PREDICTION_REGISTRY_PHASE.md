# SFI Prediction Registry Phase

## Phase 01 status

Prediction Registry is planned as governed hypothesis memory. Phase 01 defines the type contract and operational boundary only. It does not create database writes, automatic publication, Atlas promotion, protocol mutation or phenotype mutation.

## Phase 02 implementation status

Phase 02 creates the first live ROOT-governed Prediction Registry layer:

- table: `public.sfi_prediction_entries`
- migration: `supabase/migrations/20260629100000_create_sfi_prediction_entries.sql`
- health API: `/api/sfi/predictions/health`
- ROOT list/create API: `/api/sfi/predictions`
- ROOT detail API: `/api/sfi/predictions/[hypothesisId]`
- ROOT returns API: `/api/sfi/predictions/[hypothesisId]/returns`
- ROOT UI: `/root/predictions`
- ROOT create UI: `/root/predictions/new`
- ROOT detail UI: `/root/predictions/[hypothesisId]`

The implementation is private by default. It does not add public prediction browsing, participant DB writes, Atlas promotion or automatic publication.

## Core rule

A prediction must be registered before perturbation to count as predictive evidence. If the prediction is added after perturbation, it is retrospective observation, not predictive evidence.

## Entry shape

The TypeScript contract is `src/lib/sfi/predictions/types.ts` and aligns with the static schema package:

- `case_id`
- `hypothesis_id`
- `case_label`
- `operator_mode`
- `fenotipo_estimado`
- `ep_estado_inicial`
- `ssp_esperada`
- `ssp_observada`
- `perturbacion_tipo`
- `perturbacion_aplicada`
- `prediccion_explicita`
- `probabilidad_estimativa`
- `friccion_respuesta_campo`
- `resultado_72h`
- `resultado_7d`
- `resultado_30d`
- `resultado_90d`
- `ep_t_registrada`
- `cp_dias`
- `fallo_hipotesis`
- `refinamiento`
- `estado_observacion`
- `created_at`
- `updated_at`

Allowed observation states are `pendiente`, `registrada_pre_perturbacion`, `observed`, `verified`, `degraded`, `uncertain` and `archived`.

## Return windows

Results should be updated at 72h, 7d, 30d and 90d. No claim should be stronger than its evidence state.

## Agent boundary

Future deterministic agents may compute:

- `prediction_matched`
- `prediction_failed`
- `evidence_degraded`
- `requires_refinement`
- `phenotype_candidate_strengthened`
- `phenotype_candidate_weakened`
- `perturbation_family_effective`
- `perturbation_family_blocked`

Agents must not rewrite phenotypes, rewrite protocols, promote Atlas entries, publish claims or close cycles automatically.

## Governance

Any protocol mutation, phenotype mutation, Atlas promotion, publication or cycle close requires ROOT approval.

## Phase path

Phase 02 may add Prediction Registry Agent, Hypothesis Intake Agent, Evidence State Agent and Return Window Agent after the database convention is explicit. Phase 03 may add Atlas and refinement proposal agents that only propose changes. Phase 04 may prepare public-safe drafts. Phase 05 may manage method versioning proposals under ROOT.
