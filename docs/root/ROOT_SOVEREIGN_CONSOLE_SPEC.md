# ROOT sovereign console specification

## Canonical surface

`/root` is the sole founder console. The server page calls `await requireFounderPage('/root')`, reads `RootSovereignState`, and mounts only `RootSovereignConsole`. The route segment is `noindex`, dynamic, and remains wrapped by the existing client role gate as defense in depth.

## Layout

- Top bar: 64px identity, system state, ACP observation, clock and manual refresh.
- Module rail: 190px desktop, sticky, seven functional buttons.
- Main instrument: flexible, internally scrollable.
- Inspector: 360px desktop, source/evidence/payload for the selected entity.
- Action strip: 42px, latest result, audit ID and expandable session log.
- Gap: 6px. Panels, inputs, buttons and dialogs use square corners.

Responsive behavior collapses to a horizontal module rail and stacked inspector below 860px. No alternate mobile data model is created.

## Modules and deep links

1. `/root?view=overview`
2. `/root?view=governance`
3. `/root?view=agents`
4. `/root?view=predictions`
5. `/root?view=amv`
6. `/root?view=evidence`
7. `/root?view=execution`

Browser history is preserved and back/forward navigation updates the active module.

## Refresh behavior

`GET /api/root/console` is the canonical refresh route. The client polls every 30 seconds only while the document is visible, aborts prior requests, enforces an eight-second timeout, retains the last valid state after failure, and marks that state stale instead of replacing it with an empty object.

## Mutation behavior

Every UI mutation opens a modal naming effect, target, method and route. Execution remains disabled until the operator checks an explicit confirmation. A response is successful only when HTTP is successful **and** `body.ok === true`. The action strip retains individual results and audit IDs for the current browser session.

## Visual truth rules

- Cyan: observed evidence.
- Magenta: predictions and AMV.
- Copper: identity and governance.
- Green: completed/verified.
- Red: error/block.
- Gray: missing/gated.

No `Math.random`, permanent `requestAnimationFrame`, artificial geography, particle field, decorative star/nebula layer, categorical percentage or synthetic graph node is used in the active surface.
