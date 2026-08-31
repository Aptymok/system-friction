# ADR-SFI-DURABLE-UNIVERSAL-CYCLE-002 — Durable universal-cycle continuation

**Status:** PROPOSED FOR IMPLEMENTATION  
**Version:** 1.0  
**Date:** 2026-08-31

## Context

The universal signal runtime can preserve cycle identity and individual agent execution events, but a deployment timeout may terminate the request before `SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED` and AI synthesis are persisted. `AWAITING_RETURN` is also a lifecycle classification, not proof that a process is actively acquiring a RETURN.

This creates two operational ambiguities:

1. a caller can become the implicit scheduler by repeatedly resuming a cycle after runtime timeouts;
2. a caller can become the implicit RETURN provider without SFI first declaring what observation is required and whether SFI can acquire it.

## Decision

SFI will make universal cognitive execution durable using the existing epistemic event store and the existing hourly continuity heartbeat.

1. The cognitive runtime persists `SFI_UNIVERSAL_COGNITIVE_CHECKPOINT` after bounded agent steps.
2. Checkpoints contain only the bounded cognitive execution state needed to continue. They do not authorize raw-source row persistence and do not change epistemic class.
3. A later invocation restores the latest unfinalized checkpoint for the same `cycleId`/logbook and skips already processed agents.
4. Partial `SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED` records with `completed:false` do not finalize a checkpoint.
5. The existing hourly continuity heartbeat is the recovery scheduler. It may resume unfinished same-cycle cognitive work but may not open a new Case, create a parallel cycle, expand external authority, fabricate RETURN, close the cycle, or promote learning.
6. Pre-checkpoint interrupted cycles may be bootstrapped only from their persisted same-cycle resume identity plus canonical structured-result hydration. Raw source objects are not re-uploaded or reprocessed.
7. On cognitive completion SFI persists `SFI_UNIVERSAL_RETURN_PLAN_RECORDED`. The plan declares expected/contradictory signals, observation window when available, source requirement, responsibility and the rule for human escalation.
8. Human input is not the default scheduler or RETURN mechanism. It is requested only when the required source, credential, authorization or observation cannot be obtained through an already-authorized SFI capability.

## Constitutional compatibility

This ADR extends `ADR-SFI-ARCHITECTURE-001` without creating a second institute, second memory store, new table, direct client access to ROOT, or new epistemic authority. Cognitive Spine/runtime output remains non-canonical unless existing evidence and governance gates promote it.

The event store remains the sole durable execution trace for this mechanism. No raw XLSX rows are persisted by the checkpoint layer.

## Canonical preflight record

The change is owned by the existing universal signal runtime and continuity heartbeat. Existing capabilities inspected before implementation were `universalSignalCycle`, `cognitiveCycle`, the canonical observation hydrator, the governed execution router, the epistemic event store and the existing GitHub-OIDC continuity heartbeat. The decision is to absorb continuation into those owners; the only new helper is bounded orchestration for reconstructing unfinished universal-cycle execution. There is no frontend delta, database delta, migration, alternate writer, new scheduler, new agent, new Case surface or second memory store. Rollback consists of reverting this change; the new checkpoint and RETURN-plan events are derived/non-authoritative and can be ignored safely by the prior runtime.

## Failure semantics

A deployment timeout becomes an interrupted execution window, not loss of cycle identity. The next authorized continuity run resumes from the latest durable checkpoint.

If a single agent itself cannot complete within the deployment window, that agent remains retryable from the prior checkpoint; its unpersisted output is not assumed to exist.

## Acceptance criteria

A governed test must demonstrate all of the following:

- same `cycleId` before and after interruption;
- no new Case and no parallel cycle;
- no raw source re-upload or raw-row persistence;
- at least one interruption with a persisted checkpoint;
- later execution skips already processed agents;
- eventual `SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED` with `completed:true`;
- AI synthesis after the completed runtime;
- an explicit RETURN plan;
- no RETURN, CONTRAST, closure or learning promotion without real evidence.
