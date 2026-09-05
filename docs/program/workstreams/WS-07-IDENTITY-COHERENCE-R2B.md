# WS-07 · IDENTITY COHERENCE · R2-B

**Baseline:** `a5a431a7d20b61e87c10b1c6345c56e5794c511a`  
**Branch:** `ws07/identity-coherence-r2b`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## Slice

This R2-B slice is limited to canonical institution identity coherence.

It absorbs the already locked `SFI-ENTITY-COHERENCE-1.0` contract into the existing public identity owner:

`src/lib/public/institutionProfile.ts`

No second identity owner is introduced.

## Canonical fingerprint

```text
name: System Friction Institute
abbreviation: SFI
canonical URL: https://systemfriction.org
entity @id: https://systemfriction.org/#sfi
preferred handle: systemfriction
secondary handle: systemfrictioninstitute
avoid name: Systemic Friction Institute
```

The public profile, root metadata and ResearchOrganization JSON-LD project this single fingerprint rather than independently owning name/domain/@id values.

## sameAs boundary

Institutional `sameAs` is fail-closed.

An external node is eligible only when all of the following are true:

1. its state is `VERIFIED`;
2. it is an institution-equivalent external profile rather than a controlled asset or related person;
3. its URL is a valid external HTTPS URL;
4. it is not merely the canonical SFI URL reflected back as self-reference.

Current observed state therefore produces:

```text
verified institutional sameAs: []
```

Observed examples preserved by the projection:

```text
GitHub repository asset
state: VERIFIED
relationship: CONTROLLED_SOFTWARE_SOURCE_ASSET
sameAs: BLOCKED because repository control != institutional entity equivalence

Medium profile
state: CLAIMED
identity class: INSTITUTION_PROFILE
sameAs: BLOCKED because CLAIMED != VERIFIED

LinkedIn person reference
state: CLAIMED
identity class: RELATED_PERSON
sameAs: BLOCKED because person/reference != institution and state is not VERIFIED
```

No external state transition is performed by this PR.

## Disambiguation risk

The distinct external entity `Systemic Friction Institute, Inc` remains represented only as:

```text
COLLISION_CANDIDATE / DISAMBIGUATION_RISK
observedCollision: false
```

Name/terminology similarity does not become an observed collision without concrete confusion evidence.

## Machine-readable coherence

The existing discovery QA now requires agreement across:

- `src/lib/public/institutionProfile.ts`;
- root Next.js metadata;
- root ResearchOrganization JSON-LD;
- `public/ai-index.json`;
- `public/llms.txt`;
- `public/llms-full.txt`.

The QA also asserts that repository control is not promoted into institutional `sameAs` and that current CLAIMED nodes remain excluded.

## R2-B precheck

```text
Owner: WS-07 · External Identity / Identity Coherence.
Existing capability inspected: SFI-CONTRACT-LOCK, WS-07 inventory, institutionProfile.ts, layout.tsx, discovery integrity QA, ai-index, llms resources, current main and open PR #374 metadata.
Absorb vs create decision: ABSORB the existing institution profile owner and locked SFI-ENTITY-COHERENCE-1.0 contract. Do not create a parallel identity registry.
Authoritative writer: none added. Identity coherence is read-only/code-owned; external account state remains evidence-bound.
Persistence/lineage impact: NONE. No table, migration, SQL, Supabase/Auth mutation or durable account writer.
Front delta: metadata/JSON-LD consume the same canonical institution name through the existing public profile; no new route or feed.
Back delta: fail-closed sameAs disposition and observed identity-class projection inside the existing public profile owner.
DB delta: NONE.
Redundancy removed: independent hardcoded institution-name ownership in root metadata; metadata now consumes the existing profile owner.
Execution/ROOT boundary: no execution capability, account action, ROOT mutation, MCP, Twin or authority change.
Rollback: revert this PR; no external/data rollback required.
Verification: discovery/entity-coherence QA, canonical discovery integrity, typecheck, build, full exact-head SFI Verify.
```

## Explicit exclusion of PR #374

PR #374 is a separate authority/account-administration slice. This R2-B branch does not contain or modify its Supabase/Auth/access-console/API/migration files and does not depend on it.

## Scope invariants

```text
canonical institution identity coherence: YES
canonical name/domain/@id uniqueness: YES
sameAs fail-closed: YES
CLAIMED != VERIFIED: YES
repository control != institutional sameAs: YES
disambiguation risk: YES
JSON-LD/metadata/machine-readable coherence: YES
external account actions: NONE
authority expansion: NONE
persistence/migrations: NONE
contract delta: NONE
```
