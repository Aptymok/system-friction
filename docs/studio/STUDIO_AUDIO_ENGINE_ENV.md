# Studio Audio Engine Environment

Required existing environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional Studio audio limits:

- `STUDIO_AUDIO_MAX_FILE_MB`
  - Default: `75`
  - Purpose: maximum downloaded audio size for synchronous analysis.

- `STUDIO_AUDIO_MAX_DURATION_SECONDS`
  - Default: `1200`
  - Purpose: maximum decoded duration for synchronous analysis.

Storage:

- Bucket: `studio-objects`
- Upload route keeps bucket private.
- Playback route proxies bytes through authenticated Studio API.

Deployment notes:

- No Python runtime is required for this engine.
- No ffmpeg binary is required for this engine.
- Codec support is intentionally limited to WAV PCM/float until a deploy-safe decoder is added.
