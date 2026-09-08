# D-2026-09-08 · Vercel deployment cost gate

Status: ACCEPTED OPERATIONAL CONSTRAINT
Authority: founder instruction in active SFI-00 control-room session.

## Decision
Automatic Vercel Git deployments are disabled globally for this repository. GitHub CI remains the ordinary implementation and assurance plane. Vercel production deployment is reserved for an explicit SFI-00 release/RETURN action through the existing prebuilt-production workflow and its dedicated trigger or manual dispatch.

## Rationale
The repository observed Vercel's daily deployment limit after more than 100 deployment attempts. Preview deployment is not accepted as a substitute for canonical SFI Verify and should not consume deployment quota for routine code/QA iteration.

## Contract
- `vercel.json -> git.deploymentEnabled = false`.
- ordinary branch pushes and PR synchronization must not intentionally request Vercel deployments.
- ordinary `main` merges must not intentionally request Vercel production deploys.
- production deployment remains `.github/workflows/sfi-vercel-prebuilt-production.yml` only through explicit release trigger/dispatch.
- GitHub typecheck/build/contract QA remains the default implementation proof before release.

## RETURN
Before a final release, SFI-00 rechecks the exact canonical HEAD, required CI, Vercel project scope and release necessity. One bounded deployment is then used for production observation and RETURN; repeated deployments without new evidence are prohibited.
