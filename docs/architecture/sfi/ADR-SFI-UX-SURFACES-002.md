# ADR-SFI-UX-SURFACES-002 · Human surfaces and continuous cinematic interaction

**Status:** ACCEPTED / IMPLEMENTED  
**Parent:** `SFI-ARCHITECTURE-1.0`  

## Decision

System Friction Institute (SFI) uses one coherent cinematic visual grammar across its human state surfaces without collapsing their authority, purpose, data boundary, or epistemic role.

```text
PUBLIC INSTITUTIONAL ENTRY
PUBLIC OBSERVATION
MEMBER / CASE PLATFORM
FIELD
STUDIO
ENTITY / ATLAS / LEDGER
MIHM / FRICTION / WORLD VECTOR
METHOD LAB
PIPELINE
ROOT
PUBLIC MOPS
```

These surfaces may consume shared contracts and data, but they are not interchangeable applications.

```text
STUDIO ≠ FIELD ≠ CASE ASSURANCE ≠ METHOD LAB ≠ ROOT
PUBLIC OBSERVATION ≠ PRIVATE STATE
READ SURFACE ≠ CANONICAL WRITE
```

Ordinary editorial/legal/static pages such as contact, privacy, manifest documents, publication text, or policy prose do not become faux systems dashboards merely for visual uniformity. They retain their appropriate editorial interaction model while sharing the same institutional typography/palette where useful.

## Single public institutional entry

`ONE PUBLIC INSTITUTIONAL ENTRY` is a repository-level UX constraint.

```text
/      = canonical public institutional entry
/sfi   = compatibility alias → /
```

The repository must not expose two independent full-screen experiences that both present themselves as the primary System Friction Institute site. Operational views remain organs of the institute and are routed explicitly as Observatory, Field, Studio, ROOT, Atlas, Ledger, MIHM, Friction, Method Lab, or other bounded surfaces.

A cinematic grammar may be shared across those organs. Shared visual grammar does not make them additional SFI homepages.

## Implemented operational surface inventory

The current human state surfaces are classified as follows:

| Surface | Scope | Primary data/read boundary | Authority |
|---|---|---|---|
| `/` | Public | canonical institutional entry / public attractor | navigation + read only |
| `/sfi` | Compatibility alias | redirects to `/`; no independent surface | none |
| `/observatory` | Public | governed publishable observatory state + provenance | read only |
| `/e/[artifactId]` | Public | public + verified artifact identity / manifestations | read only |
| `/member` | Private member | membership + real workspace counts/access | navigation only |
| `/cases`, `/cases/[caseId]` | Private tenant | Case Platform + Assurance read models | tenant-scoped governed action |
| `/field` | Private operational | persisted cases, observation, intervention/return | FIELD boundary |
| `/studio` | Private analytical | persisted objects, features, evidence, Cognitive Spine context | analyze/propose, no canon write |
| `/entity/[id]` | Private institutional | ontology-resolved entity context | read only |
| `/atlas` | Institutional | canonical relation/temporal memory read | read only |
| `/ledger` | Institutional | evidence/projection/memory ledger | read only |
| `/mihm` | Institutional | current MIHM institutional read | read only |
| `/friction` | Institutional | current friction-field read | read only |
| `/world-vector` | Context | current World Vector snapshot/status | read only |
| `/moph` | Session boundary | no synthetic institutional value; session/object scoped | fail closed outside session |
| `/pipeline` | ROOT-observer scope | institutional operating field + cycle analysis | governed boundary |
| `/method-lab` | ROOT-observer scope | real experiment registry/runtime; outputs SIMULATED | laboratory only |
| `/root` | Private sovereign | ROOT sovereign state + Cognitive Spine status | institutional governance |
| `/library` | Public/static | canonical artifact/document manifest | document access only |

A visual family is therefore shared; authority is not.

## Continuous interaction

The preferred interaction pattern is a continuous workspace rather than repeated navigation between dashboards. A surface preserves context while focus changes.

```text
SCOPE × TIME × SERVICE PROFILE
          ↓
      ACTIVE FIELD
          ↓
EVIDENCE / MIHM / FRICTION / TRAJECTORY / RETURN
```

A service profile changes the active representation, not the institutional ontology.

- System Observatory → system topology + temporal friction.
- AI Implementation Diagnostic → execution chain.
- AI Adoption & Integration → process × use-case field.
- AI Governance Assurance → reconstructible decision chain.
- Service Observability → ticket/service/asset/supplier field.
- Contract & Warranty Assurance → contract/obligation/asset/event/return chain.
- Tender Assurance → requirement × bidder matrix.
- Enterprise Memory → longitudinal continuity field.

Missing values remain missing. A visual layout may position real entities for navigation; visual geometry does not create a semantic relationship or measured magnitude.

## Fail-closed rendering

A cinematic composition may be dense, animated, relational and spatially expressive, but it must never use visual completeness as a substitute for data completeness.

```text
NO VALUE      → NO_VALUE / MISSING
NO INPUT      → BLOCKED / REQUIRES_DECLARATION
NO FIELD DATA → REQUIRES_FIELD_EVIDENCE
NO MODEL      → CAPABILITY_MISSING
NO AUTHORITY  → READ ONLY / GOVERNANCE REQUIRED
```

Two previously demonstrative production routes were corrected under this decision:

- World Vector no longer fabricates `W_10` from hard-coded sample constants.
- MOP-H no longer fabricates `Ψ_MOP-H` from hard-coded sample constants outside a bound session/object input envelope.

The same rule applies to every future panel.

## Studio

Studio remains the SFI analysis surface.

```text
OBSERVE
→ STRUCTURE
→ RELATE
→ MIHM
→ FRICTION
→ TRAJECTORY
→ HYPOTHESIS
→ CANDIDATE INTERVENTION
```

Studio uses a continuous cinematic workspace without a permanent left sidebar. It retains real ingestion, object persistence, evidence/lineage, temporal history, MIHM, cognitive execution, simulation gating and return context.

It explicitly forbids decorative semantic substitutions. In particular:

- arbitrary metric-array position is not a friction dimension;
- audio tempo is not systemic trajectory velocity;
- stereo width is not an unrelated MIHM variable;
- a missing dimension/exchange/regime remains missing.

Studio may request a Method Lab run. Studio does not become Method Lab and does not acquire approval authority.

## Method Lab

Method Lab remains the isolated experimental context defined by the canonical Method Lab contract.

```text
STUDIO HYPOTHESIS
      ↓
TEST REQUEST
      ↓
METHOD LAB
      ↓
SIMULATED RESULT
      ↓
STUDIO INTERPRETATION
```

`SIMULATED ≠ OBSERVED`.

The laboratory can share the cinematic grammar while preserving simulated status and its prohibition on direct canonical mutation.

## Multiscale observation

The shared observation grammar is:

```text
SCOPE × TIME × SERVICE PROFILE × OBSERVABLE CONTRACT
```

A subject may be an artifact, person, process, organization, system, institution, or external field. The same epistemic distinctions can travel across scales, but one aggregation function is not assumed to be valid at every scale.

```text
SAME VARIABLE SPACE ≠ SAME AGGREGATION FUNCTION
LOCAL STATE ≠ INSTITUTIONAL STATE BY INHERITANCE
```

## Artifact identity and external manifestations

An observed/persisted artifact may have a stable SFI Artifact ID. The stable identity is independent of any particular hash algorithm.

```text
ARTIFACT ID
├── exact hash
├── perceptual fingerprint
├── lineage root
├── analysis snapshot
├── MIHM snapshot
└── external manifestations
```

A manifestation may be a website, repository, social publication, routing surface, derivative, or other externally observable occurrence. Platform URLs are not automatically verified object identity. They begin as declared manifestations and are promoted only by evidence.

A public MOPS Evidence Certificate is available only for an artifact explicitly marked `PUBLIC` and `VERIFIED`.

## External observation

External platform metrics are observations/records when directly obtained. Derived propagation measures remain derived. Cultural interpretation remains inferred. Future movement remains projected.

```text
PLATFORM METRIC ≠ CULTURAL IMPACT
CORRELATION ≠ CAUSAL RETURN
TRANSIENT CHANGE ≠ REGIME CHANGE
```

Longitudinal manifestation snapshots preserve observations rather than overwriting them.

## Epistemic visual grammar

The canonical surface encodes epistemic class visually:

- `OBSERVED` → cyan/aqua
- `DERIVED` → amber
- `INFERRED` → magenta/violet
- `PROJECTED` → violet
- `SIMULATED` → violet with explicit laboratory status
- `MISSING` / `CONTRADICTED` → controlled red
- `GOVERNED` → cool white / governed neutral

Color is a reading aid, not authority.

## Authority

```text
CLIENT / OPERATOR
  → supplies and follows case records

SFI ANALYST / STUDIO
  → analyzes and proposes

METHOD LAB
  → tests and simulates

OWNER / ADMIN APPROVER
  → approves operational case actions

FIELD / ACTION ADAPTER
  → performs approved real intervention

ROOT
  → governs institutional admission and canon
```

No commercial or visual surface changes the constitutional prohibitions:

```text
CLIENT → ROOT                  FORBIDDEN
COMMERCIAL RESULT → TRUTH      FORBIDDEN
AI OUTPUT = EVIDENCE           FORBIDDEN
SIMULATION = OBSERVATION       FORBIDDEN
REPORT = EXECUTION AUTHORITY   FORBIDDEN
VISUAL COMPLETENESS = DATA     FORBIDDEN
```

## Result

The previously designed cinematic views are not disposable mockups. Their visual language is the canonical human-surface grammar. Each implementation must bind that grammar to the real read model of the surface, or explicitly display the absence/blocking state. Specialized consoles may preserve distinct interaction mechanics where their authority demands it, but they remain recognizably part of the same SFI system.

The public institutional identity has one canonical entry at `/`. Every other route is an organ, instrument, bounded workspace, archive, or compatibility alias—not a second SFI website.
