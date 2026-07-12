# ROOT QA report

Date: 2026-07-11  
Branch: `codex/root-sovereign-functional-console`

## Automated commands

| Command | Result |
|---|---|
| `npm ci` | Pass; 255 packages installed. NPM reported 4 moderate vulnerabilities and two pending install-script approvals. |
| `npm run check:boundaries` | Pass. |
| `npm run typecheck` | Pass. |
| `npm run lint` | Blocked by obsolete repository script: Next 16 interprets `next lint` as a project directory and reports `.../lint` missing. No lint success is claimed. |
| `npm run build` | Pass; Next.js 16.2.6 compiled, typechecked and generated 96 static pages. `/root` and ROOT APIs remain dynamic. |
| `git diff --check` | Pass at validation point. |

## Static truth scans

Active sovereign UI/readers contain no `Math.random`, `deterministicParticles`, permanent `requestAnimationFrame`, literal `NULL`, artificial latitude/longitude, starfield or nebula. No active anchor targets a POST route. All visible buttons are navigation, submit controls or have handlers.

## Browser verification

Dev server: `http://localhost:3000`.

- `/root?view=overview` redirected to `/login?next=%2Froot%3Fview%3Doverview`.
- Login page contained meaningful content and no Next.js error overlay.
- Browser console error list was empty.
- Captured 1920×1080, 1440×900 and 390×844 auth-boundary evidence under `docs/root/evidence/`.
- Authenticated console layout/action proof is pending a real ROOT session. No bypass, mock session or fabricated console screenshot was used.

## Write tests

Source contracts and type/build behavior were verified. Live writes (evidence, close mutation, sync, AMV ingest, reports, prediction approval, ACP presence) were not executed because the browser had no founder session and remote database mutation was not authorized through a test fixture. Their UI requires confirmation and their routes require ROOT.

## Responsive status

The protected route boundary was checked at 1920×1080, 1440×900 and 390×844. Source CSS also defines the required desktop grid and mobile collapse. Authenticated visual acceptance remains pending preview approval.
