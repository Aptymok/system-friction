# Studio Current State Audit

Date: 2026-07-11
Branch: codex/studio-master-reconstruction
Scope: `/studio`, `/api/studio`, `src/components/studio`, `src/lib/studio`, and Studio Supabase artifacts.

## Initial Git Gate

- `git status --short`: clean before audit.
- `git branch -vv`: local branch started from `main` at `5e79cca`.
- `git fetch origin`: completed without reported changes.
- `git rev-list --left-right --count origin/main...HEAD`: `0 0`.
- Working branch created before edits: `codex/studio-master-reconstruction`.

## Express Confirmation

- Real engines: Supabase-backed Studio persistence in `studioProductionRepository.ts`; upload route with storage bucket verification in `/api/studio/objects/upload`; object/session/features/archive/export read routes; blocked analysis job registration in `/api/studio/objects/[id]/analyze`; WorldSpect/World Vector read adapters in `studioCulturalLens.ts`; existing MIHM/ScoreFriction/WorldSpect adapters in `src/lib/studio/evaluation.ts`; cultural-lab pipeline agents that return trace objects from POST routes.
- Real but blocked engines: `/api/studio/interventions/simulate` is a POST route but returns `simulation_engine_not_connected`; `/api/studio/objects/[id]/analyze` records `feature_extractors_not_connected` when no persisted features exist.
- Placeholder views: `StudioOriginLedger.tsx` declares itself a restored placeholder; multiple `src/components/studio/views/*` are legacy cultural-lab trace views not mounted by `/studio`; gold console components are not mounted by `/studio`.
- Components showing raw or API-like access: `StudioProductionShell.tsx` exposes `/api/studio/sessions`, `/api/studio/archive`, `/api/studio/deliverables`, and `/api/studio/exports/build` as interface links; `StudioFooterTransport.tsx` links to object/state JSON.
- Broken actions: `StudioRightRail.tsx` links hypotheses to missing `/api/studio/hypotheses/build`; `StudioProductionShell.tsx` links `/api/studio/exports/build`, which has no route; filters `ACTIVE`, `ARCHIVE`, `FAVORITES` have no handlers.
- Href to POST: `StudioProductionShell.tsx` links `/api/studio/interventions/simulate`; `StudioRightRail.tsx` links `/api/studio/interventions/simulate`; `StudioProductionShell.tsx` links `/api/studio/exports/build` as `POST`.
- Buttons without real handler: filter buttons in Sessions; display-only buttons in gold components (`VER TODOS`, `TOPOLOGIA`, `90 DIAS`, measurement status buttons) are outside current `/studio` mount but remain risky if remounted.
- Panels using derived information without source: readiness bars in `StudioProductionShell.tsx`; graph nodes and edges in `studioProductionAdapter.ts`; Pixi fallback points in `StudioPixiStage.tsx`; gold degraded engine values in `studioGoldDegradedState.ts`.
- Visualizations not tied to real variables: Pixi fallback `missing-vector-*` nodes; `StudioOverviewFieldRenderer` readiness normalization; `SpectralCloudRenderer` fallback values; `NeuralGraphRenderer` default values; `VectorScopeRenderer` fallback stereo value.

## Inventory

| File | Real function | Imports | Consumers | State | Dependency | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/app/studio/page.tsx` | Loads `readStudioProductionState` and renders production console. | Production console, adapter. | Next `/studio`. | Live. | Server adapter. | Low. | Conserve. |
| `src/app/api/studio/objects/upload/route.ts` | Uploads file to Supabase storage and persists session/object/upload. | Supabase service, repository. | Intake modal. | Real. | `studio_sessions`, `studio_objects`, `studio_uploads`, storage bucket. | Medium, env and permissions. | Conserve, improve UX only. |
| `src/app/api/studio/objects/[id]/analyze/route.ts` | Returns persisted features or records blocked analysis job. | Repository. | Should be UI action, not href. | Real blocked contract. | `studio_object_features`, `studio_analysis_jobs`. | Low. | Conserve. |
| `src/app/api/studio/objects/[id]/features/route.ts` | Reads object features. | Repository. | Not directly mounted. | Real read. | Supabase. | Low. | Conserve. |
| `src/app/api/studio/objects/[id]/route.ts` | Reads object. | Repository. | Footer href today. | Real read, wrong UI usage. | Supabase. | Low. | Conserve, remove direct UI link. |
| `src/app/api/studio/objects/route.ts` | Lists objects. | Repository. | Potential Memory/selector. | Real read. | Supabase. | Low. | Conserve. |
| `src/app/api/studio/sessions/route.ts` | Lists/creates sessions. | Repository. | API link today. | Real. | Supabase. | Low. | Conserve, remove direct UI link. |
| `src/app/api/studio/sessions/[id]/route.ts` | Reads session. | Repository. | Not mounted. | Real. | Supabase. | Low. | Conserve. |
| `src/app/api/studio/production/state/route.ts` | Returns full Studio production state. | Adapter. | Potential refresh/read API. | Real read. | Adapter. | Low. | Conserve. |
| `src/app/api/studio/archive/route.ts` | Lists archive events. | Repository. | API link today. | Real read. | Supabase. | Low. | Conserve, remove direct UI link. |
| `src/app/api/studio/deliverables/route.ts` | Lists exports. | Repository. | API link today. | Real read. | Supabase. | Medium, no generation. | Conserve as listing only. |
| `src/app/api/studio/interventions/simulate/route.ts` | POST contract returning blocked when engine absent. | None. | Wrong href today. | Real blocked contract. | None. | Medium if UI claims simulation. | Conserve, show unavailable. |
| `src/app/api/studio/interventions/apply/route.ts` | POST blocked contract. | None. | Not mounted. | Real blocked contract. | None. | Low. | Conserve. |
| `src/app/api/studio/pipeline/route.ts` | Runs cultural-lab trace pipeline. | Cultural-lab pipeline. | Legacy intake components. | Real trace engine, not persisted Studio object flow. | Agents. | Medium, can be mistaken for object pipeline. | Conserve as subtool. |
| `src/app/api/studio/evaluate/route.ts` | Builds Studio evaluation report. | ScoreFriction/WorldSpect/Cultural Wave adapters. | Not mounted in production console. | Real/partial evaluation. | Supabase, WSV, scorefriction. | High if mixed with production metrics. | Conserve, keep separate. |
| `src/app/api/studio/cultural-lens/route.ts` | Reads/builds cultural lens. | Supabase, cultural lens. | Not mounted. | Real/partial. | World Vector/WorldSpect. | Medium. | Conserve. |
| `src/app/api/studio/gold/route.ts` | Reads gold state. | Gold adapter. | Gold console or diagnostics. | Real/degraded. | ScoreFriction, operational cycle, WSV. | Medium. | No touch unless needed. |
| `src/app/api/studio/trace/route.ts` | Trace endpoint. | Unknown lightweight route. | Not mounted. | Read. | Route implementation. | Low. | Conserve. |
| `src/app/api/studio/simulate/route.ts` | Legacy cultural pipeline simulate POST. | Pipeline. | Not mounted. | Real trace, not production simulation. | Agents. | Medium naming conflict. | Conserve as subtool. |
| `src/app/api/studio/implement/route.ts` | Legacy cultural pipeline implement POST. | Pipeline. | Not mounted. | Real trace. | Agents. | Medium. | Conserve as subtool. |
| `src/app/api/studio/debug-upload/route.ts` | Upload diagnostics. | Supabase. | Debug only. | Real diagnostic. | Supabase. | Medium exposure. | Conserve, do not link primary UI. |
| `src/lib/studio/production/studioProductionTypes.ts` | Production state types. | Hypothesis types. | Adapter and UI. | Live contract but lacks canonical metric semantics. | UI. | High. | Replace/consolidate with canonical contracts. |
| `src/lib/studio/production/studioProductionAdapter.ts` | Builds Studio state from Supabase plus gold/lens. | Supabase, gold, lens, hypotheses. | `/studio`, state API. | Live but over-derives. | Supabase, ScoreFriction/WSV via gold. | High. | Refactor narrowly; do not alter MIHM formulas. |
| `src/lib/studio/production/studioProductionRepository.ts` | Supabase repository. | Supabase service. | API routes. | Real. | Tables and storage. | Low. | Conserve, extend read details only if needed. |
| `src/lib/studio/production/studioProductionDegradedState.ts` | Fallback state. | Types. | Adapter catch path. | Real degraded path. | None. | Medium if uses zero values. | Refactor to missing/null. |
| `src/lib/studio/production/studioCulturalLens.ts` | Builds Cultural/WSV lens from existing world data. | World Vector, WorldSpect. | Adapter. | Real/degraded. | World data. | Medium. | Conserve. |
| `src/lib/studio/production/hypothesisEngine.ts` | Hypothesis generation from layer inputs and cultural lens. | MIHM thresholds. | Adapter/pipeline. | Real deterministic engine over supplied layers. | Valid layer inputs. | Medium if fake layers supplied. | Conserve, gate inputs. |
| `src/lib/studio/production/studioHypotheses.ts` | Alternate hypothesis helpers. | MIHM thresholds. | Search shows no direct production consumer. | Unclear. | None. | Low. | No touch. |
| `src/lib/studio/production/mihmThresholds.ts` | MIHM threshold helpers. | None. | Hypothesis engines. | Valid formula support. | Fase 1 formulas. | High. | No touch. |
| `src/lib/studio/evaluation.ts` | Evaluation report using ScoreFriction/WorldSpect/Cultural Wave. | ScoreFriction, WorldSpect. | `/api/studio/evaluate`. | Real/partial. | External adapters. | High if exposed as prediction. | No formula changes. |
| `src/lib/studio/cultural-lab/*` | Legacy pipeline, agents and adapters. | Agent modules, WorldSpect. | Legacy components and POST routes. | Trace engine/subtool. | Mixed evidence quality. | Medium. | Preserve as subtools. |
| `src/lib/studio/gold/*` | Gold console state and degraded fallback. | ScoreFriction, operational cycle, WSV. | Gold route/components. | Existing live/degraded surface. | External runtime. | High if rewritten. | No touch except docs. |
| `src/components/studio/production/StudioProductionConsole.tsx` | Shell wrapper. | Types and shell. | `/studio`. | Live. | Shell. | Low. | Conserve. |
| `src/components/studio/production/StudioProductionShell.tsx` | Main mounted UI. | State types, sidebar, intake, Pixi, rails. | Production console. | Live but contains broken links and heuristic metrics. | State. | High. | Replace primary structure. |
| `src/components/studio/production/StudioSidebar.tsx` | Primary nav. | None. | Shell. | Live but too many modules. | Shell state. | Medium. | Replace with six modules. |
| `src/components/studio/production/StudioObjectIntake.tsx` | File intake POST. | React. | Shell. | Real, UX incomplete. | Upload route. | Medium. | Improve. |
| `src/components/studio/production/StudioRightRail.tsx` | Global rail. | State types. | Shell. | Live but broken hrefs. | State. | High. | Replace with contextual factual rail. |
| `src/components/studio/production/StudioFooterTransport.tsx` | Bottom transport. | State types. | Shell. | Live but links JSON. | State. | Medium. | Replace href with status/actions. |
| `src/components/studio/production/StudioHeader.tsx` | Header. | State types. | Shell. | Live. | State. | Low. | Conserve/adapt copy. |
| `src/components/studio/production/StudioEvaluationStrip.tsx` | Metric strip. | State types. | Shell. | Live. | State. | Medium if plain values. | Adapt to MetricValue. |
| `src/components/studio/production/pixi/StudioPixiStage.tsx` | Pixi host and SVG fallback. | Pixi renderers. | Shell. | Live but renders fallback fake nodes. | Browser/Pixi. | High. | Gate renderable nodes. |
| `src/components/studio/production/pixi/renderers/*` | Visual renderers. | Renderer types. | Pixi stage. | Live but several fallback defaults. | Pixi/state. | High. | Tighten to real values only. |
| `src/components/studio/gold/*` | Alternate gold console. | Gold state. | Not mounted by `/studio`; gold route possible. | Preserved. | Gold adapter. | Medium. | No touch in this scope. |
| `src/components/studio/views/*` | Cultural-lab trace views. | Pipeline trace types. | Not mounted by production console. | Preserved subtools. | Trace pipeline. | Low. | No touch. |
| `src/components/studio/Studio*.tsx` legacy | Legacy cultural intervention lab and trace components. | Cultural-lab types. | Not mounted by `/studio`. | Preserved subtools/placeholders. | Pipeline. | Medium. | No touch unless remounted. |
| `supabase/migrations/20260705090000_create_studio_production_tables.sql` | Creates Studio tables and indexes. | SQL. | Supabase. | Non-destructive migration. | Postgres. | Low. | No touch. |

## Tables

- `studio_sessions`: real session persistence.
- `studio_objects`: real object persistence.
- `studio_uploads`: real upload/storage metadata.
- `studio_object_features`: generic persisted metrics.
- `studio_audio_features`, `studio_video_features`, `studio_image_features`, `studio_text_features`, `studio_community_features`, `studio_time_coordinates`: modality feature tables exist but are not read by production adapter yet.
- `studio_hypotheses`, `studio_interventions`: persistence exists; current adapter mostly derives from gold/hypothesis engine rather than these rows.
- `studio_evidence_traces`: persistence exists; current adapter does not expose detailed evidence refs.
- `studio_archive_events`, `studio_exports`, `studio_analysis_jobs`: persistence exists; listing/blocking routes exist.

## Required Preservation

- Do not modify `mihmThresholds.ts` formulas.
- Do not recalculate WSV in render components.
- Do not remove gold or cultural-lab components; they are unmounted or subtool candidates.
- Do not apply SQL migrations in this task.
- Do not expose API endpoints as primary UI actions.

## Required Replacement

- Primary navigation must be reduced to `OVERVIEW`, `MEASURE`, `STRUCTURE`, `FIELD`, `INTERVENTION`, `MEMORY`.
- Plain numeric UI must move to `MetricValue` with status/source/confidence/explanation.
- Heuristic readiness percentages must be removed.
- Broken POST hrefs and raw API links must be removed.
- Pixi and graph nodes must render only if explainable from state.
