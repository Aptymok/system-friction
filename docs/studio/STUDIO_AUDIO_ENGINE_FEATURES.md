# Studio Audio Engine Features

## Observed from WAV metadata

- `duration_seconds`
- `sample_rate_hz`
- `channel_count`
- `bit_depth`

## Observed from decoded samples

- `rms_dbfs`
- `peak_dbfs`
- `peak_amplitude`
- `clipping_risk`
- `clipping_sample_count`
- `dynamic_range_db`
- `crest_factor_db`
- `headroom_db`
- `zero_crossing_rate`

## Spectral and tonal features

- `spectral_centroid_hz`
- `spectral_rolloff_hz`
- `spectral_bandwidth_hz`
- `spectral_flux`
- `noise_floor_dbfs`
- `tonal_balance_low`
- `tonal_balance_mid`
- `tonal_balance_high`
- `tonal_balance`

Spectral features use bounded DFT frames. They are real measurements from decoded samples, not prediction metrics.

## Stereo features

- `stereo_width`
- `phase_correlation`
- `mid_energy`
- `side_energy`

Mono objects persist these as `MISSING` with `STEREO_SOURCE_REQUIRED`.

## Segmentation artifacts

- waveform peaks in `studio_audio_features.waveform`
- short energy segments in `studio_audio_features.energy_segments`
- silence, onset, and coarse section markers in `studio_time_coordinates`

## Blocked standards features

These are intentionally persisted as `MISSING` until a standards-aligned loudness engine exists:

- `lufs_integrated`
- `true_peak_dbtp`
- `loudness_range_lu`
- `short_term_lufs_summary`

RMS is not labeled as LUFS. Sample peak is not labeled as true peak.
