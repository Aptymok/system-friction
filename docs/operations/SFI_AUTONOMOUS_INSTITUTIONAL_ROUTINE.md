# SFI autonomous institutional routine

Status: design constraint for bounded implementation.

SFI already has the required execution substrate: WorldSignalObserverAgent, World Observatory hypothesis/calibration cycles, ROOT observation/report agents, continuity auto-advance, Studio autonomy, governed execution, Universal Cycle continuation and Predictive Engine reconciliation. This routine therefore coordinates existing capabilities; it does not create a second swarm.

## Routine lanes

1. World observation remains the source-acquisition lane.
2. Hypothesis cycle remains the falsifiable hypothesis lane.
3. Signal Vane performs bounded threshold/early-warning reading over supplied context.
4. Cluster Atlas performs bounded clustering/phenomenon/regime-shift reading over supplied context.
5. Predictive Engine remains the persisted prediction, evidence request, outcome and calibration lane.
6. Continuity runtime remains the owner of operational continuation and founder-away execution inside existing authority.
7. Notas Temporales monthly routine composes the accumulated state into one governed publication candidate.

## Non-interruption rule

Routine observation, bounded inference, evidence requests that can be acquired automatically, prediction reconciliation, internal analysis, report preparation, RETURN/calibration and publication-candidate preparation should continue without asking the founder. Human interruption is reserved for a real missing fact that cannot be acquired, a sovereign authority boundary, material irreversible external action, canonical constitutional change or an explicit governance exception.

## Anti-duplication rule

No micro-agent may be introduced merely to give a pre-existing capability another name. A new agent is justified only when it owns a distinct observable contract that cannot be absorbed by the World Observatory, AMV instruments, Predictive Engine, continuity runtime or existing report agents.

## P0: Complete institutional cycle — convergence contract (2026-10-17)

The autonomous unit is **SFI as an institution**, not Reality Chain alone. One durable correlation identity (`cycleId`, with related `caseId` and source/object IDs) must connect the existing owners:

`SOURCES/OBSERVATORY → WORLD/SIGNALS → EVIDENCE/PROVENANCE → HYPOTHESES/RIVALS → METHOD LAB/MIHM/EXPERIMENT → COGNITIVE SPINE/TWIN → GOVERNED DECISION & BOUNDED EXECUTION → EMPIRICAL RETURN → CONTRAST/REALITY CHAIN/PASSPORT → REPOSITORY → LEARNING QUARANTINE → NEXT OBSERVATION`.

- **Autonomous by default:** the existing continuity scheduler/operational auto-advance may initiate and continue routine investigation, evidence acquisition, inference, approved small experiments, already-authorized bounded execution, genuine RETURN reconciliation, ordinary closure and creation of learning candidates. Do not add founder clicks between these steps. Missing evidence becomes a durable acquisition request with an observable next action.
- **Narrow sovereign gates:** only `INSTITUTIONAL_CHANGE`, `CAPABILITY_IMPLEMENTATION` (addition/material change), and `LEARNING_PROMOTION` require a new ROOT decision. Existing privacy, financial, third-party consent, legal/authorization and material-effect boundaries still apply; these do not disappear under autonomy.
- **ONE owner per stage:** use existing runtime/agents/graph/ledger, not a second orchestrator, graph, publisher, clock or memory. Correlate immutable receipts using the same cycle ID. Each stage exposes source, epistemic class, input/output refs, agent/provider, model if any, budget, authority, timestamps, result, idempotency key and recovery cursor.
- **Failure/recovery is a state, not a founder task:** if an authorized source is unavailable, or the data plane is in `RECOVERY` and requires primary writes, record `BLOCKED`/`DEFERRED_PRIMARY_WRITE_REQUIRED` and preserve pending work. Do not bypass primary-write, data-integrity, cost or authority guards simply to report autonomous success. A pending RETURN is not a completed RETURN.
- **Learning return:** contrast a real T1 observation against T0/rivals; preserve old observations. A calibrated candidate may enter quarantine without a ROOT click. Canonical promotion remains a sovereign decision. A completed cycle feeds the next observation with lineage, without rewriting history.
- **Public projections:** Repository/Observatory/Reality Chain/ROOT/World Vector and Studio read the same underlying events and provenance. No instrument may fabricate a complete cycle from independent UI counters.

### Current implementation fact vs acceptance

Main contains `runIntegratedInstitutionalCycle`, `continuity-heartbeat`, `runUniversalCycleContinuation`, `runOperationalAutoAdvance`, and independent scheduled owners in `vercel.json`. They do **not** yet constitute a proven single cross-instrument persisted cycle. Institutional cron and continuity heartbeat currently run as separate scheduled paths. Neon data plane was still `RECOVERY` (2026-10-17) with deferred effectful tasks. Thus autonomy is an accepted operating policy with a **not-yet-certified end-to-end proof**, not an already completed release.

### Acceptance test / safe release order

1. Inventory one canonical owner/event vocabulary for every stage; document the same `cycleId` and the exact handoff contract, no new subsystem.
2. Select one bounded **real** non-destructive case. Persist T0 and source provenance, perform autonomous internal work and already-authorized execution, obtain genuine T1 (or transparently mark unavailable), contrast, record RETURN and close only when criteria hold.
3. Confirm no `AWAITING_USER_CLOSE`, manual report approval, synthetic evidence, or routine ROOT click is required. Assert exception requests for the three sovereign classes and for independent consent/cost boundaries.
4. Confirm retries are bounded/idempotent; clocked loops may resume after process interruption; Observatory/ROOT/Repository/Reality Chain agree on the same receipts; prove a new observation/re-entry event.
5. During `RECOVERY`, test read-only progress/deferred lanes without primary writes. Certify data-plane integrity before enabling withheld effects. Verify expected cost, provider health, safety and runtime RETURN before one controlled production release.

**Do not mark this milestone complete merely because CI passed or individual components exist.**
