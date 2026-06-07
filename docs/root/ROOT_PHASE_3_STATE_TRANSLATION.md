# ROOT Phase 3 State Translation

Scope: state translation only. No business rules, database, Supabase, migrations, data, routes, Twin behavior, Visor behavior, node field behavior or global redesign were changed.

## Objective

Create a single operational translator for internal states so ROOT can stop exposing raw backend language in the main experience.

Delivered:

- `src/lib/root/rootStateTranslator.ts`

## Covered States

The translator covers the required states:

- `observed`
- `partial`
- `simulated`
- `queued`
- `degraded`
- `active`
- `stable`
- `critical`
- `vigente`
- `caducado`
- `sandbox`
- `blocked`
- `accepted`
- `proposed`
- `rejected`
- `failed`
- `verified`
- `pending`

It also includes conservative aliases observed in the repo, such as `design_approved`, `closed`, `missing`, `derived`, `fallback`, `homeostatic`, `transition`, `blocked_by_governance`, `approved`, and `draft`.

## Output Contract

Each translation returns:

- operative label
- human explanation
- implication
- recommended action
- severity when useful
- raw state
- normalized state

## Constitutional Boundaries

- `accepted` is translated as accepted, not necessarily executed.
- `simulated` is translated as simulation and cannot sustain regime or attractor.
- `blocked` is translated as a visible rule, not as a technical backend code.
- `verified` still requires layer, source and validation context before affecting attractor.
- Unknown states fall back to `Sin lectura suficiente` instead of becoming evidence.

## Tests

No test file was added because the repository currently has no existing `*.test.ts` or `*.spec.ts` pattern.

## Phase 3 Closure

Closed. `rootStateTranslator.ts` exists and is ready for use by Phase 4 and later phases. Full replacement of every raw UI state across all ROOT components remains outside this phase unless the component is part of Phase 4.
