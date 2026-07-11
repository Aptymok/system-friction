# Studio View Contracts

All mounted Studio modules consume `ViewContract` from `src/lib/studio/production/studioContracts.ts`.

| View | Inputs | Outputs | Blocking rule |
| --- | --- | --- | --- |
| `overview` | `studio_object`, `studio_uploads`, `studio_object_features`, `studio_analysis_jobs` | object status, pipeline, evidence, next action | `ACTIVE_OBJECT_REQUIRED` |
| `measure` | audio file, `studio_audio_features`, `studio_object_features` | technical metrics, markers, mastering metrics | `MEASUREMENT_EVIDENCE_REQUIRED` |
| `structure` | stems, layers, sections, channels, graph | layer table, arrangement dependencies, mix controls, neural graph | `MULTILAYER_EVIDENCE_REQUIRED` |
| `field` | MIHM, Cultural Vector, WorldSpect snapshot | field tensions, hypotheses | `ACTIVE_OBJECT_REQUIRED` or field evidence missing |
| `intervention` | hypothesis, intervention row, simulation endpoint | candidate actions, verification window, outcome registration | `HYPOTHESIS_REQUIRED` |
| `memory` | sessions, archive events, exports, analysis jobs | longitudinal table, timeline, deliverable state | `ACTIVE_OBJECT_REQUIRED` |

## Metric Contract

Every displayed metric must be a `MetricValue`:

- `value: null` with `status: "MISSING"` when evidence is absent.
- `source` and `evidenceIds` required for observed/derived values.
- `formulaVersion` required when a formula produced the value.
- `confidence` must be explicit and bounded from 0 to 1.

## Phase Contract

The mounted pipeline uses these exact phases:

1. OBJECT RECEIVED
2. STORAGE VERIFIED
3. METADATA EXTRACTED
4. FEATURE EXTRACTION
5. MIHM EVALUATION
6. CULTURAL VECTOR
7. WSV TIMING
8. HYPOTHESIS GENERATION
9. INTERVENTION DESIGN
10. REPORT READY
11. RETURN PENDING
12. OUTCOME RECORDED
13. LEARNING REGISTERED
