# Studio Audio Engine Audit

Date: 2026-07-11
Branch source: `codex/studio-master-reconstruction`
Target branch: `codex/studio-audio-extraction-engine`

## Git gate

- `git status --short`: clean before this audit.
- `git branch --show-current`: `codex/studio-master-reconstruction`.
- `git fetch origin`: completed.
- `git rev-list --left-right --count origin/main...HEAD`: `0 6`.
- Interpretation: the source branch is ahead of `origin/main` because it contains the Studio reconstruction work. The new work was branched from that source branch, not from `main`.

## Existing Studio runtime

| Area | File | Current function | Status | Risk | Decision |
| --- | --- | --- | --- | --- | --- |
| Analyze route | `src/app/api/studio/objects/[id]/analyze/route.ts` | Returns blocked analysis when no features exist. | Placeholder orchestration. | Uploads never trigger real extraction. | Replace within Studio scope. |
| Upload route | `src/app/api/studio/objects/upload/route.ts` | Persists `studio_session`, `studio_object`, `studio_upload`, and Supabase storage object. | Real intake path. | No automatic audio extraction after upload. | Preserve and connect analysis after upload through existing object ID. |
| Production adapter | `src/lib/studio/production/studioProductionAdapter.ts` | Reads Studio tables and maps rows into UI state. | Real repository adapter with partial audio mapping. | Uses legacy audio metric keys and can render nominal semantics with incomplete extraction. | Extend mapping only for Studio audio outputs. |
| Production types | `src/lib/studio/production/studioProductionTypes.ts` | Defines Studio state contracts. | Real local contract. | Audio fields are legacy names. | Extend without breaking existing UI. |
| Production shell | `src/components/studio/production/StudioProductionShell.tsx` | Six-module Studio UI. | Functional but not connected to a real audio extractor. | Measure panels use legacy keys and no persisted audio playback endpoint. | Update Measure and Structure panels within Studio scope. |
| Supabase schema | `supabase/migrations/20260705090000_create_studio_production_tables.sql` | Creates `studio_*` production tables. | Real migration. | No `partial` or `cancelled` job status in DB checks; no owner column for object access. | Use only allowed DB statuses and store semantic details in payload. |
| Studio repository | `src/lib/studio/production/studioProductionRepository.ts` | Basic Studio table access and blocked analysis insert. | Real service-role repository. | No audio feature persistence service. | Add dedicated audio persistence module. |

## Existing audio-related code

| Area | File | Current function | Status | Risk | Decision |
| --- | --- | --- | --- | --- | --- |
| Python WAV script | `services/audio/analyze.py` | Reads WAV with Python `wave`, samples first 30 seconds, returns duration, normalized energy, ZCR, dynamic range. | Real but minimal and non-Studio. | Not a deploy-safe Next route dependency; not enough feature coverage; uses normalized values that are not Studio MetricValue contracts. | Do not import into Next route. Keep untouched. |
| Worker skeleton | `services/worker/README.md`, `services/worker/src/index.ts` | Declares future internal job worker boundaries. | Skeleton. | Not wired to Studio jobs or deployment. | Do not depend on it for this phase. |
| ScoreFriction Python bridge | `src/lib/scorefriction/python/pythonBridge.ts` | Explicitly disables Python execution in Next route bundles. | Real boundary. | Running Python from Studio API route would violate repo boundary and widen tracing. | Respect boundary; use Node-only decode for this phase. |
| SFI media ffmpeg runtime | `src/lib/sfi/media/sfiMediaRenderRuntime.ts` | Uses local ffmpeg for media rendering paths. | Real but different domain. | Local binary availability is not a Studio extraction guarantee on Vercel. | Do not reuse as Studio audio decoder. |

## Runtime and dependency audit

- `package.json` has no audio decoding, FFT, ffmpeg, or native audio dependencies.
- Local machine has `ffmpeg.exe` and `ffprobe.exe`, but deployment availability is not guaranteed by repo config.
- `next.config.js` excludes Python services from output tracing and does not package audio binaries.
- `vercel.json` does not define Studio audio function memory, duration, or binary setup.
- Node version observed locally: `v24.14.0`.
- Python version observed locally: `3.14.3`.

## Supabase table constraints relevant to audio

- `studio_analysis_jobs.status` allows only `queued`, `running`, `complete`, `blocked`, `failed`.
- `studio_objects.status` allows only `uploaded`, `analyzing`, `ready`, `blocked`, `failed`, `archived`.
- `studio_uploads.status` allows only `stored`, `missing`, `degraded`, `failed`.
- `studio_audio_features` has scalar columns for `rms`, `peak`, `clipping_risk`, `dynamic_range`, `lufs`, `spectral_centroid` and JSON payload columns.
- `studio_object_features.numeric_value` is nullable and can represent unavailable values without substituting zero.
- There is no owner or ACL column on Studio objects, so authenticated route access can be checked, but row-level object ownership cannot be proven from the current schema.

## Engine decision

The deploy-safe implementation for this phase is a Node-only audio engine that decodes WAV PCM/float files from Supabase storage and explicitly blocks unsupported codecs with a traceable error. The engine must not call Python or ffmpeg from a Next route. Unsupported formats such as MP3, AAC/M4A, FLAC, and OGG must return `UNSUPPORTED_CODEC` instead of mocked measurements.

## Supported evidence in this phase

- Supabase `studio_uploads.storage_path`.
- Stored bytes from bucket `studio-objects`.
- SHA-256 checksum of the stored file.
- WAV RIFF metadata from file header.
- Decoded PCM samples for supported WAV variants.
- Derived waveform peaks, spectral summaries, dynamics, stereo metrics, silence regions, onsets, and coarse sections.

## Explicit limitations

- MP3/AAC/FLAC/OGG are not decoded in this phase because no deploy-safe decoder is currently present.
- Integrated LUFS, true peak, and loudness range are not reported as observed unless a standards-aligned loudness engine is added. RMS and sample peak must not be relabeled as LUFS or true peak.
- Stem, layer, channel, and mix controls remain blocked unless real multichannel or stem evidence exists.
- Studio object ownership cannot be enforced beyond authentication because the current Studio schema has no owner column.
- Browser QA of authenticated `/studio` requires a valid user session and Supabase environment; unauthenticated e2e cannot validate private audio playback.

## Required preservation

- Do not modify MIHM formulas.
- Do not recalculate WSV during Studio render.
- Do not alter non-Studio routes.
- Do not remove existing Studio tables, migrations, upload route, or production adapter.
- Do not create mocked metrics, fallback zeros, random values, decorative controls, or hrefs to POST endpoints.
