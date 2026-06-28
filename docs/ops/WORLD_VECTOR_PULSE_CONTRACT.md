# World Vector Pulse Contract

## What Runs

World Vector Pulse runs the WorldSpect measurement path and validates that the public WorldSpect state remains observable.

The GitHub workflow is:

- `.github/workflows/worldspect-cron.yml`

The runtime endpoints touched by the workflow are:

- `POST /api/worldspect/ingest-payload`
- `POST /api/cron/worldspect`
- `GET /api/worldspect/health`
- `GET /api/worldspect/trend?days=90&debug=1`
- `GET /api/worldspect/real`

## Cadence

The workflow runs every 6 hours:

```yaml
cron: '0 */6 * * *'
```

UTC slots map to existing ingest modes:

- `00` -> `daily_cron`
- `06` -> `manual`
- `12` -> `diagnostic`
- `18` -> `fallback_runtime`

The workflow sends:

- `X-SFI-Ingest-Mode`
- `X-SFI-Measurement-Slot`

## Required Secrets

GitHub Actions requires:

- `VERCEL_APP_URL`
- `WORLDSPECT_INGEST_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Runtime cron auth accepts this priority:

1. `WORLDSPECT_CRON_SECRET`
2. `WORLDSPECT_INGEST_SECRET`
3. `CRON_SECRET`

Production without a configured cron secret returns `503`.
Production without a valid bearer token returns `401`.
Local development without a secret is allowed and returns a warning.

## Data Access

Live reads:

- `public.worldspect_snapshots`

Proposed alert table:

- `public.world_vector_alerts`

Codex must not apply this migration or execute SQL against production. The human owner applies it manually.

## Validation

The workflow runs:

```bash
node scripts/qa-world-vector-pulse.mjs
```

The QA script calls:

- `GET $VERCEL_APP_URL/api/worldspect/health`
- `GET $VERCEL_APP_URL/api/worldspect/trend?days=90&debug=1`
- `GET $VERCEL_APP_URL/api/worldspect/real`

It fails if the health status is failed, trend samples are missing, all domains are empty, empty snapshots dominate the trend, or the last observation is older than 24 hours.

## Health States

`healthy` means:

- latest snapshot is recent
- active sources exist
- trend quality is thin or usable
- no critical warning is present

`degraded` means:

- latest measurement is stale but younger than 24 hours
- measurements today are below the current UTC slot expectation
- trend is thin
- source coverage is low
- degraded sources exist
- empty snapshots are high

`failed` means:

- no snapshots
- no active sources
- latest snapshot is unreadable
- last measurement is older than 24 hours
- persistence/read exception

## WORLD VECTOR SILENT

If health reports `world_vector_silent_over_24h`:

1. Inspect the latest GitHub workflow run.
2. Confirm `VERCEL_APP_URL` and ingest secret exist in GitHub Actions.
3. Call `GET /api/worldspect/health`.
4. Call `GET /api/worldspect/trend?days=90&debug=1`.
5. Inspect `worldspect_snapshots` manually in Supabase.
6. If the alert table migration has been applied, register or acknowledge the alert manually.

## Manual Supabase Work

The human owner may apply:

```text
supabase/migrations/20260627000100_world_vector_alerts.sql
```

The human owner may run the safe QA script locally:

```bash
node scripts/qa-supabase-worldspect-write.mjs
```

By default it is read-only. It does not write unless:

```bash
WRITE_CHECK=true
```

## What Codex Must Not Do

Codex must not:

- run `supabase db push`
- apply migrations to remote Supabase
- execute SQL against production
- run local scripts that write to Supabase real data
- expose service-role keys
- commit secrets
- claim that a DB migration was applied when only a migration file was created
