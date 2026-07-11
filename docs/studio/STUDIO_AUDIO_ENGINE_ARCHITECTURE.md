# Studio Audio Engine Architecture

## Boundary

Studio audio extraction runs inside the Studio API boundary only:

- `POST /api/studio/objects/[id]/analyze`
- `GET /api/studio/objects/[id]/audio`
- `src/lib/studio/audio/*`
- Studio production adapter and shell mappings

The engine does not call Python or ffmpeg from a Next route. The current repo explicitly disables Python execution inside Next bundles, and no deploy-safe audio binary is configured.

## Runtime

- Next.js route runtime: `nodejs`
- Storage source: Supabase bucket `studio-objects`
- Input evidence: `studio_objects`, `studio_uploads`, storage bytes
- Decode profile: RIFF/WAVE PCM or float WAV only
- Idempotency key: `studio-audio:{objectId}:{sha256}:{engineVersion}`

## Pipeline

1. Authenticate the Studio API caller.
2. Load the `studio_object` row.
3. Verify object has audio evidence.
4. Load latest stored `studio_upload`.
5. Download bytes from private Supabase storage.
6. Compute SHA-256 checksum.
7. Reuse completed job if checksum and engine version match.
8. Create `studio_analysis_jobs` row.
9. Decode WAV PCM/float samples.
10. Extract acoustic features.
11. Generate waveform peaks, energy segments, silence markers, onsets, and coarse sections.
12. Persist:
    - `studio_object_features`
    - `studio_audio_features`
    - `studio_time_coordinates`
    - `studio_evidence_traces`
    - `studio_analysis_jobs`
13. Mark object `ready`, `blocked`, or `failed`.

## Unsupported codecs

MP3, AAC/M4A, FLAC, OGG, AIFF, and compressed WAV codecs are not decoded. They return `UNSUPPORTED_CODEC` or `INVALID_AUDIO_CONTAINER` and are stored as blocked jobs. No fallback metrics are generated.

## Playback

The UI uses `GET /api/studio/objects/[id]/audio` as an authenticated private proxy. It returns stored bytes with `Cache-Control: private, no-store` and does not expose Supabase storage paths.

## Security note

The route verifies an authenticated Supabase session. The current Studio schema has no owner or ACL column, so object-level ownership cannot be proven without a schema addition.
