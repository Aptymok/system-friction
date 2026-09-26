# SFI public asset library

Canonical public visual master path for the fullscreen public experience.

Expected master folders:

- world/
- territory/
- city/
- institutional/
- people/
- overlays/
- maps/
- ui/
- icons/
- documents/
- transitions/

Upload masters without destructive conversion. Keep original PNG when PNG is the master; do not downscale merely for repository ingestion.

The runtime scene composition belongs in `src/components/sfi/publicSceneManifest.ts`. Assets are classified there by scene, role, depth, scale, alpha and motion. The current manifest deliberately reuses existing production-safe assets until the master corpus is uploaded here.

Vertical semantic spine:

`SFI → SPACE → EARTH → TERRITORY → CITY → INSTITUTION → HUMAN → SFI / RETURN`

Horizontal movement changes the inspection lens inside the active scene; it does not replace the vertical scale journey and it does not make Reality Chain the site-wide navigation model.
