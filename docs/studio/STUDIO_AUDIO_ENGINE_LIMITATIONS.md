# Studio Audio Engine Limitations

## Codec support

Supported:

- RIFF/WAVE PCM integer: 8, 16, 24, 32 bit
- RIFF/WAVE float: 32, 64 bit

Blocked:

- MP3
- AAC/M4A
- FLAC
- OGG
- AIFF
- compressed WAV codecs

Blocked codecs return an explicit analysis job status and do not generate fallback metrics.

## Loudness standards

The engine does not report observed LUFS, true peak, loudness range, or short-term LUFS. Those values require standards-aligned loudness processing and oversampling. They are represented as `MISSING`.

## Access control

The API checks Supabase authentication. The current Studio schema does not include object owner fields, so row ownership cannot be verified without a future migration.

## Structural audio

Stems, layer dependencies, channel faders, mix masking, and real arrangement controls remain blocked unless actual multichannel, stem, section, or event evidence exists.

## Performance

Spectral analysis uses bounded DFT frames to avoid native dependencies. It is accurate enough for traceable inspection but is not a substitute for a dedicated DSP worker on very large files.
