# Studio Multimodal Ingestion Audit

Date: 2026-07-11
Base: `main` after PR #98
Branch: `codex/studio-multimodal-ingestion`

## Current intake

- `POST /api/studio/objects/upload` accepts a multipart `File`, writes through the Supabase service client, creates a Studio object, and immediately attempts audio analysis when the inferred type is `music`.
- The route advertises a 500 MB application limit, while the Next proxy configuration is 50 MB and deployment request limits can be lower. This is not a reliable large-file upload path.
- The route does not independently validate an authenticated user before using the service role.
- The current repository creation path does not assign the `owner_id` columns introduced by the access foundation.
- The private `studio-objects` bucket is real and is created or repaired server-side.

## Current type inference

Accepted by filename or MIME at intake:

- Audio: MP3, WAV, M4A, FLAC, OGG, AIFF.
- Video: MP4, MOV, WEBM, MKV.
- Image: PNG, JPG/JPEG, WEBP, GIF.
- Text/document: TXT, MD, RTF, PDF, DOC, DOCX.

The accepted list is broader than extraction support.

## Current extractors

### Audio

- Real WAV PCM/float decoder and acoustic feature engine exist.
- MP3, AAC/M4A, FLAC, OGG, AIFF and compressed WAV remain blocked because no deployed transcode runtime is connected.
- Playback is proxied through an authenticated route, but ownership is not enforced there yet.

### Image

- `studio_image_features` exists.
- No server image extractor is connected.

### Video

- `studio_video_features` exists.
- No server video probe, frame sampling, motion or transition extractor is connected.

### Text/document

- `studio_text_features` exists.
- No TXT/Markdown/JSON/CSV/PDF/DOCX extraction pipeline is connected.

### Community and time-coordinate

- Tables exist, but no upload contract maps structured JSON/CSV into those modalities.

## Existing storage and schema

- Bucket: `studio-objects`, private.
- `studio_sessions`, `studio_objects` and `studio_uploads` now have nullable `owner_id` columns through PR #98.
- `studio_object_features` is the canonical generic metric surface.
- Modality tables already exist for audio, video, image, text, community and time coordinates.
- `studio_analysis_jobs` supports `queued`, `running`, `complete`, `blocked`, and `failed`.

## Required corrections

1. Replace large multipart uploads with authenticated signed direct uploads to Supabase Storage.
2. Assign ownership server-side; never trust `owner_id` from the client.
3. Enforce object ownership on analyze, playback, content and completion routes.
4. Introduce a canonical modality detector and allowlist.
5. Dispatch analysis by actual modality.
6. Add a deploy-traced FFmpeg/FFprobe runtime for bounded media transcoding and probing.
7. Add real text/document extraction.
8. Add real image statistics.
9. Add real video technical and sampled-motion measurements.
10. Persist all outputs with provenance and explicit missing values.

## Deployment constraints

- All media work must use temporary files with generated names and safe argument arrays.
- Processing must be bounded by file size, duration, frame count and execution time.
- The serverless route must not claim support when the binary is absent.
- Large uploads must bypass the Next request body and go directly to private Supabase Storage using a signed upload token.

## Non-goals

- No OCR in this phase.
- No speech-to-text.
- No object detection or generative captioning.
- No stem separation.
- No automatic intervention or cultural prediction.
- No fake semantic tags, motifs or sentiment values.
