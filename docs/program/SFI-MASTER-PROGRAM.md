# SFI MASTER PROGRAM

**Program:** SFI Institutional Operating System Expansion 2026  
**Program authority:** SFI-00 · CONTROL ROOM  
**Repository:** `Aptymok/system-friction`  
**Initial program baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Status:** ACTIVE — CONTROL PLANE BOOTSTRAP  
**Rule:** repository state overrides conversational assumptions.

## 1. Program objective

Implement the current maximum coherent form of System Friction Institute without reducing SFI to a digital-only product, a collection of LLM agents, a content-marketing system, or an audio generator.

SFI is an institutional operating system for observing, reconstructing, reasoning about, intervening in, returning from, and learning across complex systems.

Digital sociotechnical systems are the first heavily instrumented observation domain because they are immediately observable and globally consequential. They are not the ontology of SFI.

The target system must support:

1. domain-neutral observation of complex systems;
2. evidence-governed cognition independent of model provider;
3. cognitive passports and adaptive capability negotiation;
4. externally persisted Cognitive Twin state and governed learning;
5. Method Lab reproducible experimentation;
6. ROOT as the sole sovereign interaction map;
7. Observatory as the institutional surface for systemic-friction observation;
8. Discovery Mesh as a distributed reconstruction system around one canonical entity;
9. public machine interfaces separated from authenticated execution;
10. research graph, DOI, researcher identity and future institutional identifiers;
11. material execution verticals, beginning with controlled audio production;
12. auditable RETURN and calibration after interventions or predictions.

## 2. Canonical architecture

```text
REAL WORLD
    │
    ├─ DIGITAL SYSTEMS
    ├─ PHYSICAL SYSTEMS
    ├─ ORGANIZATIONAL SYSTEMS
    ├─ SOCIAL / ECONOMIC / CULTURAL SYSTEMS
    └─ HYBRID SYSTEMS
    │
UNIVERSAL SIGNAL
    │
OBSERVATION / ACQUISITION
    │
EVIDENCE
    │
SFI COGNITIVE RUNTIME
    │
    ├─ COGNITIVE PASSPORTS
    ├─ CAPABILITY BROKER
    ├─ MODEL BROKER
    └─ GOVERNED TOOLS
    │
INFERENCE / SIMULATION / PROJECTION
    │
PREDICTION T0 / GOVERNED PROPOSAL
    │
ROOT / AUTHORITY
    │
EXECUTION
    │
REAL WORLD
    │
RETURN
    │
CONTRAST / CALIBRATION
    │
GOVERNED LEARNING
    │
COGNITIVE SPINE
    └──────────────↺
```

Around that core:

```text
SYSTEMFRICTION.ORG — CANONICAL ENTITY
        │
        ├─ HUMAN: LinkedIn / Medium / YouTube / Email / Press / Social
        ├─ RESEARCH: DOI / Zenodo / ORCID / ROR / Scholar / OpenAlex
        └─ MACHINE: GitHub / MCP / API / Hugging Face / Plugins / Crawlers
        │
EXTERNAL REFERENCES
        │
SEARCH / AI / HUMANS / AUTONOMOUS AGENTS
        │
        ↺ systemfriction.org
```

## 3. Constitutional invariants

These are not implementation preferences. CI must eventually enforce them.

- MODEL OUTPUT != OBSERVATION.
- SIMULATION != OBSERVATION.
- CONTEXT != EVIDENCE.
- SEARCH RESULT = SOURCE CANDIDATE until admitted.
- PREDICTION must preserve its T0 state.
- RETURN must originate in a real observation or authorized external source, not model restatement.
- COGNITIVE TWIN PROPOSAL != INSTITUTIONAL AUTHORIZATION.
- APPROVAL != EXECUTION unless the governing contract explicitly defines that transition.
- REPORT APPROVAL != TRUTH, PUBLICATION, EXECUTION, CLOSURE OR CANON.
- EXECUTION != SUCCESS.
- LEARNING != CANON by inheritance.
- MISSING remains MISSING until observed.
- NOT_OBSERVED remains NOT_OBSERVED.
- UNAVAILABLE != ZERO.
- AUTHORITY NEVER EXPANDS FROM MODEL CAPABILITY OR CONFIDENCE.
- PRIVATE STATE NEVER BECOMES PUBLIC DISCOVERY MATERIAL BY INHERITANCE.
- EXTERNAL REPRESENTATION NEVER BECOMES CANON.
- SUBSTANTIVE CORRECTION IS APPEND-ONLY: AMEND / SUPERSEDE, never silent historical rewrite.
- DISCOVERY != EXECUTION.
- INSTRUMENT BANK != CULTURAL REFERENCE BANK.
- RAW MATERIAL SHOULD NOT BE PERSISTED MERELY BECAUSE A MODEL PROCESSED IT.
- ONE INTERACTIVE NEED -> ONE AUTHORITATIVE READ PER DATA DOMAIN.

## 4. Program workstreams

| ID | Workstream | Owner surface | Primary outcome |
|---|---|---|---|
| WS-01 | Cognitive Fabric | cognitive runtime | model-independent adaptive execution fabric |
| WS-02 | Twin + Method Lab | Twin / Method Lab | governed learning + reproducible experiment engine |
| WS-03 | Discovery Mesh | public semantic/discovery plane | canonical objects + distributed reconstruction |
| WS-04 | Machine Interfaces | MCP / external gateway | public discovery MCP + authenticated execution adapters |
| WS-05 | Research Graph | research metadata | citation/DOI/ORCID/ROR readiness graph |
| WS-06 | Material Audio | Studio / material execution | instrument registry + controlled audio render loop |
| WS-07 | External Identity | external platforms | entity reservation and identity coherence |
| WS-08 | Assurance + Release | CI / production verification | adversarial QA and release verification |

SFI-00 is not a ninth implementation workstream. It is integration authority.

## 5. Development model

### 5.1 Single integration authority

Only SFI-00 may authorize merge order for this program after required gates are green.

Implementation workstreams may create branches, commits and pull requests. They must not merge their own program PRs.

### 5.2 Shared state

Chats are disposable execution contexts.

Durable program state is:

- GitHub `main`;
- branch / PR state;
- this `/docs/program` control plane;
- Supabase persisted state and migrations;
- CI results;
- production deployment receipts.

No workstream may rely on an undocumented decision that exists only in chat history.

### 5.3 Vertical slices, not MVP placeholders

A workstream may sequence implementation into PRs, but each PR must finish its declared function completely.

Prohibited:

- fake adapters;
- mocks presented as production capability;
- empty registries created only to reserve architecture;
- TODO-based contractual incompleteness;
- placeholder success responses;
- fabricated external account URLs or identifiers;
- direct-SQL authority shortcuts;
- schema duplication because an existing owner was not inspected.

### 5.4 Contract-first parallelism

Shared types, event names, authority classes, table ownership and route namespaces are frozen in `SFI-CONTRACT-LOCK.md` before implementation cells independently expand them.

A workstream needing to change a frozen shared contract must record a proposed contract delta in its PR and set the workstream state to `WAITING_CONTRACT_DECISION`. It must not silently fork the contract.

## 6. Program phases

Phases establish dependency order, not reduced scope.

### Phase A — Baseline closure

- merge PR #363 after green gates;
- confirm canonical production deployment;
- verify ROOT sovereign inbox, reports, Library, Twin Learning, Method Lab/Observatory navigation;
- verify no false-zero public observations;
- verify #362 zero-duplicate interactive read-plane under real navigation.

### Phase B — Contract lock

Freeze:

- domain-neutral observed-system contract;
- observation-source classes;
- cognitive passport schema;
- capability request / admission schema;
- authority classes and ephemeral grant schema;
- dynamic task graph node/edge taxonomy;
- operation-level model requirement schema;
- canonical public object schema;
- Discovery Mesh node/representation schemas;
- material asset/instrument rights boundary;
- event taxonomy;
- database ownership map.

### Phase C — Parallel implementation wave 1

Start simultaneously after Contract Lock:

- WS-01 Cognitive Fabric;
- WS-03 Discovery Mesh;
- WS-05 Research Graph;
- WS-07 External Identity;
- WS-08 Assurance + Release.

WS-02 and WS-06 may begin read-only inspection and implementation inside owned directories as soon as their consumed contracts are frozen.

### Phase D — Parallel implementation wave 2

- WS-02 Twin + Method Lab consumes passports/runtime;
- WS-04 Machine Interfaces consumes public semantic objects + cognitive capability contracts;
- WS-06 Material Audio consumes runtime passports + material rights contracts.

### Phase E — External publication

Only after corresponding internal contracts are stable:

- public MCP and official registry submission;
- ChatGPT/Codex plugin preparation/submission;
- Hugging Face organization/spaces;
- Zenodo GitHub integration;
- LinkedIn/Medium/YouTube/Bluesky/Mastodon/email identity graph;
- Postman public API documentation when API surface is stable.

### Phase F — Program RETURN

Observe 30/60/90/180-day outcomes for Discovery Mesh and continuous operational outcomes for runtime, Method Lab and material execution.

## 7. Definition of program completion

The program is not complete when pages or schemas merely exist.

It is complete only when the repository and production system demonstrate:

1. a systemic question can enter through a domain-neutral signal contract;
2. MetaOrchestrator can choose a minimum initial capability set;
3. an executing capability can request another capability at runtime;
4. SFI, not the requesting model, admits/denies/defers the request;
5. the minimum sufficient model is selected per operation;
6. adding/removing a frontier model does not require architecture redesign;
7. model output cannot become observation by inheritance;
8. Twin state remains external to model context;
9. Method Lab can reproduce and compare experiments without contaminating observation;
10. ROOT exposes only actionable human obligations as required decisions;
11. every consequential action preserves authority lineage;
12. predictions have an explicit RETURN path;
13. learning is promoted/rejected/superseded without destructive history rewrite;
14. a canonical public object is published once and projected into machine/search/distribution representations;
15. external nodes point to the same canonical identity;
16. an autonomous client can discover SFI through a read-only public MCP without receiving execution authority;
17. an authenticated client can use only explicitly granted scopes;
18. a researcher can reconstruct outputs through metadata/DOI/author identity;
19. a human or search/AI system can discover SFI through unbranded problem-space queries;
20. Discovery Mesh performance is measured with UDR/EIC/IRD/ACR/ECR/MPD/ERR;
21. a non-digital observed system can enter the same observation kernel;
22. material audio can execute in an ephemeral workspace while SFI persists only appropriate references, hashes, metrics and lineage;
23. Instrument Bank and Cultural Reference Bank remain legally and methodologically separate;
24. CI enforces these invariants and production RETURN verifies them.

## 8. Program evidence standard

A workstream may state `IMPLEMENTED` only with repository evidence.

A workstream may state `PASS` only with executed QA evidence.

A workstream may state `DEPLOYED` only with deployment evidence for the merged SHA.

A workstream may state `OBSERVED IN PRODUCTION` only after an actual production observation.

`planned`, `designed`, `implemented`, `merged`, `deployed`, and `observed` are distinct states.

## 9. Human decision boundary

The human operator should be asked only for:

- constitutional/institutional behavior choices;
- external account ownership / platform acceptance;
- legal/rights claims that cannot be inferred;
- irreversible external publication where policy requires explicit approval;
- authority grants that cannot be delegated under existing policy.

Implementation details, QA, refactoring, migration preparation, documentation synchronization and dependency reconstruction are not automatically human decisions.

## 10. Required session behavior

Every SFI-00 or workstream session begins by reading its workstream file and fresh repository/PR state.

Every session ends by updating durable state before claiming completion.

The absence of an update is treated as `UNKNOWN`, not as successful continuation.
