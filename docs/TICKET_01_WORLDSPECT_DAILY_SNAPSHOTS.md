# TICKET 01 · WorldSpect Daily Snapshots

## Objective

WorldSpect must stop being only a runtime calculation and become a persisted daily observation layer.

This ticket hardens the first real metrics layer of the field by introducing persisted WorldSpect snapshots with explicit source health, degraded source tracking, adapter status, confidence, and runtime fallback traceability.

## Implemented

- Created `public.worldspect_snapshots`.
- Added persisted source state, evidence level, confidence, WSI, NTI, degraded sources, source health, raw payload, field state signal, adapter status, adapter error, ingest mode, and snapshot hash.
- Added `src/lib/worldspect/snapshotStore.ts`.
- Added `POST /api/worldspect/ingest-daily`.
- Modified `GET /api/worldspect/real` to read latest persisted snapshot first.
- Added runtime fallback only when no persisted snapshot exists.
- Runtime fallback is persisted as `fallback_runtime` when possible.

## Operational Rules

- No simulated success.
- No metric without source.
- No direct client writes.
- No destructive cleanup.
- Degraded state is valid state.
- Snapshot absence must be explicit.
- Runtime fallback must be traceable.

## Required Environment

```bash
WORLDSPECT_INGEST_SECRET="replace-with-long-secret"
PYTHON_BIN="python3"
```

Existing Supabase environment variables must remain configured:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Daily Ingest

`POST /api/worldspect/ingest-daily`

Required header:

```txt
x-sfi-cron-secret: <WORLDSPECT_INGEST_SECRET>
```

Example:

```bash
curl -X POST "https://systemfriction.org/api/worldspect/ingest-daily" \
  -H "x-sfi-cron-secret: $WORLDSPECT_INGEST_SECRET"
```

## Read Path

`GET /api/worldspect/real`

Resolution order:

```txt
1. Read latest persisted worldspect_snapshots row.
2. If present, return persisted snapshot.
3. If missing, execute runtime adapter.
4. Persist fallback as ingest_mode=fallback_runtime.
5. Return explicit warnings.
```

## Acceptance Criteria

- `worldspect_snapshots` table exists.
- RLS is enabled.
- Authenticated users can read snapshots.
- Service role can upsert snapshots.
- `POST /api/worldspect/ingest-daily` rejects missing or invalid secret.
- `POST /api/worldspect/ingest-daily` persists a snapshot when authorized.
- `GET /api/worldspect/real` reads persisted snapshot first.
- `GET /api/worldspect/real` does not run Python when a snapshot exists.
- If no snapshot exists, runtime fallback is used and explicitly warned.
- Failed sources persist through `degraded_sources` and `source_health`.
- No WSI/NTI is invented.
- `npm run typecheck` passes.
- `npm run build` passes.

## Boundary

This ticket does not redesign UI, does not modify terminal behavior, does not delete data, does not create new agents, and does not execute external actions.

## Result

Before this ticket:

```txt
WorldSpect = runtime calculation.
```

After this ticket:

```txt
WorldSpect = longitudinal persisted observation.
```
