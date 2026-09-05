# WS-05 · RESEARCH GRAPH · R2-B PROJECTION

**Baseline:** `a5a431a7d20b61e87c10b1c6345c56e5794c511a`  
**Branch:** `ws05/research-graph-projection`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## Precheck

### Canonical owner consumed

`src/lib/discovery/canonicalObjectRegistry.ts` remains the sole `SFI-CANONICAL-OBJECT-1.0` owner. R2-B imports its registry, object types, canonical publication disposition, public projection and canonical validation. It does not declare another canonical registry, canonical URL resolver or publication owner.

The integrated Canonical Object Plane remains upstream:

```text
CANONICAL OBJECT
→ canonicalPublicationDisposition()
→ publicProjectionForCanonicalObject()
→ Research Graph projection
→ research metadata/export representation
```

The direction never reverses. Research Graph state cannot promote or mutate canon.

### Publication/publicability owner

Publication/publicability remains owned by the Canonical Object Plane and existing `PublicationStatus` contract. A research node is projectable only when the canonical owner returns `PUBLISH` and a non-null public projection. PRIVATE, REVIEW_REQUIRED, invalid, ineligible, security-ineligible or otherwise blocked canonical objects do not enter the Research Graph.

### Existing metadata/citation owner

Repository citation metadata remains `CITATION.cff`, validated by `scripts/qa-sfi-research-metadata.mjs`. R2-B does not replace or enrich that owner. The existing observed identity remains the Git alias `Aptymok`; no legal name, affiliation, DOI, ORCID, ROR, publication date, release date or license is inferred.

### Existing Method Lab research owner

`src/lib/method-lab/researchObjects.ts` remains its existing Method Lab research/event-ledger owner and governed publication-package projection. R2-B does not fork that source. Only objects admitted to `SFI-CANONICAL-OBJECT-1.0` can enter this Research Graph projection.

### Persistence decision

The Research Graph is a deterministic code-owned view. No new DB/table/migration/event store or persistence writer is required because the canonical registry and canonical public projection already contain the required source data.

## R2-B projection boundary

Research-projectable canonical object types:

```text
METHOD
INSTRUMENT
DATASET
REPORT
PAPER
SOFTWARE
RELEASE
RETURN
PUBLICATION
```

`CONCEPT` and `OBSERVATION` are intentionally not research-projectable in this slice because the current canonical contract does not establish that eligibility.

Each projected node preserves only canonical facts:

```text
canonical object ID
canonical object key
canonical URL
object type
version
public/publication state
epistemic state
authors exactly as canonical
methods
sourceRefs / lineage
rights state
license including null
limitations
MISSING entries
related canonical object IDs
```

No scholarly status or external identifier is inherited from object type.

## Relationship semantics

`relatedObjects` in `SFI-CANONICAL-OBJECT-1.0` is untyped. Therefore R2-B supports only:

```text
RELATED_OBJECT
```

This is the exact semantic demonstrated by the canonical field. R2-B explicitly does not promote that field to `CITES`, `REFERENCES`, `DERIVED_FROM`, `IMPLEMENTS`, `VERSION_OF`, `SUPERSEDES`, `RETURN_OF`, `RELEASE_OF` or `PUBLICATION_OF` without a future canonical source contract that carries that relationship type.

A `RELATED_OBJECT` edge is emitted only when both source and target are independently projectable canonical nodes. Related IDs that are canonical but not research-projectable remain preserved in `unprojectedRelatedCanonicalObjectIds` rather than being reinterpreted.

## Contracts implemented

```text
SFI-RESEARCH-GRAPH-INTEGRITY-1.0
SFI-RESEARCH-METADATA-1.0
SFI-RESEARCH-NO-FABRICATED-IDENTIFIERS-1.0
SFI-RESEARCH-CANONICAL-LINEAGE-1.0
```

These are projection/integrity contracts. They do not replace or modify `SFI-CANONICAL-OBJECT-1.0`.

## Identifier and identity state

```text
DOI: none observed / none emitted
ORCID: none observed / none emitted
ROR: none observed / none emitted
Affiliation: not inferred
Legal human name: not inferred
Observed repository author identity: Aptymok
.zenodo.json: absent
```

`CITATION.cff` remains unchanged by R2-B.

## QA boundary

The R2-B gate proves:

- canonical-object-only source and fail-closed canonical validation;
- explicit publication/publicability gate;
- no private/review/ineligible projection;
- canonical ID/key/URL/version preserved;
- epistemic state and MISSING preserved;
- authorship, rights and license copied only from canonical state;
- null license remains null;
- no DOI/ORCID/ROR/affiliation/publication-date/release-date fields appear in the research export representation;
- deterministic projectable type set;
- deterministic `RELATED_OBJECT` projection;
- invented scholarly relationship types rejected;
- graph drift from canonical source rejected;
- canonical discovery integrity remains active;
- existing research metadata/CITATION regression remains active;
- typecheck/build remain mandatory through `SFI Verify`.

## Scope exclusions

Not implemented:

- DOI minting or DOI provider integrations;
- Crossref/DataCite publication;
- ORCID writes;
- ROR registration;
- Zenodo automation;
- external scholarly APIs;
- public feeds or search-engine submissions;
- external identity verification;
- Identity Coherence;
- MCP;
- Twin;
- adaptive task graph;
- autonomous publication.

## Contract and authority impact

```text
CONTRACT DELTA: NONE
AUTHORITY EXPANSION: NONE
PERSISTENCE/MIGRATIONS: NONE
NEW PUBLIC ROUTES: NONE
EXTERNAL MUTATION: NONE
```

## QA chronology

PR `#375` first exact-head run `SFI Verify #2402` reached canonical architecture preflight after dependency installation, parallel-topology QA and domain boundaries passed. Preflight failed only on `P17_PR_PREFLIGHT_REQUIRED`: the PR dossier used the heading `Redundancy removed/avoided:` while the canonical architecture gate requires the exact field `Redundancy removed:`.

The PR body was corrected to the required canonical field without changing implementation semantics. No code was modified to bypass the gate. This documentation commit records the preflight correction and intentionally triggers fresh exact-head CI from the corrected PR dossier.

External preview signals observed on the first PR head are not treated as product QA: Vercel reported its free-plan daily deployment limit, and Netlify reported deploy-preview failure. Neither signal had reached or evaluated the Research Graph test gate. Exact-head `SFI Verify` remains the required product/integration gate.
