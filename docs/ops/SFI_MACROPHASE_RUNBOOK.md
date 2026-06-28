# SFI Macrophase Runbook

## Architecture

WorldSpect measures.

World Vector interprets.

Agents process.

Reports translate.

ROOT/founder approves.

Publication drafts are generated but not auto-published.

## Current Operating Paths

Sensor:

```text
POST /api/cron/worldspect
GET /api/worldspect/health
```

Memory:

```text
GET /api/world-vector/status
GET /api/world-vector/today
GET /api/world-vector/operational-state
```

Reports:

```text
GET /api/world-vector/internal-report
GET /api/world-vector/public-report
```

Agents:

```text
POST /api/world-vector/agents/daily
POST /api/world-vector/agents/reports
POST /api/world-vector/agents/close-cycle
GET /api/world-vector/agents/audit
```

Publication drafts:

```text
GET /api/world-vector/publication/linkedin-draft
GET /api/world-vector/publication/repository-entry
GET /api/world-vector/publication/medium-seed
```

## Daily Operation

1. Check `/api/world-vector/status`.
2. Verify the pulse has a latest snapshot and sample count.
3. Run or verify the daily agent.
4. Generate the internal report.
5. Generate the public draft.
6. Check `/api/world-vector/agents/audit`.
7. Review `/root` World Vector panel.

Use `persist=true` only when the World Vector tables are ready and the action is intentional.

## Weekly Operation

1. On Sunday, run close-cycle.
2. Generate the `cycle_close` report.
3. Generate LinkedIn draft.
4. Generate repository entry.
5. Generate Medium seed.
6. Founder reviews and approves manually.
7. Publish externally by human action only.

## No-Legacy Rules

Do not restore WorldSpect Python.

Do not restore `services/python/world_cli.py`.

Do not restore `services/python/world_spectrum.py`.

Do not restore `src/lib/worldspect/runWorldSpectrum.ts`.

Do not restore `/api/worldspect/ingest-payload`.

Do not restore `/api/worldspect/diagnostic`.

Do not add GitHub Actions service-role Supabase access.

## Work-Computer Constraint

If Supabase/admin access is blocked, do not force it.

Use safe server endpoints and manual dashboard execution from an allowed environment.

Codex may create repository files and SQL proposals.

Codex must not apply remote migrations or write production data from local scripts.

## Validation

Local validation:

```powershell
npm run typecheck
npm run build:local-insecure
```

Production verification:

```powershell
Invoke-RestMethod "https://www.systemfriction.org/api/world-vector/status" | ConvertTo-Json -Depth 10
Invoke-RestMethod "https://www.systemfriction.org/api/world-vector/today" | ConvertTo-Json -Depth 10
Invoke-RestMethod "https://www.systemfriction.org/api/world-vector/operational-state" | ConvertTo-Json -Depth 10
```
