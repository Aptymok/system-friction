# Studio Audio Engine QA

Date: 2026-07-11
Branch: `codex/studio-audio-extraction-engine`

## Commands

| Command | Result |
| --- | --- |
| `npm install` | Passed. Dependencies already up to date. Reported existing npm audit warnings: 4 moderate vulnerabilities. |
| `npm run qa:studio-audio` | Passed. Generated in-memory stereo WAV, decoded it, extracted 34 features, produced 128 waveform peaks, verified LUFS remains `MISSING`. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Blocked. Existing script `next lint` fails under Next 16 with `Invalid project directory provided, no such directory: D:\system-friction\lint`. No ESLint replacement is configured in `package.json`. |
| `npm run build` | Passed after stopping an existing `next dev` process that held `.next/studio-dev.log`. |
| `rg -n 'href=.*api|href=.*(analyze|simulate|build|run|POST)' src/app/studio src/components/studio src/lib/studio src/app/api/studio -S` | Passed. No matches. |
| `rg -n 'mock|simulated|fake|random|NaN|Infinity|ready\s*=\s*1|partial\s*=\s*0\.46|blocked\s*=\s*0\.08' ...` | Existing non-audio matches remain in prior docs and legacy Studio files. No new audio engine mock metrics, random values, `NaN`, or `Infinity` were added. |

## Local HTTP checks

| Route | Result |
| --- | --- |
| `GET http://localhost:3000/studio` | `200` |
| `POST http://localhost:3000/api/studio/objects/test/analyze` without Supabase session | `401` with `AUTH_REQUIRED` |

The dev server was stopped after verification.

## Files touched

- `src/lib/studio/audio/**`
- `src/app/api/studio/objects/[id]/analyze/route.ts`
- `src/app/api/studio/objects/[id]/audio/route.ts`
- `src/app/api/studio/objects/upload/route.ts`
- `src/lib/studio/production/studioProductionAdapter.ts`
- `src/components/studio/production/StudioProductionShell.tsx`
- `scripts/studio-audio-engine-smoke.cjs`
- `package.json`
- `docs/studio/STUDIO_AUDIO_ENGINE_*.md`

## Errors found and corrected

- Analysis route previously returned `feature_extractors_not_connected`; replaced with real audio orchestration.
- Build initially failed with `EBUSY` because a prior dev server held `.next/studio-dev.log`; stopped the repo-local dev process and reran build successfully.
- TypeScript rejected Buffer response body in the audio proxy route; corrected by copying bytes into an `ArrayBuffer`.
- Node smoke test initially could not resolve extensionless TS imports; replaced it with a local TypeScript require hook in a `.cjs` script.
- Legacy UI metric keys (`rms`, `peak`, `clippingRisk`, `dynamicRange`, `lufs`, `spectralCentroid`) were replaced in Measure with canonical extracted keys.
- Legacy hypothesis input generation from abstract metrics was gated to real `layer_` or `stem_` evidence only.

## Remaining limitations

- Authenticated browser intake, upload, playback, and analysis e2e was not completed because no authenticated Supabase browser session or test credentials were provided in this run.
- MP3, AAC/M4A, FLAC, OGG, AIFF, and compressed WAV are blocked by design until a deploy-safe decoder exists.
- Integrated LUFS, true peak, loudness range, and short-term LUFS remain `MISSING` until a standards-aligned loudness engine is added.
- Object-level authorization cannot be proven from the current Studio schema because `studio_objects` has no owner/ACL column.
- `npm run lint` remains blocked by the existing Next 16 incompatible lint script.

## Components blocked by lack of evidence

- Layers and stems.
- Arrangement dependency controls.
- Mix faders, mute, solo, masking, panorama, and channel meters.
- Harmonic stability.
- Standards-aligned mastering loudness.
- Cultural prediction from audio.
- Intervention and simulation from audio-only evidence.
