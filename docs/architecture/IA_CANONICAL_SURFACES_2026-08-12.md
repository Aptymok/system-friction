# SFI · Canonical Information Architecture · 2026-08-12

Status: implementation decision for consolidation branch.

## Rule

SFI does not create a new surface when an existing implementation can be kept or absorbed. Git history is the archive; dead application code is deleted rather than quarantined.

## Five operational surfaces

### `/root` — Authority and institutional work queue
Purpose: review what changed, inspect agent mandate/execution, resolve governed proposals and decisions, and read the institutional logbook.

Owned capabilities: governance, agents, Cognitive Twin decision candidates, audit/logbook, bounded sovereign actions.

Not owned: the end-to-end case pipeline, public observatory, Field execution, laboratory simulation, Studio specialist analysis.

### `/pipeline` — End-to-end institutional cycle
Purpose: run one traceable cycle from object and evidence through method selection, laboratory, optional Studio analysis, Field return, contrast, Cognitive Twin learning and ROOT closure.

Studio is optional specialist analysis, not a dependency of the institutional core.

### `/field` — Observed intervention and return
Purpose: run governed MOP-H / Field cases against reality, preserve evidence, intervention identity, return window, observed return and contrast.

`/field` is not a separate product or role surface. Its useful capture constraints are absorbed into Field; the static scaffold is deleted.

### `/method-lab` — Controlled experimentation
Purpose: execute simulations, CRL, CHRONOS, Cognitive Twin reentry and bounded sociotechnical/economic tests without converting simulation into observation.

The existing Apex sociotechnical pilot belongs here. It is not a separate laboratory or namespace. Cognitive Twin experiments extend the existing Cognitive Twin/Method Lab contracts rather than creating `ct-specs` or `ecosystems` applications.

### `/observatory` — Longitudinal published observation
Purpose: expose publicable world state, phenomena and trajectories without leaking private cases or turning inference into observation.

Target layers: current state, phenomena, trajectories, attractor/regime reading and weak-signal promotion when evidence supports it.

## Supporting surfaces

### `/studio`
Specialist analysis workspace. It may participate in a pipeline cycle, but the core institutional cycle must not depend on it.

### `/library`
Durable documentary corpus and publication surface. It is not an execution engine.

## Capabilities that are not independent apps

- AMV: internal orchestration/memory capability consumed by ROOT, Method Lab and the pipeline.
- World Vector / WorldSpect: observational context owned by Observatory and consumed elsewhere with provenance.
- ScoreFriction: instrument/product capability. It does not justify another ROOT dashboard merely because it has components.
- Cognitive Twin: institutional memory/deliberation organ spanning ROOT, pipeline and Method Lab. Model providers are replaceable substrates, not the Twin.
- Atlas: longitudinal reference function. Private operational views belong inside ROOT; public longitudinal representation belongs in Observatory. No third parallel Atlas implementation.

## Immediate destination decisions

| Existing object | Decision | Reason |
|---|---|---|
| `/pipeline` | DELETE after `/pipeline` promotion | duplicate wrapper |
| `/pipeline` | DELETE after `/pipeline` promotion | duplicate wrapper |
| `/root` | DELETE after ROOT absorbs sovereign console | redundant technical entry |
| `/root/method-lab` | DELETE after `/method-lab` promotion | location duplication |
| `/root/method-lab/crl` | DELETE | redirect-only alias; CRL is embedded in Method Lab |
| `/field` | DELETE | static Phase-01 scaffold; no persistence/execution |
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
3. Evidence, inference, decision and canon remain distinct.
4. A route exists only when it represents a distinct user task or external contract.
5. A database object exists only when an active capability owns it, or when preserved history has an explicit read path.
6. No quarantine directory is used as a permanent destination.
7. Build/typecheck and route/API/data audits must pass after each destructive consolidation wave.
