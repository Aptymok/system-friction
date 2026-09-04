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

Name or terminology similarity by itself is a `COLLISION_CANDIDATE / DISAMBIGUATION_RISK`, not an observed collision and not an ECR event. Record an actual collision for WS-03 ECR metrics only when evidence shows a search system, model, person, platform, crawler or dataset confused the entities.

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
| GitHub repository asset | VERIFIED | `https://github.com/Aptymok/system-friction` | Authenticated GitHub repository metadata returned explicit `admin=true` and `push=true` permissions for the connected principal; the durable receipt is preserved in §18.2.1. This verifies controlled software/source-asset authority only, not entity equivalence with the `ResearchOrganization`; it is **not institutional `sameAs`-ready**. |
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

#### 18.1.1 Required records for observed real nodes

`verified_at` records the observation date at the granularity actually available to WS-07. It is `null` when the node is only `CLAIMED`; no platform-issued verification time is invented.

```text
platform: systemfriction.org
node_type: canonical_institution_web_entity
canonical_account_url: https://systemfriction.org/institution
handle: null
identity_name: System Friction Institute
identity_domain: systemfriction.org
verification_state: VERIFIED
relationship: CANONICAL_ENTITY
verified_at: 2026-09-04
verification_method: direct public canonical-profile observation corroborated by repository canonical-host metadata
notes: Entity ID is https://systemfriction.org/#sfi. The observation date is session-level evidence, not a platform-issued verification timestamp.
```

```text
platform: GitHub
node_type: controlled_software_repository_asset
canonical_account_url: https://github.com/Aptymok/system-friction
handle: Aptymok/system-friction
identity_name: system-friction
identity_domain: github.com
verification_state: VERIFIED
relationship: CONTROLLED_SOFTWARE_SOURCE_ASSET
verified_at: 2026-09-04
verification_method: authenticated GitHub connector `get_repo` permission projection; exact non-secret receipt preserved in §18.2.1
notes: VERIFIED means control authority over this repository asset at the observation date only. Repository URL is not entity-equivalent to the ResearchOrganization and is not institutional sameAs-ready.
```

```text
platform: Medium
node_type: public_profile_publication_identity
canonical_account_url: https://medium.com/@systemfriction
handle: @systemfriction
identity_name: System Friction Institute
identity_domain: medium.com
verification_state: CLAIMED
relationship: EXTERNAL_DISTRIBUTION_PROFILE_CLAIM
verified_at: null
verification_method: direct public profile/content inspection; no authenticated Medium control receipt or reciprocal domain proof observed
notes: Existing profile must be preserved; do not create a duplicate Medium identity. CLAIMED must not be promoted to VERIFIED without new evidence.
```

```text
platform: LinkedIn
node_type: related_person_public_reference
canonical_account_url: https://es.linkedin.com/posts/juanliera_en-febrero-escrib%C3%AD-que-la-resiliencia-real-activity-7462671453969104896-xsQt
handle: null
identity_name: Juan Antonio Marín Liera → System Friction Institute public relationship evidence
identity_domain: linkedin.com
verification_state: CLAIMED
relationship: RELATED_PERSON_PUBLIC_REFERENCE
verified_at: null
verification_method: direct public post observation naming System Friction Institute and systemfriction.org; no institutional Page-control evidence observed
notes: The person/post is relationship evidence, not institutional sameAs and not proof of a LinkedIn institutional Page.
```

### 18.2 Evidence anchors

```text
Canonical profile: https://systemfriction.org/institution
Observed history: https://systemfriction.org/history
Controlled repository asset: https://github.com/Aptymok/system-friction
GitHub control receipt: §18.2.1 in this durable workstream record
Medium claimed identity: https://medium.com/@systemfriction
LinkedIn public relationship: https://es.linkedin.com/posts/juanliera_en-febrero-escrib%C3%AD-que-la-resiliencia-real-activity-7462671453969104896-xsQt
```

#### 18.2.1 Durable GitHub repository-control receipt

The following fields are a direct transcription of the authenticated GitHub connector `get_repo` result observed on 2026-09-04. No credential, token, inferred actor scope or invented timestamp is stored.

```text
observation_date: 2026-09-04
connector_name: GitHub
action_name: get_repo
repository_full_name: Aptymok/system-friction
repository_id: 1163662905
owner_login: Aptymok
visibility: public
archived: false
permissions.admin: true
permissions.maintain: true
permissions.pull: true
permissions.push: true
permissions.triage: true
```

Interpretation boundary:

```text
This receipt demonstrates that the authenticated connector principal had administrative and push authority over Aptymok/system-friction at the observation date. It verifies control of the repository asset only.
It does NOT demonstrate that the repository URL is the institutional entity, does NOT authorize institutional sameAs, and does NOT establish control of any external account or domain by inheritance.
```

Corroborating repository evidence, not a substitute for the permission receipt: GitHub's commit API records `da15061ce9b38651f8dc082629b53ac67bb6da02` on `ws07/external-identity-inventory` with author/committer `Aptymok`, modifying this workstream. No claim is made that commit attribution alone proves identity control.

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

### 18.4 Collision candidate / disambiguation risk

A distinct external entity is observable:

```text
Name: Systemic Friction Institute, Inc
Domain: https://www.systemfrictioninstitute.com/
Abbreviation used: SFI
Distinct founder publicly named by that entity: Jason Richardson
```

The entity is a high-salience `COLLISION_CANDIDATE / DISAMBIGUATION_RISK` because it also publicly uses `System Friction Score (SFS)`. In this pass, no evidence was observed that a search system, model, person, platform, crawler or dataset actually confused it with `System Friction Institute / systemfriction.org`. Therefore it MUST NOT increment WS-03 ECR metrics and MUST NOT emit `SFI_ENTITY_COLLISION_OBSERVED` unless a concrete confusion event is captured with provenance. No affiliation, copying, priority, infringement or other legal conclusion is inferred.

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
GitHub repository — VERIFIED controlled asset, but repository != ResearchOrganization identity
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

#### P1 — Zenodo

```text
PLATFORM: Zenodo
EXACT ACTION: authenticate a real SFI/researcher account and connect the existing GitHub repository only when a real durable release/deposit is ready; do not mint a DOI merely to reserve identity.
PREFERRED NAME/HANDLE: System Friction Institute in deposit metadata only where factually appropriate; account identifier only after Zenodo confirms it.
WHY REQUIRED: account authorization and deposit/repository integration are external platform actions, and DOI relations require a real issued receipt.
WHAT TO RETURN TO SFI-07: exact Zenodo account/integration/deposit URL and any DOI only after Zenodo actually issues it.
```

#### P1 — ORCID

```text
PLATFORM: ORCID
EXACT ACTION: each real researcher/author who will be attributed by SFI signs into or creates their own ORCID record and adds only factual relationships/works; do not create an institutional ORCID.
PREFERRED NAME/HANDLE: researcher publishing identity as maintained by that researcher; no identifier is preselected.
WHY REQUIRED: ORCID is person-scoped and requires researcher ownership/consent.
WHAT TO RETURN TO SFI-07: exact ORCID URL voluntarily supplied by the researcher plus the factual relationship SFI may publish.
```

#### P1 — ResearchGate

```text
PLATFORM: ResearchGate
EXACT ACTION: real researchers may claim/create their personal profiles and claim only real publications; do not create a synthetic institutional researcher persona.
PREFERRED NAME/HANDLE: researcher identity as accepted by ResearchGate; no handle is pre-invented.
WHY REQUIRED: researcher account ownership and publication claims require human/platform confirmation.
WHAT TO RETURN TO SFI-07: exact public researcher/publication URLs that have actually been claimed.
```

#### P1 — OSF

```text
PLATFORM: OSF
EXACT ACTION: real researchers create/claim their OSF identity and create a project/registration only for a real SFI research object; do not create empty registrations to manufacture presence.
PREFERRED NAME/HANDLE: factual researcher/project identity; no account URL is pre-invented.
WHY REQUIRED: account ownership and registration actions require researcher/platform confirmation.
WHAT TO RETURN TO SFI-07: exact public profile/project/registration URL after it exists.
```

#### P1 — Hugging Face

```text
PLATFORM: Hugging Face
EXACT ACTION: create/claim an organization named System Friction Institute only if Hugging Face confirms an available organization identifier; do not upload a placeholder or fictional model.
PREFERRED NAME/HANDLE: systemfriction first; systemfrictioninstitute only if the preferred identifier is actually unavailable/rejected.
WHY REQUIRED: organization creation is account-level and identifier availability must be platform-confirmed.
WHAT TO RETURN TO SFI-07: exact organization URL created by Hugging Face and the actual confirmed identifier.
```

#### P1 — YouTube

```text
PLATFORM: YouTube
EXACT ACTION: create or claim a real institutional channel under the full visible name System Friction Institute and add https://systemfriction.org as canonical external website if channel settings permit it.
PREFERRED NAME/HANDLE: System Friction Institute; handle only what YouTube actually confirms.
WHY REQUIRED: channel creation/claim requires Google/YouTube account authority.
WHAT TO RETURN TO SFI-07: exact channel URL/channel ID after creation or claim.
```

#### P1 — Bluesky

```text
PLATFORM: Bluesky
EXACT ACTION: create a real Bluesky account, then set the handle to systemfriction.org using the domain-handle verification method Bluesky actually provides.
PREFERRED NAME/HANDLE: @systemfriction.org.
WHY REQUIRED: account creation plus DNS/domain verification requires human account/domain authority.
WHAT TO RETURN TO SFI-07: exact live profile URL and domain-handle verification result; do not pre-record a DID before Bluesky issues one.
```

#### P1 — Mastodon / Fediverse

```text
PLATFORM: Mastodon/Fediverse
EXACT ACTION: select an actual server, create the institutional profile, expose https://systemfriction.org as a verified profile link where supported, then add reciprocal rel=me on SFI only after the real profile URL exists.
PREFERRED NAME/HANDLE: System Friction Institute; handle/server determined only by the actual platform choice.
WHY REQUIRED: server/account choice and bidirectional verification require external account control.
WHAT TO RETURN TO SFI-07: exact profile URL and verification status.
```

#### P1 — Email sender/domain

```text
PLATFORM: chosen email delivery/provider stack for systemfriction.org
EXACT ACTION: establish one real @systemfriction.org sender mailbox, complete provider verification, and publish the SPF/DKIM/DMARC records required by the selected provider; do not expose credentials.
PREFERRED NAME/HANDLE: visible sender name System Friction Institute; exact mailbox only after it exists.
WHY REQUIRED: sender identity and DNS authentication require mail-provider/domain authority.
WHAT TO RETURN TO SFI-07: exact sender address, provider verification receipt/status, and SPF/DKIM/DMARC verification state.
```

#### P1 — Postman

```text
PLATFORM: Postman
EXACT ACTION: after WS-04 declares the public API contract stable for publication, create/claim a public workspace and publish only the real stable API collection/documentation.
PREFERRED NAME/HANDLE: System Friction Institute; workspace identifier only after Postman confirms it.
WHY REQUIRED: workspace creation is account-level and publication is dependency-bound to WS-04 stability.
WHAT TO RETURN TO SFI-07: exact public workspace URL after publication.
```

### 18.7 Current handoff

```text
BASE SHA
1bd890c8a2ec784ad87d73eac6d19a294e050543

VERIFIED NODES
- https://systemfriction.org / https://systemfriction.org/#sfi
- https://github.com/Aptymok/system-friction — VERIFIED controlled repository asset via durable §18.2.1 permission receipt; NOT institutional sameAs

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
None observed. No concrete confusion event is currently evidenced.

COLLISION CANDIDATES / DISAMBIGUATION RISKS
- Systemic Friction Institute, Inc — https://www.systemfrictioninstitute.com/ — distinct entity using SFI and System Friction Score / SFS; similarity is not an ECR event and no affiliation is inferred.

HUMAN ACTIONS REQUIRED
- P0 GitHub repository Website/Homepage normalization.
- P0 verify existing Medium identity through real account/domain evidence.
- P0 identify/claim/create LinkedIn institutional Page only through platform confirmation.
- P0 check/create GitHub Organization only through platform-confirmed availability; do not transfer repository during bootstrap.
- P1 research identities: Zenodo, ORCID, ResearchGate, OSF only through real researchers/releases/research objects.
- P1 distribution/developer identities: Hugging Face, YouTube, Bluesky, Mastodon/Fediverse, email sender/domain; Postman remains dependency-bound to WS-04 stable API publication.
- Exact five-field actions are preserved in §18.6.

CANONICAL SAMEAS READY
- none observed

CONTRACT DELTAS
None. Collision-candidate language clarifies the existing §13 actual-observation rule and does not change the frozen ECR/event semantics.

PR IF CODE/METADATA CHANGED
- PR #370 `docs(ws07): record observed external identity inventory` — OPEN; branch `ws07/external-identity-inventory`; docs-only workstream metadata/evidence update; NO MERGE.

KNOWN IDENTITY DEFECTS
- GitHub repository homepage remains https://system-friction.vercel.app instead of https://systemfriction.org.
- main root ResearchOrganization JSON-LD currently uses the repository URL in sameAs; repository is an owned asset, not entity-equivalent organization identity. WS-03/shared-public-metadata normalization required.

NEXT SAFE ACTION
1. Keep PR #370 bounded to Slice A evidence/state corrections; no Slice B until integration.
2. Re-run/review exact-HEAD CI and any new review threads after this correction commit; resolve threads only after the fix is demonstrated.
3. SFI-00 may review the docs-only PR only after exact-head checks and review state are green; no self-merge.
4. Route the pre-existing root JSON-LD sameAs defect to WS-03/SFI-00 rather than expanding WS-07 into canonical public-plane ownership.
5. Normalize GitHub Website/Homepage manually when authorized by the human account holder.
6. Verify Medium and claim/verify future institutional profiles only through real platform evidence before any sameAs emission.
```

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-07 · EXTERNAL IDENTITY**.

Use the canonical program documents and `docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md`. Reconstruct actual external identity state from authorized tools/public evidence; never assume planned accounts exist.

Your job is to inventory, reserve/verify where the available authorized technology permits, and normalize the identity of **System Friction Institute — systemfriction.org** across LinkedIn, existing Medium, GitHub organization reservation, Zenodo, ORCID/research relationships, Hugging Face, YouTube, Bluesky, Mastodon, email and appropriate developer/research nodes. Preserve the System/Systemic disambiguation without spam or impersonation.

Do not fabricate handles, URLs, accounts, followers, DOIs, ORCIDs or ROR. Do not expose credentials. If a human login/acceptance/DNS step is genuinely required, return an exact minimal action request and continue all nonblocked work in parallel.

You may modify repository identity metadata through a PR when appropriate, but may not merge. Leave durable observed-state handoff.

Proceed from actual external/repository state now.
