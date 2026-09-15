# SFI Visual Slot Manifest v1

Status: WORKING CONTRACT
Branch: feat/interface-convergence-v1

## Rule

Structure, grid, spacing, borders, typography, iconography, graph edges, timelines, metadata, state markers and actions are rendered by code. Images are replaceable renditions only. No embedded text, logos, UI, frames or gold rules inside generated image assets.

## Public master slots

| Slot | Render use | Master | Safe focal contract | Reuse |
| --- | --- | --- | --- | --- |
| institutional-threshold | Home / Institute / Login | 3200x1400, 16:7 | left 42% available for copy; focal architecture/city center-right | shared |
| knowledge-network | Publications / Library / Discovery | 3200x1200, 8:3 | copy-safe left 35%; horizon/network right | shared |
| evidence-archive | Research / Reports / Evidence | 3200x1200, 8:3 | strong depth; no readable wall text | shared |
| safe-space-lab | Lab / Simulation / Project testing | 3200x1200, 8:3 | central experimental object; peripheral whitespace | shared |
| temporal-cover | monthly Notas Temporales | 1600x2000, 4:5 | no typography baked in | template |
| editorial-card | public object cards | 1600x1200, 4:3 | focal center; aggressive crop-safe | shared |

## Explicitly not image assets

- Observatory map and FIELD internals.
- Library neural graph.
- Case/project temporal graph.
- Discovery Mesh graph.
- futures/branch projections.
- degradation/freshness state.
- T0 -> RETURN timelines.
- decisions, HUD, metadata, evidence, lineage, actions.

These are data-driven components.

## Asset path contract

`/public/images/sfi/<semantic-class>/<asset>.webp`

Objects reference semantic visual classes, not fixed filenames, so a rendition can be replaced without changing the canonical object.

## Initial implementation order

1. shared visual tokens and public shell
2. Institute
3. Publications
4. Library / graph
5. Reports + Discovery projection
6. authenticated Project / Attractor / Case workspace
7. Decisions inbox
8. ROOT system observation surface

Observatory and FIELD keep their internal visual grammar; only the common institutional shell may surround them.
