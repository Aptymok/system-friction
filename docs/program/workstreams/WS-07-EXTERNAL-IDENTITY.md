# WS-07 · EXTERNAL IDENTITY

**Mission:** establish and verify the external institutional identity graph of System Friction Institute across professional, research, developer and open-web platforms without fabricating ownership, identifiers or activity.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Canonical fingerprint

```text
Name: System Friction Institute
Abbreviation: SFI
Domain: https://systemfriction.org
Entity ID: https://systemfriction.org/#sfi
Preferred handle: systemfriction
Secondary handle: systemfrictioninstitute
Avoid name: Systemic Friction Institute
```

Digital-facing descriptor:

`Evidence-governed observability and governed AI interaction for complex sociotechnical systems.`

Institution descriptor:

`System Friction Institute studies how friction becomes observable, persistent and actionable across complex systems through evidence, governed inference, intervention and RETURN.`

No external node may identify the institution only as `SFI` without the full name/domain context.

## 2. External node state model

Every platform node begins as:

```text
UNCLAIMED
```

Allowed transitions:

```text
UNCLAIMED → CLAIMED → VERIFIED
VERIFIED → DEGRADED / LOST
DEGRADED → VERIFIED / LOST
```

A planned URL/handle is not `CLAIMED` until the platform confirms it.

## 3. Platforms to inventory/reserve

P0/P1 target inventory:

```text
LinkedIn institutional Page
LinkedIn founder relationship
Medium existing publication/profile
GitHub Organization reservation
Zenodo account/integration identity
ORCID researcher records
ResearchGate researcher/publication nodes
Hugging Face Organization
YouTube channel
Bluesky domain handle
Mastodon/Fediverse identity
Email sender/domain
Postman public workspace
OSF researcher/registration identity
```

Later/conditional:

```text
ROR
npm/PyPI
ISBN/WorldCat
Wikidata
Crunchbase
Wikipedia (independent emergence only)
```

## 4. External-node inventory record

For every real node record:

```text
platform
node_type
canonical_account_url
handle
identity_name
identity_domain
verification_state
relationship
verified_at
verification_method
notes
```

Do not store credentials in this inventory.

## 5. LinkedIn

Institutional Page role:

```text
SFI → methods → evidence → results → releases → research → calls → infrastructure
```

Founder role:

```text
PERSON → observation → criterion → experience → interpretation → SFI
```

Do not copy identical content across both.

Target newsletter when account/Page eligibility permits:

`SFI · FIELD NOTES`

Cadence target: quincenal.

Question framing:

`What did the system make observable this week?`

Record Page/newsletter as real only after platform confirmation.

## 6. Medium

Use the existing SFI Medium presence if verified.

Purpose:

`semantic distribution mirror`

Flow:

```text
SFI ORIGINAL
→ index
→ Medium representation/import
→ canonical back to systemfriction.org original
```

Normalize visible identity to `System Friction Institute` where platform configuration allows.

Do not open a second Medium merely to restart naming.

## 7. GitHub Organization

Reserve organization identity if available, but do not transfer `Aptymok/system-friction` during bootstrap.

Before any future transfer audit:

```text
OAuth
Actions
Vercel
secrets
webhooks
repository URLs
Zenodo integration
external references
```

Preserve founder genealogy if that remains the institutional decision.

## 8. Hugging Face

Target organization:

`System Friction Institute`

Do not upload a fictional model.

Coordinate real public Spaces/datasets with WS-03/WS-04.

External org URL is recorded only after ownership is verified.

## 9. Bluesky

Preferred identity proof:

`@systemfriction.org`

Use domain verification when available/controlled.

Fallback handles are secondary, not canonical replacement.

## 10. Mastodon / Fediverse

Target bidirectional web identity using real profile URL and `rel="me"` when appropriate.

Coordinate `fediverse:creator` attribution with WS-03 only after the real profile exists.

## 11. YouTube

Institutional channel role:

`visual index of SFI concepts`

Program format:

`SFI / 180`

Initial concepts:

```text
MODEL OUTPUT IS NOT OBSERVATION
What is RETURN?
Why does MISSING remain MISSING?
What makes an AI agent authorized?
What is a Cognitive Twin?
What is systemic friction?
What does an Authority Envelope do?
Simulation is not observation
```

Channel existence/URL must be verified before canonical exposure.

## 12. Email

Target owned distribution identity:

`SFI FIELD DISPATCH`

External provider is replaceable.

Requirements:

- verified sender/domain;
- explicit subscriber consent;
- unsubscribe lifecycle;
- canonical archive remains SFI;
- no imported list without consent.

## 13. Entity collision observation

Actively observe confusion between:

```text
System Friction Institute
```

and similarly named entities, especially `Systemic Friction Institute`.

Do not attack/impersonate/keyword-spam the other entity. Defend identity through coherent canonical signals and verified external references.

Record actual collision observations for WS-03 ECR metrics.

## 14. External human actions

This workstream may reach operations requiring the user's manual login/acceptance/DNS verification.

For each, provide only:

```text
PLATFORM
EXACT ACTION
PREFERRED NAME/HANDLE
WHY REQUIRED
WHAT TO RETURN TO SFI-07
```

Do not ask the user to perform steps that can be completed through an already authorized connector/tool.

## 15. Forbidden outcomes

- fake account state;
- fabricated handle availability;
- fake follower counts;
- fabricated ORCID/DOI/ROR;
- duplicate Medium identity without cause;
- canonical `sameAs` to unverified nodes;
- Google Business profile without actual eligibility;
- self-promotional Wikipedia creation;
- using a location or affiliation that is aspirational rather than factual.

## 16. Definition of done

WS-07 is complete when all targeted nodes have an explicit observed state, all claimed nodes use the canonical identity fingerprint, verified nodes can safely enter SFI external-node relations, only entity-equivalent verified profiles enter institutional `sameAs`, and all remaining unclaimed nodes are clearly blocked by a specific human/external action rather than vague future work.

## 17. Handoff

```text
BASE SHA
VERIFIED NODES
CLAIMED-NOT-VERIFIED NODES
UNCLAIMED NODES
LOST/DEGRADED NODES
ENTITY COLLISIONS OBSERVED
HUMAN ACTIONS REQUIRED
CANONICAL SAMEAS READY
CONTRACT DELTAS
PR IF CODE/METADATA CHANGED
NEXT SAFE ACTION
```

## 18. Observed external identity inventory — 2026-09-04

Fresh inspection baseline:

```text
BASE SHA: 1bd890c8a2ec784ad87d73eac6d19a294e050543
OBSERVATION DATE: 2026-09-04
CANONICAL ENTITY: https://systemfriction.org/#sfi
```

State semantics are strict. Search absence is not proof of nonexistence. Public self-identification without authenticated/domain-coherent control evidence remains `CLAIMED`, not `VERIFIED`. Asset control and entity equivalence are separate relations: a controlled repository can be `VERIFIED` as an owned external asset without being valid institutional `sameAs`.

### 18.1 Node inventory

| Platform / node | State | Observed identity / URL | Relationship and verification note |
|---|---|---|---|
| Canonical web entity | VERIFIED | `https://systemfriction.org` / `https://systemfriction.org/institution` | Canonical domain serves the full `System Friction Institute` identity. Entity ID remains `https://systemfriction.org/#sfi`. |
| GitHub repository asset | VERIFIED | `https://github.com/Aptymok/system-friction` | Authenticated connector confirms control of the public repository and README points to the canonical domain. This verifies an owned software/source asset, not entity equivalence with the `ResearchOrganization`; it is therefore **not institutional `sameAs`-ready**. |
| Medium profile/publication identity | CLAIMED | `https://medium.com/@systemfriction` | Public profile is named `System Friction Institute` and exposes multiple posts under that identity. No authenticated control receipt or reciprocal domain verification was observed; do not create a second Medium identity. |
| LinkedIn person → SFI relationship | CLAIMED | public post by Juan Antonio Marín Liera linking `System Friction Institute` and `systemfriction.org` | Real person-to-institution public relationship observed. It does not prove an institutional LinkedIn Page and the person profile is not institutional `sameAs`. |
| LinkedIn institutional Page | UNCLAIMED | — | No attributable institutional Page observed in fresh targeted search. |
| GitHub Organization | UNCLAIMED | — | No verified organization node observed; handle availability remains unknown. Do not transfer `Aptymok/system-friction` during bootstrap. |
| Zenodo | UNCLAIMED | — | No attributable SFI Zenodo account/deposit/integration observed; no DOI recorded by WS-07. |
| ORCID relationships | UNCLAIMED | — | No attributable researcher ORCID relation observed; no ORCID inferred. |
| ResearchGate | UNCLAIMED | — | No attributable SFI researcher/publication node observed. |
| Hugging Face Organization | UNCLAIMED | — | No attributable organization/Space/dataset/model node observed. |
| YouTube | UNCLAIMED | — | No attributable institutional channel observed. |
| Bluesky | UNCLAIMED | — | No attributable profile/domain-handle proof observed. `@systemfriction.org` remains a preferred future proof pattern only. |
| Mastodon / Fediverse | UNCLAIMED | — | No attributable profile with bidirectional web identity observed. |
| Email sender/domain | UNCLAIMED | — | Public contact surface exists, but no verified sender mailbox/provider-domain authentication receipt was observed. |
| Postman public workspace | UNCLAIMED | — | No attributable public workspace observed; publication remains dependency-bound to WS-04 stability. |
| OSF | UNCLAIMED | — | No attributable researcher/project/registration identity observed. |

### 18.2 Evidence anchors

```text
Canonical profile: https://systemfriction.org/institution
Observed history: https://systemfriction.org/history
Controlled repository asset: https://github.com/Aptymok/system-friction
Medium claimed identity: https://medium.com/@systemfriction
LinkedIn public relationship: https://es.linkedin.com/posts/juanliera_en-febrero-escrib%C3%AD-que-la-resiliencia-real-activity-7462671453969104896-xsQt
```

### 18.3 Internal/external identity-coherence defects

Fresh repository metadata still reports:

```text
homepage: https://system-friction.vercel.app
```

while canonical program/site identity uses:

```text
https://systemfriction.org
```

The connected GitHub tool surface does not expose repository Website/Homepage mutation, so this setting remains a manual repository-account action.

Fresh `main` also contains this `ResearchOrganization` JSON-LD edge in `src/app/layout.tsx`:

```text
sameAs: ['https://github.com/Aptymok/system-friction']
```

That edge is semantically unsafe: repository control proves ownership/provenance of a software/source asset, not that the repository URL identifies the organization itself. This is a **pre-existing WS-03/shared-public-metadata defect**, not a state transition of the GitHub asset and not introduced by PR #370. WS-07 records the evidence and removes the repository from `sameAs` readiness; WS-03/SFI-00 owns normalization of the canonical JSON-LD surface in the appropriate integration slice.

### 18.4 Entity collision observed

A distinct external entity remains observable:

```text
Name: Systemic Friction Institute, Inc
Domain: https://www.systemfrictioninstitute.com/
Abbreviation used: SFI
Distinct founder publicly named by that entity: Jason Richardson
```

The collision is high-salience because the distinct entity also publicly uses `System Friction Score (SFS)`. Record this as an entity-reconstruction collision for WS-03 ECR metrics only. No affiliation, copying, priority, infringement or other legal conclusion is inferred.

Defensive fingerprint remains:

```text
System Friction Institute
https://systemfriction.org
https://systemfriction.org/#sfi
```

### 18.5 Canonical `sameAs` readiness

Safe now:

```text
NONE OBSERVED
```

Blocked from institutional `sameAs`:

```text
GitHub repository — VERIFIED owned asset, but repository != ResearchOrganization identity
Medium @systemfriction — CLAIMED; reciprocal/control verification incomplete
LinkedIn person relationship — real relationship, but person != institution
LinkedIn institutional Page — UNCLAIMED
GitHub Organization — UNCLAIMED
Zenodo / ORCID / ResearchGate / Hugging Face / YouTube / Bluesky / Mastodon / Postman / OSF — UNCLAIMED
Email sender/domain — UNCLAIMED
```

An external node enters `sameAs` only when both conditions hold: (1) identity/control verification is sufficient and (2) the URL is entity-equivalent to the institution rather than merely an owned project, publication, repository or related person.

### 18.6 Human/external action ledger

#### P0 — GitHub repository metadata

```text
PLATFORM: GitHub repository settings
EXACT ACTION: change Website/Homepage for Aptymok/system-friction from https://system-friction.vercel.app to https://systemfriction.org; do not transfer the repository.
PREFERRED NAME/HANDLE: Aptymok/system-friction unchanged.
WHY REQUIRED: remove stale canonical-domain metadata; authorized connector cannot mutate this property.
WHAT TO RETURN TO SFI-07: confirmation that the live Website field resolves to https://systemfriction.org.
```

#### P0 — Medium

```text
PLATFORM: Medium
EXACT ACTION: sign into existing @systemfriction; preserve visible name System Friction Institute; add/confirm https://systemfriction.org as profile/About website where supported; do not create another account.
PREFERRED NAME/HANDLE: existing @systemfriction.
WHY REQUIRED: obtain control/domain-coherence evidence.
WHAT TO RETURN TO SFI-07: live profile URL plus visible canonical-domain result or documented platform limitation.
```

#### P0 — LinkedIn institutional Page

```text
PLATFORM: LinkedIn
EXACT ACTION: while authenticated, identify an already-controlled institutional Page; if none exists, create one using full name System Friction Institute and website https://systemfriction.org.
PREFERRED NAME/HANDLE: full institutional name; handle only what LinkedIn actually confirms.
WHY REQUIRED: institutional Page ownership cannot be inferred from a personal post.
WHAT TO RETURN TO SFI-07: exact live Page URL and confirmation of administrative control.
```

#### P0 — GitHub Organization

```text
PLATFORM: GitHub
EXACT ACTION: check authenticated organization-name availability; prefer systemfriction, fallback systemfrictioninstitute only if confirmed unavailable; create only after GitHub confirmation; do not transfer the repository.
PREFERRED NAME/HANDLE: systemfriction, then systemfrictioninstitute.
WHY REQUIRED: organization reservation is account-level and no verified organization node exists.
WHAT TO RETURN TO SFI-07: exact created organization URL or observed availability conflict.
```

#### P1 — Research identities

```text
ZENODO: authenticate/connect only for a real durable release/deposit; return real account/deposit URL and DOI only if issued.
ORCID: each real researcher controls their own record; return only voluntarily supplied exact ORCID plus factual publishable relation.
RESEARCHGATE: real researchers claim real profiles/publications only; return exact claimed URLs.
OSF: create researcher/project/registration only for a real research object; return exact public URL.
```

#### P1 — Distribution/developer identities

```text
HUGGING FACE: create/claim real organization only after identifier confirmation; no placeholder model; return exact org URL.
YOUTUBE: create/claim institutional channel under full name; return exact channel URL/ID.
BLUESKY: create account then verify @systemfriction.org with actual Bluesky DNS method; return profile URL and issued verification/DID data only after platform issuance.
MASTODON/FEDIVERSE: choose real server/profile, expose canonical site, then add reciprocal rel=me only after profile exists; return exact URL/status.
EMAIL: establish one real @systemfriction.org sender and verify provider + SPF/DKIM/DMARC; return sender and verification states, never credentials.
POSTMAN: wait for WS-04 stable public API; then create/publish a real workspace/collection and return exact public URL.
```

### 18.7 Current handoff

```text
BASE SHA
1bd890c8a2ec784ad87d73eac6d19a294e050543

VERIFIED NODES
- https://systemfriction.org / https://systemfriction.org/#sfi
- https://github.com/Aptymok/system-friction — VERIFIED controlled repository asset; NOT institutional sameAs

CLAIMED-NOT-VERIFIED NODES
- https://medium.com/@systemfriction
- LinkedIn person-to-SFI public relationship; not an institutional sameAs node

UNCLAIMED NODES
- LinkedIn institutional Page
- GitHub Organization
- Zenodo
- ORCID relationships
- ResearchGate
- Hugging Face Organization
- YouTube
- Bluesky
- Mastodon/Fediverse
- verified email sender/domain
- Postman public workspace
- OSF

LOST/DEGRADED NODES
None observed.

ENTITY COLLISIONS OBSERVED
- Systemic Friction Institute, Inc — https://www.systemfrictioninstitute.com/ — distinct entity using SFI and System Friction Score / SFS; no affiliation inferred.

CANONICAL SAMEAS READY
- none observed

CONTRACT DELTAS
None.

KNOWN IDENTITY DEFECTS
- GitHub repository homepage remains https://system-friction.vercel.app instead of https://systemfriction.org.
- main root ResearchOrganization JSON-LD currently uses the repository URL in sameAs; repository is an owned asset, not entity-equivalent organization identity. WS-03/shared-public-metadata normalization required.

NEXT SAFE ACTION
1. Keep PR #370 bounded to the observed-state documentation/review correction; no Slice B until integration.
2. SFI-00 may review the updated docs-only PR after checks settle; no self-merge.
3. Route the pre-existing root JSON-LD sameAs defect to WS-03/SFI-00 rather than expanding WS-07 into canonical public-plane ownership.
4. Normalize GitHub Website/Homepage manually when authorized by the human account holder.
5. Verify Medium and claim/verify future institutional profiles only through real platform evidence before any sameAs emission.
```

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-07 · EXTERNAL IDENTITY**.

Use the canonical program documents and `docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md`. Reconstruct actual external identity state from authorized tools/public evidence; never assume planned accounts exist.

Your job is to inventory, reserve/verify where the available authorized technology permits, and normalize the identity of **System Friction Institute — systemfriction.org** across LinkedIn, existing Medium, GitHub organization reservation, Zenodo, ORCID/research relationships, Hugging Face, YouTube, Bluesky, Mastodon, email and appropriate developer/research nodes. Preserve the System/Systemic disambiguation without spam or impersonation.

Do not fabricate handles, URLs, accounts, followers, DOIs, ORCIDs or ROR. Do not expose credentials. If a human login/acceptance/DNS step is genuinely required, return an exact minimal action request and continue all nonblocked work in parallel.

You may modify repository identity metadata through a PR when appropriate, but may not merge. Leave durable observed-state handoff.

Proceed from actual external/repository state now.
