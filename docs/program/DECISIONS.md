# SFI PROGRAM DECISION LEDGER

**Contract:** `SFI-PROGRAM-DECISIONS-1.0`  
**Authority:** SFI-00 · CONTROL ROOM  
**Rule:** only decisions recorded here or in a superseding canonical contract are program decisions.

## D-001 — Repository state overrides chat state

**Status:** ACCEPTED  
**Decision:** GitHub/Supabase/CI/deployment evidence is the durable state. Chat context is disposable execution context.  
**Consequence:** any new SFI-00 or workstream session must reconstruct state from repository and current infrastructure before acting.

## D-002 — One integration authority

**Status:** ACCEPTED  
**Decision:** SFI-00 is the sole program integration authority. Workstreams may implement and open PRs but do not merge their own program PRs.  
**Reason:** prevent simultaneous semantic divergence and unsafe merge ordering.

## D-003 — Contract-first parallel development

**Status:** ACCEPTED  
**Decision:** shared schemas, event names, authority classes, namespaces and ownership rules are frozen before parallel implementation.  
**Consequence:** workstreams request contract deltas rather than silently forking.

## D-004 — Vertical slices, not reduced MVPs

**Status:** ACCEPTED  
**Decision:** sequencing is allowed; incompleteness disguised as an MVP is not. Each PR must completely implement its declared function, including QA and authority boundaries.  
**Forbidden:** mocks/fakes/placeholders presented as production capability.

## D-005 — SFI is domain-neutral

**Status:** ACCEPTED  
**Decision:** digital systems are the first high-instrumentation observation domain, not the institutional ontology.  
**Consequence:** system/source contracts must admit physical, organizational, social, cultural, economic, infrastructural, ecological and hybrid systems without weakening evidence standards.

## D-006 — Cognitive agents evolve into governed passports/capabilities

**Status:** ACCEPTED  
**Decision:** existing agent IDs remain historical/runtime-compatible identifiers, but strategic architecture treats them as governed cognitive functions/passports where appropriate.  
**Consequence:** no migration that erases historical agent lineage.

## D-007 — Runtime capability negotiation, not rigid pipeline

**Status:** ACCEPTED  
**Decision:** add `adaptive` execution semantics on top of existing `explicit` and `auto` selection. A capability may request another capability during execution.  
**Authority rule:** requester cannot self-authorize; the SFI broker admits/denies/defers.

## D-008 — Model is executor, not institution

**Status:** ACCEPTED  
**Decision:** model choice is per operation and provider-independent. Frontier models such as Astra are optional executors beneath SFI governance.  
**Consequence:** availability, price or capability of a model cannot redefine institutional authority or epistemic state.

## D-009 — Ephemeral authority

**Status:** ACCEPTED  
**Decision:** tool/resource authority granted to models/capabilities must be scoped, time-bounded and revocable.  
**Forbidden:** unrestricted service-role/database/shell/browser authority by default.

## D-010 — Twin state external to model context

**Status:** ACCEPTED  
**Decision:** Cognitive Twin state is externally persisted structured state/lineage, not merely long model context or provider memory.  
**Consequence:** model replacement does not replace Twin identity/history.

## D-011 — Learning is append-only

**Status:** ACCEPTED  
**Decision:** promoted/rejected learning preserves historical candidates. Substantive correction uses AMEND/SUPERSEDE semantics, not destructive rewrite.

## D-012 — Method Lab never upgrades simulation into observation

**Status:** ACCEPTED  
**Decision:** simulation, replay, reentry, counterfactual and model comparison remain explicitly experimental/derived until independent evidence changes epistemic state.

## D-013 — ROOT is sovereign operation; Observatory is separate

**Status:** ACCEPTED  
**Decision:** `/root` is the sovereign operational map/inbox. `/observatory` is the Observatorio de la Fricción Sistémica.  
**Consequence:** machine/public metadata must converge on this naming and no longer use ROOT as synonym for Observatory.

## D-014 — Human queue means actionable

**Status:** ACCEPTED  
**Decision:** an item can count in `NECESITA DE TI` only when SFI can explain the requested human decision and expose a legitimate transition or deep-link to the owning dossier.

## D-015 — Systemfriction.org owns canon

**Status:** ACCEPTED  
**Decision:** external platforms distribute, interpret, cite, index or execute canonical SFI objects; they do not become competing canonical sources.

## D-016 — External identity fingerprint

**Status:** ACCEPTED  
**Canonical:**

```text
System Friction Institute
SFI
https://systemfriction.org
https://systemfriction.org/#sfi
```

**Avoid as SFI name:** `Systemic Friction Institute`.  
**Rule:** external identity must not use `SFI` alone as sole disambiguator.

## D-017 — Discovery goal is unbranded reconstruction

**Status:** ACCEPTED  
**Decision:** primary discovery objective is not virality/followers. It is increasing the probability that humans, search systems, research graphs and agents find/reconstruct SFI from problem-space queries and independent nodes.

## D-018 — Discovery and execution are separate

**Status:** ACCEPTED  
**Decision:** public MCP/discovery surfaces remain read-only. Authenticated observe/propose/lab/execute operations remain governed by explicit scopes and existing authority owners.

## D-019 — Evidence Capsules are projections, not automatic publication of events

**Status:** ACCEPTED  
**Decision:** only events/objects that satisfy publicability, rights, privacy and epistemic requirements may receive public capsule URLs.

## D-020 — External accounts are observed, never fabricated

**Status:** ACCEPTED  
**Decision:** a planned LinkedIn/HF/Zenodo/etc. node remains `UNCLAIMED` until the platform actually confirms ownership.  
**Consequence:** no invented handles, ORCIDs, DOIs, ROR IDs or account URLs in canonical `sameAs`.

## D-021 — Research identifiers are earned/real

**Status:** ACCEPTED  
**Decision:** Zenodo/DOI for durable research/software/data objects; ORCID for real researchers; ROR only when institutional evidence is sufficient; Wikipedia not self-created for promotion.

## D-022 — Audio is material execution, not file warehousing

**Status:** ACCEPTED  
**Decision:** source/sample audio may live in authorized external storage or ephemeral execution workspace. SFI persists appropriate refs, hashes, rights, metrics, manifests and lineage rather than default raw audio bytes.

## D-023 — SFZ is the neutral canonical acoustic mapping

**Status:** ACCEPTED  
**Decision:** SFI Acoustic Instrument Package 1.0 uses WAV 48k/24-bit samples + SFZ mapping + manifest + optional IR + MIDI + SFI performance controls. Other engines are adapters.

## D-024 — Instrument Bank != Cultural Reference Bank

**Status:** ACCEPTED  
**Decision:** executable/licensed instrument assets and observed cultural/commercial reference works are separate owners and rights domains. A reference track is not a sample library.

## D-025 — Audio capabilities are capabilities, not eleven autonomous agents

**Status:** ACCEPTED  
**Reserved capability family:** observer, reference resolver, cultural vector, score planner, performance planner, instrument resolver, renderer, stem separator, mix/master, candidate evaluator, intersection forecaster.

## D-026 — Distribution is lineage-bearing

**Status:** ACCEPTED  
**Decision:** every real external representation should retain canonical object ID, platform, external URL, source/published hashes, relationship and publication timestamps when technically possible.

## D-027 — Workstream cells do not coordinate through copied chat history

**Status:** ACCEPTED  
**Decision:** cross-workstream handoff occurs through repository contracts, PRs and workstream state files.  
**Consequence:** no requirement to copy entire conversations between cells.

## D-028 — Production claims require RETURN

**Status:** ACCEPTED  
**Decision:** merged != deployed != production-observed. All three states must remain separate in status reporting.

## D-029 — Current control-room structure

**Status:** ACCEPTED

```text
SFI-00 CONTROL ROOM
WS-01 COGNITIVE FABRIC
WS-02 TWIN + METHOD LAB
WS-03 DISCOVERY MESH
WS-04 MACHINE INTERFACES
WS-05 RESEARCH GRAPH
WS-06 MATERIAL AUDIO
WS-07 EXTERNAL IDENTITY
WS-08 ASSURANCE + RELEASE
```

## D-030 — Contract delta procedure

**Status:** ACCEPTED  
**Decision:** any change to frozen cross-workstream semantics requires an explicit delta including limitation, proposed change, affected workstreams, migration/authority/epistemic impact, compatibility and rollback. SFI-00 records accepted changes here or in the Contract Lock.
