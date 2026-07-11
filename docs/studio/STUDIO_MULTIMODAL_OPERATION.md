# Studio Multimodal Operation

## Intake flow

1. Authenticated client requests `POST /api/studio/objects/upload/prepare`.
2. Server validates modality, size and ownership and creates owner-bound Studio rows.
3. Client uploads directly to the private `studio-objects` bucket using the signed token.
4. Client calls `POST /api/studio/objects/upload/complete`.
5. Server verifies the stored object and marks the upload as stored.
6. Client calls `POST /api/studio/objects/{id}/analyze`.
7. The dispatcher selects the real modality extractor and persists generic and specialized evidence.

The legacy multipart endpoint remains limited to small compatibility uploads. It is not the primary upload path.

## Supported intake

### Audio

- WAV/WAVE
- MP3
- M4A/AAC
- FLAC
- OGG/OGA/OPUS
- AIFF/AIF

Compressed audio is probed and transcoded to bounded PCM float WAV before the existing acoustic feature engine is executed. The original file remains unchanged in private storage.

### Video

- MP4/M4V
- MOV
- WEBM
- MKV

Video extraction includes stream metadata and bounded grayscale frame sampling for motion and threshold-transition measurements. It does not claim editorial scene understanding.

### Image

- PNG
- JPEG
- WEBP
- GIF
- TIFF

Image extraction includes dimensions, format, quantized dominant colors, luminance entropy, bounded texture density, spatial luminance balance, brightness and saturation.

### Text and documents

- TXT
- Markdown
- JSON
- CSV/TSV
- RTF
- PDF
- DOCX

Text extraction includes character/token counts, paragraph-based sections, lexical density, recurrence and frequent terms/phrases. It does not fabricate sentiment.

### Structured FIELD-like objects

JSON, CSV, TSV, TXT and Markdown can be explicitly classified as `community` or `time_coordinate`. The parser reports only fields and relationships it can observe from the records.

## Ownership

- `owner_id` is assigned from the authenticated server session.
- Client-provided owner IDs are ignored.
- Storage paths contain owner and session identifiers.
- Analyze, playback, content and completion routes require owner or founder access.
- `/studio` state is owner-scoped. Founder access may additionally inspect legacy unowned Studio rows.

## Environment limits

Optional variables:

- `STUDIO_AUDIO_UPLOAD_MAX_MB` — default 250
- `STUDIO_VIDEO_UPLOAD_MAX_MB` — default 500
- `STUDIO_IMAGE_UPLOAD_MAX_MB` — default 60
- `STUDIO_TEXT_UPLOAD_MAX_MB` — default 80
- `STUDIO_AUDIO_ANALYSIS_MAX_MB` — default 150
- `STUDIO_VIDEO_ANALYSIS_MAX_MB` — default 180
- `STUDIO_IMAGE_ANALYSIS_MAX_MB` — default 40
- `STUDIO_TEXT_ANALYSIS_MAX_MB` — default 50
- `STUDIO_MEDIA_PROCESS_TIMEOUT_MS` — default 240000
- `STUDIO_AUDIO_DECODED_MAX_MB` — default 300
- `STUDIO_LEGACY_MULTIPART_MAX_MB` — default 8

## Deployment requirements

- The ownership migration introduced in PR #98 must be applied.
- Vercel or the target deployment must include the traced FFmpeg/FFprobe binaries.
- Native Sharp binaries must be installable for the deployment architecture.
- The `studio-objects` bucket remains private.

## Explicitly unavailable

- OCR for scanned PDFs or images
- Speech-to-text
- Object detection and symbolic visual classification
- Generative captions
- Audio stem separation
- Standards-aligned LUFS/true peak unless separately connected
- Sentiment and affective tone models
- Automatic intervention or cultural prediction

Unavailable functions remain `MISSING` or `BLOCKED`; they are not replaced with zeros or synthetic values.
