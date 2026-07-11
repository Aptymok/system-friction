# Studio QA Report

Date: 2026-07-11

## Commands

| Command | Result |
| --- | --- |
| `git status --short` before audit | clean |
| `git branch -vv` before audit | `main` at `5e79cca`, tracking `origin/main` |
| `git fetch origin` | success |
| `git rev-list --left-right --count origin/main...HEAD` | `0 0` |
| `npm install` | success, up to date; reported 4 moderate audit vulnerabilities and pending install-script approvals |
| `npm run typecheck` | success |
| `npm run lint` | failed: `next lint` reports `Invalid project directory provided, no such directory: D:\system-friction\lint` |
| `npm run build` | success |
| `Invoke-WebRequest http://127.0.0.1:3000/studio` | HTTP 200 before browser auth flow check |
| Browser open `http://127.0.0.1:3000/studio` | redirected to `/login?next=%2Fstudio`; no console errors on login page |
| `Invoke-WebRequest http://127.0.0.1:3000/api/studio/production/state` | HTTP 200 |

## Files Touched

See git history on branch `codex/studio-master-reconstruction`.

## Routes Tested

- `/studio`: server response 200; browser session redirected to login because route is auth-gated.
- `/api/studio/production/state`: HTTP 200.

## Errors Found

- Broken UI links to raw API and POST endpoints in mounted Studio shell.
- Display-only filters and buttons in Studio/Gold surfaces.
- Readiness heuristics converting textual state into fake percentages.
- Pixi fallback nodes and animations without real variables.
- `npm run lint` script incompatible with current Next CLI behavior.
- Browser QA blocked by login gate.

## Errors Corrected

- Removed mounted raw API links and href-to-POST actions.
- Replaced six-module navigation.
- Added canonical metric/phase/evidence/view contracts.
- Reworked adapter to read Studio persistence tables directly.
- Disabled fake Pixi fallback nodes and missing-data animations.
- Removed decorative buttons from legacy/Gold Studio components.
- Intake now disables duplicate submit and refreshes after real upload.

## Limitations Remaining

- Auth-gated `/studio` could not be manually exercised in-browser without credentials.
- Audio intake could not be completed in browser QA because the page redirected to login.
- Small/large audio upload tests were not executed for the same auth reason.
- Simulation remains unavailable because the POST route returns `simulation_engine_not_connected`.
- Deliverable generation remains blocked because only listing/downloading persisted exports is implemented.
- Manual marker persistence is not exposed because no Studio marker endpoint exists.
- Outcome and learning registration controls are hidden because no scoped persistence endpoints were found.
- `npm run lint` is blocked by project script/tooling, not by Studio code.

## Components Blocked By Missing Evidence

- Structure layers: `MULTILAYER_EVIDENCE_REQUIRED`.
- Arrangements: stems/layers/sections/events required.
- Mix controls: real channels required.
- Mastering technical metrics: persisted mastering feature rows required.
- World timing snapshot ID/regime: missing unless exposed by current WSV adapter.
- Field tensions: require real relationships between MIHM, Cultural Vector, WSV, external evidence or declared attractor.
- Simulation: real simulation engine required.
- Deliverable generation: real generation endpoint required.
