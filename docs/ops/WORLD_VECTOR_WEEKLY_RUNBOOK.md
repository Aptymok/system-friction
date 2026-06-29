# World Vector Weekly Runbook

## Boundary

World Vector cron is a system actor. It may read WorldSpect snapshots, derive World Vector observations, persist daily memory, persist report drafts and run health checks.

It must not close cycles, approve drafts, publish externally or mutate governed ROOT state.

## Daily loop

Every scheduled run:

1. WorldSpect remains the measurement source.
2. World Vector system actor calls `/api/world-vector/agents/system-run`.
3. `dailyObservationAgent` derives and persists the daily observation when memory is ready.
4. `internalReportAgent` and `publicReportAgent` prepare draft memory when requested.
5. `persistenceAuditAgent` and `alertAgent` report blockers.
6. `/api/world-vector/agents/health` exposes operational status.

## Weekly close

Sunday close remains a governed ROOT action.

The system actor may prepare draft material, but it does not close the cycle. Closing the cycle requires the protected close-cycle route and a ROOT session.

## Required secrets

- `VERCEL_APP_URL`
- `SFI_AGENT_SECRET`

`SFI_AGENT_SECRET` is used only by the World Vector system actor route. It is not a publishing credential and does not grant ROOT.

## Surfaces

- `/world-vector`: minimal observatory dashboard.
- `/api/world-vector/agents/system-run`: system actor execution endpoint.
- `/api/world-vector/agents/health`: read-only health endpoint.
- `/api/world-vector/agents/close-cycle`: ROOT-only close-cycle endpoint.

## Failure modes

- If WorldSpect has no latest snapshot, agents must report `worldspect_snapshot_missing`.
- If World Vector tables are missing, agents must report `world_vector_tables_not_installed`.
- If memory is blocked, agents may return interpretation but must not claim persistence.
- If close-cycle is requested without ROOT, it must remain blocked.
