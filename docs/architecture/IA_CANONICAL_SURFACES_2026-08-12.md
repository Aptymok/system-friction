# SFI · Canonical Information Architecture · 2026-08-12

Status: ACTIVE implementation decision and development preflight.

## Rule

SFI does not create a new surface when an existing implementation can be kept or absorbed. Git history is the archive; dead application code is deleted rather than quarantined.

Before modifying code, every human or agent must observe the current repository, the active contracts, the live persistence surface when relevant, and the governance state of the requested change. Development starts from the existing structure; it does not start from a blank architectural hypothesis.

## Mandatory development preflight

Every implementation must be able to answer, before creating files or writers:

1. **Owner** — Which canonical surface or supporting surface owns this capability?
2. **Existing capability** — What existing module, route, contract, reader, writer, agent capability or database object already serves part or all of this need?
3. **Absorb vs create** — Why can the change not be absorbed into that existing implementation? If it can be absorbed, no parallel file or subsystem is created.
4. **Single writer** — Which existing writer is authoritative for the institutional object being mutated? A UI, lens, agent or scheduler may not create a second writer merely for convenience.
5. **Persistence** — What is preserved before interpretation, and where are identity, provenance, epistemic class, time, lineage and authorization recorded?
6. **Front / back / DB delta** — What changes in frontend, backend and database respectively? `NONE` is a valid and preferred answer when no new layer is required.
7. **Replacement** — If a capability is absorbed or replaced, which redundant runtime file, route, component or writer is removed in the same change? Temporary coexistence requires an explicit external-contract reason and removal condition.
8. **Execution boundary** — What may execute automatically, what requires governed authorization, what RETURN/evidence is expected, and what remains ROOT-only?
9. **Rollback** — How is the change reversed without erasing evidence or history?
10. **Verification** — Which canonical architecture audit, domain boundary, typecheck, build and capability-specific tests prove the change did not fragment SFI?

If these questions cannot be answered, the change is not ready to be implemented.

## Reuse-before-build invariant

The required order for development is:

`observe existing structure → preserve relevant state → identify owner → reuse/absorb → extend only if necessary → test reversibly → record RETURN → remove redundancy → merge`

A new backend module, frontend component, API route, database object, registry, scheduler, agent or surface is a last resort, not a default implementation technique.

A file is justified only when it owns a responsibility that cannot be represented coherently by an existing owner. File count is not progress.

## Five operational surfaces

### `/root` — Authority and institutional work queue
Purpose: review what changed, inspect agent mandate/execution, resolve governed proposals and decisions, and read the institutional logbook.

Owned capabilities: governance, agents, Cognitive Twin decision candidates, audit/logbook, bounded sovereign actions.

Not owned: the end-to-end case pipeline, public observatory, Field execution, laboratory simulation, Studio specialist analysis.

ROOT is an observability and authority surface, not a recurring manual transition operator. Routine routing, assignment, execution, calibration and retry may proceed automatically when an already-governed contract permits it. Human intervention is reserved for explicit authority boundaries, sensitive mutation, scope expansion, external/irreversible action, publication, conflict resolution and canon promotion.

### `/pipeline` — End-to-end institutional cycle
Purpose: run one traceable cycle from object and evidence through method selection, laboratory, optional Studio analysis, Field return, contrast, Cognitive Twin learning and ROOT closure.

Studio is optional specialist analysis, not a dependency of the institutional core.

### `/field` — Observed intervention and return
Purpose: run governed MOP-H / Field cases against reality, preserve evidence, intervention identity, return window, observed return and contrast.

`/field` is not a separate product or role surface. Its useful capture constraints are absorbed into Field; static or duplicate scaffolds are removed.

### `/method-lab` — Controlled experimentation
Purpose: execute simulations, CRL, CHRONOS, Cognitive Twin reentry and bounded sociotechnical/economic tests without converting simulation into observation.

The existing Apex sociotechnical pilot belongs here. It is not a separate laboratory or namespace. Cognitive Twin experiments extend the existing Cognitive Twin/Method Lab contracts rather than creating `ct-specs` or `ecosystems` applications.

### `/observatory` — Longitudinal published observation
Purpose: expose publicable world state, phenomena and trajectories without leaking private cases or turning inference into observation.

Target layers: current state, phenomena, trajectories, attractor/regime reading and weak-signal promotion when evidence supports it.

The human posture is primarily observational: one place should make current state, change, blocked work, execution, RETURN, calibration and required decisions legible without requiring navigation through implementation modules.

## Supporting surfaces

### `/studio`
Specialist analysis workspace. It may participate in a pipeline cycle, but the core institutional cycle must not depend on it.

### `/library`
Durable documentary corpus and publication surface. It is not an execution engine.

## Visual lenses are not surfaces

The routes represented by the dynamic SFI scene system — including `systems`, `archive`, `falsification`, `optionality`, `governance`, `authority`, `agents`, `identity`, `models` and `genai` — are **visual/semantic lenses over canonical read contracts**. They are not independent bounded contexts.

A lens may:

- select and annotate an authorized read model;
- change visual emphasis or navigation;
- expose a focused question about the same institutional state.

A lens may not:

- own a private database table merely because it has a route name;
- introduce a parallel writer;
- create a duplicate agent registry, memory, ontology or state machine;
- become an independent operational application without a new explicit architectural decision.

If a lens needs new durable state, the state must be owned by one of the canonical surfaces/capabilities and then projected into the lens.

## Capabilities that are not independent apps

- AMV: internal orchestration/memory capability consumed by ROOT, Method Lab and the pipeline.
- World Vector / WorldSpect: observational context owned by Observatory and consumed elsewhere with provenance.
- ScoreFriction: instrument/product capability. It does not justify another ROOT dashboard merely because it has components.
- Cognitive Twin: the versioned developmental/decision-learning representation (including CT-A01 and its reentry/Decision Transfer contracts). It is not a surface and it does not inherit truth or canon authority.
- Cognitive Spine: the already-existing institutional reconstruction/projection/integration layer under `src/core/cognitive-spine`. It materializes sealed, profile-bounded snapshots and carries allowed context across Runtime, Studio, ROOT, Field, Method Lab, Decision Transfer, WorldSpect, Atlas and Library. It may expose bounded Twin memory/decision context through explicit adapters, but it does not turn context into evidence, does not grant truth authority and is not a second Twin implementation.
- Atlas: longitudinal reference function. Private operational views belong inside ROOT; public longitudinal representation belongs in Observatory. No third parallel Atlas implementation.

`Cognitive Spine` is the correct name for the transversal operational anatomy. A visual anatomy may expose CT-A01 as a developmental organ inside that anatomy, but visualization must reuse the existing Spine contracts/status rather than create a parallel `Spine` or `Twin` backend.

## Agentic operating model

SFI is designed to minimize human mechanical intervention.

The intended cycle is:

`observe → diagnose → propose when authority is needed → authorize → route → assign → execute → RETURN → calibrate → learn → request canon/close only when appropriate`

Agents may observe, diagnose, decompose, route, execute bounded capabilities, retry reversible operations, generate remediation requests and return evidence under declared authority.

ROOT defines and observes authority. ROOT should not be required to click through intermediate states that carry no new decision.

Cognitive Spine may transport a sealed institutional context and Cognitive Twin may learn or deliberate only through lineage-preserving records under their declared epistemic boundaries. Context transport, learning, functional execution, validation, truth and canon remain distinct states.

## Agent development entrypoint

`/AGENTS.md` is the single repository-level machine/developer entrypoint. It must point agents to this architecture decision and the canonical audit before code changes. It does not duplicate this document; it is an instruction pointer and preflight checklist.

The previous misplaced `.github/workflows/copilot_instructions.md` is not an architecture owner and must not remain as a second source of development policy.

## Immediate destination decisions

| Existing object | Decision | Reason |
|---|---|---|
| duplicate pipeline wrappers | DELETE after canonical `/pipeline` promotion | duplicate wrapper |
| redundant technical ROOT entries | ABSORB into `/root` | ROOT owns sovereign observability/work queue |
| `/root/method-lab` aliases | DELETE after `/method-lab` promotion | location duplication |
| `/root/method-lab/crl` | DELETE | redirect-only alias; CRL is embedded in Method Lab |
| static Field scaffolds without persistence/execution | DELETE | no distinct runtime responsibility |
| `AcpAttractorFieldView` | DELETE | unconsumed parallel attractor visualization |
| `AcpFieldRegimeView` | DELETE | unconsumed parallel regime visualization |
| `RootLogbookConsole` | DELETE | static explanatory component, not a logbook |
| `LogbookSelectorPanel` | ABSORB into `src/components/root/logbook` | reads actual persisted logbook entries |
| `AttractorFieldConsole` | KEEP pending absorption | contains unique sovereign attractor/experiment controls |
| `DynamicAttractorField` | KEEP pending Atlas merge | provides persisted longitudinal AMV view |
| Apex pilot contract | KEEP / expose in Method Lab | existing bounded pilot contract, not a new app |

## Non-negotiable boundaries

1. Simulation never becomes observation by persistence alone.
2. Missing data stays missing.
3. Evidence, inference, decision, execution, RETURN, learning and canon remain distinct.
4. A route exists only when it represents a distinct user task, visual lens or external contract; a lens is not automatically a bounded context.
5. A database object exists only when an active capability owns it, or when preserved history has an explicit read path.
6. No quarantine directory is used as a permanent destination.
7. No duplicate runtime implementation remains after its function is absorbed, except a time-bounded compatibility contract with an explicit removal condition.
8. One institutional object has one authoritative mutation path. Read projections may be many; writers may not proliferate by surface.
9. New files must belong to an existing declared owner. Unowned files are architecture failures.
10. Build, typecheck, canonical architecture, route/API/data and capability-specific audits must pass before merge.
