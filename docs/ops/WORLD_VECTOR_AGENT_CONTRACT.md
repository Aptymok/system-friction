# World Vector Agent Contract

## Boundary

World Vector agents do not measure the world.

They do not run WorldSpect adapters.

They do not touch the WorldSpect cron.

They interpret existing WorldSpect snapshots and operate World Vector memory.

## Agents

`dailyObservationAgent`

- reads latest and recent WorldSpect snapshots
- derives today's World Vector observation
- persists or reuses the daily observation when memory tables are ready

`internalReportAgent`

- generates founder/internal report
- persists or reuses `internal_daily` draft when ready

`publicReportAgent`

- generates public-safe report
- persists or reuses `public_weekly` LinkedIn draft when ready
- excludes raw payloads, private diagnostics and Supabase internals

`cycleCloseAgent`

- runs Sunday close logic
- creates `cycle_close` draft
- marks cycle closed only through protected ROOT action
- does not publish externally

`persistenceAuditAgent`

- verifies latest snapshot availability
- verifies memory readiness
- verifies observation/report persistence when possible
- reports blockers clearly

`alertAgent`

- checks stale or missing pulse signals
- checks missing observations, low samples and degraded memory
- reads `world_vector_alerts` when available
- returns warnings when alert table is unavailable

## Protection

Agent routes use the governed ROOT actor gate.

No client-exposed secret is introduced.

No GitHub Actions secret is required.

## Routes

```text
POST /api/world-vector/agents/daily
POST /api/world-vector/agents/reports
POST /api/world-vector/agents/close-cycle
GET /api/world-vector/agents/audit
```

## Failure Modes

If memory tables are unavailable, agents return blocked states.

If WorldSpect has no snapshot, agents do not fabricate observations.

If close-cycle is called before Sunday, it blocks unless ROOT passes `force=true`.
