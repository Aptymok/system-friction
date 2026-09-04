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

WS-07 is complete when all targeted nodes have an explicit observed state, all claimed nodes use the canonical identity fingerprint, verified nodes can safely enter SFI `sameAs`/external-node relations, and all remaining unclaimed nodes are clearly blocked by a specific human/external action rather than vague future work.

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

State semantics in this inventory are deliberately strict. Search absence is never converted into proof that an account cannot exist. When no attributable node was observed, the node remains `UNCLAIMED`. Public self-identification without an independent control/domain proof is `CLAIMED`, not `VERIFIED`.

### 18.1 Node inventory

| Platform / node | State | Observed identity / URL | Relationship and verification note |
|---|---|---|---|
| Canonical web entity | VERIFIED | `https://systemfriction.org` / `https://systemfriction.org/institution` | Canonical domain serves the full `System Friction Institute` identity and institutional profile. Entity ID remains `https://systemfriction.org/#sfi`. |
| GitHub repository | VERIFIED | `https://github.com/Aptymok/system-friction` | Authenticated connector confirms control of the public repository; README declares `System Friction Institute` and `https://systemfriction.org` as canonical host. Current site JSON-LD already emits this repository in institutional `sameAs`. Repository ownership remains under founder genealogy during bootstrap. |
| Medium profile/publication identity | CLAIMED | `https://medium.com/@systemfriction` | Public Medium profile is named `System Friction Institute` and contains multiple publications under that identity. Fresh evidence did not establish reciprocal domain verification or an authenticated Medium control receipt, therefore it is not yet `VERIFIED`. Do not create a second Medium identity. |
| LinkedIn person → SFI relationship | CLAIMED | public post by Juan Antonio Marín Liera linking `System Friction Institute` and `systemfriction.org` | A real person-to-institution public relationship is observable. The retrieved evidence does not establish an institutional LinkedIn Page and does not independently verify a founder-role claim; this personal node is not institutional `sameAs`. |
| LinkedIn institutional Page | UNCLAIMED | — | No attributable institutional Page was observed in the fresh targeted search. Do not infer nonexistence or invent a Page URL. |
| GitHub Organization | UNCLAIMED | — | Connected GitHub account reports no organization memberships. Preferred/secondary organization-handle availability was not established. Do not transfer `Aptymok/system-friction` during bootstrap. |
| Zenodo | UNCLAIMED | — | No attributable SFI Zenodo account/deposit/integration was observed. No DOI is recorded by WS-07. |
| ORCID relationships | UNCLAIMED | — | No attributable ORCID relationship was observed. ORCID is researcher-level identity; no ORCID identifier is recorded or inferred. |
| ResearchGate | UNCLAIMED | — | No attributable SFI researcher/publication node was observed. |
| Hugging Face Organization | UNCLAIMED | — | No attributable organization/Space/dataset/model node was observed. No organization URL is reserved in canon. |
| YouTube | UNCLAIMED | — | No attributable institutional channel was observed. |
| Bluesky | UNCLAIMED | — | No attributable SFI profile/domain-handle proof was observed. `@systemfriction.org` remains a preferred future verification pattern, not a claimed handle. |
| Mastodon / Fediverse | UNCLAIMED | — | No attributable profile with bidirectional web identity was observed. |
| Email sender/domain | UNCLAIMED | — | Canonical site exposes an institutional contact surface at `https://systemfriction.org/contact`, but fresh public/repository evidence did not establish a verified sender mailbox or provider/domain-authentication receipt. |
| Postman public workspace | UNCLAIMED | — | No attributable public workspace was observed. Publication remains dependency-bound to a stable public API surface. |
| OSF | UNCLAIMED | — | No attributable researcher/project/registration identity was observed. |

### 18.2 Verified evidence anchors

```text
SFI canonical profile
https://systemfriction.org/institution

SFI public history
https://systemfriction.org/history

SFI GitHub repository
https://github.com/Aptymok/system-friction

SFI Medium claimed identity
https://medium.com/@systemfriction

LinkedIn public relationship evidence
https://es.linkedin.com/posts/juanliera_en-febrero-escrib%C3%AD-que-la-resiliencia-real-activity-7462671453969104896-xsQt
```

### 18.3 Repository identity-coherence defect

GitHub repository metadata currently reports:

```text
homepage: https://system-friction.vercel.app
```

while README, site JSON-LD and canonical program contracts use:

```text
https://systemfriction.org
```

This is an external metadata-coherence defect, not evidence that repository ownership is degraded or lost. The connected GitHub tool surface available to this workstream does not expose repository-settings mutation for `homepage`; therefore this setting cannot be normalized automatically from this session.

### 18.4 Entity collision observed

A distinct external entity is currently observable at:

```text
Name: Systemic Friction Institute, Inc
Domain: https://www.systemfrictioninstitute.com/
Abbreviation used: SFI
Distinct founder publicly named by that entity: Jason Richardson
```

The collision is high-salience because it is not only orthographic (`System` vs `Systemic`) and acronym-level (`SFI`). The distinct entity also publicly uses `System Friction Score (SFS)` for its own framework. This must be treated as an entity-reconstruction collision for WS-03 metrics, not as evidence of affiliation, copying, ownership, infringement or any other legal conclusion.

Defensive response remains canonical coherence only:

```text
System Friction Institute
https://systemfriction.org
https://systemfriction.org/#sfi
```

Do not attack, impersonate or keyword-spam the distinct entity.

### 18.5 Canonical `sameAs` readiness

Ready now:

```text
https://github.com/Aptymok/system-friction
```

Not ready for institutional `sameAs`:

```text
Medium @systemfriction — CLAIMED, reciprocal/control verification incomplete
LinkedIn person relationship — real relationship but person != institution
LinkedIn institutional Page — UNCLAIMED
Zenodo / ORCID / ResearchGate / Hugging Face / YouTube / Bluesky / Mastodon / Postman / OSF — UNCLAIMED
Email sender/domain — UNCLAIMED
```

No unverified node should be added to canonical `sameAs` merely to increase graph density.

### 18.6 Human/external actions required

Only manual platform ownership, acceptance or DNS operations remain outside the authorized tool surface.

#### GitHub repository metadata

```text
PLATFORM: GitHub repository settings
EXACT ACTION: change the repository Website/Homepage value for Aptymok/system-friction from https://system-friction.vercel.app to https://systemfriction.org; do not transfer the repository.
PREFERRED NAME/HANDLE: Aptymok/system-friction remains unchanged during bootstrap.
WHY REQUIRED: remove a stale external canonical-domain signal; the connected GitHub tool surface does not expose repository homepage mutation.
WHAT TO RETURN TO SFI-07: confirmation that the live GitHub repository Website field resolves to https://systemfriction.org.
```

#### Medium

```text
PLATFORM: Medium
EXACT ACTION: sign into the existing @systemfriction account; preserve the visible name System Friction Institute; add or confirm https://systemfriction.org as the profile/About canonical website where Medium permits it. Do not create a second account.
PREFERRED NAME/HANDLE: existing @systemfriction only.
WHY REQUIRED: upgrade the observed node from public self-claim to bidirectional/domain-coherent verification evidence.
WHAT TO RETURN TO SFI-07: live profile URL after the canonical website is publicly visible, or the platform limitation if Medium provides no usable website field.
```

#### LinkedIn institutional Page

```text
PLATFORM: LinkedIn
EXACT ACTION: while authenticated, search for an existing organization Page that is actually controlled by SFI. If none exists, create the institutional Page using the full name System Friction Institute and website https://systemfriction.org. Do not substitute the personal profile for the institutional node.
PREFERRED NAME/HANDLE: System Friction Institute; handle only whatever LinkedIn actually confirms.
WHY REQUIRED: no institutional Page ownership was observed publicly; creation/claim requires platform account acceptance.
WHAT TO RETURN TO SFI-07: exact live Page URL and confirmation of administrative control.
```

#### GitHub Organization

```text
PLATFORM: GitHub
EXACT ACTION: check organization-name availability while authenticated; prefer systemfriction, then systemfrictioninstitute only if the preferred name is unavailable. Create an organization only after GitHub confirms the selected name. Do not transfer the repository.
PREFERRED NAME/HANDLE: systemfriction; fallback systemfrictioninstitute.
WHY REQUIRED: organization reservation is an account-level external action and current authenticated account has no organization membership.
WHAT TO RETURN TO SFI-07: exact organization URL GitHub actually creates, or the observed availability conflict.
```

#### Zenodo

```text
PLATFORM: Zenodo
EXACT ACTION: authenticate a real SFI/researcher account and connect the existing GitHub repository only when a real durable release/deposit is ready. Do not mint or record a DOI merely to reserve identity.
PREFERRED NAME/HANDLE: System Friction Institute in deposit metadata where factually appropriate.
WHY REQUIRED: account authorization and repository/deposit integration are external platform actions.
WHAT TO RETURN TO SFI-07: exact Zenodo account/integration/deposit URL and any DOI only after Zenodo actually issues it.
```

#### ORCID

```text
PLATFORM: ORCID
EXACT ACTION: each real researcher/author who will be attributed by SFI must sign in to or create their own ORCID record and add only factual relationships/works. Do not create an institutional ORCID.
PREFERRED NAME/HANDLE: researcher legal/publishing identity as maintained by that researcher.
WHY REQUIRED: ORCID is person-scoped and requires researcher ownership/consent.
WHAT TO RETURN TO SFI-07: exact ORCID URL voluntarily supplied by the researcher and the factual relationship SFI may publish.
```

#### ResearchGate

```text
PLATFORM: ResearchGate
EXACT ACTION: real researchers may claim/create their personal profiles and claim only real publications; do not create a synthetic institutional researcher persona.
PREFERRED NAME/HANDLE: researcher identity as accepted by ResearchGate.
WHY REQUIRED: researcher account ownership and publication claims require human/platform confirmation.
WHAT TO RETURN TO SFI-07: exact public researcher/publication URLs that have actually been claimed.
```

#### Hugging Face

```text
PLATFORM: Hugging Face
EXACT ACTION: create/claim an organization named System Friction Institute if Hugging Face confirms an available organization identifier. Do not upload a placeholder or fictional model.
PREFERRED NAME/HANDLE: systemfriction first; secondary only if the platform rejects/unavailable.
WHY REQUIRED: organization creation is an account-level platform action.
WHAT TO RETURN TO SFI-07: exact organization URL created by Hugging Face and the actual confirmed identifier.
```

#### YouTube

```text
PLATFORM: YouTube
EXACT ACTION: create or claim a real institutional channel under the full visible name System Friction Institute; add https://systemfriction.org as the canonical external website if channel settings permit it.
PREFERRED NAME/HANDLE: full institutional name; handle only what YouTube actually confirms.
WHY REQUIRED: channel creation/claim requires Google/YouTube account authority.
WHAT TO RETURN TO SFI-07: exact channel URL/channel ID after creation or claim.
```

#### Bluesky

```text
PLATFORM: Bluesky
EXACT ACTION: create a real Bluesky account, then set the handle to systemfriction.org using Bluesky domain-handle verification and the DNS method Bluesky actually provides.
PREFERRED NAME/HANDLE: @systemfriction.org.
WHY REQUIRED: account creation plus DNS verification requires human account/DNS authority.
WHAT TO RETURN TO SFI-07: exact live profile URL and the domain-handle verification result; do not pre-record a DID before Bluesky issues one.
```

#### Mastodon / Fediverse

```text
PLATFORM: Mastodon/Fediverse
EXACT ACTION: select an actual server, create the institutional profile, expose https://systemfriction.org as a verified profile link where supported, then add reciprocal rel=me on SFI only after the real profile URL exists.
PREFERRED NAME/HANDLE: System Friction Institute; handle/server determined only by the actual platform choice.
WHY REQUIRED: server/account choice and bidirectional verification require external account control.
WHAT TO RETURN TO SFI-07: exact profile URL and verification status.
```

#### Email sender/domain

```text
PLATFORM: chosen email delivery/provider stack for systemfriction.org
EXACT ACTION: establish one real @systemfriction.org sender mailbox, complete provider verification, and publish the SPF/DKIM/DMARC records required by the selected provider. Do not expose credentials.
PREFERRED NAME/HANDLE: visible sender name System Friction Institute; exact mailbox only after it exists.
WHY REQUIRED: sender identity and DNS authentication require mail-provider/domain authority.
WHAT TO RETURN TO SFI-07: exact sender address, provider verification receipt/status, and SPF/DKIM/DMARC verification state.
```

#### Postman

```text
PLATFORM: Postman
EXACT ACTION: after WS-04 declares the public API contract stable for publication, create/claim a public workspace and publish only the real stable API collection/documentation.
PREFERRED NAME/HANDLE: System Friction Institute; workspace identifier only after Postman confirms it.
WHY REQUIRED: workspace creation is account-level and publication is dependency-bound to WS-04 stability.
WHAT TO RETURN TO SFI-07: exact public workspace URL after publication.
```

#### OSF

```text
PLATFORM: OSF
EXACT ACTION: real researchers create/claim their OSF identity and create a project/registration only for a real SFI research object. Do not create empty registrations to manufacture presence.
PREFERRED NAME/HANDLE: factual researcher/project identity.
WHY REQUIRED: account ownership and registration actions require researcher/platform confirmation.
WHAT TO RETURN TO SFI-07: exact public profile/project/registration URL after it exists.
```

### 18.7 Current handoff

```text
BASE SHA
1bd890c8a2ec784ad87d73eac6d19a294e050543

VERIFIED NODES
- https://systemfriction.org / https://systemfriction.org/#sfi
- https://github.com/Aptymok/system-friction

CLAIMED-NOT-VERIFIED NODES
- https://medium.com/@systemfriction
- LinkedIn person-to-SFI public relationship evidenced by a Juan Antonio Marín Liera post linking System Friction Institute + systemfriction.org; not an institutional sameAs node

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
- https://github.com/Aptymok/system-friction

CONTRACT DELTAS
None.

KNOWN METADATA DEFECT
- GitHub repository homepage remains https://system-friction.vercel.app instead of https://systemfriction.org.

NEXT SAFE ACTION
1. Merge only through SFI-00 after review; no self-merge.
2. Normalize the GitHub repository Website/Homepage through the manual account setting because no authorized connector mutation exists for that property.
3. Verify the already-existing Medium node bidirectionally before adding it to canonical sameAs.
4. Claim LinkedIn institutional Page and GitHub Organization only through actual platform confirmation; do not transfer the repository during bootstrap.
5. Keep research/developer nodes UNCLAIMED until real account/deposit/publication actions occur; coordinate Zenodo/ORCID research metadata with WS-05 and Postman/public interface publication with WS-04.
```

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-07 · EXTERNAL IDENTITY**.

Use the canonical program documents and `docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md`. Reconstruct actual external identity state from authorized tools/public evidence; never assume planned accounts exist.

Your job is to inventory, reserve/verify where the available authorized technology permits, and normalize the identity of **System Friction Institute — systemfriction.org** across LinkedIn, existing Medium, GitHub organization reservation, Zenodo, ORCID/research relationships, Hugging Face, YouTube, Bluesky, Mastodon, email and appropriate developer/research nodes. Preserve the System/Systemic disambiguation without spam or impersonation.

Do not fabricate handles, URLs, accounts, followers, DOIs, ORCIDs or ROR. Do not expose credentials. If a human login/acceptance/DNS step is genuinely required, return an exact minimal action request and continue all nonblocked work in parallel.

You may modify repository identity metadata through a PR when appropriate, but may not merge. Leave durable observed-state handoff.

Proceed from actual external/repository state now.
