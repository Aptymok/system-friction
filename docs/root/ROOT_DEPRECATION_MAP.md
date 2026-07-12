# ROOT deprecation map

Date: 2026-07-11

## Removed after import verification

- `src/components/root/gold/**`: previous active Gold surface. Removed after `/root` and `/api/root/governance` moved to the sovereign read model. It contained synthetic particles, artificial coordinates, literal `NULL`, permanent animation and dead navigation controls.
- `src/lib/root/gold/**`: Gold-specific adapter/state. Removed with its only remaining API consumer migrated to `readRootSovereignState()`.
- `src/components/root/shell/**`: unused parallel shell. Repository-wide search found no imports. It contained star/nebula decoration, rounded panels, gauges without measurement contracts and an operational trigger that trusted HTTP status alone.
- `RootDashboardClient.tsx`, `RootOperationsConsole.tsx`, `RootLiveGraphPanel.tsx`: unmounted legacy chain. `RootDashboardClient` was the only consumer of the two panels and had no external import.

## Preserved

- Other `src/observatory/components/root/**` files: preserved because they may still serve non-ROOT observatory, VISOR, terminal or field imports. No broad directory deletion was performed.
- `src/components/root/scene/**`, engines, topology and adapter files: preserved where import relationships still exist. They are not mounted by `/root`.
- Legacy AMV routes: preserved because field and terminal consumers remain.
- Prediction registry pages: preserved as governed deep routes; the sovereign console observes the same private persistence without creating a public browser.

## Canonical replacements

- Page: `src/app/root/page.tsx`.
- Console: `src/components/root/sovereign/RootSovereignConsole.tsx`.
- State: `src/lib/root/sovereign/rootSovereignState.ts`.
- Adapter: `src/lib/root/sovereign/rootSovereignAdapter.ts`.
- Refresh: `GET /api/root/console` (with `/api/root/governance` retained as a compatible ROOT-gated sovereign state read).
