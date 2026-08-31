# ADR-SFI-DURABLE-UNIVERSAL-CYCLE-002 — Durable universal-cycle continuation

**Status:** ACCEPTED · COGNITIVE CONTINUITY PROVEN · RETURN OWNERSHIP PROOF PENDING  
**Version:** 1.2  
**Date:** 2026-08-31

## Context

The universal signal runtime can preserve cycle identity and individual agent execution events, but a deployment timeout may terminate the request before `SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED` and AI synthesis are persisted. `AWAITING_RETURN` is also a lifecycle classification, not proof that a process is actively acquiring a RETURN.

This creates two operational ambiguities:

1. a caller can become the implicit scheduler by repeatedly resuming a cycle after runtime timeouts;
2. a caller can become the implicit RETURN provider without SFI first declaring what observation is required and whether SFI can acquire it.

## Decision

SFI will make universal cognitive execution durable using the existing epistemic event store and the existing continuity heartbeat.

1. The cognitive runtime persists `SFI_UNIVERSAL_COGNITIVE_CHECKPOINT` after bounded agent steps.
2. Checkpoints contain only the bounded cognitive execution state needed to continue. They do not authorize raw-source row persistence and do not change epistemic class.
3. A later invocation restores the latest unfinalized checkpoint for the same `cycleId`/logbook and skips already processed agents.
4. Partial `SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED` records with `completed:false` do not finalize a checkpoint.
5. The existing continuity heartbeat is the recovery scheduler. It may resume unfinished same-cycle cognitive work but may not open a new Case, create a parallel cycle, expand external authority, fabricate RETURN, close the cycle, or promote learning.
6. Pre-checkpoint interrupted cycles may be bootstrapped only from their persisted same-cycle resume identity plus canonical structured-result hydration. Raw source objects are not re-uploaded or reprocessed.
7. On cognitive completion SFI persists `SFI_UNIVERSAL_RETURN_PLAN_RECORDED`. The plan declares expected/contradictory signals, observation window when available, source requirement, responsibility and the rule for human escalation.
8. Human input is not the default scheduler or RETURN mechanism. It is requested only when the required source, credential, authorization or observation cannot be obtained through an already-authorized SFI capability.
9. Automatic continuation is starvation-resistant: unfinished cycles are selected by oldest observed progress first, and each new checkpoint moves the serviced cycle behind older unfinished work. A governed targeted mode may select one already-existing `cycleId`; it cannot create a cycle.

## Continuity resilience amendment — 2026-08-31

Production observation showed that the GitHub scheduled event declared for minute `:15` stopped producing workflow runs for multiple consecutive slots even though the workflow remained present on the default branch. This is a scheduler-observation failure upstream of the universal-cycle runtime; it must not be represented as `RETURN_OVERDUE` for the affected cycle.

The existing heartbeat ownership is retained, with the following resilience rules:

- The same GitHub Actions heartbeat workflow exposes two schedule opportunities per hour (`:15` and `:45`). This is one scheduler owner and one heartbeat path, not a second SFI execution authority.
- A successful canonical `SFI Vercel Prebuilt Production` deployment triggers the same heartbeat workflow through `workflow_run`, so a newly deployed continuity change is exercised immediately instead of waiting for the next scheduled slot.
- OIDC remains constrained to the exact SFI repository, repository id, `main` ref, heartbeat workflow ref, audience and token lifetime. `workflow_run` is accepted only by that same policy boundary.
- The existing Vercel continuity cron remains a daily fallback. It is not promoted to an hourly parallel scheduler.
- The heartbeat workflow treats a live response with `ok:false` or a failed universal-continuation lane as a failed workflow instead of cosmetic green execution.
- ROOT reads the existing continuity state/run records and exposes heartbeat age, mode, latest run and scheduler health. No new table or second event store is introduced.
- Cycle operational state is derived from actual progress events. Interrupted cognition, pending synthesis and pending RETURN-plan generation remain machine-owned states. A cycle is not called `RETURN_OVERDUE` merely because its opening event is old.

These changes restore scheduling liveness and observability but do not by themselves satisfy the empirical acceptance criteria below. Scheduler green is not equivalent to cognitive completion, RETURN, CONTRAST or learning.

## Return ownership completion amendment — 2026-08-31

The production proof target subsequently demonstrated durable same-cycle progress through all required cognitive agents and persisted a completed cognitive-cycle event. That observation exposed the next discontinuity: a RETURN plan could declare `responsibility:SFI` and `humanInputRequired:false` while no runtime owner actually resolved whether the required source was available. ROOT could therefore display apparent acquisition even though only a plan existed.

The durable continuation owner now closes that ambiguity without introducing a second return subsystem:

- The same continuation runtime reads the latest RETURN plan after cognitive completion and resolves execution ownership before ROOT may represent the plan as active acquisition.
- Capability resolution supersedes the existing `SFI_UNIVERSAL_RETURN_PLAN_RECORDED` event with another event of the same contract and lineage. No new table, queue, memory store or parallel plan object is created.
- If the observation requires authoritative internal semantics, source-system lineage, controlled audit history, credentials or material real-world observation not present in the authorized runtime, the superseding plan sets `humanInputRequired:true` and states the minimum source/access/observation required.
- The resolver explicitly accepts authorized read access as an alternative to raw-file transfer. Raw source re-upload and raw-row persistence are never made default requirements.
- A capability-resolution event is still derived execution metadata. It is not RETURN and cannot be used as evidence, CONTRAST, closure or learning.
- AI synthesis is no longer considered healthy merely because a synthesis event exists. `COMPLETE` is semantic success. `DEGRADED` synthesis is retryable for a bounded number of attempts and is non-blocking for deterministic RETURN ownership resolution.
- Continuation performs a larger bounded amount of cognitive work per heartbeat while retaining checkpoints, so scheduler irregularity causes less wall-clock drag without returning to a fragile one-shot request.

This amendment preserves the existing rule that an observed RETURN must be explicitly linked to material evidence/prediction before reality calibration. When the required source is outside SFI authority, truthful human escalation is the terminal capability-resolution result; SFI must not manufacture autonomy by relabeling inference as observation.

## Constitutional compatibility

This ADR extends `ADR-SFI-ARCHITECTURE-001` without creating a second institute, second memory store, new table, direct client access to ROOT, or new epistemic authority. Cognitive Spine/runtime output remains non-canonical unless existing evidence and governance gates promote it.

The event store remains the sole durable execution trace for this mechanism. No raw XLSX rows are persisted by the checkpoint layer.

## Canonical preflight record

The change is owned by the existing universal signal runtime, continuity heartbeat and ROOT operational projection. Existing capabilities inspected before implementation were `universalSignalCycle`, `cognitiveCycle`, the canonical observation hydrator, the governed execution router, the epistemic event store, the existing GitHub-OIDC continuity heartbeat, the continuity state/run ledger and the ROOT workboard. The decision is to absorb continuation, synthesis recovery, RETURN-plan ownership resolution and scheduler resilience into those owners; there is no new frontend authority, database delta, migration, alternate writer, Case surface, memory store or epistemic promotion path. Rollback consists of reverting the implementation; checkpoint and RETURN-plan events are derived/non-authoritative and can be ignored safely by the prior runtime.

## Failure semantics

A deployment timeout becomes an interrupted execution window, not loss of cycle identity. The next authorized continuity run resumes from the latest durable checkpoint.

If a single agent itself cannot complete within the deployment window, that agent remains retryable from the prior checkpoint; its unpersisted output is not assumed to exist.

If a scheduler slot is not observed, ROOT reports heartbeat staleness and the cycle remains owned by continuity. Missing scheduler activity is not evidence that a real-world RETURN is overdue.

If AI synthesis is degraded, deterministic cycle state remains valid and RETURN ownership resolution continues. Synthesis may retry only within its bounded retry policy.

If the required RETURN source is outside currently authorized SFI capabilities, the plan must become explicit human input/authorization work. It must not remain labeled as active SFI acquisition.

## Acceptance criteria

A governed test must demonstrate all of the following:

- same `cycleId` before and after interruption;
- no new Case and no parallel cycle;
- no raw source re-upload or raw-row persistence;
- at least one interruption with a persisted checkpoint;
- later execution skips already processed agents;
- eventual `SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED` with `completed:true`;
- AI synthesis after the completed runtime, with degraded synthesis treated as bounded-retry/non-authoritative rather than silently healthy;
- an explicit RETURN plan;
- the RETURN plan is superseded by truthful capability ownership resolution when `CAPABILITY_RESOLUTION_REQUIRED`;
- unavailable authoritative source access becomes explicit minimum human input/authorization instead of fake machine acquisition;
- no RETURN, CONTRAST, closure or learning promotion without real evidence.

The designated production proof target remains the existing cycle `ce563b2a-3715-49ce-8806-1cc051f6ad71`.
