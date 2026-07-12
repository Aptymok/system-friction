# Studio Migration Notes

## Created

- `src/lib/studio/production/studioContracts.ts`
- `docs/studio/STUDIO_CURRENT_STATE_AUDIT.md`
- `docs/studio/STUDIO_MASTER_SPEC.md`
- `docs/studio/STUDIO_VIEW_CONTRACTS.md`
- `docs/studio/STUDIO_DATA_PROVENANCE.md`
- `docs/studio/STUDIO_MIGRATION_NOTES.md`
- `docs/studio/STUDIO_QA_REPORT.md`

## Changed

- `studioProductionTypes.ts` now exports canonical metric, phase, evidence, view, field graph and next action types.
- `studioProductionAdapter.ts` now reads Studio persistence tables directly and avoids Gold fallback for object features.
- `StudioProductionShell.tsx` now mounts six canonical modules and hides unavailable actions.
- `StudioObjectIntake.tsx` refreshes after upload, closes the modal, disables duplicate submit and preserves real errors.
- Pixi renderers now show missing states instead of animated fallback data.
- Legacy/Gold Studio components no longer expose decorative buttons.

## Not Changed

- No SQL migration was edited or applied.
- No MIHM formula file was changed.
- No WorldSpect/World Vector formula was changed.
- No non-Studio route was modified.

## Compatibility

The old production state fields remain present for existing components, while the mounted `/studio` surface consumes the canonical contract fields.
