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

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-07 · EXTERNAL IDENTITY**.

Use the canonical program documents and `docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md`. Reconstruct actual external identity state from authorized tools/public evidence; never assume planned accounts exist.

Your job is to inventory, reserve/verify where the available authorized technology permits, and normalize the identity of **System Friction Institute — systemfriction.org** across LinkedIn, existing Medium, GitHub organization reservation, Zenodo, ORCID/research relationships, Hugging Face, YouTube, Bluesky, Mastodon, email and appropriate developer/research nodes. Preserve the System/Systemic disambiguation without spam or impersonation.

Do not fabricate handles, URLs, accounts, followers, DOIs, ORCIDs or ROR. Do not expose credentials. If a human login/acceptance/DNS step is genuinely required, return an exact minimal action request and continue all nonblocked work in parallel.

You may modify repository identity metadata through a PR when appropriate, but may not merge. Leave durable observed-state handoff.

Proceed from actual external/repository state now.
