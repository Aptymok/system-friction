# World Vector Longitudinal Memory Contract

## Boundary

WorldSpect measures.

World Vector interprets.

The WorldSpect pulse remains the canonical sensor path:

```text
.github/workflows/worldspect-cron.yml
-> POST /api/cron/worldspect
-> src/lib/worldspect/runAdapters.ts
-> src/lib/worldspect/adapters/publicAdapters.ts
-> src/lib/worldspect/vector-aggregator.ts
-> src/lib/worldspect/snapshotStore.ts
-> public.worldspect_snapshots
-> /api/worldspect/health
```

Macrofase 2A does not change that path.

## What This Adds

This repository now contains SQL proposal files for World Vector longitudinal memory:

```text
supabase/migrations/20260628090000_create_world_vector_cycles.sql
supabase/migrations/20260628090010_create_world_vector_observations.sql
supabase/migrations/20260628090020_create_world_vector_reports.sql
```

These files are not applied by Codex.

The human owner must apply them manually in Supabase when the work environment allows it.

## Tables

The proposed tables are:

- `public.world_vector_cycles`
- `public.world_vector_observations`
- `public.world_vector_reports`

`public.world_vector_alerts` is covered by the earlier pulse migration proposal.

## Security

GitHub Actions does not need Supabase service-role access for World Vector memory.

No service-role key is exposed to client code.

The proposed tables enable RLS and grant direct table access only to `service_role`.

Anon and authenticated roles do not receive direct write grants.

Runtime reads/writes are performed server-side only after the SQL exists.

## Safe Before SQL

The endpoints are safe before SQL is applied.

If tables are missing, they return read-only or blocked responses:

```json
{
  "memory": {
    "enabled": false,
    "reason": "world_vector_tables_not_installed"
  }
}
```

No fake persistence is reported.

## Endpoints

Read-only by default:

```text
GET /api/world-vector/status
GET /api/world-vector/today
GET /api/world-vector/internal-report
GET /api/world-vector/public-report
```

Optional persistence after SQL exists:

```text
GET /api/world-vector/today?persist=true
GET /api/world-vector/internal-report?persist=true
GET /api/world-vector/public-report?persist=true
```

Protected close action:

```text
POST /api/world-vector/close-cycle
POST /api/world-vector/close-cycle?force=true
```

`close-cycle` requires the existing governed ROOT actor gate.

It does not publish externally.

## Manual SQL Application Order

Apply in this order:

1. `20260628090000_create_world_vector_cycles.sql`
2. `20260628090010_create_world_vector_observations.sql`
3. `20260628090020_create_world_vector_reports.sql`

Do not apply through Codex on the institutional/work computer.

Do not run `supabase db push` through Codex.

## Verification

Before SQL:

```powershell
Invoke-RestMethod "https://www.systemfriction.org/api/world-vector/status" | ConvertTo-Json -Depth 10
Invoke-RestMethod "https://www.systemfriction.org/api/world-vector/today" | ConvertTo-Json -Depth 10
```

Expected:

```text
memory.enabled=false
memory.reason=world_vector_tables_not_installed
```

After SQL:

```powershell
Invoke-RestMethod "https://www.systemfriction.org/api/world-vector/status" | ConvertTo-Json -Depth 10
Invoke-RestMethod "https://www.systemfriction.org/api/world-vector/today?persist=true" | ConvertTo-Json -Depth 10
Invoke-RestMethod "https://www.systemfriction.org/api/world-vector/internal-report?persist=true" | ConvertTo-Json -Depth 10
Invoke-RestMethod "https://www.systemfriction.org/api/world-vector/public-report?persist=true" | ConvertTo-Json -Depth 10
```

Expected:

```text
memory.enabled=true
persisted=true for persist=true requests
```

## Rollback Notes

If manual SQL application fails, do not modify WorldSpect Pulse.

The application remains operational because World Vector endpoints degrade to read-only/blocked states.

If rollback is required, remove the proposed World Vector tables manually in Supabase only after confirming no production process depends on them.

## What Codex Must Not Do

Codex must not:

- apply migrations
- run Supabase CLI against remote
- execute SQL against production
- write production data from local scripts
- add Supabase service role to GitHub Actions
- expose secrets
- recreate deleted WorldSpect legacy files
- restore `/api/worldspect/ingest-payload`
- restore `/api/worldspect/diagnostic`
