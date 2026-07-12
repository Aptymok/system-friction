# Studio Data Provenance

## Persisted Studio Sources

- `studio_sessions`: session identity, title, status and timestamps.
- `studio_objects`: active object identity, source URI, MIME, size, status and metadata.
- `studio_uploads`: storage verification and upload metadata.
- `studio_object_features`: generic feature rows shown as observed metrics.
- `studio_audio_features`, `studio_video_features`, `studio_image_features`, `studio_text_features`, `studio_community_features`, `studio_time_coordinates`: modality-specific feature rows.
- `studio_hypotheses`: persisted hypotheses.
- `studio_interventions`: persisted intervention queue.
- `studio_evidence_traces`: evidence references.
- `studio_archive_events`: memory/timeline/outcome/learning events.
- `studio_exports`: deliverable rows and download URLs.
- `studio_analysis_jobs`: blocked/complete analysis job state.

## Existing Engines Preserved

- MIHM thresholds and Phase 1 formulas are not modified.
- `readStudioGoldState` is used only as an existing internal signal source for MIHM readout.
- `buildStudioCulturalLens` reads existing World Vector/WorldSpect sources and is not recalculated by rendering.
- Cultural-lab pipeline endpoints remain subtools, not the primary mounted Studio flow.

## Missing Evidence Handling

When evidence is absent, Studio renders `MISSING`, `DEGRADED`, `FAILED` or a blocked reason. It does not convert absent values to `0`, `0.5`, percentages, fake graph nodes or animated defaults.
